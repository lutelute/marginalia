// ---------------------------------------------------------------------------
// Bidirectional scroll sync hook for AnnotatedPreview
// ---------------------------------------------------------------------------
// エディタ⇔プレビューの双方向スクロール同期ロジック。
// AnnotatedPreview.tsx から切り出したもの（挙動は不変）。
// フィードバックループ防止用の ref は呼び出し元から受け取る。

import React, { useCallback, useEffect, useRef } from 'react';
import { computeEditorPositionFromOffset } from '../../utils/selectorUtils';
import { setEditorScrollCallback, triggerScrollSync } from './MarkdownEditor';

interface UsePreviewScrollSyncParams {
  content: string;
  scrollSyncEnabled: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isScrollingFromEditorRef: React.MutableRefObject<boolean>;
  isScrollingFromPreviewRef: React.MutableRefObject<boolean>;
}

export function usePreviewScrollSync({
  content,
  scrollSyncEnabled,
  scrollContainerRef,
  contentRef,
  isScrollingFromEditorRef,
  isScrollingFromPreviewRef,
}: UsePreviewScrollSyncParams) {
  // ソースオフセットから行番号へ変換するヘルパー
  const offsetToLine = useCallback((offset: number): number => {
    if (!content) return 1;
    const pos = computeEditorPositionFromOffset(content, offset, offset);
    return pos.startLine;
  }, [content]);

  // 行番号からソースオフセットへ変換するヘルパー
  const lineToOffset = useCallback((line: number): number => {
    if (!content) return 0;
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    return offset;
  }, [content]);

  // スクロール同期の世代カウンタ（フィードバックループ防止）
  const syncGenerationRef = useRef(0);

  // (A) エディタ→プレビュー: エディタスクロール時にプレビューを追従
  useEffect(() => {
    if (!scrollSyncEnabled) {
      setEditorScrollCallback(null);
      return;
    }

    const handleEditorScroll = (line: number) => {
      if (isScrollingFromPreviewRef.current) return;

      const scrollContainer = scrollContainerRef.current;
      const contentEl = contentRef.current;
      if (!scrollContainer || !contentEl) return;

      // 世代カウンタをインクリメント — 進行中のプレビュー→エディタ同期を無効化
      syncGenerationRef.current++;
      isScrollingFromEditorRef.current = true;

      // 行番号 → ソースオフセット → [data-s] スパンで最も近い要素を検索
      const targetOffset = lineToOffset(line);
      const spanEls = contentEl.querySelectorAll<HTMLElement>('[data-s]');
      let closestEl: HTMLElement | null = null;
      let closestDiff = Infinity;

      for (const el of spanEls) {
        const s = parseInt(el.dataset.s || '', 10);
        if (isNaN(s)) continue;
        const diff = Math.abs(s - targetOffset);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestEl = el;
        }
        if (s > targetOffset && closestEl) break;
      }

      if (closestEl) {
        const elRect = closestEl.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetScroll = scrollContainer.scrollTop + elRect.top - containerRect.top - 20;
        scrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'auto',
        });
      }

      setTimeout(() => {
        isScrollingFromEditorRef.current = false;
      }, 80);
    };

    setEditorScrollCallback(handleEditorScroll);
    return () => setEditorScrollCallback(null);
  }, [scrollSyncEnabled, lineToOffset]);

  // (B) プレビュー→エディタ: プレビュースクロール時にエディタを追従
  useEffect(() => {
    if (!scrollSyncEnabled) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const handlePreviewScroll = () => {
      if (isScrollingFromEditorRef.current) return;

      // 現在の世代を捕捉
      const gen = syncGenerationRef.current;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // 世代が変わっていたら（エディタ側からの新しい同期が発生した）スキップ
        if (gen !== syncGenerationRef.current) return;
        if (isScrollingFromEditorRef.current) return;

        const contentEl = contentRef.current;
        if (!contentEl) return;

        // 最初の可視 [data-s] スパンを検索
        const containerRect = scrollContainer.getBoundingClientRect();
        const spanEls = contentEl.querySelectorAll<HTMLElement>('[data-s]');

        for (const el of spanEls) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom >= containerRect.top) {
            const s = parseInt(el.dataset.s || '', 10);
            if (isNaN(s)) continue;
            const line = offsetToLine(s);

            isScrollingFromPreviewRef.current = true;
            triggerScrollSync(line);
            setTimeout(() => {
              isScrollingFromPreviewRef.current = false;
            }, 80);
            break;
          }
        }
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handlePreviewScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handlePreviewScroll);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [scrollSyncEnabled, offsetToLine]);
}

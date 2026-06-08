import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { useFile } from '../../contexts/FileContext';
import { useAnnotation } from '../../contexts/AnnotationContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  computeEditorPositionFromOffset,
  getEditorPosition,
} from '../../utils/selectorUtils';
import { AnnotationV2, AnnotationType, AnnotationSelector } from '../../types/annotations';
import AnnotationHoverCard from '../Annotations/AnnotationHoverCard';
import { clampHoverCardX } from '../../utils/cardPosition';
import { triggerEditorScroll } from './MarkdownEditor';
import FrontmatterCard from './FrontmatterCard';
import { createPreviewMarkdownComponents } from './previewMarkdownComponents';
import {
  rehypePreservePositions,
  rehypeSourceMap,
  getSourceOffsetFromNode,
  getContainerSourceRange,
  findMathSourceRange,
} from './sourcePositionUtils';
import { usePreviewHighlights, isCaretInRange } from './highlightUtils';
import { usePreviewScrollSync } from './usePreviewScrollSync';
import { SelectionPopup, AnnotationForm } from './PreviewSelectionPopup';
import { annotatedPreviewStyles } from './annotatedPreviewStyles';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnnotatedPreview() {
  const { content, currentFile } = useFile();
  const {
    annotations,
    selectedAnnotation,
    selectAnnotation,
    addAnnotation,
    updateAnnotation,
    resolveAnnotation,
    deleteAnnotation,
    addReply,
    scrollToEditorLine,
  } = useAnnotation();
  const { settings } = useSettings();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const lastHoverCheck = useRef(0);

  // ホバーカード用 state / ref
  const [hoverCardData, setHoverCardData] = useState<{
    annotation: AnnotationV2;
    position: { x: number; y: number };
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringCardRef = useRef(false);

  // スクロール同期用 ref（フィードバックループ防止）
  const isScrollingFromEditorRef = useRef(false);
  const isScrollingFromPreviewRef = useRef(false);

  // Selection state (with source offsets)
  const [selectionPopup, setSelectionPopup] = useState<{
    text: string;
    top: number;
    left: number;
    srcStart: number | null;
    srcEnd: number | null;
  } | null>(null);

  const [pendingAnnotation, setPendingAnnotation] = useState<{
    type: string;
    text: string;
    srcStart: number | null;
    srcEnd: number | null;
  } | null>(null);

  // CSS Custom Highlight API
  const rangeMapRef = usePreviewHighlights(
    contentRef,
    annotations,
    content,
    selectedAnnotation,
    hoveredAnnotation,
  );

  // --- ホバーカード閉じるロジック ---
  const scheduleCloseCard = useCallback(() => {
    if (closeTimeoutRef.current) return;
    closeTimeoutRef.current = setTimeout(() => {
      if (!isHoveringCardRef.current) {
        setHoverCardData(null);
      }
      closeTimeoutRef.current = null;
    }, 300);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    isHoveringCardRef.current = true;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    isHoveringCardRef.current = false;
    closeTimeoutRef.current = setTimeout(() => {
      setHoverCardData(null);
      closeTimeoutRef.current = null;
    }, 200);
  }, []);

  // --- Hover detection ---
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastHoverCheck.current < 50) return;
      lastHoverCheck.current = now;

      // ホバーカード上にいる場合は何もしない
      if ((e.target as HTMLElement).closest('.annotation-hover-card-unified')) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        return;
      }

      try {
        const caretRange = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (!caretRange) {
          if (hoveredAnnotation) setHoveredAnnotation(null);
          scheduleCloseCard();
          return;
        }

        for (const [id, ranges] of rangeMapRef.current) {
          for (const range of ranges) {
            if (isCaretInRange(caretRange.startContainer, caretRange.startOffset, range)) {
              if (hoveredAnnotation !== id) setHoveredAnnotation(id);

              // 閉じるタイマーをキャンセル
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }

              // ホバーカード表示（200ms 遅延）
              // マウス位置をキャプチャ（setTimeout内で使うため）
              const hoverMouseX = e.clientX;
              const hoverMouseY = e.clientY;

              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              hoverTimeoutRef.current = setTimeout(() => {
                const ann = annotations.find((a) => a.id === id);
                if (!ann) return;

                // マウス位置ベースで配置（ハイライト下端だと遠くなる場合がある）
                setHoverCardData({
                  annotation: ann,
                  position: {
                    x: clampHoverCardX(hoverMouseX),
                    y: hoverMouseY + 16,
                  },
                });
              }, 200);

              return;
            }
          }
        }

        // フォールバック: コンテナレベルハイライト([data-annotation-id])の検知
        const targetEl = e.target as HTMLElement;
        const containerHighlight = targetEl.closest('[data-annotation-id]') as HTMLElement | null;
        if (containerHighlight) {
          const id = containerHighlight.getAttribute('data-annotation-id')!;
          if (hoveredAnnotation !== id) setHoveredAnnotation(id);

          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }

          // マウス位置をキャプチャ（setTimeout内で使うため）
          const mouseX = e.clientX;
          const mouseY = e.clientY;

          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = setTimeout(() => {
            const ann = annotations.find((a) => a.id === id);
            if (!ann) return;

            // ビューポート座標で位置を計算（position: fixed 用）
            setHoverCardData({
              annotation: ann,
              position: {
                x: clampHoverCardX(mouseX),
                y: mouseY + 12,
              },
            });
          }, 200);

          return;
        }

        // 注釈外
        if (hoveredAnnotation) setHoveredAnnotation(null);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        scheduleCloseCard();
      } catch {
        // ignore
      }
    },
    [hoveredAnnotation, rangeMapRef, annotations, scheduleCloseCard],
  );

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    scheduleCloseCard();
  }, [scheduleCloseCard]);

  // --- Click on highlight or general text ---
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectionPopup || pendingAnnotation) return;
      if ((e.target as HTMLElement).closest('.annotation-hover-card-unified')) return;

      try {
        const caretRange = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (!caretRange) return;

        // 1. 注釈ハイライト上のクリック → 既存ロジック
        for (const [id, ranges] of rangeMapRef.current) {
          for (const range of ranges) {
            if (isCaretInRange(caretRange.startContainer, caretRange.startOffset, range)) {
              selectAnnotation(id);
              const ann = annotations.find((a) => a.id === id);
              if (ann) {
                const editorPos = getEditorPosition(ann);
                if (editorPos) {
                  scrollToEditorLine(editorPos.startLine, id);
                }
              }
              return;
            }
          }
        }

        // 2. コンテナレベルハイライト上のクリック
        const targetEl = e.target as HTMLElement;
        const containerHighlight = targetEl.closest('[data-annotation-id]') as HTMLElement | null;
        if (containerHighlight) {
          const id = containerHighlight.getAttribute('data-annotation-id')!;
          selectAnnotation(id);
          const ann = annotations.find((a) => a.id === id);
          if (ann) {
            const editorPos = getEditorPosition(ann);
            if (editorPos) {
              scrollToEditorLine(editorPos.startLine, id);
            }
          }
          return;
        }

        // 3. 一般テキストクリック → エディタジャンプ（フラッシュ付き）
        const sourceOffset = getSourceOffsetFromNode(caretRange.startContainer, caretRange.startOffset);
        if (sourceOffset != null && content) {
          const pos = computeEditorPositionFromOffset(content, sourceOffset, sourceOffset);
          triggerEditorScroll(pos.startLine);
        }
      } catch {
        // ignore
      }
    },
    [rangeMapRef, selectAnnotation, annotations, scrollToEditorLine, selectionPopup, pendingAnnotation, content],
  );

  // --- Text selection for new annotations ---
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionPopup(null);
      return;
    }

    const container = contentRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!container || !scrollContainer) return;

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    // Compute source offsets from data-s spans
    let srcStart = getSourceOffsetFromNode(range.startContainer, range.startOffset);
    let srcEnd = getSourceOffsetFromNode(range.endContainer, range.endOffset);

    // 両方 null の場合のみコンテナ範囲で解決を試みる
    // （コードブロック・数式ブロック等、[data-s] スパンが存在しない領域）
    if (srcStart == null && srcEnd == null) {
      const containerRange = getContainerSourceRange(range.commonAncestorContainer);
      if (containerRange) {
        // コードブロック: レンダリングテキスト＝ソースなので indexOf で精密マッチ
        const idx = content.indexOf(text, containerRange.start);
        if (idx >= 0 && idx + text.length <= containerRange.end) {
          srcStart = idx;
          srcEnd = idx + text.length;
        } else {
          // 数式ブロック: レンダリング結果≠ソース → デリミタを除去してLaTeX本体のみを注釈対象にする
          let mathStart = containerRange.start;
          let mathEnd = containerRange.end;
          const raw = content.slice(mathStart, mathEnd);

          if (raw.startsWith('$$') && raw.endsWith('$$')) {
            mathStart += 2;
            mathEnd -= 2;
            // $$直後の改行・空白を除去
            while (mathStart < mathEnd && /[\s\n]/.test(content[mathStart])) mathStart++;
            while (mathEnd > mathStart && /[\s\n]/.test(content[mathEnd - 1])) mathEnd--;
          } else if (raw.startsWith('$') && raw.endsWith('$')) {
            mathStart += 1;
            mathEnd -= 1;
            while (mathStart < mathEnd && content[mathStart] === ' ') mathStart++;
            while (mathEnd > mathStart && content[mathEnd - 1] === ' ') mathEnd--;
          }

          // 安全ガード: 除去後に空なら元の範囲を使用
          if (mathStart >= mathEnd) {
            srcStart = containerRange.start;
            srcEnd = containerRange.end;
          } else {
            srcStart = mathStart;
            srcEnd = mathEnd;
          }
        }
      } else {
        // フォールバック: KaTeX 数式の DOM ベース検出
        // data-source-s/e が KaTeX により消された場合でも、
        // MathML annotation から元の LaTeX を抽出してソース位置を特定する
        const mathRange = findMathSourceRange(range.commonAncestorContainer, content);
        if (mathRange) {
          srcStart = mathRange.start;
          srcEnd = mathRange.end;
        }
      }
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = scrollContainer.scrollTop;

    setSelectionPopup({
      text,
      top: rect.top - containerRect.top + scrollTop - 48,
      left: rect.left - containerRect.left + rect.width / 2,
      srcStart,
      srcEnd,
    });
  }, [content]);

  // Dismiss popup on click outside
  useEffect(() => {
    if (!selectionPopup) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ta-selection-popup')) {
        setSelectionPopup(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectionPopup]);

  // --- Type select ---
  const handleTypeSelect = useCallback(
    (type: string) => {
      if (!selectionPopup) return;
      setPendingAnnotation({
        type,
        text: selectionPopup.text,
        srcStart: selectionPopup.srcStart,
        srcEnd: selectionPopup.srcEnd,
      });
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
    },
    [selectionPopup],
  );

  // --- Form submit ---
  const handleFormSubmit = useCallback(
    (formContent: string) => {
      if (!pendingAnnotation || !currentFile || !content) return;

      const { type, text, srcStart, srcEnd } = pendingAnnotation;
      const selectors: AnnotationSelector[] = [];

      if (srcStart != null && srcEnd != null && srcStart < srcEnd) {
        // Source-mapped path: use raw content at source range
        const exact = content.slice(srcStart, srcEnd);
        const prefix = content.slice(Math.max(0, srcStart - 50), srcStart);
        const suffix = content.slice(srcEnd, srcEnd + 50);

        selectors.push({
          type: 'TextQuoteSelector',
          exact,
          prefix: prefix || undefined,
          suffix: suffix || undefined,
        });

        selectors.push({
          type: 'TextPositionSelector',
          start: srcStart,
          end: srcEnd,
        });

        const pos = computeEditorPositionFromOffset(content, srcStart, srcEnd);
        selectors.push({
          type: 'EditorPositionSelector',
          ...pos,
        });
      } else {
        // Fallback: search rendered text in raw content
        const matchIndex = content.indexOf(text);
        if (matchIndex >= 0) {
          const prefix = content.slice(Math.max(0, matchIndex - 50), matchIndex);
          const suffix = content.slice(matchIndex + text.length, matchIndex + text.length + 50);

          selectors.push({
            type: 'TextQuoteSelector',
            exact: text,
            prefix: prefix || undefined,
            suffix: suffix || undefined,
          });
          selectors.push({
            type: 'TextPositionSelector',
            start: matchIndex,
            end: matchIndex + text.length,
          });
          const pos = computeEditorPositionFromOffset(content, matchIndex, matchIndex + text.length);
          selectors.push({ type: 'EditorPositionSelector', ...pos });
        } else {
          selectors.push({ type: 'TextQuoteSelector', exact: text });
        }
      }

      addAnnotation(type as AnnotationType, formContent, { text, selectors });
      setPendingAnnotation(null);
    },
    [pendingAnnotation, currentFile, content, addAnnotation],
  );

  const handleFormCancel = useCallback(() => {
    setPendingAnnotation(null);
  }, []);

  // --- 双方向スクロール同期 ---
  usePreviewScrollSync({
    content,
    scrollSyncEnabled: settings.editor.scrollSync ?? true,
    scrollContainerRef,
    contentRef,
    isScrollingFromEditorRef,
    isScrollingFromPreviewRef,
  });

  // ホバーカード / タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Mermaid コードブロック intercept + 相対パス画像解決
  const markdownComponents = useMemo(
    () => createPreviewMarkdownComponents(currentFile),
    [currentFile],
  );

  if (!currentFile) {
    return (
      <div className="preview-empty">
        <p>プレビュー</p>
      </div>
    );
  }

  return (
    <div className="annotated-preview-wrapper">
      <div className="annotated-preview-header">
        <span>プレビュー</span>
      </div>
      <div className="annotated-preview-scroll" ref={scrollContainerRef}>
        <div
          className="annotated-preview-content"
          ref={contentRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{ cursor: hoveredAnnotation ? 'pointer' : undefined, position: 'relative' }}
        >
          <FrontmatterCard content={content} />
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypePreservePositions, rehypeKatex, rehypePreservePositions, rehypeSourceMap]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>

          {selectionPopup && (
            <SelectionPopup
              onSelect={handleTypeSelect}
              style={{
                position: 'absolute',
                top: selectionPopup.top,
                left: selectionPopup.left,
                transform: 'translateX(-50%)',
                zIndex: 100,
              }}
            />
          )}

          {hoverCardData && (
            <AnnotationHoverCard
              annotation={hoverCardData.annotation}
              position={hoverCardData.position}
              onClose={() => setHoverCardData(null)}
              onSelect={(id) => {
                setHoverCardData(null);
                selectAnnotation(id);
              }}
              onUpdate={(id, updates) => updateAnnotation(id, updates)}
              onResolve={(id, resolved) => resolveAnnotation(id, resolved)}
              onDelete={(id) => {
                deleteAnnotation(id);
                setHoverCardData(null);
              }}
              onAddReply={(id, replyContent) => addReply(id, replyContent)}
              onJumpToEditor={(line, annotationId) => {
                const editorPos = getEditorPosition(hoverCardData.annotation);
                const targetLine = editorPos ? editorPos.startLine : line;
                scrollToEditorLine(targetLine, annotationId);
              }}
              source="preview"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
            />
          )}
        </div>
      </div>

      {pendingAnnotation && (
        <AnnotationForm
          type={pendingAnnotation.type}
          selectedText={pendingAnnotation.text}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <style>{annotatedPreviewStyles}</style>
    </div>
  );
}

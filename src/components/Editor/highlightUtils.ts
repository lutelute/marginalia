// ---------------------------------------------------------------------------
// CSS Custom Highlight API utilities for AnnotatedPreview
// ---------------------------------------------------------------------------
// 注釈ハイライトの描画ロジック（CSS Custom Highlight API + コンテナレベル
// フォールバック）を AnnotatedPreview.tsx から切り出したもの。挙動は不変。

import React, { useLayoutEffect, useRef } from 'react';
import { anchorAnnotation } from '../../utils/selectorUtils';
import { AnnotationV2 } from '../../types/annotations';

// ---------------------------------------------------------------------------
// CSS Custom Highlight API helpers
// ---------------------------------------------------------------------------

export function clearAllHighlights() {
  try {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    CSS.highlights.delete('annotation-comment');
    CSS.highlights.delete('annotation-review');
    CSS.highlights.delete('annotation-pending');
    CSS.highlights.delete('annotation-discussion');
    CSS.highlights.delete('annotation-selected');
    CSS.highlights.delete('annotation-hover');
  } catch {}
}

interface SourceSpanInfo {
  srcStart: number;
  srcEnd: number;
  textNode: Text;
}

// ---------------------------------------------------------------------------
// Text matching helper for code blocks
// ---------------------------------------------------------------------------
// Creates a CSS Highlight API Range by finding searchText within an element's
// text content. Used when [data-s] spans are unavailable (e.g. after rehypeRaw).

function createRangeForTextMatch(el: HTMLElement, searchText: string): Range | null {
  if (!searchText) return null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let fullText = '';

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
    fullText += (walker.currentNode as Text).textContent || '';
  }

  const matchIdx = fullText.indexOf(searchText);
  if (matchIdx < 0) return null;

  let currentPos = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const node of textNodes) {
    const nodeLen = node.length;
    if (!startNode && currentPos + nodeLen > matchIdx) {
      startNode = node;
      startOffset = matchIdx - currentPos;
    }
    if (startNode && currentPos + nodeLen >= matchIdx + searchText.length) {
      endNode = node;
      endOffset = matchIdx + searchText.length - currentPos;
      break;
    }
    currentPos += nodeLen;
  }

  if (!startNode || !endNode) return null;

  try {
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOffset, startNode.length));
    range.setEnd(endNode, Math.min(endOffset, endNode.length));
    return range;
  } catch {
    return null;
  }
}

export function usePreviewHighlights(
  containerRef: React.RefObject<HTMLElement | null>,
  annotations: AnnotationV2[],
  content: string,
  selectedAnnotation: string | null,
  hoveredAnnotation: string | null,
) {
  const rangeMapRef = useRef(new Map<string, Range[]>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !content) return;

    const hasAPI = typeof CSS !== 'undefined' && 'highlights' in CSS;
    if (!hasAPI) return;

    clearAllHighlights();

    // Collect all source-mapped spans ([data-s])
    const spanEls = container.querySelectorAll<HTMLElement>('[data-s]');
    const spanInfos: SourceSpanInfo[] = [];
    for (const el of spanEls) {
      const s = parseInt(el.dataset.s || '', 10);
      const e = parseInt(el.dataset.e || '', 10);
      if (isNaN(s) || isNaN(e)) continue;
      const textNode = el.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
      spanInfos.push({ srcStart: s, srcEnd: e, textNode: textNode as Text });
    }
    spanInfos.sort((a, b) => a.srcStart - b.srcStart);

    // Collect container elements with preserved positions ([data-source-s])
    const containerEls = container.querySelectorAll<HTMLElement>('[data-source-s]');

    const rangesByType = new Map<string, Range[]>();
    const selectedRanges: Range[] = [];
    const hoveredRanges: Range[] = [];
    const newRangeMap = new Map<string, Range[]>();

    const activeAnns = annotations.filter((a) => a.status === 'active');

    for (const ann of activeAnns) {
      const anchor = anchorAnnotation(content, ann);
      if (!anchor) continue;

      const { start: annStart, end: annEnd } = anchor;
      const ranges: Range[] = [];

      // --- パス1: [data-s] スパンによる精密ハイライト ---
      for (const si of spanInfos) {
        if (si.srcStart >= annEnd) break;
        if (si.srcEnd <= annStart) continue;

        const overlapStart = Math.max(annStart, si.srcStart) - si.srcStart;
        const overlapEnd = Math.min(annEnd, si.srcEnd) - si.srcStart;
        const textLen = si.textNode.length;
        const clampedStart = Math.min(overlapStart, textLen);
        const clampedEnd = Math.min(overlapEnd, textLen);
        if (clampedStart >= clampedEnd) continue;

        try {
          const range = document.createRange();
          range.setStart(si.textNode, clampedStart);
          range.setEnd(si.textNode, clampedEnd);
          ranges.push(range);
        } catch {
          // skip invalid ranges
        }
      }

      // --- パス2: [data-s] で見つからない場合、コンテナ内テキストマッチング ---
      // コードブロック等で rehypeRaw が position を消した場合のフォールバック
      if (ranges.length === 0) {
        for (const el of containerEls) {
          const cS = parseInt(el.dataset.sourceS || '', 10);
          const cE = parseInt(el.dataset.sourceE || '', 10);
          if (isNaN(cS) || isNaN(cE)) continue;
          if (cS >= annEnd || cE <= annStart) continue;

          // コードブロック (<pre>) の場合: テキストマッチングで精密Range作成
          if (el.tagName === 'PRE') {
            const codeEl = el.querySelector('code') || el;
            const overlapStart = Math.max(annStart, cS);
            const overlapEnd = Math.min(annEnd, cE);
            const overlapText = content.slice(overlapStart, overlapEnd);

            let range = createRangeForTextMatch(codeEl as HTMLElement, overlapText);
            if (!range && overlapText.trim()) {
              range = createRangeForTextMatch(codeEl as HTMLElement, overlapText.trim());
            }
            if (range) {
              ranges.push(range);
              break;
            }
          }
        }
      }

      if (ranges.length > 0) {
        newRangeMap.set(ann.id, ranges);

        if (ann.id === selectedAnnotation) {
          selectedRanges.push(...ranges);
        } else if (ann.id === hoveredAnnotation) {
          hoveredRanges.push(...ranges);
        } else {
          const key = `annotation-${ann.type}`;
          if (!rangesByType.has(key)) rangesByType.set(key, []);
          rangesByType.get(key)!.push(...ranges);
        }
      }
    }

    rangeMapRef.current = newRangeMap;

    try {
      for (const [name, ranges] of rangesByType) {
        if (ranges.length > 0) {
          const hl = new window.Highlight(...ranges);
          hl.priority = 0;
          CSS.highlights.set(name, hl);
        }
      }
      if (hoveredRanges.length > 0) {
        const hl = new window.Highlight(...hoveredRanges);
        hl.priority = 1;
        CSS.highlights.set('annotation-hover', hl);
      }
      if (selectedRanges.length > 0) {
        const hl = new window.Highlight(...selectedRanges);
        hl.priority = 2;
        CSS.highlights.set('annotation-selected', hl);
      }
    } catch (e) {
      console.warn('Failed to set CSS highlights:', e);
    }

    // --- パス3: コンテナレベルハイライト ---
    // CSS Highlight API でカバーできなかった注釈（数式ブロック等）に対し、
    // 最も内側の [data-source-s] コンテナ要素にデータ属性を付与する
    const highlightedAnnIds = new Set<string>();

    for (const ann of activeAnns) {
      if (newRangeMap.has(ann.id)) continue; // CSS Highlight でカバー済み

      const anchor = anchorAnnotation(content, ann);
      if (!anchor) continue;

      const { start: annStart, end: annEnd } = anchor;

      // 内側のコンテナを優先（querySelectorAll はDOM順なので子が後に来る）
      // → 逆順に走査して最も内側を見つける
      for (let i = containerEls.length - 1; i >= 0; i--) {
        const el = containerEls[i];
        const cS = parseInt(el.dataset.sourceS || '', 10);
        const cE = parseInt(el.dataset.sourceE || '', 10);
        if (isNaN(cS) || isNaN(cE)) continue;
        if (cS >= annEnd || cE <= annStart) continue;

        // 親コンテナが既にマーク済みならスキップ（内側を優先）
        if (el.querySelector('[data-annotation-id="' + ann.id + '"]')) continue;

        el.setAttribute('data-annotation-highlight', ann.type);
        el.setAttribute('data-annotation-id', ann.id);
        if (ann.id === selectedAnnotation) {
          el.setAttribute('data-annotation-highlight-selected', '');
        } else if (ann.id === hoveredAnnotation) {
          el.setAttribute('data-annotation-highlight-hover', '');
        }
        highlightedAnnIds.add(ann.id);
        break; // 最も内側のコンテナのみにマーク
      }
    }

    // --- パス4: KaTeX 数式要素のハイライト ---
    // data-source-s/e が KaTeX によって消された場合のフォールバック。
    // MathML annotation から元の LaTeX を抽出し、注釈のソース範囲とマッチさせる。
    const katexEls = container.querySelectorAll('.katex');
    for (const ann of activeAnns) {
      if (newRangeMap.has(ann.id)) continue;
      if (highlightedAnnIds.has(ann.id)) continue;

      const anchor = anchorAnnotation(content, ann);
      if (!anchor) continue;

      const exactText = content.slice(anchor.start, anchor.end);

      for (const katexEl of katexEls) {
        const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
        if (!annotation?.textContent) continue;
        const latex = annotation.textContent.trim();

        if (latex === exactText || latex.includes(exactText) || exactText.includes(latex)) {
          // KaTeX の親コンテナ（.katex-display or math span）にハイライトを適用
          const mathContainer = (katexEl.closest('.katex-display') || katexEl.parentElement || katexEl) as HTMLElement;
          mathContainer.setAttribute('data-annotation-highlight', ann.type);
          mathContainer.setAttribute('data-annotation-id', ann.id);
          if (ann.id === selectedAnnotation) {
            mathContainer.setAttribute('data-annotation-highlight-selected', '');
          } else if (ann.id === hoveredAnnotation) {
            mathContainer.setAttribute('data-annotation-highlight-hover', '');
          }
          highlightedAnnIds.add(ann.id);
          break;
        }
      }
    }

    return () => {
      clearAllHighlights();
      // コンテナレベルハイライトの除去
      const highlighted = container.querySelectorAll<HTMLElement>('[data-annotation-highlight]');
      for (const el of highlighted) {
        el.removeAttribute('data-annotation-highlight');
        el.removeAttribute('data-annotation-id');
        el.removeAttribute('data-annotation-highlight-selected');
        el.removeAttribute('data-annotation-highlight-hover');
      }
    };
  }, [containerRef, annotations, content, selectedAnnotation, hoveredAnnotation]);

  return rangeMapRef;
}

// ---------------------------------------------------------------------------
// Hover detection
// ---------------------------------------------------------------------------

export function isCaretInRange(caretNode: Node, caretOffset: number, range: Range): boolean {
  try {
    const testRange = document.createRange();
    testRange.setStart(caretNode, caretOffset);
    testRange.setEnd(caretNode, caretOffset);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, testRange) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, testRange) >= 0
    );
  } catch {
    return false;
  }
}

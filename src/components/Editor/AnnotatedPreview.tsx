import React, { useLayoutEffect, useCallback, useRef, useState, useEffect, useMemo } from 'react';
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
  anchorAnnotation,
  computeEditorPositionFromOffset,
  getEditorPosition,
} from '../../utils/selectorUtils';
import { AnnotationV2, AnnotationType, AnnotationSelector } from '../../types/annotations';
import { ANNOTATION_TYPE_CONFIGS } from '../../constants/annotationTypes';
import AnnotationHoverCard from '../Annotations/AnnotationHoverCard';
import { setEditorScrollCallback, triggerEditorScroll, triggerScrollSync } from './MarkdownEditor';
import FrontmatterCard from './FrontmatterCard';
import MermaidBlock from './MermaidBlock';

// ---------------------------------------------------------------------------
// Rehype Preserve Positions Plugin
// ---------------------------------------------------------------------------
// Runs BEFORE AND AFTER rehypeKatex to save element position info as data attributes.
// 1回目: KaTeX前にソース位置を保存
// 2回目: KaTeX後に再適用（KaTeXがプロパティを上書きした場合のリカバリ）

function rehypePreservePositions() {
  return (tree: any) => {
    walkHastElements(tree);
  };
}

function walkHastElements(node: any) {
  if (
    node.type === 'element' &&
    node.position?.start?.offset != null &&
    node.position?.end?.offset != null
  ) {
    if (!node.properties) node.properties = {};
    node.properties['data-source-s'] = String(node.position.start.offset);
    node.properties['data-source-e'] = String(node.position.end.offset);
  }
  if (node.children) {
    for (const child of node.children) {
      walkHastElements(child);
    }
  }
}

// ---------------------------------------------------------------------------
// Rehype Source Map Plugin
// ---------------------------------------------------------------------------
// Wraps HAST text nodes in <span data-s="offset" data-e="offset"> to preserve
// source markdown character positions in the rendered DOM.

function rehypeSourceMap() {
  return (tree: any) => {
    walkHast(tree);
  };
}

function walkHast(node: any) {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (
      child.type === 'text' &&
      child.position?.start?.offset != null &&
      child.position?.end?.offset != null
    ) {
      node.children[i] = {
        type: 'element',
        tagName: 'span',
        properties: {
          'data-s': String(child.position.start.offset),
          'data-e': String(child.position.end.offset),
        },
        children: [{ type: 'text', value: child.value }],
      };
    } else if (child.children) {
      walkHast(child);
    }
  }
}

// ---------------------------------------------------------------------------
// Source offset from DOM position
// ---------------------------------------------------------------------------

function getSourceOffsetFromNode(
  node: Node,
  charOffset: number,
): number | null {
  // [data-s] スパンから正確なソースオフセットを算出
  // 祖先走査は行わない（コードブロック等で null を返し、呼び出し元のフォールバックに任せる）
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (parent?.dataset?.s != null) {
      const srcStart = parseInt(parent.dataset.s, 10);
      return isNaN(srcStart) ? null : srcStart + charOffset;
    }
  } else if (node instanceof HTMLElement && node.dataset?.s != null) {
    const srcStart = parseInt(node.dataset.s, 10);
    return isNaN(srcStart) ? null : srcStart + charOffset;
  }
  return null;
}

// コンテナの [data-source-s]/[data-source-e] 範囲を取得
function getContainerSourceRange(node: Node): { start: number; end: number } | null {
  let el = node instanceof HTMLElement ? node : node.parentElement;
  while (el) {
    if (el.dataset?.sourceS != null && el.dataset?.sourceE != null) {
      const s = parseInt(el.dataset.sourceS, 10);
      const e = parseInt(el.dataset.sourceE, 10);
      if (!isNaN(s) && !isNaN(e)) return { start: s, end: e };
    }
    if (el.classList?.contains('annotated-preview-content')) break;
    el = el.parentElement;
  }
  return null;
}

// ---------------------------------------------------------------------------
// KaTeX math source detection
// ---------------------------------------------------------------------------
// KaTeX の MathML annotation 要素から元の LaTeX ソースを抽出し、
// マークダウンソース内での位置を特定する。
// data-source-s/e が KaTeX によって消された場合のフォールバック。

function findMathSourceRange(node: Node, content: string): { start: number; end: number } | null {
  let el = node instanceof HTMLElement ? node : node.parentElement;
  if (!el) return null;

  // .katex 祖先を探す
  const katexEl = el.closest('.katex');
  if (!katexEl) return null;

  // MathML annotation から元の LaTeX を取得
  const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
  if (!annotation?.textContent) return null;

  const latex = annotation.textContent.trim();
  if (!latex) return null;

  return findLatexInSource(latex, content);
}

function findLatexInSource(latex: string, content: string): { start: number; end: number } | null {
  // ブロック数式 $$...$$ を検索
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    if (match[1].trim() === latex) {
      const inner = match[1];
      const trimOffset = inner.indexOf(inner.trim());
      const start = match.index + 2 + trimOffset;
      return { start, end: start + latex.length };
    }
  }

  // インライン数式 $...$ を検索
  const inlineRegex = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    if (match[1].trim() === latex) {
      const inner = match[1];
      const trimOffset = inner.indexOf(inner.trim());
      const start = match.index + 1 + trimOffset;
      return { start, end: start + latex.length };
    }
  }

  // 直接検索（最終フォールバック）
  const idx = content.indexOf(latex);
  if (idx >= 0) {
    return { start: idx, end: idx + latex.length };
  }

  return null;
}

// ---------------------------------------------------------------------------
// CSS Custom Highlight API helpers
// ---------------------------------------------------------------------------

function clearAllHighlights() {
  try {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    (CSS as any).highlights.delete('annotation-comment');
    (CSS as any).highlights.delete('annotation-review');
    (CSS as any).highlights.delete('annotation-pending');
    (CSS as any).highlights.delete('annotation-discussion');
    (CSS as any).highlights.delete('annotation-selected');
    (CSS as any).highlights.delete('annotation-hover');
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

function usePreviewHighlights(
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
          const hl = new (window as any).Highlight(...ranges);
          hl.priority = 0;
          (CSS as any).highlights.set(name, hl);
        }
      }
      if (hoveredRanges.length > 0) {
        const hl = new (window as any).Highlight(...hoveredRanges);
        hl.priority = 1;
        (CSS as any).highlights.set('annotation-hover', hl);
      }
      if (selectedRanges.length > 0) {
        const hl = new (window as any).Highlight(...selectedRanges);
        hl.priority = 2;
        (CSS as any).highlights.set('annotation-selected', hl);
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

function isCaretInRange(caretNode: Node, caretOffset: number, range: Range): boolean {
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

// ---------------------------------------------------------------------------
// SelectionPopup
// ---------------------------------------------------------------------------

function SelectionPopup({
  onSelect,
  style,
}: {
  onSelect: (type: string) => void;
  style: React.CSSProperties;
}) {
  return (
    <div className="ta-selection-popup" style={style} onMouseDown={(e) => e.preventDefault()}>
      {ANNOTATION_TYPE_CONFIGS.map((type) => (
        <button
          key={type.id}
          className="ta-popup-btn"
          style={{ backgroundColor: type.cssVar }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(type.id);
          }}
          title={type.label}
        >
          <span>{type.icon}</span>
          <span className="ta-popup-label">{type.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnnotationForm
// ---------------------------------------------------------------------------

function AnnotationForm({
  type,
  selectedText,
  onSubmit,
  onCancel,
}: {
  type: string;
  selectedText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = React.useState('');
  const typeInfo = ANNOTATION_TYPE_CONFIGS.find((t) => t.id === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) onSubmit(content);
  };

  return (
    <div className="ta-form-overlay" onClick={onCancel}>
      <form className="ta-form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="ta-form-header">
          <span style={{ backgroundColor: typeInfo?.cssVar }}>
            {typeInfo?.icon} {typeInfo?.label}
          </span>
        </div>
        <div className="ta-form-text">
          &ldquo;{selectedText.slice(0, 100)}
          {selectedText.length > 100 ? '...' : ''}&rdquo;
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="注釈を入力..."
          rows={4}
          autoFocus
        />
        <div className="ta-form-actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" disabled={!content.trim()}>
            追加
          </button>
        </div>
      </form>
    </div>
  );
}

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
                const cardWidth = 320;
                let hoverX = hoverMouseX - cardWidth / 2;
                hoverX = Math.max(8, Math.min(hoverX, window.innerWidth - cardWidth - 8));

                setHoverCardData({
                  annotation: ann,
                  position: {
                    x: hoverX,
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
            const cardWidth = 320;
            let hoverX2 = mouseX - cardWidth / 2;
            hoverX2 = Math.max(8, Math.min(hoverX2, window.innerWidth - cardWidth - 8));

            setHoverCardData({
              annotation: ann,
              position: {
                x: hoverX2,
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
    const scrollSyncEnabled = settings.editor.scrollSync ?? true;
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
  }, [settings.editor.scrollSync, lineToOffset]);

  // (B) プレビュー→エディタ: プレビュースクロール時にエディタを追従
  useEffect(() => {
    const scrollSyncEnabled = settings.editor.scrollSync ?? true;
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
  }, [settings.editor.scrollSync, offsetToLine]);

  // ホバーカード / タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Mermaid コードブロック intercept
  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match?.[1] === 'mermaid') {
        return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
    img({ src, alt, ...props }: any) {
      const resolvedSrc = (() => {
        if (!src) return src;
        // http/https/data URI はそのまま
        if (/^(https?:|data:)/.test(src)) return src;
        // currentFile の親ディレクトリから相対パスを解決
        if (!currentFile) return src;
        const dir = currentFile.substring(0, currentFile.lastIndexOf('/'));
        const cleanSrc = src.replace(/^\.\//, '');
        const absolutePath = dir + '/' + cleanSrc;
        return 'local-file://' + absolutePath;
      })();

      return (
        <img
          src={resolvedSrc}
          alt={alt}
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.style.cssText = 'display:inline-block;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-muted);font-size:12px';
            fallback.textContent = `🖼️ ${alt || src || '画像を読み込めません'}`;
            target.parentNode?.insertBefore(fallback, target.nextSibling);
          }}
          {...props}
        />
      );
    },
  }), [currentFile]);

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

      <style>{`
        .annotated-preview-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          min-width: 0;
          background: var(--bg-primary);
          position: relative;
        }

        .annotated-preview-header {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .annotated-preview-scroll {
          flex: 1;
          overflow-y: auto;
          min-width: 0;
        }

        .annotated-preview-content {
          padding: 32px 40px;
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-primary);
          max-width: 100%;
        }

        /* source-map spans: invisible wrappers */
        .annotated-preview-content span[data-s] {
          /* no visual effect – purely for source position tracking */
        }

        .preview-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary);
        }

        /* CSS Custom Highlight API styles */
        ::highlight(annotation-comment) {
          background-color: color-mix(in srgb, var(--comment-color) 20%, transparent);
        }

        ::highlight(annotation-review) {
          background-color: color-mix(in srgb, var(--review-color) 20%, transparent);
        }

        ::highlight(annotation-pending) {
          background-color: color-mix(in srgb, var(--pending-color) 20%, transparent);
        }

        ::highlight(annotation-discussion) {
          background-color: color-mix(in srgb, var(--discussion-color) 20%, transparent);
        }

        ::highlight(annotation-selected) {
          background-color: color-mix(in srgb, var(--accent-color) 40%, transparent);
        }

        ::highlight(annotation-hover) {
          background-color: color-mix(in srgb, var(--accent-color) 25%, transparent);
        }

        /* Container-level highlights for math blocks, etc. */
        [data-annotation-highlight] {
          border-radius: 4px;
          padding: 2px 4px;
          transition: background-color 0.15s, box-shadow 0.15s;
        }
        [data-annotation-highlight="comment"] {
          background-color: color-mix(in srgb, var(--comment-color) 15%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--comment-color) 40%, transparent);
        }
        [data-annotation-highlight="review"] {
          background-color: color-mix(in srgb, var(--review-color) 15%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--review-color) 40%, transparent);
        }
        [data-annotation-highlight="pending"] {
          background-color: color-mix(in srgb, var(--pending-color) 15%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--pending-color) 40%, transparent);
        }
        [data-annotation-highlight="discussion"] {
          background-color: color-mix(in srgb, var(--discussion-color) 15%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--discussion-color) 40%, transparent);
        }
        [data-annotation-highlight-selected] {
          background-color: color-mix(in srgb, var(--accent-color) 20%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 60%, transparent);
        }
        [data-annotation-highlight-hover] {
          background-color: color-mix(in srgb, var(--accent-color) 15%, transparent);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent-color) 40%, transparent);
        }

        /* ======= Markdown element styles ======= */

        /* --- Headings --- */
        .annotated-preview-content h1 {
          font-size: 1.8em;
          font-weight: 700;
          margin: 1.4em 0 0.6em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }
        .annotated-preview-content h2 {
          font-size: 1.45em;
          font-weight: 700;
          margin: 1.2em 0 0.5em;
          padding-bottom: 0.25em;
          border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
          color: var(--text-primary);
        }
        .annotated-preview-content h3 {
          font-size: 1.2em;
          font-weight: 600;
          margin: 1em 0 0.4em;
          color: var(--text-primary);
        }
        .annotated-preview-content h4,
        .annotated-preview-content h5,
        .annotated-preview-content h6 {
          font-size: 1em;
          font-weight: 600;
          margin: 0.8em 0 0.3em;
          color: var(--text-secondary);
        }

        /* --- Paragraphs --- */
        .annotated-preview-content p {
          margin: 0.6em 0;
        }

        /* --- Links --- */
        .annotated-preview-content a {
          color: var(--accent-color);
          text-decoration: none;
        }
        .annotated-preview-content a:hover {
          text-decoration: underline;
        }

        /* --- Inline code --- */
        .annotated-preview-content code:not(pre code) {
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 0.15em 0.4em;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace;
          font-size: 0.88em;
          color: color-mix(in srgb, var(--accent-color) 80%, var(--text-primary));
        }

        /* --- Code blocks --- */
        .annotated-preview-content pre {
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px 20px;
          margin: 1em 0;
          overflow-x: auto;
          font-size: 0.88em;
          line-height: 1.55;
        }
        .annotated-preview-content pre code {
          background: none;
          border: none;
          padding: 0;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace;
          font-size: inherit;
          color: var(--text-primary);
        }

        /* --- Blockquotes --- */
        .annotated-preview-content blockquote {
          margin: 1em 0;
          padding: 0.6em 1em;
          border-left: 4px solid var(--accent-color);
          background-color: color-mix(in srgb, var(--accent-color) 6%, transparent);
          border-radius: 0 6px 6px 0;
          color: var(--text-secondary);
        }
        .annotated-preview-content blockquote p {
          margin: 0.3em 0;
        }

        /* --- Tables --- */
        .annotated-preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          font-size: 0.92em;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }
        .annotated-preview-content thead th {
          background-color: var(--bg-tertiary);
          font-weight: 600;
          text-align: left;
          padding: 10px 14px;
          border-bottom: 2px solid var(--border-color);
          color: var(--text-primary);
        }
        .annotated-preview-content tbody td {
          padding: 8px 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
          color: var(--text-primary);
        }
        .annotated-preview-content tbody tr:last-child td {
          border-bottom: none;
        }
        .annotated-preview-content tbody tr:hover {
          background-color: color-mix(in srgb, var(--accent-color) 4%, transparent);
        }

        /* --- Horizontal rules --- */
        .annotated-preview-content hr {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 2em 0;
        }

        /* --- Lists --- */
        .annotated-preview-content ul,
        .annotated-preview-content ol {
          margin: 0.6em 0;
          padding-left: 1.8em;
        }
        .annotated-preview-content li {
          margin: 0.25em 0;
        }
        .annotated-preview-content li > p {
          margin: 0.2em 0;
        }

        /* Task lists (GFM) */
        .annotated-preview-content ul.contains-task-list {
          list-style: none;
          padding-left: 0.5em;
        }
        .annotated-preview-content .task-list-item {
          display: flex;
          align-items: baseline;
          gap: 0.5em;
        }
        .annotated-preview-content .task-list-item input[type="checkbox"] {
          accent-color: var(--accent-color);
          margin: 0;
        }

        /* --- Images --- */
        .annotated-preview-content img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 0.8em 0;
        }

        /* --- Math (KaTeX) --- */
        .annotated-preview-content .katex-display {
          margin: 1em 0;
          padding: 12px 16px;
          background-color: color-mix(in srgb, var(--bg-tertiary) 60%, transparent);
          border-radius: 8px;
          overflow-x: auto;
        }
        .annotated-preview-content .katex {
          font-size: 1.1em;
        }

        /* --- Strong / Em --- */
        .annotated-preview-content strong {
          font-weight: 700;
          color: var(--text-primary);
        }
        .annotated-preview-content em {
          font-style: italic;
        }

        /* --- Strikethrough --- */
        .annotated-preview-content del {
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .ta-selection-popup {
          display: flex;
          gap: 4px;
          padding: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .ta-popup-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          color: white;
          font-size: 14px;
        }

        .ta-popup-btn:hover {
          opacity: 0.9;
          transform: scale(1.05);
        }

        .ta-popup-label {
          font-size: 10px;
        }

        .ta-form-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 60px;
          z-index: 200;
        }

        .ta-form {
          background: var(--bg-secondary);
          padding: 20px;
          border-radius: 8px;
          width: 360px;
          max-width: 90%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        .ta-form-header {
          margin-bottom: 12px;
        }

        .ta-form-header span {
          padding: 4px 10px;
          border-radius: 4px;
          color: white;
          font-size: 13px;
        }

        .ta-form-text {
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
          margin-bottom: 12px;
          max-height: 60px;
          overflow-y: auto;
        }

        .ta-form textarea {
          width: 100%;
          min-height: 80px;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
          margin-bottom: 12px;
          resize: vertical;
        }

        .ta-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .ta-form-actions button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 13px;
        }

        .ta-form-actions button[type="button"] {
          background: transparent;
          color: var(--text-secondary);
        }

        .ta-form-actions button[type="submit"] {
          background: var(--accent-color);
          color: white;
        }

        .ta-form-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

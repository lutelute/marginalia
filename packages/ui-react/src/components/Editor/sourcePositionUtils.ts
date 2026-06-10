// ---------------------------------------------------------------------------
// Source position utilities for AnnotatedPreview
// ---------------------------------------------------------------------------
// ソース位置（data-source-s/e, data-s/e）の保存・復元、DOM位置からソース
// オフセットへの変換、KaTeX 数式の LaTeX ソース検出を担う。
// AnnotatedPreview.tsx から切り出した純粋ロジック（挙動は不変）。

// ---------------------------------------------------------------------------
// Rehype Preserve Positions Plugin
// ---------------------------------------------------------------------------
// Runs BEFORE AND AFTER rehypeKatex to save element position info as data attributes.
// 1回目: KaTeX前にソース位置を保存
// 2回目: KaTeX後に再適用（KaTeXがプロパティを上書きした場合のリカバリ）

export function rehypePreservePositions() {
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

export function rehypeSourceMap() {
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

export function getSourceOffsetFromNode(
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
export function getContainerSourceRange(node: Node): { start: number; end: number } | null {
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

export function findMathSourceRange(node: Node, content: string): { start: number; end: number } | null {
  const el = node instanceof HTMLElement ? node : node.parentElement;
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

export function findLatexInSource(latex: string, content: string): { start: number; end: number } | null {
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

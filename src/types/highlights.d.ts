// ---------------------------------------------------------------------------
// CSS Custom Highlight API ambient declarations
// ---------------------------------------------------------------------------
// 型のみの宣言。ランタイム挙動には影響しない。
// `(CSS as any).highlights` / `(window as any).Highlight` の型を解消するため、
// 最小限のアンビエント宣言を提供する。

interface Highlight {
  priority: number;
}

interface HighlightConstructor {
  new (...ranges: Range[]): Highlight;
}

interface HighlightRegistry {
  set(name: string, highlight: Highlight): void;
  delete(name: string): boolean;
  clear(): void;
}

interface Window {
  Highlight: HighlightConstructor;
}

interface CSS {
  highlights: HighlightRegistry;
}

// `CSS` はグローバル名前空間ではオブジェクトとして参照される。
// `'highlights' in CSS` / `CSS.highlights` を型安全に扱えるようにする。
declare namespace CSS {
  const highlights: HighlightRegistry;
}

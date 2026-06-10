// ---------------------------------------------------------------------------
// ReactMarkdown renderer components for AnnotatedPreview
// ---------------------------------------------------------------------------
// mermaid コードブロックのインターセプトと、相対パス画像の解決を担う
// レンダラ群。AnnotatedPreview.tsx から切り出したもの（挙動・見た目は不変）。
// currentFile に依存するため、ファクトリ関数として提供する。

import MermaidBlock from './MermaidBlock';

export function createPreviewMarkdownComponents(currentFile: string | null) {
  return {
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
  };
}

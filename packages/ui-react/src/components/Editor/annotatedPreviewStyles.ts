// ---------------------------------------------------------------------------
// AnnotatedPreview inline styles
// ---------------------------------------------------------------------------
// AnnotatedPreview.tsx のインライン <style> を文字列定数として外出ししたもの。
// 本体は <style>{annotatedPreviewStyles}</style> として1回だけ描画する。
// CSS の内容は不変。

export const annotatedPreviewStyles = `
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
      `;

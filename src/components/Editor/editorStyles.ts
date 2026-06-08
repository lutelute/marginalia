// MarkdownEditor 関連のインライン <style> 文字列定数

export const SELECTION_POPUP_STYLES = `
        .editor-selection-popup {
          position: absolute;
          display: flex;
          gap: 8px;
          padding: 12px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 100;
          transform: translateX(-50%);
          animation: popupFadeIn 0.15s ease-out;
        }

        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .editor-selection-popup .popup-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 18px;
          border-radius: 10px;
          transition: all 0.2s;
          min-width: 70px;
        }

        .editor-selection-popup .popup-btn:hover {
          background-color: var(--btn-color);
          color: white;
          transform: scale(1.05);
        }

        .editor-selection-popup .popup-icon {
          font-size: 24px;
        }

        .editor-selection-popup .popup-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .editor-selection-popup .popup-btn:hover .popup-label {
          color: white;
        }
      `;

export const ANNOTATION_FORM_STYLES = `
        .editor-annotation-form-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }

        .editor-annotation-form {
          width: 90%;
          max-width: 400px;
          background-color: var(--bg-secondary);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .editor-annotation-form .form-header {
          margin-bottom: 12px;
        }

        .editor-annotation-form .form-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          color: white;
        }

        .editor-annotation-form .form-selected-text {
          padding: 8px 12px;
          background-color: var(--bg-tertiary);
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
          margin-bottom: 12px;
          max-height: 60px;
          overflow-y: auto;
        }

        .editor-annotation-form textarea {
          width: 100%;
          margin-bottom: 12px;
          min-height: 80px;
        }

        .editor-annotation-form .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .editor-annotation-form .cancel-btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .editor-annotation-form .cancel-btn:hover {
          background-color: var(--bg-hover);
        }

        .editor-annotation-form .submit-btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          background-color: var(--accent-color);
          color: white;
        }

        .editor-annotation-form .submit-btn:hover:not(:disabled) {
          background-color: var(--accent-hover);
        }
      `;

export const EDITOR_EMPTY_STYLES = `
          .editor-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-secondary);
            font-size: 14px;
          }
        `;

export const MARKDOWN_EDITOR_STYLES = `
        .markdown-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background-color: var(--bg-primary);
          min-width: 0;
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .editor-header.compact-header {
          padding: 2px 8px;
          background-color: var(--bg-tertiary);
        }

        .editor-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .editor-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .export-menu-wrapper {
          position: relative;
        }

        .export-btn {
          padding: 4px 10px;
          font-size: 12px;
          color: var(--text-secondary);
          border-radius: 4px;
          transition: all 0.15s;
        }

        .export-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 100;
          overflow: hidden;
        }

        .export-menu button {
          display: block;
          width: 100%;
          padding: 8px 16px;
          text-align: left;
          font-size: 12px;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .export-menu button:hover {
          background-color: var(--bg-hover);
        }

        /* ツールバー */
        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px 8px;
          background-color: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
        }

        .toolbar-btn {
          padding: 4px 8px;
          min-width: 28px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 4px;
          transition: all 0.15s;
        }

        .toolbar-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .toolbar-divider {
          width: 1px;
          height: 20px;
          background-color: var(--border-color);
          margin: 0 4px;
        }

        .file-name {
          font-size: 13px;
          color: var(--text-primary);
        }

        .modified-indicator {
          color: var(--accent-color);
          margin-left: 6px;
        }

        .metadata-btn {
          padding: 4px;
          border-radius: 4px;
          color: var(--text-muted);
          transition: all 0.15s;
        }

        .metadata-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .metadata-btn svg {
          width: 14px;
          height: 14px;
        }

        .metadata-popup {
          background-color: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
          padding: 12px 16px;
          font-size: 12px;
        }

        .metadata-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .metadata-label {
          color: var(--text-muted);
        }

        .metadata-value {
          color: var(--text-primary);
          font-family: monospace;
        }

        .metadata-path {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border-color);
        }

        .metadata-path .metadata-label {
          display: block;
          margin-bottom: 4px;
        }

        .metadata-value.path {
          display: block;
          word-break: break-all;
          font-size: 10px;
          color: var(--text-secondary);
        }

        .save-btn {
          padding: 4px 12px;
          background-color: var(--accent-color);
          color: white;
          border-radius: 4px;
          font-size: 12px;
          transition: all 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background-color: var(--accent-hover);
        }

        .save-btn:disabled {
          background-color: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .editor-main-area {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
          min-width: 0;
          width: 100%;
        }

        .editor-container {
          flex: 1;
          overflow: hidden;
          position: relative;
          min-width: 0;
          width: 100%;
        }

        .editor-container .cm-editor {
          height: 100%;
        }

        /* 注釈ハイライトスタイル */
        .cm-annotation-highlight {
          background-color: color-mix(in srgb, var(--highlight-color) 25%, transparent);
          border-bottom: 2px solid var(--highlight-color);
          border-radius: 2px;
        }
        .cm-annotation-comment { --highlight-color: var(--comment-color); }
        .cm-annotation-review { --highlight-color: var(--review-color); }
        .cm-annotation-pending { --highlight-color: var(--pending-color); }
        .cm-annotation-discussion { --highlight-color: var(--discussion-color); }

        /* フラッシュハイライト */
        .cm-flash-highlight {
          background-color: color-mix(in srgb, var(--accent-color) 35%, transparent) !important;
          animation: flash-fade 2.5s ease-out;
        }

        @keyframes flash-fade {
          0% { background-color: color-mix(in srgb, var(--accent-color) 35%, transparent); }
          100% { background-color: transparent; }
        }
      `;

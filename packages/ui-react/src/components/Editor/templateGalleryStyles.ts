// Global stylesheet for the Template Gallery family of components.
// Kept as a single string so the host component renders exactly one <style> element
// (identical runtime behavior to the previous inline block).

export const templateGalleryStyles = `
        .template-gallery-container {
          height: 100%;
          overflow-y: auto;
          padding: 20px;
          background-color: var(--bg-primary);
        }
        .template-gallery-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .template-gallery-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .template-gallery-count {
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .tg-create-btn {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid var(--accent-color);
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        }
        .tg-create-btn:hover {
          background: var(--accent-hover);
        }
        .tg-header-actions {
          display: flex;
          gap: 4px;
          margin-left: 8px;
        }
        .tg-header-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-header-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .tg-filter-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
        }
        .tg-filter-btn {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }
        .tg-filter-btn.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .tg-filter-btn:hover:not(.active) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .template-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .template-gallery-card {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-secondary);
          transition: all 0.2s;
        }
        .template-gallery-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .template-gallery-card.selected {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
        }
        .template-gallery-preview {
          height: 200px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          background: white;
        }
        .template-gallery-iframe {
          width: 200%;
          height: 400px;
          border: none;
          transform: scale(0.5);
          transform-origin: top left;
          pointer-events: none;
        }
        .template-gallery-preview-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 4px;
          text-align: center;
          font-size: 10px;
          color: white;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .template-gallery-preview:hover .template-gallery-preview-overlay {
          opacity: 1;
        }
        .template-gallery-no-preview {
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 12px;
        }
        .template-gallery-card-body {
          padding: 12px;
        }
        .template-gallery-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .template-gallery-card-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .template-gallery-type-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .tg-source-badge {
          font-size: 8px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .tg-source-builtin {
          background-color: rgba(107, 114, 128, 0.15);
          color: #9ca3af;
        }
        .tg-source-custom {
          background-color: rgba(251, 191, 36, 0.2);
          color: #f59e0b;
        }
        .tg-type-report { background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .tg-type-paper { background-color: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .tg-type-conference { background-color: rgba(168, 85, 247, 0.15); color: #a855f7; }
        .tg-type-minutes { background-color: rgba(249, 115, 22, 0.15); color: #f97316; }
        .tg-type-proposal { background-color: rgba(236, 72, 153, 0.15); color: #ec4899; }
        .tg-type-techspec { background-color: rgba(20, 184, 166, 0.15); color: #14b8a6; }
        .tg-type-other { background-color: rgba(107, 114, 128, 0.15); color: #6b7280; }
        .template-gallery-card-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
          margin: 0 0 8px 0;
        }
        .template-gallery-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        .template-gallery-feature-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .template-gallery-style-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--text-muted);
        }
        .tg-section-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 6px;
          padding: 3px 6px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        }
        .tg-card-actions {
          display: flex;
          gap: 6px;
        }
        .template-gallery-apply-btn {
          flex: 1;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--accent-color);
          background: var(--accent-color);
          color: white;
          cursor: pointer;
          transition: all 0.15s;
        }
        .template-gallery-apply-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .template-gallery-apply-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tg-quick-build-btn {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-quick-build-btn:hover:not(:disabled) {
          border-color: var(--accent-color);
          color: var(--accent-color);
          background: rgba(0, 120, 212, 0.08);
        }
        .tg-quick-build-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tg-install-btn {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(34, 197, 94, 0.4);
          background: transparent;
          color: #22c55e;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-install-btn:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.1);
        }
        .tg-install-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tg-delete-btn {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: transparent;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-delete-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
        }
        .tg-delete-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .template-gallery-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          font-size: 14px;
        }
        .template-gallery-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .template-gallery-modal-content {
          width: 80%;
          height: 85%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .template-gallery-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
        }
        .template-gallery-modal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .template-gallery-modal-header button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .template-gallery-modal-iframe {
          flex: 1;
          width: 100%;
          border: none;
        }
        .tg-preview-tabs {
          display: flex;
          gap: 2px;
          margin-left: 16px;
          flex: 1;
        }
        .tg-preview-tab {
          padding: 4px 12px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-preview-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .tg-preview-tab.active {
          background: var(--accent-color);
          color: white;
        }
        .tg-preview-code-container {
          flex: 1;
          overflow: auto;
          padding: 16px;
          background: var(--bg-primary);
        }
        .tg-preview-code {
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
        }
        .tg-preview-md-section {
          margin-bottom: 16px;
        }
        .tg-preview-md-filename {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-color);
          padding: 4px 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-bottom: none;
          border-radius: 6px 6px 0 0;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        }
        .tg-preview-md-section .tg-preview-code {
          border-radius: 0 0 6px 6px;
        }
        .tg-preview-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 14px;
          min-height: 200px;
        }
        .tg-create-dialog {
          width: 400px;
          background: var(--bg-secondary);
          border-radius: 8px;
          overflow: hidden;
        }
        .tg-create-form {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tg-create-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .tg-create-input {
          padding: 6px 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .tg-create-input:focus {
          border-color: var(--accent-color);
        }
        .tg-create-submit {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        }
        .tg-create-submit:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .tg-create-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Main Tabs */
        .tg-main-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0;
        }
        .tg-main-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s;
        }
        .tg-main-tab:hover {
          color: var(--text-primary);
        }
        .tg-main-tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }
        .tg-main-tab svg {
          flex-shrink: 0;
        }

        /* Guides */
        .tg-guides {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tg-guide-card {
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
          background: var(--bg-secondary);
          transition: border-color 0.2s;
        }
        .tg-guide-card:hover {
          border-color: var(--text-muted);
        }
        .tg-guide-card.expanded {
          border-color: var(--accent-color);
        }
        .tg-guide-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
        }
        .tg-guide-card-header:hover {
          background: var(--bg-hover);
        }
        .tg-guide-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.5px;
          flex-shrink: 0;
        }
        .tg-guide-icon-pdf {
          background: linear-gradient(135deg, #e5574f 0%, #c0392b 100%);
          color: white;
        }
        .tg-guide-icon-docx {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }
        .tg-guide-icon-yaml {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }
        .tg-guide-title-area {
          flex: 1;
          min-width: 0;
        }
        .tg-guide-title-area h3 {
          margin: 0 0 2px 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .tg-guide-title-area p {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .tg-guide-chevron {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .tg-guide-chevron.open {
          transform: rotate(180deg);
        }
        .tg-guide-body {
          padding: 0 20px 20px 20px;
          border-top: 1px solid var(--border-color);
        }
        .tg-guide-section {
          margin-top: 16px;
        }
        .tg-guide-section h4 {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin: 0 0 8px 0;
        }
        .tg-guide-deps {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tg-guide-dep {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }
        .tg-guide-dep-opt {
          background: rgba(107, 114, 128, 0.12);
          color: var(--text-muted);
        }
        .tg-guide-steps {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .tg-guide-steps li {
          margin-bottom: 4px;
        }
        .tg-guide-steps code {
          font-size: 12px;
          padding: 1px 5px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          color: var(--accent-color);
        }
        .tg-guide-code {
          font-size: 12px;
          line-height: 1.6;
          padding: 14px 16px;
          border-radius: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          overflow-x: auto;
          margin: 0;
          white-space: pre;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        }
        .tg-guide-flow {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }
        .tg-guide-flow-step {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .tg-guide-flow-output {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .tg-guide-flow-arrow {
          color: var(--text-muted);
          font-size: 14px;
        }
        .tg-guide-engines {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .tg-guide-engine {
          padding: 12px;
          border-radius: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
        }
        .tg-guide-engine h5 {
          margin: 0 0 4px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .tg-guide-engine p {
          margin: 0 0 8px 0;
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .tg-guide-engine code {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--bg-secondary);
          border-radius: 3px;
          color: var(--accent-color);
        }
        .tg-guide-directives {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tg-guide-directive {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 10px;
          border-radius: 6px;
          background: var(--bg-tertiary);
          font-size: 12px;
        }
        .tg-guide-directive code {
          font-size: 11px;
          color: var(--accent-color);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tg-guide-directive span {
          color: var(--text-muted);
          font-size: 11px;
        }
        .tg-guide-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .tg-guide-table th {
          text-align: left;
          padding: 6px 10px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 11px;
          border-bottom: 1px solid var(--border-color);
        }
        .tg-guide-table td {
          padding: 5px 10px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
        }
        .tg-guide-table td code {
          font-size: 11px;
          padding: 1px 4px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          color: var(--accent-color);
        }
        .tg-guide-table tr:last-child td {
          border-bottom: none;
        }

        /* Sample Explorer */
        .se-container {
          display: flex;
          height: calc(100vh - 200px);
          min-height: 400px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-secondary);
        }
        .se-tree-pane {
          width: 240px;
          min-width: 200px;
          border-right: 1px solid var(--border-color);
          overflow-y: auto;
          background: var(--bg-tertiary);
        }
        .se-content-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .se-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }
        .se-template-group {
          border-bottom: 1px solid var(--border-color);
        }
        .se-template-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          user-select: none;
          transition: background 0.1s;
        }
        .se-template-header:hover {
          background: var(--bg-hover);
        }
        .se-chevron {
          display: flex;
          align-items: center;
          transition: transform 0.15s;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .se-chevron.open {
          transform: rotate(90deg);
        }
        .se-template-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .se-stem-group {
          padding-left: 12px;
        }
        .se-stem-header {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          user-select: none;
          transition: background 0.1s;
        }
        .se-stem-header:hover {
          background: var(--bg-hover);
        }
        .se-stem-name {
          color: #f59e0b;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 11px;
        }
        .se-file-list {
          padding-left: 16px;
        }
        .se-file-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          cursor: pointer;
          font-size: 11px;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          color: var(--text-muted);
          border-radius: 3px;
          margin: 1px 4px;
          transition: all 0.1s;
        }
        .se-file-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .se-file-item.selected {
          background: var(--accent-color);
          color: white;
        }
        .se-file-item.selected svg {
          stroke: white;
          opacity: 1;
        }
        .se-content-header {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
          flex-shrink: 0;
        }
        .se-content-filename {
          font-size: 13px;
          font-weight: 600;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          color: var(--accent-color);
        }
        .se-content-body {
          flex: 1;
          overflow: auto;
          padding: 16px;
        }
        .se-content-footer {
          flex-shrink: 0;
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .se-content-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-muted);
          font-size: 13px;
        }
`;

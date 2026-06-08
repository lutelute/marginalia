// App シェル (TopBar / サイドバー / リサイズハンドル / レスポンシブ) のグローバルCSS。
// AppContent から <style> でただ一度マウントされる（元の挙動を完全に維持）。
export const appShellStyles = `
          .resize-handle {
            width: 6px;
            cursor: col-resize;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background-color: transparent;
            transition: background-color 0.2s;
            z-index: 10;
          }

          .resize-handle:hover {
            background-color: var(--accent-color);
          }

          .resize-handle-bar {
            width: 2px;
            height: 40px;
            background-color: var(--border-color);
            border-radius: 2px;
            transition: all 0.2s;
          }

          .resize-handle:hover .resize-handle-bar {
            height: 60px;
            background-color: white;
          }

          .resize-handle.left {
            margin-left: -3px;
            margin-right: -3px;
          }

          .resize-handle.right {
            margin-left: -3px;
            margin-right: -3px;
          }

          .top-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 38px;
            background-color: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px 0 76px;
            z-index: 100;
            -webkit-app-region: drag;
          }

          .top-bar-left {
            display: flex;
            align-items: center;
            gap: 4px;
            -webkit-app-region: no-drag;
          }

          .top-bar-center {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            -webkit-app-region: no-drag;
          }

          .app-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            letter-spacing: -0.3px;
            user-select: none;
          }

          .top-bar-right {
            display: flex;
            align-items: center;
            gap: 4px;
            -webkit-app-region: no-drag;
          }

          .btn-group {
            display: flex;
            align-items: center;
            background-color: var(--bg-secondary);
            border-radius: 6px;
            padding: 2px;
            gap: 1px;
          }

          .mode-toggle-group {
            display: flex;
            align-items: center;
            background-color: var(--bg-secondary);
            border-radius: 6px;
            padding: 2px;
            margin-left: 8px;
          }

          .mode-toggle-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 4px;
            background-color: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 500;
          }

          .mode-toggle-group.disabled {
            opacity: 0.4;
            pointer-events: none;
          }

          .mode-toggle-btn:hover {
            background-color: var(--bg-hover);
            color: var(--text-primary);
          }

          .mode-toggle-btn.active {
            background-color: var(--accent-color);
            color: white;
          }

          .mode-toggle-btn.active:hover {
            background-color: var(--accent-hover);
            color: white;
          }

          .mode-toggle-btn svg {
            flex-shrink: 0;
          }

          .top-bar-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px 7px;
            border-radius: 4px;
            background-color: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            color: var(--text-muted);
          }

          .top-bar-btn:hover {
            background-color: var(--bg-hover);
            color: var(--text-primary);
          }

          .top-bar-btn:active {
            background-color: var(--bg-active);
          }

          .top-bar-btn svg {
            width: 15px;
            height: 15px;
          }

          .top-bar-btn.icon-only {
            padding: 5px 7px;
          }

          .top-bar-btn.active {
            background-color: var(--accent-color);
            color: white;
          }

          .top-bar-btn.active:hover {
            background-color: var(--accent-hover);
            color: white;
          }

          .top-bar-btn {
            position: relative;
          }

          .annotation-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            font-size: 10px;
            font-weight: 600;
            line-height: 16px;
            text-align: center;
            color: white;
            background-color: var(--error-color);
            border-radius: 8px;
            animation: badgePulse 2s infinite;
          }

          @keyframes badgePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          .env-badge {
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .env-badge.dev {
            background-color: rgba(255, 193, 7, 0.15);
            color: #ffc107;
          }

          .env-badge.prod {
            background-color: rgba(76, 175, 80, 0.15);
            color: #4caf50;
          }

          .app {
            position: absolute;
            top: 38px;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            overflow: hidden;
          }

          .sidebar {
            transition: width 0.2s ease-out, min-width 0.2s ease-out;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .sidebar-section-header {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
            cursor: pointer;
            user-select: none;
            flex-shrink: 0;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-secondary);
          }

          .sidebar-section-header:hover {
            color: var(--text-primary);
            background: var(--bg-hover);
          }

          .sidebar-section-chevron {
            display: flex;
            align-items: center;
            transition: transform 0.15s ease;
          }

          .sidebar-section-chevron.collapsed {
            transform: rotate(-90deg);
          }

          .vertical-resize-handle {
            height: 4px;
            cursor: row-resize;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background-color: transparent;
            transition: background-color 0.2s;
          }

          .vertical-resize-handle:hover {
            background-color: var(--accent-color);
          }

          .vertical-resize-handle-bar {
            width: 40px;
            height: 2px;
            background-color: var(--border-color);
            border-radius: 2px;
            transition: all 0.2s;
          }

          .vertical-resize-handle:hover .vertical-resize-handle-bar {
            width: 60px;
            background-color: white;
          }

          .sidebar-no-project-hint {
            padding: 12px;
            text-align: center;
          }

          .sidebar-no-project-hint p {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.5;
            margin: 0;
          }

          .sidebar-section-popout-btn {
            margin-left: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            opacity: 0;
            transition: all 0.15s;
          }

          .sidebar-section-header:hover .sidebar-section-popout-btn {
            opacity: 1;
          }

          .sidebar-section-popout-btn:hover {
            background: var(--bg-active);
            color: var(--text-primary);
          }

          .sidebar.closed {
            width: 0 !important;
            min-width: 0 !important;
          }

          .main-content {
            min-width: 0;
            transition: flex 0.2s ease-out;
          }

          .annotation-panel {
            transition: width 0.2s ease-out;
            overflow: hidden;
          }

          .annotation-panel.closed {
            width: 0 !important;
            min-width: 0 !important;
          }

          /* レスポンシブ対応 */
          @media (max-width: 900px) {
            .mode-toggle-btn span {
              display: none;
            }

            .mode-toggle-btn {
              padding: 4px 8px;
            }

            .top-bar {
              padding: 0 8px 0 68px;
            }

            .app-title {
              font-size: 12px;
            }
          }

          @media (max-width: 768px) {
            .top-bar {
              padding: 0 8px 0 60px;
            }

            .mode-toggle-group {
              margin-left: 4px;
            }

            .btn-group {
              padding: 1px;
            }

            .top-bar-btn {
              padding: 4px 5px;
            }

            .top-bar-btn svg {
              width: 14px;
              height: 14px;
            }

            .app-title {
              display: none;
            }

            .env-badge {
              font-size: 7px;
              padding: 1px 4px;
            }
          }

          @media (max-width: 480px) {
            .mode-toggle-group {
              display: none;
            }

            .top-bar {
              padding: 0 6px 0 50px;
            }
          }
        `;

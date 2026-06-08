import React, { useState } from 'react';
import { useFile } from '../../contexts/FileContext';
import { useSettings } from '../../contexts/SettingsContext';
import FileTreeItem from './FileTreeItem';

type FileFilter = 'all' | 'local' | 'system';

function FileTree() {
  const { rootPath, fileTree, openDirectory, openDirectoryByPath, refreshDirectory, isLoading, recentFolders, clearRecentFolders } = useFile();
  const { settings, updateSettings } = useSettings();
  const [showRecentFolders, setShowRecentFolders] = useState(false);
  const [fileFilter, setFileFilter] = useState<FileFilter>('local');
  const [showExcludeEditor, setShowExcludeEditor] = useState(false);
  const [excludeInput, setExcludeInput] = useState('');
  const [asciiTreeText, setAsciiTreeText] = useState<string | null>(null);
  const [asciiCopied, setAsciiCopied] = useState(false);

  // フィルタに応じてファイルツリーを絞り込み
  const filteredTree = fileFilter === 'all' ? fileTree : fileTree.filter((item: any) => {
    if (fileFilter === 'system') return item.isSystem;
    if (fileFilter === 'local') return !item.isSystem;
    return true;
  });

  // システムファイルが存在するかチェック
  const hasSystemFiles = fileTree.some((item: any) => item.isSystem);

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">エクスプローラー</span>
        <div className="file-tree-actions">
          {recentFolders.length > 0 && (
            <button
              onClick={() => setShowRecentFolders(!showRecentFolders)}
              title="最近のフォルダ"
              className={showRecentFolders ? 'active' : ''}
            >
              <HistoryIcon />
            </button>
          )}
          <button
            onClick={() => setAsciiTreeText(buildAsciiTree(filteredTree, rootPath))}
            title="ASCIIツリーを表示"
            disabled={!rootPath}
          >
            <TreeIcon />
          </button>
          <button onClick={refreshDirectory} title="更新" disabled={!rootPath}>
            <RefreshIcon />
          </button>
          <button onClick={openDirectory} title="フォルダを開く">
            <FolderOpenIcon />
          </button>
        </div>
      </div>

      {/* 最近のフォルダドロップダウン */}
      {showRecentFolders && recentFolders.length > 0 && (
        <div className="recent-folders-dropdown">
          <div className="recent-folders-title">最近のフォルダ</div>
          {recentFolders.map((folder, index) => (
            <button
              key={index}
              className="recent-folder-btn"
              onClick={() => {
                openDirectoryByPath(folder);
                setShowRecentFolders(false);
              }}
            >
              <FolderIcon />
              <span className="folder-name">{folder.split('/').pop()}</span>
            </button>
          ))}
          <button className="clear-recent-btn" onClick={clearRecentFolders}>
            履歴をクリア
          </button>
        </div>
      )}

      {/* システム/ローカルフィルタバー */}
      {rootPath && (
        <div className="file-filter-bar">
          <button className={`file-filter-btn ${fileFilter === 'all' ? 'active' : ''}`} onClick={() => setFileFilter('all')}>
            All
          </button>
          <button className={`file-filter-btn ${fileFilter === 'local' ? 'active' : ''}`} onClick={() => setFileFilter('local')}>
            Local
          </button>
          {hasSystemFiles && (
            <button className={`file-filter-btn ${fileFilter === 'system' ? 'active' : ''}`} onClick={() => setFileFilter('system')}>
              System
            </button>
          )}
          <button
            className={`file-filter-btn exclude-settings-btn ${showExcludeEditor ? 'active' : ''}`}
            onClick={() => {
              if (!showExcludeEditor) {
                setExcludeInput((settings.files.excludePatterns || []).join(', '));
              }
              setShowExcludeEditor(!showExcludeEditor);
            }}
            title="除外パターン設定"
          >
            <ExcludeIcon />
          </button>
        </div>
      )}

      {/* 除外パターン編集 */}
      {showExcludeEditor && (
        <div className="exclude-editor">
          <label className="exclude-label">除外フォルダ (カンマ区切り)</label>
          <input
            className="exclude-input"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            placeholder="dist, release, build, .cache"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const patterns = excludeInput.split(',').map(s => s.trim()).filter(Boolean);
                updateSettings('files.excludePatterns', patterns);
                setShowExcludeEditor(false);
              }
            }}
          />
          <div className="exclude-actions">
            <button
              className="exclude-save-btn"
              onClick={() => {
                const patterns = excludeInput.split(',').map(s => s.trim()).filter(Boolean);
                updateSettings('files.excludePatterns', patterns);
                setShowExcludeEditor(false);
              }}
            >
              保存
            </button>
            <button className="exclude-cancel-btn" onClick={() => setShowExcludeEditor(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="file-tree-content">
        {!rootPath ? (
          <div className="file-tree-empty">
            <p>フォルダが開かれていません</p>
            <button className="open-folder-btn" onClick={openDirectory}>
              フォルダを開く
            </button>
            {recentFolders.length > 0 && (
              <div className="recent-folders-hint">
                <HistoryIcon small />
                <span>最近のフォルダがあります</span>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="file-tree-loading">読み込み中...</div>
        ) : filteredTree.length === 0 ? (
          <div className="file-tree-empty">
            <p>{fileFilter === 'system' ? 'システムファイルがありません' : fileFilter === 'local' ? 'ローカルファイルがありません' : 'ファイルがありません'}</p>
          </div>
        ) : (
          <ul className="file-tree-list">
            {filteredTree.map((item: any) => (
              <FileTreeItem key={item.path} item={item} depth={0} />
            ))}
          </ul>
        )}
      </div>

      {/* ASCIIツリーモーダル */}
      {asciiTreeText !== null && (
        <div className="ascii-tree-modal-overlay" onClick={() => setAsciiTreeText(null)}>
          <div className="ascii-tree-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ascii-tree-modal-header">
              <span>ASCIIツリー</span>
              <div className="ascii-tree-modal-actions">
                <button
                  className="ascii-tree-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(asciiTreeText);
                    setAsciiCopied(true);
                    setTimeout(() => setAsciiCopied(false), 1500);
                  }}
                >
                  {asciiCopied ? 'コピー済み' : 'コピー'}
                </button>
                <button
                  className="ascii-tree-close-btn"
                  onClick={() => setAsciiTreeText(null)}
                  title="閉じる"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
            <pre className="ascii-tree-content">{asciiTreeText}</pre>
          </div>
        </div>
      )}

      <style>{`
        .file-tree {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .file-tree-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .file-tree-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .file-tree-actions {
          display: flex;
          gap: 4px;
        }

        .file-tree-actions button {
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .file-tree-actions button:hover:not(:disabled) {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .file-tree-actions button svg {
          width: 16px;
          height: 16px;
        }

        .file-tree-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .file-tree-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          color: var(--text-secondary);
        }

        .file-tree-empty p {
          margin-bottom: 12px;
          font-size: 13px;
        }

        .open-folder-btn {
          padding: 8px 16px;
          background-color: var(--accent-color);
          color: white;
          border-radius: 4px;
          font-size: 13px;
          transition: background-color 0.2s;
        }

        .open-folder-btn:hover {
          background-color: var(--accent-hover);
        }

        .file-tree-loading {
          padding: 20px;
          text-align: center;
          color: var(--text-secondary);
        }

        .file-tree-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .file-tree-actions button.active {
          background-color: var(--accent-color);
          color: white;
        }

        .recent-folders-dropdown {
          background-color: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
          padding: 8px;
        }

        .recent-folders-title {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 6px;
          padding: 0 4px;
        }

        .recent-folder-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px 8px;
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 12px;
          text-align: left;
          transition: all 0.15s;
        }

        .recent-folder-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .recent-folder-btn svg {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .recent-folder-btn .folder-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .clear-recent-btn {
          width: 100%;
          padding: 6px;
          margin-top: 6px;
          color: var(--text-muted);
          font-size: 11px;
          text-align: center;
          border-top: 1px solid var(--border-color);
        }

        .clear-recent-btn:hover {
          color: #ef5350;
        }

        .recent-folders-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .recent-folders-hint svg {
          width: 12px;
          height: 12px;
        }

        .file-filter-bar {
          display: flex;
          gap: 2px;
          padding: 4px 8px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .file-filter-btn {
          flex: 1;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .file-filter-btn.exclude-settings-btn {
          flex: 0 0 auto;
          padding: 2px 4px;
          display: flex;
          align-items: center;
        }

        .file-filter-btn.exclude-settings-btn svg {
          width: 12px;
          height: 12px;
        }

        .file-filter-btn:hover:not(.active) {
          background: var(--bg-hover);
          color: var(--text-secondary);
        }

        .file-filter-btn.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .exclude-editor {
          padding: 8px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          flex-shrink: 0;
        }

        .exclude-label {
          font-size: 10px;
          color: var(--text-muted);
          display: block;
          margin-bottom: 4px;
        }

        .exclude-input {
          width: 100%;
          padding: 4px 6px;
          font-size: 11px;
          border: 1px solid var(--border-color);
          border-radius: 3px;
          background: var(--bg-primary);
          color: var(--text-primary);
          outline: none;
          box-sizing: border-box;
        }

        .exclude-input:focus {
          border-color: var(--accent-color);
        }

        .exclude-actions {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }

        .exclude-save-btn, .exclude-cancel-btn {
          flex: 1;
          padding: 3px 6px;
          font-size: 10px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .exclude-save-btn {
          background: var(--accent-color);
          color: white;
          border: none;
        }

        .exclude-save-btn:hover {
          background: var(--accent-hover);
        }

        .exclude-cancel-btn {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border-color);
        }

        .exclude-cancel-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .ascii-tree-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .ascii-tree-modal {
          width: min(720px, 90vw);
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        .ascii-tree-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ascii-tree-modal-actions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .ascii-tree-copy-btn {
          padding: 4px 10px;
          font-size: 11px;
          border-radius: 4px;
          background: var(--accent-color);
          color: white;
          border: none;
          cursor: pointer;
        }
        .ascii-tree-copy-btn:hover { opacity: 0.9; }

        .ascii-tree-close-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .ascii-tree-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .ascii-tree-content {
          margin: 0;
          padding: 14px 16px;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-primary);
          background: var(--bg-primary);
          overflow: auto;
          flex: 1;
          border-radius: 0 0 8px 8px;
          white-space: pre;
        }
      `}</style>
    </div>
  );
}

function HistoryIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ExcludeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h6M4 12h10M4 20h14M10 4v16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function buildAsciiTree(nodes: any[], rootPath: string | null): string {
  const lines: string[] = [];
  if (rootPath) {
    const rootName = rootPath.split('/').pop() || rootPath;
    lines.push(`${rootName}/`);
  }

  function walk(items: any[], prefix: string) {
    const visible = items.filter((it) => !it.isHidden);
    visible.forEach((item, idx) => {
      const isLast = idx === visible.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const label = item.isDirectory ? `${item.name}/` : item.name;
      lines.push(prefix + connector + label);
      if (item.isDirectory && item.children && item.children.length > 0) {
        walk(item.children, nextPrefix);
      }
    });
  }

  walk(nodes, '');
  return lines.join('\n');
}

export default FileTree;

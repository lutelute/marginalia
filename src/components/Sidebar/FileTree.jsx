import React from 'react';
import { useFile } from '../../contexts/FileContext';
import FileTreeItem from './FileTreeItem';

function FileTree() {
  const { rootPath, fileTree, openDirectory, refreshDirectory, isLoading } = useFile();

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">エクスプローラー</span>
        <div className="file-tree-actions">
          <button onClick={refreshDirectory} title="更新" disabled={!rootPath}>
            <RefreshIcon />
          </button>
          <button onClick={openDirectory} title="フォルダを開く">
            <FolderOpenIcon />
          </button>
        </div>
      </div>

      <div className="file-tree-content">
        {!rootPath ? (
          <div className="file-tree-empty">
            <p>フォルダが開かれていません</p>
            <button className="open-folder-btn" onClick={openDirectory}>
              フォルダを開く
            </button>
          </div>
        ) : isLoading ? (
          <div className="file-tree-loading">読み込み中...</div>
        ) : fileTree.length === 0 ? (
          <div className="file-tree-empty">
            <p>Markdownファイルがありません</p>
          </div>
        ) : (
          <ul className="file-tree-list">
            {fileTree.map((item) => (
              <FileTreeItem key={item.path} item={item} depth={0} />
            ))}
          </ul>
        )}
      </div>

      <style>{`
        .file-tree {
          display: flex;
          flex-direction: column;
          height: 100%;
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
      `}</style>
    </div>
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

export default FileTree;

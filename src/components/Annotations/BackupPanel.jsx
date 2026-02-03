import React, { useState, useEffect, useCallback } from 'react';
import { useFile } from '../../contexts/FileContext';

function BackupPanel() {
  const { currentFile, openFile } = useFile();
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewBackup, setPreviewBackupData] = useState(null);

  // バックアップ一覧を取得
  const loadBackups = useCallback(async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.listBackups(currentFile);
      if (result.success) {
        setBackups(result.backups);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentFile]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // バックアップをプレビュー
  const handlePreview = async (backup) => {
    try {
      const result = await window.electronAPI.previewBackup(backup.path);
      if (result.success) {
        setPreviewContent(result.content);
        setPreviewBackupData(backup);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  // バックアップから復元
  const handleRestore = async (backup) => {
    if (!confirm(`${formatDate(backup.createdAt)} のバックアップから復元しますか？\n\n現在の内容はバックアップされます。`)) {
      return;
    }

    try {
      const result = await window.electronAPI.restoreBackup(backup.path, currentFile);
      if (result.success) {
        // ファイルを再読み込み
        await openFile(currentFile);
        loadBackups();
        setPreviewContent(null);
        setPreviewBackupData(null);
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  // バックアップを削除
  const handleDelete = async (backup) => {
    if (!confirm('このバックアップを削除しますか？')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteBackup(backup.path);
      if (result.success) {
        loadBackups();
        if (previewBackup?.id === backup.id) {
          setPreviewContent(null);
          setPreviewBackupData(null);
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // 手動バックアップ作成
  const handleCreateBackup = async () => {
    try {
      const result = await window.electronAPI.createBackup(currentFile);
      if (result.success) {
        loadBackups();
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!currentFile) {
    return (
      <div className="backup-empty">
        <p>ファイルを選択してください</p>
      </div>
    );
  }

  return (
    <div className="backup-panel">
      <div className="backup-header">
        <span className="backup-title">バックアップ ({backups.length}件)</span>
        <button className="create-backup-btn" onClick={handleCreateBackup}>
          + 作成
        </button>
      </div>

      {isLoading ? (
        <div className="backup-loading">読み込み中...</div>
      ) : backups.length === 0 ? (
        <div className="backup-empty">
          <p>バックアップがありません</p>
          <p className="hint">保存時に自動でバックアップされます</p>
        </div>
      ) : (
        <div className="backup-list">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className={`backup-item ${previewBackup?.id === backup.id ? 'selected' : ''}`}
            >
              <div className="backup-info" onClick={() => handlePreview(backup)}>
                <div className="backup-date">{formatDate(backup.createdAt)}</div>
                <div className="backup-size">{formatSize(backup.size)}</div>
              </div>
              <div className="backup-actions">
                <button
                  className="restore-btn"
                  onClick={() => handleRestore(backup)}
                  title="復元"
                >
                  ↺
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(backup)}
                  title="削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewContent && (
        <div className="backup-preview">
          <div className="preview-header">
            <span>プレビュー: {formatDate(previewBackup?.createdAt)}</span>
            <button onClick={() => { setPreviewContent(null); setPreviewBackupData(null); }}>
              閉じる
            </button>
          </div>
          <pre className="preview-content">{previewContent}</pre>
          <button
            className="restore-preview-btn"
            onClick={() => handleRestore(previewBackup)}
          >
            このバージョンを復元
          </button>
        </div>
      )}

      <style>{`
        .backup-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .backup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .backup-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .create-backup-btn {
          padding: 4px 8px;
          font-size: 11px;
          background-color: var(--accent-color);
          color: white;
          border-radius: 4px;
        }

        .create-backup-btn:hover {
          background-color: var(--accent-hover);
        }

        .backup-loading,
        .backup-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: var(--text-secondary);
          text-align: center;
        }

        .backup-empty .hint {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .backup-list {
          flex: 1;
          overflow-y: auto;
        }

        .backup-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .backup-item:hover {
          background-color: var(--bg-hover);
        }

        .backup-item.selected {
          background-color: var(--bg-active);
        }

        .backup-info {
          flex: 1;
        }

        .backup-date {
          font-size: 12px;
          color: var(--text-primary);
        }

        .backup-size {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .backup-actions {
          display: flex;
          gap: 4px;
        }

        .backup-actions button {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .restore-btn {
          color: var(--accent-color);
        }

        .restore-btn:hover {
          background-color: var(--accent-color);
          color: white;
        }

        .delete-btn {
          color: var(--text-muted);
        }

        .delete-btn:hover {
          background-color: var(--error-color);
          color: white;
        }

        .backup-preview {
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          max-height: 50%;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: var(--bg-tertiary);
          font-size: 11px;
          color: var(--text-secondary);
        }

        .preview-header button {
          font-size: 11px;
          color: var(--text-muted);
        }

        .preview-content {
          flex: 1;
          overflow: auto;
          padding: 12px;
          font-size: 11px;
          font-family: monospace;
          background-color: var(--bg-primary);
          color: var(--text-secondary);
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
        }

        .restore-preview-btn {
          padding: 8px;
          background-color: var(--success-color);
          color: white;
          font-size: 12px;
        }

        .restore-preview-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

export default BackupPanel;

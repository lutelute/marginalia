import React, { useState, useCallback } from 'react';
import { useAnnotation } from '../../contexts/AnnotationContext';

const ANNOTATION_TYPES = [
  { id: 'comment', label: 'コメント', icon: '💬', color: 'var(--comment-color)' },
  { id: 'review', label: '校閲', icon: '✏️', color: 'var(--review-color)' },
  { id: 'pending', label: '保留', icon: '⏳', color: 'var(--pending-color)' },
  { id: 'discussion', label: '議論', icon: '💭', color: 'var(--discussion-color)' },
];

function OrphanedAnnotations() {
  const {
    orphanedAnnotations,
    keptAnnotations,
    keepAnnotation,
    deleteAnnotation,
    reassignAnnotation,
  } = useAnnotation();

  const [reassignMode, setReassignMode] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  const handleKeep = useCallback((id: string) => {
    keepAnnotation(id);
  }, [keepAnnotation]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('この注釈を削除しますか？')) {
      deleteAnnotation(id);
    }
  }, [deleteAnnotation]);

  const handleReassignStart = useCallback((id: string, currentText: string) => {
    setReassignMode(id);
    setNewText(currentText);
  }, []);

  const handleReassignConfirm = useCallback((id: string) => {
    if (newText.trim()) {
      reassignAnnotation(id, newText.trim(), 0);
      setReassignMode(null);
      setNewText('');
    }
  }, [newText, reassignAnnotation]);

  const handleReassignCancel = useCallback(() => {
    setReassignMode(null);
    setNewText('');
  }, []);

  const totalOrphaned = orphanedAnnotations.length;
  const totalKept = keptAnnotations.length;

  if (totalOrphaned === 0 && totalKept === 0) {
    return (
      <div className="orphaned-empty">
        <div className="empty-icon">✓</div>
        <div className="empty-text">孤立した注釈はありません</div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="orphaned-container">
      {totalOrphaned > 0 && (
        <div className="orphaned-section">
          <div className="section-header warning">
            <span className="section-icon">⚠️</span>
            <span className="section-title">対象テキストが見つかりません ({totalOrphaned}件)</span>
          </div>
          <div className="section-description">
            元のテキストが削除または変更されました。
          </div>
          <div className="orphaned-list">
            {orphanedAnnotations.map((annotation) => {
              const typeInfo = ANNOTATION_TYPES.find((t) => t.id === annotation.type);
              const isReassigning = reassignMode === annotation.id;

              return (
                <div key={annotation.id} className="orphaned-item">
                  <div className="item-header">
                    <span
                      className="item-type"
                      style={{ backgroundColor: typeInfo?.color }}
                    >
                      {typeInfo?.icon} {typeInfo?.label}
                    </span>
                  </div>

                  <div className="item-text">
                    <span className="text-label">元のテキスト:</span>
                    <span className="text-content">"{annotation.selectedText}"</span>
                  </div>

                  <div className="item-content">
                    {annotation.content}
                  </div>

                  {isReassigning ? (
                    <div className="reassign-form">
                      <input
                        type="text"
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="新しいテキストを入力..."
                        autoFocus
                      />
                      <div className="reassign-actions">
                        <button
                          className="btn-confirm"
                          onClick={() => handleReassignConfirm(annotation.id)}
                        >
                          確定
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={handleReassignCancel}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="item-actions">
                      <button
                        className="btn-keep"
                        onClick={() => handleKeep(annotation.id)}
                        title="メモとして保持"
                      >
                        📝 保持
                      </button>
                      <button
                        className="btn-reassign"
                        onClick={() => handleReassignStart(annotation.id, annotation.selectedText)}
                        title="新しいテキストに再割当"
                      >
                        🔄 再割当
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(annotation.id)}
                        title="削除"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalKept > 0 && (
        <div className="kept-section">
          <div className="section-header kept">
            <span className="section-icon">📝</span>
            <span className="section-title">保持された注釈 ({totalKept}件)</span>
          </div>
          <div className="section-description">
            メモとして保持された注釈です。
          </div>
          <div className="kept-list">
            {keptAnnotations.map((annotation) => {
              const typeInfo = ANNOTATION_TYPES.find((t) => t.id === annotation.type);

              return (
                <div key={annotation.id} className="kept-item">
                  <div className="item-header">
                    <span
                      className="item-type"
                      style={{ backgroundColor: typeInfo?.color }}
                    >
                      {typeInfo?.icon} {typeInfo?.label}
                    </span>
                  </div>

                  <div className="item-text">
                    <span className="text-label">元のテキスト:</span>
                    <span className="text-content kept">"{annotation.selectedText}"</span>
                  </div>

                  <div className="item-content">
                    {annotation.content}
                  </div>

                  <div className="item-actions">
                    <button
                      className="btn-reassign"
                      onClick={() => handleReassignStart(annotation.id, annotation.selectedText)}
                      title="新しいテキストに再割当"
                    >
                      🔄 再割当
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(annotation.id)}
                      title="削除"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .orphaned-container {
    padding: 12px;
    overflow-y: auto;
    height: 100%;
  }

  .orphaned-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    color: var(--success-color);
  }

  .empty-text {
    font-size: 13px;
  }

  .orphaned-section,
  .kept-section {
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .section-header.warning {
    background-color: rgba(255, 152, 0, 0.15);
    color: var(--warning-color);
  }

  .section-header.kept {
    background-color: rgba(33, 150, 243, 0.15);
    color: var(--info-color);
  }

  .section-icon {
    font-size: 14px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
  }

  .section-description {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 12px;
    padding-left: 4px;
  }

  .orphaned-list,
  .kept-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .orphaned-item,
  .kept-item {
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    padding: 12px;
    border-left: 3px solid var(--warning-color);
  }

  .kept-item {
    border-left-color: var(--info-color);
  }

  .item-header {
    margin-bottom: 8px;
  }

  .item-type {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    color: white;
  }

  .item-text {
    margin-bottom: 8px;
    font-size: 12px;
  }

  .text-label {
    color: var(--text-muted);
    margin-right: 4px;
  }

  .text-content {
    color: var(--warning-color);
    font-style: italic;
  }

  .text-content.kept {
    color: var(--info-color);
  }

  .item-content {
    font-size: 13px;
    color: var(--text-primary);
    padding: 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .item-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .item-actions button {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 11px;
    transition: all 0.2s;
  }

  .btn-keep {
    background-color: var(--info-color);
    color: white;
  }

  .btn-keep:hover {
    filter: brightness(1.1);
  }

  .btn-reassign {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-reassign:hover {
    background-color: var(--bg-hover);
  }

  .btn-delete {
    background-color: transparent;
    color: var(--error-color);
  }

  .btn-delete:hover {
    background-color: rgba(244, 67, 54, 0.1);
  }

  .reassign-form {
    margin-top: 8px;
  }

  .reassign-form input {
    width: 100%;
    padding: 8px;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
  }

  .reassign-form input:focus {
    border-color: var(--accent-color);
    outline: none;
  }

  .reassign-actions {
    display: flex;
    gap: 8px;
  }

  .btn-confirm {
    background-color: var(--success-color);
    color: white;
    padding: 6px 16px;
    border-radius: 4px;
  }

  .btn-confirm:hover {
    filter: brightness(1.1);
  }

  .btn-cancel {
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    padding: 6px 16px;
    border-radius: 4px;
  }

  .btn-cancel:hover {
    background-color: var(--bg-hover);
  }
`;

export default OrphanedAnnotations;

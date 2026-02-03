import React, { useState } from 'react';
import { useAnnotation } from '../../contexts/AnnotationContext';
import { useFile } from '../../contexts/FileContext';
import CommentThread from './CommentThread';
import HistoryItem from './HistoryItem';
import BackupPanel from './BackupPanel';

const ANNOTATION_TYPES = [
  { id: 'comment', label: 'コメント', color: 'var(--comment-color)' },
  { id: 'review', label: '校閲', color: 'var(--review-color)' },
  { id: 'pending', label: '保留', color: 'var(--pending-color)' },
  { id: 'discussion', label: '議論', color: 'var(--discussion-color)' },
];

function AnnotationPanel() {
  const [activeTab, setActiveTab] = useState('annotations');
  const [newAnnotationType, setNewAnnotationType] = useState('comment');
  const [newAnnotationContent, setNewAnnotationContent] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { currentFile } = useFile();
  const {
    annotations,
    history,
    pendingSelection,
    selectedAnnotation,
    addAnnotation,
    setPendingSelection,
  } = useAnnotation();

  const handleAddAnnotation = () => {
    if (!pendingSelection || !newAnnotationContent.trim()) return;

    addAnnotation(newAnnotationType, newAnnotationContent, pendingSelection);
    setNewAnnotationContent('');
    setPendingSelection(null);
  };

  const handleCancel = () => {
    setNewAnnotationContent('');
    setPendingSelection(null);
  };

  // フィルタリング
  const filteredAnnotations = annotations.filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'unresolved') return !a.resolved;
    if (filterType === 'resolved') return a.resolved;
    return a.type === filterType;
  });

  const unresolvedCount = annotations.filter((a) => !a.resolved).length;
  const resolvedCount = annotations.filter((a) => a.resolved).length;

  if (!currentFile) {
    return (
      <div className="annotation-panel-empty">
        <p>注釈パネル</p>
        <p className="subtitle">ファイルを選択してください</p>
        <style>{`
          .annotation-panel-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-secondary);
            text-align: center;
          }
          .annotation-panel-empty .subtitle {
            font-size: 12px;
            margin-top: 8px;
            color: var(--text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="annotation-panel-container">
      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'annotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('annotations')}
        >
          注釈 ({unresolvedCount})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          履歴
        </button>
        <button
          className={`tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          保存
        </button>
      </div>

      {/* 新規注釈追加フォーム */}
      {pendingSelection && (
        <div className="new-annotation-form">
          <div className="selected-text">
            <span className="label">選択テキスト:</span>
            <span className="text">"{pendingSelection.text.slice(0, 50)}..."</span>
          </div>
          <div className="type-selector">
            {ANNOTATION_TYPES.map((type) => (
              <button
                key={type.id}
                className={`type-btn ${newAnnotationType === type.id ? 'active' : ''}`}
                style={{ '--type-color': type.color }}
                onClick={() => setNewAnnotationType(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
          <textarea
            value={newAnnotationContent}
            onChange={(e) => setNewAnnotationContent(e.target.value)}
            placeholder="注釈を入力..."
            rows={3}
          />
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleCancel}>
              キャンセル
            </button>
            <button
              className="add-btn"
              onClick={handleAddAnnotation}
              disabled={!newAnnotationContent.trim()}
            >
              追加
            </button>
          </div>
        </div>
      )}

      {activeTab === 'annotations' && (
        <div className="filter-bar">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">すべて ({annotations.length})</option>
            <option value="unresolved">未解決 ({unresolvedCount})</option>
            <option value="resolved">解決済み ({resolvedCount})</option>
            <option disabled>──────</option>
            <option value="comment">コメント</option>
            <option value="review">校閲</option>
            <option value="pending">保留</option>
            <option value="discussion">議論</option>
          </select>
        </div>
      )}

      <div className="panel-content">
        {activeTab === 'annotations' && (
          <div className="annotations-list">
            {filteredAnnotations.length === 0 ? (
              <div className="empty-state">
                <p>注釈がありません</p>
                <p className="hint">テキストを選択して注釈を追加できます</p>
              </div>
            ) : (
              filteredAnnotations.map((annotation) => (
                <CommentThread
                  key={annotation.id}
                  annotation={annotation}
                  isSelected={selectedAnnotation === annotation.id}
                />
              ))
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-state">
                <p>履歴がありません</p>
              </div>
            ) : (
              history.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))
            )}
          </div>
        )}
        {activeTab === 'backup' && (
          <BackupPanel />
        )}
      </div>

      <style>{`
        .annotation-panel-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .panel-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .tab {
          flex: 1;
          padding: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        .tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }

        .new-annotation-form {
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
          background-color: var(--bg-tertiary);
          flex-shrink: 0;
        }

        .selected-text {
          margin-bottom: 8px;
          font-size: 12px;
        }

        .selected-text .label {
          color: var(--text-secondary);
          margin-right: 4px;
        }

        .selected-text .text {
          color: var(--text-primary);
          font-style: italic;
        }

        .type-selector {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }

        .type-btn {
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 4px;
          background-color: var(--bg-secondary);
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .type-btn:hover {
          background-color: var(--bg-hover);
        }

        .type-btn.active {
          background-color: var(--type-color);
          color: white;
        }

        .new-annotation-form textarea {
          width: 100%;
          margin-bottom: 8px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .cancel-btn {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .cancel-btn:hover {
          background-color: var(--bg-hover);
        }

        .add-btn {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 4px;
          background-color: var(--accent-color);
          color: white;
        }

        .add-btn:hover:not(:disabled) {
          background-color: var(--accent-hover);
        }

        .filter-bar {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .filter-bar select {
          width: 100%;
          padding: 6px 8px;
          font-size: 12px;
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-secondary);
          text-align: center;
        }

        .empty-state .hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        .annotations-list {
          padding: 8px 0;
        }
      `}</style>
    </div>
  );
}

export default AnnotationPanel;

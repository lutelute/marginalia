import React from 'react';
import type { HistoryEntryV2 } from '../../types/annotations';

const ACTION_ICONS: Record<string, string> = {
  comment: '💬',
  review: '✏️',
  pending: '⏳',
  discussion: '💭',
  edit: '📝',
};

const ACTION_LABELS = {
  comment: 'コメント',
  review: '校閲',
  pending: '保留',
  discussion: '議論',
  edit: '編集',
};

function HistoryItem({ item }: { item: HistoryEntryV2 }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const icon = ACTION_ICONS[item.action] || '📄';

  return (
    <div className="history-item">
      <div className="history-icon">{icon}</div>
      <div className="history-content">
        <div className="history-summary">{item.summary}</div>
        <div className="history-time">{formatDate(item.timestamp)}</div>
      </div>

      <style>{`
        .history-item {
          display: flex;
          align-items: flex-start;
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.2s;
        }

        .history-item:hover {
          background-color: var(--bg-hover);
        }

        .history-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-tertiary);
          border-radius: 50%;
          margin-right: 12px;
          flex-shrink: 0;
          font-size: 14px;
        }

        .history-content {
          flex: 1;
          min-width: 0;
        }

        .history-summary {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }

        .history-time {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

export default HistoryItem;

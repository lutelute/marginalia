import React from 'react';
import type { HistoryEntryV2 } from '../../types/annotations';
import AuthorBadge from './AuthorBadge';

const ACTION_ICONS: Record<string, string> = {
  comment: '💬',
  review: '✏️',
  pending: '⏳',
  discussion: '💭',
  edit: '📝',
  delete: '🗑️',
  reply: '↩️',
  resolve: '✅',
  unresolve: '🔄',
  keep: '📌',
  reassign: '🔗',
  orphan: '⚠️',
};

const DETAIL_MAX = 60;
const clip = (text: string) => (text.length > DETAIL_MAX ? `${text.slice(0, DETAIL_MAX)}…` : text);

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
        {item.detail?.before !== undefined && item.detail?.after !== undefined && (
          <div className="history-detail">
            <span className="history-detail-before">{clip(item.detail.before)}</span>
            {' → '}
            <span className="history-detail-after">{clip(item.detail.after)}</span>
          </div>
        )}
        <div className="history-time">
          {item.author && (
            <>
              <AuthorBadge author={item.author} authorId={item.authorId} />
              {' ・ '}
            </>
          )}
          {formatDate(item.timestamp)}
        </div>
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
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .history-detail {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
          word-break: break-word;
        }

        .history-detail-before {
          text-decoration: line-through;
          opacity: 0.7;
        }

        .history-detail-after {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default HistoryItem;

import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

interface AuthorBadgeProps {
  author: string;
  authorId?: string;
}

/** 設定のユーザー一覧に居ない著者（共有された .mrgl の他者など）のフォールバック色 */
const UNKNOWN_AUTHOR_COLOR = '#9e9e9e';

/**
 * 注釈・返信の著者表示バッジ（色ドット + 名前）。
 * 設定のユーザー一覧と authorId（無ければ名前）で照合して色を引く。
 * 他環境で作られた注釈は一覧に居ないため、ニュートラル色で表示する。
 */
function AuthorBadge({ author, authorId }: AuthorBadgeProps) {
  const { users } = useSettings();
  const matched =
    (authorId ? users.find((u) => u.id === authorId) : undefined) ||
    users.find((u) => u.name === author);
  const color = matched?.color || UNKNOWN_AUTHOR_COLOR;

  return (
    <span className="author-badge">
      <span className="author-badge-dot" style={{ backgroundColor: color }} />
      {author}
      <style>{`
        .author-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .author-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </span>
  );
}

export default AuthorBadge;

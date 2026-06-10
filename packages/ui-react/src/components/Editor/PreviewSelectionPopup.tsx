// ---------------------------------------------------------------------------
// SelectionPopup / AnnotationForm
// ---------------------------------------------------------------------------
// AnnotatedPreview.tsx から切り出したテキスト選択ポップアップと注釈入力フォーム。
// 見た目・挙動は不変。

import React from 'react';
import { ANNOTATION_TYPE_CONFIGS } from '../../constants/annotationTypes';

// ---------------------------------------------------------------------------
// SelectionPopup
// ---------------------------------------------------------------------------

export function SelectionPopup({
  onSelect,
  style,
}: {
  onSelect: (type: string) => void;
  style: React.CSSProperties;
}) {
  return (
    <div className="ta-selection-popup" style={style} onMouseDown={(e) => e.preventDefault()}>
      {ANNOTATION_TYPE_CONFIGS.map((type) => (
        <button
          key={type.id}
          className="ta-popup-btn"
          style={{ backgroundColor: type.cssVar }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(type.id);
          }}
          title={type.label}
        >
          <span>{type.icon}</span>
          <span className="ta-popup-label">{type.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnnotationForm
// ---------------------------------------------------------------------------

export function AnnotationForm({
  type,
  selectedText,
  onSubmit,
  onCancel,
}: {
  type: string;
  selectedText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = React.useState('');
  const typeInfo = ANNOTATION_TYPE_CONFIGS.find((t) => t.id === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) onSubmit(content);
  };

  return (
    <div className="ta-form-overlay" onClick={onCancel}>
      <form className="ta-form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="ta-form-header">
          <span style={{ backgroundColor: typeInfo?.cssVar }}>
            {typeInfo?.icon} {typeInfo?.label}
          </span>
        </div>
        <div className="ta-form-text">
          &ldquo;{selectedText.slice(0, 100)}
          {selectedText.length > 100 ? '...' : ''}&rdquo;
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="注釈を入力..."
          rows={4}
          autoFocus
        />
        <div className="ta-form-actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" disabled={!content.trim()}>
            追加
          </button>
        </div>
      </form>
    </div>
  );
}

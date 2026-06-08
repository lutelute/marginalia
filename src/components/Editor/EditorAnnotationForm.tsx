import React, { useState } from 'react';
import { AnnotationType } from '../../types/annotations';
import { ANNOTATION_TYPES } from './editorToolbar';
import { ANNOTATION_FORM_STYLES } from './editorStyles';

interface EditorAnnotationFormProps {
  type: AnnotationType | null;
  selectedText: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export default function EditorAnnotationForm({ type, selectedText, onSubmit, onCancel }: EditorAnnotationFormProps) {
  const [content, setContent] = useState('');
  const typeInfo = ANNOTATION_TYPES.find((t) => t.id === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
    }
  };

  return (
    <div className="editor-annotation-form-overlay">
      <form className="editor-annotation-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <span className="form-type" style={{ backgroundColor: typeInfo?.color }}>
            {typeInfo?.icon} {typeInfo?.label}
          </span>
        </div>
        <div className="form-selected-text">
          "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="注釈を入力..."
          rows={4}
          autoFocus
        />
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className="submit-btn" disabled={!content.trim()}>
            追加
          </button>
        </div>
      </form>

      <style>{ANNOTATION_FORM_STYLES}</style>
    </div>
  );
}

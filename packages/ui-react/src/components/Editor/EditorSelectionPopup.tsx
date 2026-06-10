import React, { useEffect, useRef, useState } from 'react';
import { AnnotationType } from '../../types/annotations';
import { ANNOTATION_TYPES } from './editorToolbar';
import { SELECTION_POPUP_STYLES } from './editorStyles';

interface EditorSelectionPopupProps {
  position: { x: number; y: number };
  onSelect: (type: AnnotationType) => void;
  onClose: () => void;
}

export default function EditorSelectionPopup({ position, onSelect, onClose }: EditorSelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isReady]);

  return (
    <div
      ref={popupRef}
      className="editor-selection-popup"
      style={{ top: position.y, left: position.x }}
    >
      {ANNOTATION_TYPES.map((type) => (
        <button
          key={type.id}
          className="popup-btn"
          style={{ '--btn-color': type.color } as React.CSSProperties}
          onClick={() => onSelect(type.id)}
          title={type.label}
        >
          <span className="popup-icon">{type.icon}</span>
          <span className="popup-label">{type.label}</span>
        </button>
      ))}

      <style>{SELECTION_POPUP_STYLES}</style>
    </div>
  );
}

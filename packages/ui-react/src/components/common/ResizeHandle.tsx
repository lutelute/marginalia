import React, { useCallback, useRef } from 'react';

export function ResizeHandle({ onResize, position }: { onResize: (clientX: number) => void; position: 'left' | 'right' }) {
  const handleRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      onResize(e.clientX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize]);

  return (
    <div
      ref={handleRef}
      className={`resize-handle ${position}`}
      onMouseDown={handleMouseDown}
    >
      <div className="resize-handle-bar" />
    </div>
  );
}

export function VerticalResizeHandle({ onResize }: { onResize: (ratio: number) => void }) {
  const isDragging = useRef(false);
  const parentRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    parentRef.current = (e.target as HTMLElement).parentElement;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !parentRef.current) return;
      const parentRect = parentRef.current.getBoundingClientRect();
      const ratio = ((e.clientY - parentRect.top) / parentRect.height) * 100;
      onResize(ratio);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      parentRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize]);

  return (
    <div className="vertical-resize-handle" onMouseDown={handleMouseDown}>
      <div className="vertical-resize-handle-bar" />
    </div>
  );
}

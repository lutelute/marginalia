import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useAnnotations(filePath) {
  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnnotations = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.readMarginalia(filePath);
      if (result.success) {
        setAnnotations(result.data.annotations || []);
        setHistory(result.data.history || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  const saveAnnotations = useCallback(async () => {
    if (!filePath) return;

    const data = {
      version: 1,
      filePath,
      lastModified: new Date().toISOString(),
      annotations,
      history,
    };

    await window.electronAPI.writeMarginalia(filePath, data);
  }, [filePath, annotations, history]);

  const addAnnotation = useCallback((type, content, selection) => {
    const newAnnotation = {
      id: uuidv4(),
      type,
      startLine: selection.startLine,
      endLine: selection.endLine,
      startChar: selection.startChar,
      endChar: selection.endChar,
      selectedText: selection.text,
      content,
      author: 'user',
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };

    setAnnotations((prev) => [...prev, newAnnotation]);

    setHistory((prev) => [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: type,
        summary: `${type}を追加`,
      },
      ...prev,
    ].slice(0, 100));

    return newAnnotation;
  }, []);

  const updateAnnotation = useCallback((id, updates) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addReply = useCallback((annotationId, content) => {
    const reply = {
      id: uuidv4(),
      content,
      author: 'user',
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === annotationId
          ? { ...a, replies: [...a.replies, reply] }
          : a
      )
    );
  }, []);

  return {
    annotations,
    history,
    isLoading,
    loadAnnotations,
    saveAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addReply,
  };
}

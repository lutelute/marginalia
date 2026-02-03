import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFile } from './FileContext';
import { Annotation, AnnotationStatus } from '../types';

const AnnotationContext = createContext(null);

const initialState = {
  annotations: [] as Annotation[],
  history: [],
  selectedAnnotation: null,
  isLoading: false,
  pendingSelection: null, // テキスト選択時の一時データ
  scrollToLine: null as { line: number; annotationId: string } | null, // エディタへのジャンプ用
  documentText: '', // 現在のドキュメントテキスト（孤立検出用）
};

function annotationReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        annotations: action.payload.annotations || [],
        history: action.payload.history || [],
        isLoading: false,
      };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        pendingSelection: null,
      };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        selectedAnnotation:
          state.selectedAnnotation === action.payload ? null : state.selectedAnnotation,
      };

    case 'SELECT_ANNOTATION':
      return {
        ...state,
        selectedAnnotation: action.payload,
      };

    case 'SET_PENDING_SELECTION':
      return {
        ...state,
        pendingSelection: action.payload,
      };

    case 'ADD_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history].slice(0, 100), // 最新100件を保持
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'CLEAR':
      return {
        ...initialState,
      };

    case 'SET_SCROLL_TO_LINE':
      return {
        ...state,
        scrollToLine: action.payload,
      };

    case 'SET_DOCUMENT_TEXT':
      return {
        ...state,
        documentText: action.payload,
      };

    case 'UPDATE_ANNOTATION_STATUS':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a
        ),
      };

    case 'BULK_UPDATE_STATUS':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          action.payload.ids.includes(a.id) ? { ...a, status: action.payload.status } : a
        ),
      };

    case 'REASSIGN_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? {
                ...a,
                selectedText: action.payload.newText,
                occurrenceIndex: action.payload.occurrenceIndex ?? 0,
                status: 'active' as AnnotationStatus,
              }
            : a
        ),
      };

    default:
      return state;
  }
}

export function AnnotationProvider({ children }) {
  const [state, dispatch] = useReducer(annotationReducer, initialState);
  const { currentFile } = useFile();

  // ファイル変更時にMarginaliaデータをロード
  useEffect(() => {
    if (!currentFile) {
      dispatch({ type: 'CLEAR' });
      return;
    }

    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await window.electronAPI.readMarginalia(currentFile);
      if (result.success) {
        dispatch({ type: 'LOAD_DATA', payload: result.data });
      }
    };

    loadData();
  }, [currentFile]);

  // データ変更時に自動保存
  const saveMarginalia = useCallback(async () => {
    if (!currentFile) return;

    const data = {
      _tool: 'marginalia',
      _version: '1.0.0',
      filePath: currentFile,
      fileName: currentFile.split('/').pop(),
      lastModified: new Date().toISOString(),
      annotations: state.annotations,
      history: state.history,
    };

    await window.electronAPI.writeMarginalia(currentFile, data);
  }, [currentFile, state.annotations, state.history]);

  // annotations/history変更時に保存
  useEffect(() => {
    if (currentFile && !state.isLoading) {
      saveMarginalia();
    }
  }, [state.annotations, state.history, currentFile, state.isLoading, saveMarginalia]);

  const addAnnotation = useCallback((type, content, selection) => {
    const annotation = {
      id: uuidv4(),
      type, // 'comment' | 'review' | 'pending' | 'discussion'
      startLine: selection.startLine,
      endLine: selection.endLine,
      startChar: selection.startChar,
      endChar: selection.endChar,
      selectedText: selection.text,
      // 同一テキストの何番目の出現か（0始まり）
      occurrenceIndex: selection.occurrenceIndex ?? 0,
      blockId: selection.blockId || null, // ブロック要素へのジャンプ用ID
      content,
      author: 'user',
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });

    // 履歴に追加
    dispatch({
      type: 'ADD_HISTORY',
      payload: {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: type,
        summary: `${type}を追加: "${selection.text.slice(0, 30)}..."`,
      },
    });
  }, []);

  const updateAnnotation = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, ...updates } });
  }, []);

  const deleteAnnotation = useCallback((id) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: id });
  }, []);

  const selectAnnotation = useCallback((id) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: id });
  }, []);

  const setPendingSelection = useCallback((selection) => {
    dispatch({ type: 'SET_PENDING_SELECTION', payload: selection });
  }, []);

  const addReply = useCallback((annotationId, content) => {
    const reply = {
      id: uuidv4(),
      content,
      author: 'user',
      createdAt: new Date().toISOString(),
    };

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        id: annotationId,
        replies: [
          ...(state.annotations.find((a) => a.id === annotationId)?.replies || []),
          reply,
        ],
      },
    });
  }, [state.annotations]);

  const resolveAnnotation = useCallback((id, resolved = true) => {
    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: { id, resolved },
    });
  }, []);

  const scrollToEditorLine = useCallback((line: number, annotationId: string) => {
    dispatch({
      type: 'SET_SCROLL_TO_LINE',
      payload: { line, annotationId },
    });
  }, []);

  const clearScrollToLine = useCallback(() => {
    dispatch({
      type: 'SET_SCROLL_TO_LINE',
      payload: null,
    });
  }, []);

  // ドキュメントテキストを更新（孤立検出用）
  const setDocumentText = useCallback((text: string) => {
    dispatch({ type: 'SET_DOCUMENT_TEXT', payload: text });
  }, []);

  // 注釈のステータスを変更
  const setAnnotationStatus = useCallback((id: string, status: AnnotationStatus) => {
    dispatch({ type: 'UPDATE_ANNOTATION_STATUS', payload: { id, status } });
  }, []);

  // 注釈を保持（kept状態に）
  const keepAnnotation = useCallback((id: string) => {
    setAnnotationStatus(id, 'kept');
  }, [setAnnotationStatus]);

  // 注釈を再割当
  const reassignAnnotation = useCallback((id: string, newText: string, occurrenceIndex?: number) => {
    dispatch({
      type: 'REASSIGN_ANNOTATION',
      payload: { id, newText, occurrenceIndex },
    });
  }, []);

  // 孤立注釈を検出
  const detectOrphanedAnnotations = useCallback((documentText: string) => {
    if (!documentText || state.annotations.length === 0) return [];

    const orphaned: string[] = [];
    const reactivated: string[] = [];

    state.annotations.forEach((annotation) => {
      // 既にkept状態の注釈はスキップ
      if (annotation.status === 'kept') return;
      // 解決済みはスキップ
      if (annotation.resolved) return;
      // ブロック注釈は別処理（今回はスキップ）
      if (annotation.blockId) return;

      const searchText = annotation.selectedText;
      if (!searchText) return;

      // テキストの出現回数をカウント
      let count = 0;
      let index = 0;
      while ((index = documentText.indexOf(searchText, index)) !== -1) {
        count++;
        index += 1;
      }

      const targetOccurrence = annotation.occurrenceIndex ?? 0;

      // 出現回数が足りない場合は孤立
      if (count <= targetOccurrence) {
        // まだorphanedでない場合のみ追加
        if (annotation.status !== 'orphaned') {
          orphaned.push(annotation.id);
        }
      } else {
        // テキストが見つかった場合、orphanedからactiveに戻す
        if (annotation.status === 'orphaned') {
          reactivated.push(annotation.id);
        }
      }
    });

    // 孤立注釈のステータスを更新
    if (orphaned.length > 0) {
      dispatch({
        type: 'BULK_UPDATE_STATUS',
        payload: { ids: orphaned, status: 'orphaned' as AnnotationStatus },
      });
    }

    // 再アクティブ化
    if (reactivated.length > 0) {
      dispatch({
        type: 'BULK_UPDATE_STATUS',
        payload: { ids: reactivated, status: 'active' as AnnotationStatus },
      });
    }

    return orphaned;
  }, [state.annotations]);

  // 孤立注釈のリスト
  const orphanedAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'orphaned');
  }, [state.annotations]);

  // 保持された注釈のリスト
  const keptAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'kept');
  }, [state.annotations]);

  // アクティブな注釈のリスト
  const activeAnnotations = useMemo(() => {
    return state.annotations.filter((a) => !a.status || a.status === 'active');
  }, [state.annotations]);

  const value = {
    ...state,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    setPendingSelection,
    addReply,
    resolveAnnotation,
    scrollToEditorLine,
    clearScrollToLine,
    // 孤立注釈管理
    setDocumentText,
    setAnnotationStatus,
    keepAnnotation,
    reassignAnnotation,
    detectOrphanedAnnotations,
    orphanedAnnotations,
    keptAnnotations,
    activeAnnotations,
  };

  return (
    <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
  );
}

export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotation must be used within an AnnotationProvider');
  }
  return context;
}

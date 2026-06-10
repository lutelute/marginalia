import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFile } from './FileContext';
import {
  AnnotationV2,
  AnnotationStatus,
  AnnotationType,
  AnnotationReply,
  AnnotationSelector,
  AnnotationTarget,
  HistoryEntryV2,
  MarginaliaFileV1,
  MarginaliaFileV2,
  PendingSelectionV2,
} from '../types/annotations';
import { migrateFile } from '@marginalia/annotation-core';
import { usePorts } from './PortsContext';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';
import {
  anchorAnnotation,
  getAnnotationExactText,
  rebuildSelectors,
  isSelectorDrifted,
} from '../utils/selectorUtils';

// --- State ---

interface AnnotationCacheEntry {
  annotations: AnnotationV2[];
  history: HistoryEntryV2[];
}

interface AnnotationState {
  annotations: AnnotationV2[];
  history: HistoryEntryV2[];
  selectedAnnotation: string | null;
  isLoading: boolean;
  pendingSelection: PendingSelectionV2 | null;
  scrollToLine: { line: number; annotationId: string } | null;
  documentText: string;
  annotationCache: Record<string, AnnotationCacheEntry>;
}

const initialState: AnnotationState = {
  annotations: [],
  history: [],
  selectedAnnotation: null,
  isLoading: false,
  pendingSelection: null,
  scrollToLine: null,
  documentText: '',
  annotationCache: {},
};

// --- Actions ---

type AnnotationAction =
  | { type: 'LOAD_DATA'; payload: { annotations: AnnotationV2[]; history: HistoryEntryV2[] } }
  | { type: 'ADD_ANNOTATION'; payload: AnnotationV2 }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string } & Partial<AnnotationV2> }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'SET_PENDING_SELECTION'; payload: PendingSelectionV2 | null }
  | { type: 'ADD_HISTORY'; payload: HistoryEntryV2 }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR' }
  | { type: 'SET_SCROLL_TO_LINE'; payload: { line: number; annotationId: string } | null }
  | { type: 'SET_DOCUMENT_TEXT'; payload: string }
  | { type: 'UPDATE_ANNOTATION_STATUS'; payload: { id: string; status: AnnotationStatus } }
  | { type: 'BULK_UPDATE_STATUS'; payload: { ids: string[]; status: AnnotationStatus } }
  | { type: 'REASSIGN_ANNOTATION'; payload: { id: string; newSelectors: AnnotationSelector[] } }
  | { type: 'CACHE_ANNOTATIONS'; payload: { filePath: string; annotations: AnnotationV2[]; history: HistoryEntryV2[] } }
  | { type: 'EVICT_ANNOTATION_CACHE'; payload: string };

// --- Reducer ---

function annotationReducer(state: AnnotationState, action: AnnotationAction): AnnotationState {
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
        history: [action.payload, ...state.history].slice(0, 100),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'CLEAR':
      return { ...initialState };

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
          a.id === action.payload.id
            ? {
                ...a,
                status: action.payload.status,
                resolvedAt: action.payload.status === 'resolved' ? new Date().toISOString() : a.resolvedAt,
              }
            : a
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
                target: { ...a.target, selectors: action.payload.newSelectors },
                status: 'active' as AnnotationStatus,
              }
            : a
        ),
      };

    case 'CACHE_ANNOTATIONS':
      return {
        ...state,
        annotationCache: {
          ...state.annotationCache,
          [action.payload.filePath]: {
            annotations: action.payload.annotations,
            history: action.payload.history,
          },
        },
      };

    case 'EVICT_ANNOTATION_CACHE':
      {
        const { [action.payload]: _, ...rest } = state.annotationCache;
        return {
          ...state,
          annotationCache: rest,
        };
      }

    default:
      return state;
  }
}

// --- Context ---

export interface AnnotationContextValue extends AnnotationState {
  addAnnotation: (
    type: AnnotationType,
    content: string,
    selection: PendingSelectionV2 & { text?: string }
  ) => void;
  updateAnnotation: (id: string, updates: Partial<AnnotationV2>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  setPendingSelection: (selection: PendingSelectionV2 | null) => void;
  addReply: (annotationId: string, replyContent: string) => void;
  resolveAnnotation: (id: string, resolved?: boolean) => void;
  scrollToEditorLine: (line: number, annotationId: string) => void;
  clearScrollToLine: () => void;
  setDocumentText: (text: string) => void;
  setAnnotationStatus: (id: string, status: AnnotationStatus) => void;
  keepAnnotation: (id: string) => void;
  reassignAnnotation: (id: string, newText: string, occurrenceIndex?: number) => void;
  detectOrphanedAnnotations: (documentText: string) => string[];
  clearAnnotationCache: (filePath: string) => void;
  orphanedAnnotations: AnnotationV2[];
  keptAnnotations: AnnotationV2[];
  activeAnnotations: AnnotationV2[];
  resolvedAnnotations: AnnotationV2[];
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(annotationReducer, initialState);
  const { currentFile, content, reloadNonce } = useFile();
  const ports = usePorts();
  const { currentUser } = useSettings();
  const { info: toastInfo } = useToast();

  // 設定の現在ユーザーを注釈の author / authorId に使う（未設定時は 'user'）
  const authorName = currentUser?.name?.trim() || 'user';
  const authorId = currentUser?.id || undefined;

  // 最新値の参照用（reloadNonce 起点の effect から依存を増やさず読むため）。
  // 依存なし effect は毎コミット実行され、宣言順で後続の effect より先に走る。
  const currentFileRef = React.useRef<string | null>(null);
  const contentRef = React.useRef<string>('');
  useEffect(() => {
    currentFileRef.current = currentFile;
    contentRef.current = content;
  });

  // ディスクから .mrgl を読み込んで state に反映（V1 形式は読み込み時にマイグレーション）
  const loadAnnotationsFromDisk = useCallback(
    async (filePath: string, docText?: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await ports.annotations.read(filePath);
      if (result && result.success && result.data) {
        if (result.needsMigration) {
          // V1→V2マイグレーション
          const v2Data = migrateFile(result.data as unknown as MarginaliaFileV1, docText);
          dispatch({
            type: 'LOAD_DATA',
            payload: {
              annotations: v2Data.annotations,
              history: v2Data.history,
            },
          });
        } else {
          dispatch({
            type: 'LOAD_DATA',
            payload: {
              annotations: result.data.annotations || [],
              history: result.data.history || [],
            },
          });
        }
      } else {
        // ファイルに .marginalia がない場合はクリア
        dispatch({
          type: 'LOAD_DATA',
          payload: { annotations: [], history: [] },
        });
      }
    },
    [ports]
  );

  // ファイル変更時: 現在のデータをキャッシュに保存してから切替
  const prevFileRef = React.useRef<string | null>(null);

  useEffect(() => {
    // 前のファイルの注釈をキャッシュに保存
    if (prevFileRef.current && prevFileRef.current !== currentFile && state.annotations.length > 0) {
      dispatch({
        type: 'CACHE_ANNOTATIONS',
        payload: {
          filePath: prevFileRef.current,
          annotations: state.annotations,
          history: state.history,
        },
      });
    }
    prevFileRef.current = currentFile;

    if (!currentFile) {
      dispatch({ type: 'CLEAR' });
      return;
    }

    // YAML ファイルの場合は注釈読み込みをスキップ
    if (/\.ya?ml$/i.test(currentFile)) {
      dispatch({ type: 'LOAD_DATA', payload: { annotations: [], history: [] } });
      return;
    }

    // キャッシュにあればディスク読み込みスキップ
    if (state.annotationCache[currentFile]) {
      const cached = state.annotationCache[currentFile];
      dispatch({
        type: 'LOAD_DATA',
        payload: {
          annotations: cached.annotations,
          history: cached.history,
        },
      });
      return;
    }

    loadAnnotationsFromDisk(currentFile, content || undefined);
  }, [currentFile, ports]);

  // 外部変更による再読み込み（reloadFile）時: .mrgl もディスクから読み直す。
  // git pull や共同編集で .md と一緒に .mrgl が更新されるケースに追従するため、
  // 注釈キャッシュをバイパスして必ずディスクを読む。
  useEffect(() => {
    if (reloadNonce === 0) return;
    const filePath = currentFileRef.current;
    if (!filePath || /\.ya?ml$/i.test(filePath)) return;
    loadAnnotationsFromDisk(filePath, contentRef.current || undefined);
  }, [reloadNonce, loadAnnotationsFromDisk]);

  // 自アプリの .mrgl 保存直後タイムスタンプ（外部変更イベントの自己起因ガード用）。
  // 自動保存の書き込み → fs.watch イベント（500ms debounce）の往復を吸収できる長さにする
  const lastAnnotationSaveAtRef = React.useRef(0);
  const SELF_ANNOTATION_SAVE_IGNORE_MS = 1500;

  // .mrgl 単独の外部変更（注釈だけが git pull で届いた等）: サイレント再読込。
  // md 本文は変わらないため再アンカー不要で、確認バナーは出さない（トーストのみ）。
  useEffect(() => {
    const unsubscribe = ports.watcher.onAnnotationsChanged((docPath) => {
      if (docPath !== currentFileRef.current) return;
      if (Date.now() - lastAnnotationSaveAtRef.current < SELF_ANNOTATION_SAVE_IGNORE_MS) return;
      loadAnnotationsFromDisk(docPath, contentRef.current || undefined);
      toastInfo('注釈が外部で更新されました');
    });
    return unsubscribe;
  }, [ports, loadAnnotationsFromDisk, toastInfo]);

  // データ変更時に自動保存（V2形式）
  const saveMarginalia = useCallback(async () => {
    if (!currentFile) return;

    const data: MarginaliaFileV2 = {
      _tool: 'marginalia',
      _version: '2.1.0',
      filePath: currentFile,
      fileName: currentFile.split('/').pop() || '',
      lastModified: new Date().toISOString(),
      annotations: state.annotations,
      history: state.history,
    };

    // 自己起因の .mrgl 変更イベントを無視するためのタイムスタンプ
    lastAnnotationSaveAtRef.current = Date.now();
    await ports.annotations.write(currentFile, data);
  }, [currentFile, state.annotations, state.history, ports]);

  // annotations/history変更時に保存 + キャッシュ更新
  useEffect(() => {
    if (currentFile && !state.isLoading) {
      saveMarginalia();
      // キャッシュも更新
      dispatch({
        type: 'CACHE_ANNOTATIONS',
        payload: {
          filePath: currentFile,
          annotations: state.annotations,
          history: state.history,
        },
      });
    }
  }, [state.annotations, state.history, currentFile, state.isLoading, saveMarginalia]);

  // --- Actions ---

  const addAnnotation = useCallback(
    (type: AnnotationType, content: string, selection: PendingSelectionV2 & { text?: string }) => {
      const now = new Date().toISOString();
      const target: AnnotationTarget = {
        source: currentFile || '',
        selectors: selection.selectors || [],
      };

      const annotation: AnnotationV2 = {
        id: uuidv4(),
        type,
        target,
        content,
        author: authorName,
        authorId,
        createdAt: now,
        status: 'active',
        replies: [],
        blockId: selection.blockId || undefined,
      };

      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });

      // 履歴に追加
      const selectedText = selection.text || getAnnotationExactText(annotation);
      dispatch({
        type: 'ADD_HISTORY',
        payload: {
          id: uuidv4(),
          timestamp: now,
          action: type,
          summary: `${type}を追加: "${selectedText.slice(0, 30)}..."`,
          annotationId: annotation.id,
        },
      });
    },
    [currentFile, authorName, authorId]
  );

  const updateAnnotation = useCallback((id: string, updates: Partial<AnnotationV2>) => {
    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: { id, ...updates, updatedAt: new Date().toISOString() },
    });
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: id });
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: id });
  }, []);

  const setPendingSelection = useCallback((selection: PendingSelectionV2 | null) => {
    dispatch({ type: 'SET_PENDING_SELECTION', payload: selection });
  }, []);

  const addReply = useCallback(
    (annotationId: string, replyContent: string) => {
      const reply: AnnotationReply = {
        id: uuidv4(),
        content: replyContent,
        author: authorName,
        authorId,
        createdAt: new Date().toISOString(),
      };

      const annotation = state.annotations.find((a) => a.id === annotationId);
      if (annotation) {
        dispatch({
          type: 'UPDATE_ANNOTATION',
          payload: {
            id: annotationId,
            replies: [...annotation.replies, reply],
          },
        });
      }
    },
    [state.annotations, authorName, authorId]
  );

  const resolveAnnotation = useCallback((id: string, resolved: boolean = true) => {
    dispatch({
      type: 'UPDATE_ANNOTATION_STATUS',
      payload: { id, status: resolved ? 'resolved' : 'active' },
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

  const setDocumentText = useCallback((text: string) => {
    dispatch({ type: 'SET_DOCUMENT_TEXT', payload: text });
  }, []);

  const clearAnnotationCache = useCallback((filePath: string) => {
    dispatch({ type: 'EVICT_ANNOTATION_CACHE', payload: filePath });
  }, []);

  const setAnnotationStatus = useCallback((id: string, status: AnnotationStatus) => {
    dispatch({ type: 'UPDATE_ANNOTATION_STATUS', payload: { id, status } });
  }, []);

  const keepAnnotation = useCallback(
    (id: string) => {
      setAnnotationStatus(id, 'kept');
    },
    [setAnnotationStatus]
  );

  const reassignAnnotation = useCallback(
    (id: string, newText: string, occurrenceIndex?: number) => {
      // ドキュメントテキストから新しいセレクタを生成
      const docText = state.documentText || content || '';
      const newSelectors: AnnotationSelector[] = [];

      if (docText && newText) {
        let count = 0;
        let searchFrom = 0;
        const targetOcc = occurrenceIndex ?? 0;
        let foundPos = -1;

        while (true) {
          const pos = docText.indexOf(newText, searchFrom);
          if (pos === -1) break;
          if (count === targetOcc) {
            foundPos = pos;
            break;
          }
          count++;
          searchFrom = pos + 1;
        }

        if (foundPos >= 0) {
          const prefix = docText.slice(Math.max(0, foundPos - 50), foundPos);
          const suffix = docText.slice(foundPos + newText.length, foundPos + newText.length + 50);

          newSelectors.push({
            type: 'TextQuoteSelector',
            exact: newText,
            prefix: prefix || undefined,
            suffix: suffix || undefined,
          });
          newSelectors.push({
            type: 'TextPositionSelector',
            start: foundPos,
            end: foundPos + newText.length,
          });
        } else {
          // テキストが見つからなくてもTextQuoteSelectorは設定
          newSelectors.push({
            type: 'TextQuoteSelector',
            exact: newText,
          });
        }
      } else {
        newSelectors.push({
          type: 'TextQuoteSelector',
          exact: newText,
        });
      }

      dispatch({
        type: 'REASSIGN_ANNOTATION',
        payload: { id, newSelectors },
      });
    },
    [state.documentText, content]
  );

  // 孤立注釈を検出し、再びテキストが見つかったものは位置を自動再マッチング
  const detectOrphanedAnnotations = useCallback(
    (documentText: string) => {
      if (!documentText || state.annotations.length === 0) return [];

      const orphaned: string[] = [];
      // 再アンカーに成功し、かつ位置がズレている注釈はセレクタを作り直す
      // （orphaned からの復帰・編集による位置ドリフトの両方をこれで吸収する）
      const rematched: { id: string; newSelectors: AnnotationSelector[] }[] = [];

      state.annotations.forEach((annotation) => {
        // kept/resolved/archivedはスキップ
        if (annotation.status === 'kept') return;
        if (annotation.status === 'resolved') return;
        if (annotation.status === 'archived') return;
        // ブロック注釈は別処理
        if (annotation.blockId) return;

        const result = anchorAnnotation(documentText, annotation);

        if (!result) {
          // アンカー失敗 → orphaned
          if (annotation.status !== 'orphaned') {
            orphaned.push(annotation.id);
          }
        } else {
          // アンカー成功 → 位置が変わっていれば（または orphaned からの復帰なら）
          // 最新位置でセレクタを再生成して追従させる
          const wasOrphaned = annotation.status === 'orphaned';
          if (wasOrphaned || isSelectorDrifted(annotation, result)) {
            rematched.push({
              id: annotation.id,
              newSelectors: rebuildSelectors(documentText, result.start, result.end),
            });
          }
        }
      });

      if (orphaned.length > 0) {
        dispatch({
          type: 'BULK_UPDATE_STATUS',
          payload: { ids: orphaned, status: 'orphaned' },
        });
      }

      // 再マッチング: 各注釈のセレクタを最新位置で更新し status を active に戻す
      for (const { id, newSelectors } of rematched) {
        dispatch({ type: 'REASSIGN_ANNOTATION', payload: { id, newSelectors } });
      }

      return orphaned;
    },
    [state.annotations]
  );

  // ドキュメント内容の変更に追従して孤立検出＋再アンカーを実行（debounce付き）。
  // パネルの表示状態に依存させないため、Provider 自身が監視する。
  // detectOrphanedAnnotations を依存に含めても、再アンカー結果が安定すれば
  // 2周目以降は dispatch が発生せず収束する。
  useEffect(() => {
    if (!content || state.annotations.length === 0) return;

    const timer = setTimeout(() => {
      detectOrphanedAnnotations(content);
    }, 500);

    return () => clearTimeout(timer);
  }, [content, detectOrphanedAnnotations, state.annotations.length]);

  // --- Memoized Selectors ---

  const orphanedAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'orphaned');
  }, [state.annotations]);

  const keptAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'kept');
  }, [state.annotations]);

  const activeAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'active');
  }, [state.annotations]);

  const resolvedAnnotations = useMemo(() => {
    return state.annotations.filter((a) => a.status === 'resolved');
  }, [state.annotations]);

  const value: AnnotationContextValue = {
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
    setDocumentText,
    setAnnotationStatus,
    keepAnnotation,
    reassignAnnotation,
    detectOrphanedAnnotations,
    clearAnnotationCache,
    annotationCache: state.annotationCache,
    orphanedAnnotations,
    keptAnnotations,
    activeAnnotations,
    resolvedAnnotations,
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

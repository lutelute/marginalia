import React, { useEffect, useRef, useCallback, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFile } from '../../contexts/FileContext';
import { useAnnotation } from '../../contexts/AnnotationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useBuild } from '../../contexts/BuildContext';
import { createMarkdownCompletions } from '../../codemirror/completions';
import {
  dispatchAnnotations,
  dispatchFlashHighlight,
  findAnnotationPositionInDoc,
} from './annotationDecorations';
import { createSelectorsFromEditorSelection, getEditorPosition } from '../../utils/selectorUtils';
import { AnnotationV2, PendingSelectionV2, AnnotationType } from '../../types/annotations';
import {
  getEditorVisibleLine,
  getEditorVisibleRange,
  scrollEditorToLine,
} from '../../utils/scrollSync';
import Minimap from './Minimap';
import AnnotationHoverCard from '../Annotations/AnnotationHoverCard';
import { TOOLBAR_ITEMS, ToolbarItem } from './editorToolbar';
import { completionCompartment, buildEditorExtensions } from './editorSetup';
import { embedAnnotationsToMarkdown, generateHTMLWithAnnotations } from './exportUtils';
import EditorSelectionPopup from './EditorSelectionPopup';
import EditorAnnotationForm from './EditorAnnotationForm';
import { EDITOR_EMPTY_STYLES, MARKDOWN_EDITOR_STYLES } from './editorStyles';

// EditorViewを外部と共有するためのContext
export const EditorViewContext = React.createContext<{
  view: EditorView | null;
  scrollToLine: (line: number) => void;
  getVisibleLine: () => number;
  getVisibleRange: () => { startLine: number; endLine: number };
} | null>(null);

export function useEditorView() {
  return React.useContext(EditorViewContext);
}

// スクロール同期コールバック用の型
type ScrollSyncCallback = (line: number) => void;

// グローバルなスクロール同期コールバック（エディタ→プレビュー）
let onEditorScrollCallback: ScrollSyncCallback | null = null;

// グローバルなスクロール同期コールバック（プレビュー→エディタ）
let onPreviewScrollCallback: ScrollSyncCallback | null = null;

// 穏やかなスクロール同期コールバック（プレビュー→エディタ、フラッシュなし）
let onScrollSyncCallback: ScrollSyncCallback | null = null;

export function setEditorScrollCallback(callback: ScrollSyncCallback | null) {
  onEditorScrollCallback = callback;
}

export function setPreviewScrollCallback(callback: ScrollSyncCallback | null) {
  onPreviewScrollCallback = callback;
}

export function setScrollSyncCallback(callback: ScrollSyncCallback | null) {
  onScrollSyncCallback = callback;
}

// プレビューからエディタへジャンプ（行番号ベース）— フラッシュ+フォーカス付き
export function triggerEditorScroll(line: number) {
  if (onPreviewScrollCallback) {
    onPreviewScrollCallback(line);
  }
}

// プレビューからエディタへスクロール同期（穏やか、フラッシュなし）
export function triggerScrollSync(line: number) {
  if (onScrollSyncCallback) {
    onScrollSyncCallback(line);
  }
}

function MarkdownEditor({ compact }: { compact?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { content, currentFile, updateContent, saveFile, isModified, fileMetadata, loadFileMetadata } = useFile();
  const { setPendingSelection, annotations, scrollToLine, clearScrollToLine, addAnnotation, selectAnnotation, updateAnnotation, resolveAnnotation, deleteAnnotation, addReply, scrollToEditorLine } = useAnnotation();
  const { settings } = useSettings();
  const { catalog, sourceFiles, bibEntries } = useBuild();
  const [showMetadata, setShowMetadata] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editorSelection, setEditorSelection] = useState<(PendingSelectionV2 & { text: string }) | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<AnnotationType | null>(null);

  // ミニマップ用の状態
  const [visibleRange, setVisibleRange] = useState({ startLine: 1, endLine: 1 });
  const totalLines = content?.split('\n').length || 1;

  // スクロール同期設定をrefで追跡（クロージャ問題を回避）
  // undefinedの場合はデフォルトでtrue（localStorage互換性のため）
  const scrollSyncEnabledRef = useRef(settings.editor.scrollSync ?? true);

  // 注釈ホバーカード用の状態
  const [hoveredAnnotation, setHoveredAnnotation] = useState<{
    annotation: AnnotationV2;
    position: { x: number; y: number };
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringCardRef = useRef(false);

  // スクロール同期設定が変わったらrefを更新
  useEffect(() => {
    scrollSyncEnabledRef.current = settings.editor.scrollSync ?? true;
  }, [settings.editor.scrollSync]);

  // オートコンプリートデータが変わったら Compartment を再設定
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: completionCompartment.reconfigure(
        createMarkdownCompletions({
          catalog,
          sourceFiles,
          fileTree: sourceFiles,
          bibEntries: bibEntries || [],
          crossRefLabels: [],
        })
      ),
    });
  }, [catalog, sourceFiles, bibEntries]);

  // ファイルが変更されたらメタデータを読み込む
  useEffect(() => {
    if (currentFile) {
      loadFileMetadata(currentFile);
    }
  }, [currentFile, loadFileMetadata]);

  // scrollToLineが変更されたらエディタをスクロール＋フラッシュハイライト
  useEffect(() => {
    if (!scrollToLine || !viewRef.current) return;

    const view = viewRef.current;
    const doc = view.state.doc;

    // 行番号が有効な範囲内か確認
    if (scrollToLine.line < 1 || scrollToLine.line > doc.lines) {
      clearScrollToLine();
      return;
    }

    try {
      const lineInfo = doc.line(scrollToLine.line);

      // 該当行にスクロールして中央に表示
      view.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
        selection: { anchor: lineInfo.from },
      });

      // 注釈に対応するテキストをフラッシュハイライト（V2対応）
      const annotation = annotations.find(a => a.id === scrollToLine.annotationId);
      let highlighted = false;

      if (annotation) {
        const pos = findAnnotationPositionInDoc(doc, annotation);
        if (pos) {
          dispatchFlashHighlight(view, pos.from, pos.to, 2500);
          highlighted = true;
        }
      }

      // テキストが見つからない場合は行全体をハイライト
      if (!highlighted) {
        dispatchFlashHighlight(view, lineInfo.from, lineInfo.to, 2500);
      }

      // フォーカスを当てる（少し遅延）
      setTimeout(() => {
        view.focus();
      }, 50);

      // クリアする
      clearScrollToLine();
    } catch (e) {
      console.error('Failed to scroll to line:', e);
      clearScrollToLine();
    }
  }, [scrollToLine, clearScrollToLine, annotations]);

  // エディタの初期化
  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        updateContent(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: buildEditorExtensions({
        catalog,
        sourceFiles,
        bibEntries,
        updateListener,
      }),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // 初期化後に注釈ハイライトを適用
    if (annotations && annotations.length > 0) {
      dispatchAnnotations(view, annotations);
    }

    // スクロールイベントリスナーを追加
    const scrollerEl = view.scrollDOM;
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // 可視範囲を更新（ミニマップ用）
      const range = getEditorVisibleRange(view);
      setVisibleRange(range);

      // エディタ→プレビューの同期（デバウンス付き）
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const isScrollSyncEnabled = scrollSyncEnabledRef.current;
        if (isScrollSyncEnabled && onEditorScrollCallback) {
          const line = getEditorVisibleLine(view);
          onEditorScrollCallback(line);
        }
      }, 50);
    };

    scrollerEl.addEventListener('scroll', handleScroll);

    return () => {
      scrollerEl.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      view.destroy();
      viewRef.current = null;
    };
  }, [currentFile]); // currentFileが変わったときに再初期化（scrollSyncはrefで追跡）

  // コンテンツの更新（外部からの変更）
  useEffect(() => {
    if (!viewRef.current) return;

    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== content) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      });
    }
  }, [content]);

  // 注釈が変更されたらエディタのデコレーションを更新
  useEffect(() => {
    if (!viewRef.current || !annotations) return;
    dispatchAnnotations(viewRef.current, annotations);
  }, [annotations]);

  // プレビュークリックでエディタにジャンプ + フラッシュハイライト
  const handlePreviewJump = useCallback((line: number) => {
    if (!viewRef.current) return;

    const view = viewRef.current;
    const doc = view.state.doc;

    if (line < 1 || line > doc.lines) return;

    try {
      const lineInfo = doc.line(line);

      // 行にスクロール（中央に配置）
      view.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
        selection: { anchor: lineInfo.from },
      });

      // 行全体をフラッシュハイライト（2.5秒間）
      dispatchFlashHighlight(view, lineInfo.from, lineInfo.to, 2500);

      // フォーカスを当てる
      setTimeout(() => {
        view.focus();
      }, 50);
    } catch (e) {
      console.error('Failed to jump to line:', e);
    }
  }, []);

  // プレビュークリックでエディタにジャンプするコールバックを設定
  useEffect(() => {
    setPreviewScrollCallback(handlePreviewJump);
    return () => {
      setPreviewScrollCallback(null);
    };
  }, [handlePreviewJump]);

  // 穏やかなスクロール同期（プレビュー→エディタ、フラッシュなし）
  const handleScrollSync = useCallback((line: number) => {
    if (!viewRef.current) return;
    scrollEditorToLine(viewRef.current, line, true);
  }, []);

  useEffect(() => {
    setScrollSyncCallback(handleScrollSync);
    return () => setScrollSyncCallback(null);
  }, [handleScrollSync]);

  // ミニマップからのジャンプ
  const handleMinimapClick = useCallback((line: number) => {
    if (!viewRef.current) return;
    scrollEditorToLine(viewRef.current, line, true);
  }, []);

  // エディタ内の注釈ホバー処理
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // ホバーカード上にいる場合は何もしない
    if (target.closest('.annotation-hover-card-unified')) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      return;
    }

    const annotationEl = target.closest('.cm-annotation-highlight');

    if (annotationEl) {
      // 閉じるタイマーをキャンセル
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      const annotationId = annotationEl.getAttribute('data-annotation-id');
      if (annotationId) {
        const annotation = annotations.find(a => a.id === annotationId);
        if (annotation) {
          // ホバーカードを表示（少し遅延させる）
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = setTimeout(() => {
            // ビューポート座標で位置を計算（position: fixed 用）
            const rect = annotationEl.getBoundingClientRect();
            const cardWidth = 320;
            let hoverX = rect.left + rect.width / 2 - cardWidth / 2;
            hoverX = Math.max(8, Math.min(hoverX, window.innerWidth - cardWidth - 8));

            setHoveredAnnotation({
              annotation,
              position: {
                x: hoverX,
                y: rect.bottom + 8,
              },
            });
          }, 200);
          return;
        }
      }
    }

    // 注釈外の場合は遅延してカードを非表示（カードに移動する時間を確保）
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (!closeTimeoutRef.current && hoveredAnnotation) {
      closeTimeoutRef.current = setTimeout(() => {
        if (!isHoveringCardRef.current) {
          setHoveredAnnotation(null);
        }
        closeTimeoutRef.current = null;
      }, 300);
    }
  }, [annotations, hoveredAnnotation]);

  const handleEditorMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 遅延して閉じる（カードに移動する時間を確保）
    if (!closeTimeoutRef.current) {
      closeTimeoutRef.current = setTimeout(() => {
        if (!isHoveringCardRef.current) {
          setHoveredAnnotation(null);
        }
        closeTimeoutRef.current = null;
      }, 300);
    }
  }, []);

  // カード上のホバー状態を追跡
  const handleCardMouseEnter = useCallback(() => {
    isHoveringCardRef.current = true;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    isHoveringCardRef.current = false;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredAnnotation(null);
      closeTimeoutRef.current = null;
    }, 200);
  }, []);

  // テキスト選択時の処理（V2セレクタ生成）
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!viewRef.current || !editorRef.current) return;

    const selection = viewRef.current.state.selection.main;
    if (selection.from === selection.to) {
      setPendingSelection(null);
      setPopupPosition(null);
      setEditorSelection(null);
      return;
    }

    const doc = viewRef.current.state.doc;
    const fromLine = doc.lineAt(selection.from);
    const toLine = doc.lineAt(selection.to);
    const selectedText = doc.sliceString(selection.from, selection.to);
    const fullText = doc.toString();

    // V2: 3種類のセレクタを同時生成
    const selectors = createSelectorsFromEditorSelection(
      fullText,
      selection.from,
      selection.to,
      fromLine.number,
      toLine.number,
      selection.from - fromLine.from,
      selection.to - toLine.from
    );

    const selectionData: PendingSelectionV2 & { text: string } = {
      text: selectedText,
      selectors,
    };

    setPendingSelection(selectionData);
    setEditorSelection(selectionData);

    // ポップアップ位置を計算
    const coords = viewRef.current.coordsAtPos(selection.to);
    const containerRect = editorRef.current.getBoundingClientRect();

    if (coords) {
      setPopupPosition({
        x: coords.left - containerRect.left,
        y: coords.bottom - containerRect.top + 8,
      });
    }
  }, [setPendingSelection]);

  // ポップアップで注釈タイプを選択
  const handleSelectType = useCallback((type: AnnotationType) => {
    setFormType(type);
    setShowForm(true);
    setPopupPosition(null);
  }, []);

  // 注釈追加フォームの送信
  const handleAddAnnotation = useCallback((content: string) => {
    if (editorSelection && formType) {
      addAnnotation(formType, content, editorSelection);
    }
    setShowForm(false);
    setFormType(null);
    setEditorSelection(null);
  }, [editorSelection, formType, addAnnotation]);

  // フォームキャンセル
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setFormType(null);
    setEditorSelection(null);
  }, []);

  // ポップアップを閉じる
  const handleClosePopup = useCallback(() => {
    setPopupPosition(null);
    setEditorSelection(null);
  }, []);

  // 保存のキーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      // 太字: Cmd+B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        applyFormat(TOOLBAR_ITEMS.find(t => t.id === 'bold'));
      }
      // 斜体: Cmd+I
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        applyFormat(TOOLBAR_ITEMS.find(t => t.id === 'italic'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  // ツールバーのフォーマット適用
  const applyFormat = useCallback((item: ToolbarItem | undefined) => {
    if (!viewRef.current || !item) return;

    const view = viewRef.current;
    const selection = view.state.selection.main;
    const doc = view.state.doc;

    if (item.template) {
      // テンプレート挿入
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: item.template },
        selection: { anchor: selection.from + item.template.length },
      });
    } else if (item.line) {
      // 行頭に挿入
      const line = doc.lineAt(selection.from);
      view.dispatch({
        changes: { from: line.from, insert: item.before },
      });
    } else if (item.block) {
      // ブロック挿入
      const selectedText = doc.sliceString(selection.from, selection.to) || '内容';
      const newText = item.before + selectedText + item.after;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: newText },
      });
    } else {
      // 選択テキストを囲む
      const before = item.before ?? '';
      const selectedText = doc.sliceString(selection.from, selection.to) || 'テキスト';
      const newText = before + selectedText + item.after;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: newText },
        selection: { anchor: selection.from + before.length, head: selection.from + before.length + selectedText.length },
      });
    }

    view.focus();
  }, []);

  // エクスポート機能
  const handleExport = useCallback((format: 'md' | 'md-styled' | 'html') => {
    if (!content) return;

    let exportContent = content;
    let fileName = currentFile?.split('/').pop() || 'document.md';
    let mimeType = 'text/markdown';

    if (format === 'html') {
      // 注釈をHTMLスタイルとして埋め込む
      exportContent = generateHTMLWithAnnotations(content, annotations, currentFile);
      fileName = fileName.replace('.md', '.html');
      mimeType = 'text/html';
    } else if (format === 'md-styled') {
      // 注釈をHTMLタグとしてMarkdownに埋め込む
      exportContent = embedAnnotationsToMarkdown(content, annotations);
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [content, currentFile, annotations]);

  if (!currentFile) {
    return (
      <div className="editor-empty">
        <p>ファイルを選択してください</p>
        <style>{EDITOR_EMPTY_STYLES}</style>
      </div>
    );
  }

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="markdown-editor">
      {!compact && (
        <div className="editor-header compact-header">
          <div className="editor-header-left">
            <button
              className="metadata-btn"
              onClick={() => setShowMetadata(!showMetadata)}
              title="ファイル情報"
            >
              <InfoIcon />
            </button>
          </div>
          <div className="editor-header-right">
            <div className="export-menu-wrapper">
              <button
                className="export-btn"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="エクスポート"
              >
                ↓
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={() => handleExport('md')}>Markdown (.md)</button>
                  <button onClick={() => handleExport('md-styled')}>Markdown + 注釈</button>
                  <button onClick={() => handleExport('html')}>HTML</button>
                </div>
              )}
            </div>
            <button
              className="save-btn"
              onClick={saveFile}
              disabled={!isModified}
              title="保存 (⌘S)"
            >
              {isModified ? '● 保存' : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* ツールバー（settings.editor.showToolbar で制御） */}
      {!compact && settings.editor.showToolbar && (
        <div className="editor-toolbar">
          {TOOLBAR_ITEMS.map((item) => {
            if (item.id.startsWith('divider')) {
              return <div key={item.id} className="toolbar-divider" />;
            }
            return (
              <button
                key={item.id}
                className="toolbar-btn"
                onClick={() => applyFormat(item)}
                title={item.label + (item.shortcut ? ` (${item.shortcut})` : '')}
              >
                {item.icon}
              </button>
            );
          })}
        </div>
      )}

      {/* メタデータポップアップ */}
      {showMetadata && fileMetadata && (
        <div className="metadata-popup">
          <div className="metadata-row">
            <span className="metadata-label">ファイル名</span>
            <span className="metadata-value">{fileMetadata.fileName}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">サイズ</span>
            <span className="metadata-value">{fileMetadata.sizeFormatted}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">行数</span>
            <span className="metadata-value">{fileMetadata.lines?.toLocaleString()}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">単語数</span>
            <span className="metadata-value">{fileMetadata.words?.toLocaleString()}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">文字数</span>
            <span className="metadata-value">{fileMetadata.chars?.toLocaleString()}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">作成日</span>
            <span className="metadata-value">{formatDate(fileMetadata.created)}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">更新日</span>
            <span className="metadata-value">{formatDate(fileMetadata.modified)}</span>
          </div>
          <div className="metadata-path">
            <span className="metadata-label">パス</span>
            <span className="metadata-value path">{fileMetadata.filePath}</span>
          </div>
        </div>
      )}

      <div className="editor-main-area">
        <div
          className="editor-container"
          ref={editorRef}
          onMouseUp={handleMouseUp}
          onMouseMove={handleEditorMouseMove}
          onMouseLeave={handleEditorMouseLeave}
        >
          {popupPosition && editorSelection && (
            <EditorSelectionPopup
              position={popupPosition}
              onSelect={handleSelectType}
              onClose={handleClosePopup}
            />
          )}

          {/* 注釈ホバーカード */}
          {hoveredAnnotation && (
            <AnnotationHoverCard
              annotation={hoveredAnnotation.annotation}
              position={hoveredAnnotation.position}
              onClose={() => setHoveredAnnotation(null)}
              onSelect={(id) => {
                setHoveredAnnotation(null);
                selectAnnotation(id);
              }}
              onUpdate={(id, updates) => updateAnnotation(id, updates)}
              onResolve={(id, resolved) => resolveAnnotation(id, resolved)}
              onDelete={(id) => {
                deleteAnnotation(id);
                setHoveredAnnotation(null);
              }}
              onAddReply={(id, replyContent) => addReply(id, replyContent)}
              onJumpToEditor={(line, annotationId) => {
                // V2: EditorPositionSelectorの行情報を使用
                const editorPos = getEditorPosition(hoveredAnnotation.annotation);
                const targetLine = editorPos ? editorPos.startLine : line;
                scrollToEditorLine(targetLine, annotationId);
              }}
              source="editor"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
            />
          )}
        </div>

        {/* ミニマップ */}
        {settings.editor.showMinimap && (
          <Minimap
            content={content || ''}
            annotations={annotations || []}
            visibleStartLine={visibleRange.startLine}
            visibleEndLine={visibleRange.endLine}
            totalLines={totalLines}
            onLineClick={handleMinimapClick}
          />
        )}
      </div>

      {showForm && editorSelection && (
        <EditorAnnotationForm
          type={formType}
          selectedText={editorSelection.text}
          onSubmit={handleAddAnnotation}
          onCancel={handleCancelForm}
        />
      )}

      <style>{MARKDOWN_EDITOR_STYLES}</style>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export default MarkdownEditor;

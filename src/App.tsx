import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileProvider } from './contexts/FileContext';
import { AnnotationProvider } from './contexts/AnnotationContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { BuildProvider, useBuild } from './contexts/BuildContext';
import { TabProvider, useTab } from './contexts/TabContext';
import { TerminalProvider } from './contexts/TerminalContext';
import { useFile } from './contexts/FileContext';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import FileTree from './components/Sidebar/FileTree';
import ErrorBoundary from './components/common/ErrorBoundary';
// ProjectPanel は SidebarGallery に統合済み
import EditorArea from './components/Editor/EditorArea';
import AnnotationPanel from './components/Annotations/AnnotationPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import ToastContainer from './components/common/ToastContainer';
import ExternalChangeWarning from './components/common/ExternalChangeWarning';
import SidebarGallery from './components/Sidebar/SidebarGallery';
import TopBar from './components/TopBar';
import { GalleryModal, GalleryWindowApp } from './components/GalleryModal';
import { ResizeHandle, VerticalResizeHandle } from './components/common/ResizeHandle';
import { ChevronDownIcon } from './components/Icons';
import { appShellStyles } from './components/appStyles';

// ギャラリー専用ウィンドウモード判定
const isGalleryWindow = new URLSearchParams(window.location.search).get('view') === 'gallery';

function SettingsModalWrapper() {
  const { isSettingsOpen } = useSettings();
  return isSettingsOpen ? <SettingsPanel /> : null;
}

function FileProviderBridge({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return <FileProvider showHiddenFiles={settings.files.showHiddenFiles} excludePatterns={settings.files.excludePatterns || []}>{children}</FileProvider>;
}

function BuildProviderBridge({ children }: { children: React.ReactNode }) {
  const { rootPath } = useFile();
  return <BuildProvider rootPath={rootPath}>{children}</BuildProvider>;
}

function App() {
  // ギャラリー専用ウィンドウモードの場合は専用レイアウトを返す
  // 注: フックを持つ本体は MainApp に分離（早期returnとフックの共存は rules-of-hooks 違反）
  if (isGalleryWindow) {
    return <GalleryWindowApp />;
  }
  return <MainApp />;
}

function MainApp() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 250;
  });
  const [annotationWidth, setAnnotationWidth] = useState(() => {
    const saved = localStorage.getItem('annotationWidth');
    return saved ? parseInt(saved, 10) : 300;
  });
  const appRef = useRef<HTMLDivElement>(null);

  // サイドバー幅の変更
  const handleSidebarResize = useCallback((clientX: number) => {
    const newWidth = Math.max(150, Math.min(400, clientX));
    setSidebarWidth(newWidth);
    localStorage.setItem('sidebarWidth', newWidth.toString());
  }, []);

  // 注釈パネル幅の変更
  const handleAnnotationResize = useCallback((clientX: number) => {
    if (!appRef.current) return;
    const appRect = appRef.current.getBoundingClientRect();
    const newWidth = Math.max(200, Math.min(500, appRect.right - clientX));
    setAnnotationWidth(newWidth);
    localStorage.setItem('annotationWidth', newWidth.toString());
  }, []);

  return (
    <SettingsProvider>
      <ToastProvider>
        <AppStateProvider>
          <FileProviderBridge>
            <BuildProviderBridge>
            <AnnotationProvider>
              <TerminalProvider>
              <TabProvider>
                <AppContent
                  sidebarWidth={sidebarWidth}
                  annotationWidth={annotationWidth}
                  handleSidebarResize={handleSidebarResize}
                  handleAnnotationResize={handleAnnotationResize}
                  appRef={appRef}
                />
              </TabProvider>
              </TerminalProvider>
            </AnnotationProvider>
            </BuildProviderBridge>
          </FileProviderBridge>
        </AppStateProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

interface AppContentProps {
  sidebarWidth: number;
  annotationWidth: number;
  handleSidebarResize: (clientX: number) => void;
  handleAnnotationResize: (clientX: number) => void;
  appRef: React.RefObject<HTMLDivElement>;
}

function AppContent({ sidebarWidth, annotationWidth, handleSidebarResize, handleAnnotationResize, appRef }: AppContentProps) {
  const { isSidebarOpen, isAnnotationPanelOpen, explorerCollapsed, galleryCollapsed, sidebarSplitRatio, toggleExplorer, toggleGallery, setSidebarSplitRatio, openGalleryModal } = useAppState();
  const { projectDir, manifestData, selectedManifestPath, updateManifestData, saveManifest, refreshFromDisk } = useBuild();
  const { rootPath } = useFile();
  const { activeTab, openTerminalTab } = useTab();
  const editorMode = activeTab?.editorMode || 'split';

  // ⌘+` で新規ターミナルを開く (メニューからの new-terminal イベント)
  useEffect(() => {
    if (!window.electronAPI?.onNewTerminal) return;
    const cleanup = window.electronAPI.onNewTerminal(async () => {
      try {
        const cwd = rootPath || undefined;
        const result = await window.electronAPI.terminalCreate(cwd);
        openTerminalTab(result.sessionId);
      } catch (e) {
        console.error('Failed to create terminal:', e);
      }
    });
    return cleanup;
  }, [openTerminalTab, rootPath]);

  // ⌘+Shift+T でギャラリーモーダルを開く (メニューイベント)
  useEffect(() => {
    if (!window.electronAPI?.onOpenGallery) return;
    const cleanup = window.electronAPI.onOpenGallery(() => {
      openGalleryModal();
    });
    return cleanup;
  }, [openGalleryModal]);

  // ギャラリーウィンドウからテンプレート適用
  useEffect(() => {
    if (!window.electronAPI?.onGalleryApplyTemplate) return;
    const cleanup = window.electronAPI.onGalleryApplyTemplate(async (templateName: string) => {
      if (manifestData && selectedManifestPath) {
        const updatedData = { ...manifestData, template: templateName };
        updateManifestData(updatedData);
        await saveManifest(selectedManifestPath, updatedData);
      }
    });
    return cleanup;
  }, [manifestData, selectedManifestPath, updateManifestData, saveManifest]);

  // ギャラリーウィンドウからのデータ変更通知
  useEffect(() => {
    if (!window.electronAPI?.onGalleryDataChanged) return;
    const cleanup = window.electronAPI.onGalleryDataChanged(() => {
      refreshFromDisk();
    });
    return cleanup;
  }, [refreshFromDisk]);

  return (
    <>
      <div className="app" ref={appRef}>
        <div
          className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
          style={{
            width: isSidebarOpen ? sidebarWidth : 0,
            minWidth: isSidebarOpen ? 150 : 0,
          }}
        >
          {/* Explorer ヘッダー */}
          <div className="sidebar-section-header" onClick={toggleExplorer} style={{ flexShrink: 0 }}>
            <span className={`sidebar-section-chevron ${explorerCollapsed ? 'collapsed' : ''}`}>
              <ChevronDownIcon />
            </span>
            <span>EXPLORER</span>
          </div>
          {/* Explorer コンテンツ */}
          {!explorerCollapsed && (
            <div style={{
              flex: `${sidebarSplitRatio} 1 0px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              <ErrorBoundary name="エクスプローラー">
                <FileTree />
              </ErrorBoundary>
            </div>
          )}

          {/* 縦リサイズハンドル（EXPLORER と GALLERY が共に展開時） */}
          {!explorerCollapsed && !galleryCollapsed && (
            <VerticalResizeHandle onResize={setSidebarSplitRatio} />
          )}

          {/* GALLERY ヘッダー（常に下部に固定） */}
          <div className="sidebar-section-header" onClick={toggleGallery} style={{ flexShrink: 0, marginTop: 'auto' }}>
            <span className={`sidebar-section-chevron ${galleryCollapsed ? 'collapsed' : ''}`}>
              <ChevronDownIcon />
            </span>
            <span>GALLERY</span>
            <button
              className="sidebar-section-popout-btn"
              onClick={(e) => { e.stopPropagation(); openGalleryModal(); }}
              title="フルギャラリーを開く (⌘⇧T)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
          {/* GALLERY コンテンツ */}
          {!galleryCollapsed && (
            <div style={{
              flex: `${100 - sidebarSplitRatio} 1 0px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column' as const,
            }}>
              <ErrorBoundary name="ギャラリー">
                <SidebarGallery onOpenFullGallery={openGalleryModal} />
              </ErrorBoundary>
            </div>
          )}
        </div>
        {isSidebarOpen && <ResizeHandle onResize={handleSidebarResize} position="left" />}

        <div className={`main-content editor-mode-${editorMode}`}>
          <ErrorBoundary name="エディタ">
            <EditorArea />
          </ErrorBoundary>
        </div>

        {isAnnotationPanelOpen && <ResizeHandle onResize={handleAnnotationResize} position="right" />}
        <div
          className={`annotation-panel ${isAnnotationPanelOpen ? 'open' : 'closed'}`}
          style={{
            width: isAnnotationPanelOpen ? annotationWidth : 0,
            minWidth: isAnnotationPanelOpen ? 200 : 0,
          }}
        >
          <ErrorBoundary name="注釈パネル">
            <AnnotationPanel />
          </ErrorBoundary>
        </div>
      </div>
      <TopBar />
      <SettingsModalWrapper />
      <GalleryModal />
      <ToastContainer />
      <ExternalChangeWarning />
      <style>{appShellStyles}</style>
    </>
  );
}

export default App;

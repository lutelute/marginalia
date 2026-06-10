import React, { useState, useCallback } from 'react';
import type { AppStateContextValue, EditorMode } from '../types';

// アプリ全体の状態を管理するContext
const AppStateContext = React.createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('isSidebarOpen');
    return saved !== 'false';
  });
  // editorMode: 'edit' | 'split' | 'preview'
  const [editorMode, setEditorModeState] = useState<EditorMode>(() => {
    const saved = localStorage.getItem('editorMode');
    return (saved as EditorMode) || 'split';
  });
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(() => {
    const saved = localStorage.getItem('isAnnotationPanelOpen');
    return saved !== 'false';
  });
  const [explorerCollapsed, setExplorerCollapsed] = useState(() => {
    return localStorage.getItem('explorerCollapsed') === 'true';
  });
  const [buildCollapsed, setBuildCollapsed] = useState(() => {
    return localStorage.getItem('buildCollapsed') === 'true';
  });
  const [galleryCollapsed, setGalleryCollapsed] = useState(() => {
    return localStorage.getItem('galleryCollapsed') === 'true';
  });
  const [sidebarSplitRatio, setSidebarSplitRatioState] = useState(() => {
    const saved = localStorage.getItem('sidebarSplitRatio');
    return saved ? parseInt(saved, 10) : 50;
  });
  const [viewingPdf, setViewingPdfState] = useState<string | null>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  const openGalleryModal = useCallback(() => setIsGalleryModalOpen(true), []);
  const closeGalleryModal = useCallback(() => setIsGalleryModalOpen(false), []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem('isSidebarOpen', newValue.toString());
      return newValue;
    });
  }, []);

  const setEditorMode = useCallback((mode: EditorMode) => {
    setEditorModeState(mode);
    localStorage.setItem('editorMode', mode);
  }, []);

  const toggleAnnotationPanel = useCallback(() => {
    setIsAnnotationPanelOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem('isAnnotationPanelOpen', newValue.toString());
      return newValue;
    });
  }, []);

  const toggleExplorer = useCallback(() => {
    setExplorerCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('explorerCollapsed', newValue.toString());
      return newValue;
    });
  }, []);

  const toggleBuild = useCallback(() => {
    setBuildCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('buildCollapsed', newValue.toString());
      return newValue;
    });
  }, []);

  const toggleGallery = useCallback(() => {
    setGalleryCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('galleryCollapsed', newValue.toString());
      return newValue;
    });
  }, []);

  const setSidebarSplitRatio = useCallback((ratio: number) => {
    const clamped = Math.max(20, Math.min(80, ratio));
    setSidebarSplitRatioState(clamped);
    localStorage.setItem('sidebarSplitRatio', clamped.toString());
  }, []);

  const setViewingPdf = useCallback((path: string | null) => {
    setViewingPdfState(path);
  }, []);

  return (
    <AppStateContext.Provider value={{ isSidebarOpen, editorMode, isAnnotationPanelOpen, explorerCollapsed, buildCollapsed, galleryCollapsed, sidebarSplitRatio, viewingPdf, isGalleryModalOpen, toggleSidebar, setEditorMode, toggleAnnotationPanel, toggleExplorer, toggleBuild, toggleGallery, setSidebarSplitRatio, setViewingPdf, openGalleryModal, closeGalleryModal }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const context = React.useContext(AppStateContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

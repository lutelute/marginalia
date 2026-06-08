import { useEffect, useCallback } from 'react';
import type { EditorMode } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useTab } from '../contexts/TabContext';
import { useAnnotation } from '../contexts/AnnotationContext';
import { useAppState } from '../contexts/AppStateContext';
import {
  ScrollSyncIcon,
  MinimapIcon,
  ToolbarIcon,
  SidebarIcon,
  SunIcon,
  MoonIcon,
  SystemThemeIcon,
  SettingsIcon,
  AppLogo,
  EditIcon,
  SplitIcon,
  PreviewIcon,
  AnnotationPanelIcon,
} from './Icons';

function TopBar() {
  const { settings, updateSettings, openSettings, isDevelopment, effectiveTheme } = useSettings();
  const { isSidebarOpen, isAnnotationPanelOpen, toggleSidebar, toggleAnnotationPanel } = useAppState();
  const { activeTab, activeGroup, setTabMode } = useTab();
  const { annotations } = useAnnotation();
  const isDark = effectiveTheme === 'dark';

  // アクティブタブの editorMode を取得（PDF/YAML タブではモード切替を無効化）
  const editorMode = activeTab?.editorMode || 'split';
  const isPdfTab = activeTab?.fileType === 'pdf';
  const isYamlTab = activeTab?.fileType === 'yaml';
  const isModeDisabled = isPdfTab || isYamlTab;
  const setEditorMode = useCallback((mode: EditorMode) => {
    if (activeTab && activeGroup && !isModeDisabled) {
      setTabMode(activeTab.id, activeGroup.id, mode);
    }
  }, [activeTab, activeGroup, isModeDisabled, setTabMode]);

  // ツールバートグル
  const toggleToolbar = useCallback(() => {
    updateSettings('editor.showToolbar', !settings.editor.showToolbar);
  }, [settings.editor.showToolbar, updateSettings]);

  // スクロール同期トグル
  const toggleScrollSync = useCallback(() => {
    updateSettings('editor.scrollSync', !settings.editor.scrollSync);
  }, [settings.editor.scrollSync, updateSettings]);

  // ミニマップトグル
  const toggleMinimap = useCallback(() => {
    updateSettings('editor.showMinimap', !settings.editor.showMinimap);
  }, [settings.editor.showMinimap, updateSettings]);

  // 未解決の注釈数（open + pending）
  const unresolvedCount = annotations.filter(a => a.status === 'active' || a.status === 'orphaned').length;

  useEffect(() => {
    if (effectiveTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [effectiveTheme]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSettings]);

  const cycleTheme = () => {
    const themeOrder: ('dark' | 'light' | 'system')[] = ['dark', 'light', 'system'];
    const currentIndex = themeOrder.indexOf(settings.ui.theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    updateSettings('ui.theme', nextTheme);
  };

  const getThemeIcon = () => {
    if (settings.ui.theme === 'system') {
      return <SystemThemeIcon />;
    }
    return isDark ? <SunIcon /> : <MoonIcon />;
  };

  const getThemeLabel = () => {
    if (settings.ui.theme === 'system') {
      return `システム (${effectiveTheme === 'dark' ? 'ダーク' : 'ライト'})`;
    }
    return isDark ? 'ライトモード' : 'ダークモード';
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="btn-group">
          <button
            className={`top-bar-btn icon-only ${isSidebarOpen ? 'active' : ''}`}
            onClick={toggleSidebar}
            title={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          >
            <SidebarIcon />
          </button>
        </div>
        <div className={`mode-toggle-group ${isModeDisabled ? 'disabled' : ''}`}>
          <button
            className={`mode-toggle-btn ${editorMode === 'edit' ? 'active' : ''}`}
            onClick={() => setEditorMode('edit')}
            title="編集モード"
            disabled={isModeDisabled}
          >
            <EditIcon />
            <span>Edit</span>
          </button>
          <button
            className={`mode-toggle-btn ${editorMode === 'split' ? 'active' : ''}`}
            onClick={() => setEditorMode('split')}
            title="分割モード"
            disabled={isModeDisabled}
          >
            <SplitIcon />
            <span>Split</span>
          </button>
          <button
            className={`mode-toggle-btn ${editorMode === 'preview' ? 'active' : ''}`}
            onClick={() => setEditorMode('preview')}
            title="プレビューモード"
            disabled={isModeDisabled}
          >
            <PreviewIcon />
            <span>Preview</span>
          </button>
        </div>
      </div>
      <div className="top-bar-center">
        <AppLogo />
        <span className="app-title">Marginalia</span>
        {isDevelopment && (
          <span className="env-badge dev">DEV</span>
        )}
      </div>
      <div className="top-bar-right">
        {/* 表示トグル群 */}
        <div className="btn-group">
          {activeTab && !isModeDisabled && editorMode !== 'preview' && (
            <button
              className={`top-bar-btn icon-only ${settings.editor.showToolbar ? 'active' : ''}`}
              onClick={toggleToolbar}
              title={settings.editor.showToolbar ? '編集ツールバーを非表示' : '編集ツールバーを表示'}
            >
              <ToolbarIcon />
            </button>
          )}
          {activeTab && editorMode === 'split' && (
            <>
              <button
                className={`top-bar-btn icon-only ${settings.editor.scrollSync ? 'active' : ''}`}
                onClick={toggleScrollSync}
                title={settings.editor.scrollSync ? 'スクロール同期をオフ' : 'スクロール同期をオン'}
              >
                <ScrollSyncIcon />
              </button>
              <button
                className={`top-bar-btn icon-only ${settings.editor.showMinimap ? 'active' : ''}`}
                onClick={toggleMinimap}
                title={settings.editor.showMinimap ? 'ミニマップを非表示' : 'ミニマップを表示'}
              >
                <MinimapIcon />
              </button>
            </>
          )}
        </div>
        <div className="btn-group">
          <button
            className={`top-bar-btn icon-only ${isAnnotationPanelOpen ? 'active' : ''}`}
            onClick={toggleAnnotationPanel}
            title={isAnnotationPanelOpen ? '注釈パネルを閉じる' : '注釈パネルを開く'}
          >
            <AnnotationPanelIcon />
            {unresolvedCount > 0 && (
              <span className="annotation-badge">{unresolvedCount > 99 ? '99+' : unresolvedCount}</span>
            )}
          </button>
        </div>
        <div className="btn-group">
          <button className="top-bar-btn icon-only" onClick={cycleTheme} title={getThemeLabel()}>
            {getThemeIcon()}
          </button>
          <button className="top-bar-btn icon-only" onClick={openSettings} title="設定 (⌘,)">
            <SettingsIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopBar;

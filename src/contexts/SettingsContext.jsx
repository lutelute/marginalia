import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  // 環境設定
  environment: 'development', // 'development' | 'production'

  // エディタ設定
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    autoSave: true,
    autoSaveInterval: 30000, // 30秒
  },

  // プレビュー設定
  preview: {
    fontSize: 16,
    lineHeight: 1.6,
    showAnnotationSidebar: true,
  },

  // バックアップ設定
  backup: {
    enabled: true,
    maxBackups: 20,
    autoBackupOnSave: true,
  },

  // UI設定
  ui: {
    theme: 'dark', // 'dark' | 'light'
    sidebarWidth: 250,
    annotationPanelWidth: 300,
    showWelcomeOnStartup: true,
  },

  // 開発者設定
  developer: {
    enableDevTools: true,
    verboseLogging: false,
    showDebugInfo: false,
  },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('marginalia-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 設定の保存
  useEffect(() => {
    localStorage.setItem('marginalia-settings', JSON.stringify(settings));
  }, [settings]);

  // 設定の更新
  const updateSettings = useCallback((path, value) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  }, []);

  // 設定のリセット
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('marginalia-settings');
  }, []);

  // 環境切り替え
  const setEnvironment = useCallback((env) => {
    updateSettings('environment', env);

    // 環境に応じた設定を自動適用
    if (env === 'development') {
      updateSettings('developer.enableDevTools', true);
      updateSettings('developer.verboseLogging', true);
    } else {
      updateSettings('developer.enableDevTools', false);
      updateSettings('developer.verboseLogging', false);
    }
  }, [updateSettings]);

  // 設定モーダルの開閉
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  // 設定のエクスポート
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marginalia-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  // 設定のインポート
  const importSettings = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      setSettings({ ...DEFAULT_SETTINGS, ...imported });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const value = {
    settings,
    updateSettings,
    resetSettings,
    setEnvironment,
    isSettingsOpen,
    openSettings,
    closeSettings,
    exportSettings,
    importSettings,
    isDevelopment: settings.environment === 'development',
    isProduction: settings.environment === 'production',
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

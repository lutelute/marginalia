import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, USER_COLORS, UpdateStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SettingsContext = createContext(null);

// 環境判定（ビルド時に決定）
const IS_DEVELOPMENT = import.meta.env.DEV;
const APP_VERSION = '1.0.8';
const GITHUB_REPO = 'lutelute/Marginalia';

// Electronアプリかどうかを判定
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// デフォルトユーザー
const DEFAULT_USER: User = {
  id: 'default-user',
  name: 'ユーザー',
  color: USER_COLORS[0],
};

const DEFAULT_SETTINGS = {
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

  // ユーザー管理
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('marginalia-users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : [DEFAULT_USER];
      } catch (e) {
        console.error('Failed to parse users:', e);
      }
    }
    return [DEFAULT_USER];
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('marginalia-current-user');
    return saved || 'default-user';
  });

  // 現在のユーザー情報を取得
  const currentUser = users.find(u => u.id === currentUserId) || users[0] || DEFAULT_USER;

  // ユーザーの保存
  useEffect(() => {
    localStorage.setItem('marginalia-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('marginalia-current-user', currentUserId);
  }, [currentUserId]);

  // ユーザー追加
  const addUser = useCallback((name: string, color: string) => {
    const newUser: User = {
      id: uuidv4(),
      name,
      color,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, []);

  // ユーザー削除
  const removeUser = useCallback((userId: string) => {
    // 現在のユーザーは削除できない
    if (userId === currentUserId) return false;
    // 最後のユーザーは削除できない
    if (users.length <= 1) return false;

    setUsers(prev => prev.filter(u => u.id !== userId));
    return true;
  }, [currentUserId, users.length]);

  // ユーザー切り替え
  const switchUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUserId(userId);
    }
  }, [users]);

  // ユーザー名更新
  const updateUserName = useCallback((name: string) => {
    setUsers(prev => prev.map(u =>
      u.id === currentUserId ? { ...u, name } : u
    ));
  }, [currentUserId]);

  // ユーザー色更新
  const updateUserColor = useCallback((color: string) => {
    setUsers(prev => prev.map(u =>
      u.id === currentUserId ? { ...u, color } : u
    ));
  }, [currentUserId]);

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

  // アップデート確認
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Electronアップデートイベントを監視
  useEffect(() => {
    if (!isElectron()) return;

    const cleanup = window.electronAPI?.onUpdateStatus((data: UpdateStatus) => {
      setUpdateStatus(data);

      switch (data.status) {
        case 'checking':
          setIsCheckingUpdate(true);
          break;
        case 'available':
          setIsCheckingUpdate(false);
          setUpdateInfo({
            hasUpdate: true,
            currentVersion: APP_VERSION,
            latestVersion: data.version,
            releaseName: data.releaseName,
            error: null,
          });
          break;
        case 'not-available':
          setIsCheckingUpdate(false);
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: APP_VERSION,
            latestVersion: data.version,
            error: null,
          });
          break;
        case 'downloading':
          setIsDownloading(true);
          setDownloadProgress(data.percent);
          break;
        case 'downloaded':
          setIsDownloading(false);
          setDownloadProgress(100);
          break;
        case 'error':
          setIsCheckingUpdate(false);
          setIsDownloading(false);
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: APP_VERSION,
            latestVersion: APP_VERSION,
            error: data.message,
          });
          break;
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (isElectron()) {
      // Electronアプリの場合はelectron-updaterを使用
      setIsCheckingUpdate(true);
      try {
        const result = await window.electronAPI?.checkForUpdates();
        if (!result?.success) {
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: APP_VERSION,
            latestVersion: APP_VERSION,
            error: result?.error || 'アップデート確認に失敗しました',
          });
          setIsCheckingUpdate(false);
        }
        // 成功時はonUpdateStatusコールバックで処理される
      } catch (error) {
        setIsCheckingUpdate(false);
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: 'アップデート確認に失敗しました',
        });
      }
    }
    return null;
  }, []);

  // アップデートをダウンロード
  const downloadUpdate = useCallback(async () => {
    if (!isElectron()) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const result = await window.electronAPI?.downloadUpdate();
      if (!result?.success) {
        setIsDownloading(false);
        setUpdateInfo(prev => ({
          ...prev,
          error: result?.error || 'ダウンロードに失敗しました',
        }));
      }
      // 成功時はonUpdateStatusコールバックで処理される
    } catch (error) {
      setIsDownloading(false);
      setUpdateInfo(prev => ({
        ...prev,
        error: 'ダウンロードに失敗しました',
      }));
    }
  }, []);

  // アップデートをインストールして再起動
  const installUpdate = useCallback(() => {
    if (!isElectron()) return;
    window.electronAPI?.installUpdate();
  }, []);

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
    isSettingsOpen,
    openSettings,
    closeSettings,
    exportSettings,
    importSettings,
    checkForUpdates,
    updateInfo,
    isCheckingUpdate,
    isDevelopment: IS_DEVELOPMENT,
    appVersion: APP_VERSION,
    githubRepo: GITHUB_REPO,
    // 自動アップデート
    updateStatus,
    isDownloading,
    downloadProgress,
    downloadUpdate,
    installUpdate,
    isElectronApp: isElectron(),
    // ユーザー管理
    users,
    currentUser,
    currentUserId,
    addUser,
    removeUser,
    switchUser,
    updateUserName,
    updateUserColor,
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

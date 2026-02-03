import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, USER_COLORS } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SettingsContext = createContext(null);

// 環境判定（ビルド時に決定）
const IS_DEVELOPMENT = import.meta.env.DEV;
const APP_VERSION = '1.0.7';
const GITHUB_REPO = 'lutelute/Marginalia_simple';
const GITHUB_API_TIMEOUT = 5000; // 5秒タイムアウト

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

  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      // タイムアウト付きfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT);

      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const latestVersion = data.tag_name?.replace('v', '') || '';
        const hasUpdate = latestVersion && latestVersion !== APP_VERSION;
        setUpdateInfo({
          hasUpdate,
          currentVersion: APP_VERSION,
          latestVersion: latestVersion || APP_VERSION,
          releaseUrl: data.html_url || '',
          releaseName: data.name || '',
          publishedAt: data.published_at || '',
          error: null,
        });
        return { hasUpdate, latestVersion };
      } else if (response.status === 404) {
        // リポジトリまたはリリースが見つからない
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: 'リリース情報が見つかりません',
        });
      } else if (response.status === 403) {
        // API制限
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: 'API制限に達しました。しばらく待ってから再試行してください',
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Update check timed out');
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: '接続がタイムアウトしました',
        });
      } else {
        console.error('Failed to check for updates:', error);
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: 'アップデート確認に失敗しました',
        });
      }
    } finally {
      setIsCheckingUpdate(false);
    }
    return null;
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

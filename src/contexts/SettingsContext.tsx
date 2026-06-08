import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, USER_COLORS } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 設定オブジェクトの型（DEFAULT_SETTINGS の構造から導出）
type SettingsState = typeof DEFAULT_SETTINGS;

// 設定の更新結果（インポート時に返る）
interface ImportSettingsResult {
  success: boolean;
  error?: string;
}

// provider 内部で保持するアップデート情報（error に null も許容する）
// 部分更新（setUpdateInfo(prev => ({ ...prev, error }))）が行われるため全フィールド任意。
interface UpdateInfoState {
  hasUpdate?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  releaseName?: string;
  releaseUrl?: string;
  error?: string | null;
}

// Context が提供する値の型
export interface SettingsContextValue {
  // 設定本体
  settings: SettingsState;
  updateSettings: (path: string, value: unknown) => void;
  resetSettings: () => void;
  // 設定モーダル
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  // 設定の入出力
  exportSettings: () => void;
  importSettings: (jsonString: string) => ImportSettingsResult;
  // アップデート確認
  checkForUpdates: () => Promise<null>;
  updateInfo: UpdateInfoState | null;
  isCheckingUpdate: boolean;
  isDevelopment: boolean;
  appVersion: string;
  githubRepo: string;
  // 自動アップデート
  updateStatus: string | null;
  isDownloading: boolean;
  downloadProgress: number;
  downloadUrl: string | null | undefined;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  isElectronApp: boolean;
  // ユーザー管理
  users: User[];
  currentUser: User;
  currentUserId: string;
  addUser: (name: string, color: string) => User;
  removeUser: (userId: string) => boolean;
  switchUser: (userId: string) => void;
  updateUserName: (name: string) => void;
  updateUserColor: (color: string) => void;
  // テーマ
  effectiveTheme: 'dark' | 'light';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// 環境判定（ビルド時に決定）
const IS_DEVELOPMENT = import.meta.env.DEV;
const APP_VERSION = __APP_VERSION__;
const GITHUB_REPO = 'lutelute/Marginalia';

// Electronアプリかどうかを判定
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// checkForUpdates が返す data の形（preload / updateManager に合わせる）
interface UpdateCheckData {
  available?: boolean;
  version?: string;
  releaseName?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  error?: string;
}

// アップデート関連で利用する electronAPI のサブセット
// （src/types の ElectronAPI を変更せず、このファイル内で利用するメソッドのみ型付けする）
interface UpdateElectronAPI {
  checkForUpdates: () => Promise<{ success: boolean; data?: UpdateCheckData; error?: string }>;
  downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  restartApp: () => void;
  onUpdateProgress: (
    callback: (data: { percent: number; downloadedMB: string; totalMB: string }) => void
  ) => () => void;
}

// アップデート関連メソッドへ型付きでアクセスするためのヘルパー
const updateAPI = (): UpdateElectronAPI | undefined =>
  window.electronAPI as unknown as UpdateElectronAPI | undefined;

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
    showMinimap: true, // ミニマップ表示
    scrollSync: true, // スクロール同期
    showToolbar: false, // 編集ツールバー表示（デフォルト非表示）
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
    theme: 'dark' as 'dark' | 'light' | 'system',
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

  // ファイル表示設定
  files: {
    showHiddenFiles: false,
    excludePatterns: ['dist', 'release', 'build', '.cache', '.next', '.nuxt', 'coverage', '.turbo'],
  },
};

// 深いマージ関数（デフォルト設定と保存された設定をマージ）
function deepMerge<T extends Record<string, any>>(defaults: T, saved: Partial<T>): T {
  const result = { ...defaults };

  for (const key in saved) {
    if (Object.prototype.hasOwnProperty.call(saved, key)) {
      const savedValue = saved[key];
      const defaultValue = defaults[key];

      // 両方がオブジェクト（配列でない）の場合は再帰的にマージ
      if (
        savedValue !== null &&
        defaultValue !== null &&
        typeof savedValue === 'object' &&
        typeof defaultValue === 'object' &&
        !Array.isArray(savedValue) &&
        !Array.isArray(defaultValue)
      ) {
        result[key] = deepMerge(defaultValue, savedValue) as T[Extract<keyof T, string>];
      } else if (savedValue !== undefined) {
        result[key] = savedValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('marginalia-settings');
    if (saved) {
      try {
        // 深いマージで新しいデフォルトプロパティを保持
        return deepMerge(DEFAULT_SETTINGS, JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // OS設定が変更されたときに再計算
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // OS設定変更の監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 実効テーマを計算
  const effectiveTheme = settings.ui.theme === 'system' ? systemTheme : settings.ui.theme;

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
  const updateSettings = useCallback((path: string, value: unknown) => {
    setSettings((prev) => {
      const newSettings: Record<string, any> = { ...prev };
      const keys = path.split('.');
      let current: Record<string, any> = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings as SettingsState;
    });
  }, []);

  // 設定のリセット
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('marginalia-settings');
  }, []);

  // アップデート確認
  const [updateInfo, setUpdateInfo] = useState<UpdateInfoState | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null | undefined>(null);
  const [, setIsInstalling] = useState(false);
  const [, setIsReadyToInstall] = useState(false);

  // Electronアップデート進捗イベントを監視
  useEffect(() => {
    if (!isElectron()) return;

    const cleanup = updateAPI()?.onUpdateProgress((data) => {
      setDownloadProgress(data.percent);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron()) return null;

    setIsCheckingUpdate(true);
    setUpdateStatus('checking');
    try {
      const result = await updateAPI()?.checkForUpdates();

      if (result?.success && result.data) {
        const data = result.data;
        if (data.available) {
          setUpdateInfo({
            hasUpdate: true,
            currentVersion: APP_VERSION,
            latestVersion: data.version,
            releaseName: data.releaseName,
            releaseUrl: data.releaseUrl,
            error: null,
          });
          setDownloadUrl(data.downloadUrl);
          setUpdateStatus('available');
        } else {
          setUpdateInfo({
            hasUpdate: false,
            currentVersion: APP_VERSION,
            latestVersion: data.version || APP_VERSION,
            error: null,
          });
          setUpdateStatus('not-available');
        }
      } else {
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: result?.data?.error || result?.error || 'アップデート確認に失敗しました',
        });
        setUpdateStatus('error');
      }
    } catch {
      setUpdateInfo({
        hasUpdate: false,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        error: 'アップデート確認に失敗しました',
      });
      setUpdateStatus('error');
    } finally {
      setIsCheckingUpdate(false);
    }
    return null;
  }, []);

  // アップデートをダウンロード
  const downloadUpdate = useCallback(async () => {
    if (!isElectron()) return;

    if (!downloadUrl) {
      setUpdateInfo(prev => ({
        ...prev,
        error: 'ダウンロードURLが見つかりません。リリースページから手動でダウンロードしてください。',
      }));
      setUpdateStatus('error');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setUpdateStatus('downloading');

    try {
      const result = await updateAPI()?.downloadUpdate(downloadUrl);
      if (result?.success) {
        setIsDownloading(false);
        setDownloadProgress(100);
        setIsReadyToInstall(true);
        setUpdateStatus('downloaded');
      } else {
        setIsDownloading(false);
        setUpdateInfo(prev => ({
          ...prev,
          error: result?.error || 'ダウンロードに失敗しました',
        }));
        setUpdateStatus('error');
      }
    } catch {
      setIsDownloading(false);
      setUpdateInfo(prev => ({
        ...prev,
        error: 'ダウンロードに失敗しました',
      }));
      setUpdateStatus('error');
    }
  }, [downloadUrl]);

  // アップデートをインストール
  const installUpdate = useCallback(async () => {
    if (!isElectron()) return;

    setIsInstalling(true);
    setUpdateStatus('installing');

    try {
      const result = await updateAPI()?.installUpdate();
      if (result?.success) {
        // インストール成功、再起動が必要
        setUpdateStatus('installed');
        // 自動で再起動
        updateAPI()?.restartApp();
      } else {
        setIsInstalling(false);
        setUpdateInfo(prev => ({
          ...prev,
          error: result?.error || 'インストールに失敗しました',
        }));
        setUpdateStatus('error');
      }
    } catch {
      setIsInstalling(false);
      setUpdateInfo(prev => ({
        ...prev,
        error: 'インストールに失敗しました',
      }));
      setUpdateStatus('error');
    }
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
  const importSettings = useCallback((jsonString: string): ImportSettingsResult => {
    try {
      const imported = JSON.parse(jsonString);
      setSettings(deepMerge(DEFAULT_SETTINGS, imported));
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const value: SettingsContextValue = {
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
    downloadUrl,
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
    // テーマ
    effectiveTheme,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

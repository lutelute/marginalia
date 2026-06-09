// Editor Mode
export type EditorMode = 'edit' | 'split' | 'preview';

// Tab Types
export type { Tab, EditorGroup, TabLayout, FileContentCache } from './tabs';

import type { FileContentCache } from './tabs';
// Build 系の型は @marginalia/shared-types に移行（ElectronAPI 定義で参照する分を import）
import type {
  ManifestInfo,
  TemplateInfo,
  CatalogData,
  BuildResult,
  DependencyStatus,
  ProjectDetectionResult,
} from '@marginalia/shared-types';
// File 系の型も @marginalia/shared-types に移行（ElectronAPI で参照する分を import）
import type {
  FileTreeNode,
  FileStats,
  ReadDirectoryOptions,
  BackupListResult,
  RestoreBackupResult,
  PreviewBackupResult,
  CreateBackupResult,
  RestoreMarginaliaBackupResult,
} from '@marginalia/shared-types';

// ---------------------------------------------------------------------------
// FileContext (src/contexts/FileContext.tsx) の型
// ---------------------------------------------------------------------------

// reducer が管理する状態
export interface FileState {
  rootPath: string | null;
  fileTree: FileTreeNode[];
  currentFile: string | null;
  content: string;
  originalContent: string;
  isModified: boolean;
  isLoading: boolean;
  error: string | null;
  externalChangeDetected: boolean;
  lastKnownMtime: string | null;
  orphanedFiles: OrphanedFileData[];
  contentCache: Record<string, FileContentCache>;
}

// reducer に渡される action (discriminated union)
export type FileAction =
  | { type: 'SET_ROOT_PATH'; payload: string | null }
  | { type: 'SET_FILE_TREE'; payload: FileTreeNode[] }
  | { type: 'SET_CURRENT_FILE'; payload: string | null }
  | { type: 'SET_CONTENT'; payload: { content: string; original?: string; mtime?: string | null } }
  | { type: 'UPDATE_CONTENT'; payload: string }
  | { type: 'MARK_SAVED' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'EXTERNAL_CHANGE_DETECTED' }
  | { type: 'CLEAR_EXTERNAL_CHANGE' }
  | { type: 'UPDATE_MTIME'; payload: string | null }
  | { type: 'SET_ORPHANED_FILES'; payload: OrphanedFileData[] }
  | { type: 'REMOVE_ORPHANED_FILE'; payload: string }
  | { type: 'CACHE_FILE_CONTENT'; payload: { filePath: string; content: string; mtime?: string | null } }
  | { type: 'UPDATE_CACHED_CONTENT'; payload: { filePath: string; content: string } }
  | { type: 'MARK_CACHED_SAVED'; payload: string }
  | { type: 'EVICT_CACHE'; payload: string };

// useFile() が返す値（state を spread した上にメソッド群を加えたもの）
export interface FileContextValue extends FileState {
  openDirectory: () => Promise<void>;
  openDirectoryByPath: (dirPath: string) => Promise<void>;
  refreshDirectory: () => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  updateContent: (content: string) => void;
  saveFile: () => Promise<void>;
  clearError: () => void;
  recentFolders: string[];
  clearRecentFolders: () => void;
  fileMetadata: FileStats | null;
  loadFileMetadata: (filePath: string) => Promise<void>;
  checkExternalChange: () => Promise<boolean>;
  reloadFile: () => Promise<void>;
  clearExternalChange: () => void;
  // ファイル操作
  closeFile: (filePath: string) => void;
  loadFileToCache: (filePath: string) => Promise<void>;
  updateCachedContent: (filePath: string, newContent: string) => void;
  saveCachedFile: (filePath: string) => Promise<void>;
  renameFileWithAnnotations: (filePath: string, newName: string) => Promise<FileOperationResult>;
  moveFileWithAnnotations: (oldPath: string, newPath: string) => Promise<FileOperationResult>;
  // 孤立ファイル管理
  detectOrphanedFiles: (dirPath: string) => Promise<void>;
  exportOrphanedFile: (orphanedFile: OrphanedFileData) => void;
  reassignOrphanedFile: (orphanedFile: OrphanedFileData, newFilePath: string) => Promise<FileOperationResult>;
  deleteOrphanedFile: (orphanedFile: OrphanedFileData) => Promise<FileOperationResult>;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  color: string;
}

export const USER_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
] as const;

// V2 Annotation Types (re-export from annotations.ts)
export type {
  AnnotationType,
  AnnotationStatus,
  AnnotationV2,
  AnnotationReply,
  AnnotationSelector,
  TextQuoteSelector,
  TextPositionSelector,
  EditorPositionSelector,
  AnnotationTarget,
  HistoryEntryV2,
  MarginaliaFileV2,
  PendingSelectionV2,
  LegacyAnnotation,
} from './annotations';

// V1互換エイリアス（マイグレーション済みコードでも動くように）
export type { AnnotationV2 as Annotation } from './annotations';
export type { AnnotationReply as Reply } from './annotations';
export type { HistoryEntryV2 as HistoryItem } from './annotations';
export type { PendingSelectionV2 as PendingSelection } from './annotations';

// 削除されたファイルの注釈データ
export interface OrphanedFileData {
  filePath: string;
  fileName: string;
  lastModified: string;
  annotations: any[];
  history: any[];
}

// File operation result (rename/move/reassign/delete 等の戻り値)
export interface FileOperationResult {
  success: boolean;
  error?: string;
  newPath?: string;
}

export interface AnnotationFilter {
  status: 'resolved' | 'unresolved' | null;
  types: ('comment' | 'review' | 'pending' | 'discussion')[];
  author: string | null;
}

// File Types — 実体は @marginalia/shared-types（M4 で移行）
export type {
  FileTreeNode,
  FileStats,
  BackupInfo,
  BackupListResult,
  PreviewBackupResult,
  RestoreBackupResult,
  RestoreMarginaliaBackupResult,
  CreateBackupResult,
  ReadDirectoryOptions,
} from '@marginalia/shared-types';

// Settings Types
export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showMinimap: boolean;
  scrollSync: boolean;
}

export interface PreviewSettings {
  fontSize: number;
  lineHeight: number;
  showAnnotationSidebar: boolean;
}

export interface BackupSettings {
  enabled: boolean;
  maxBackups: number;
  autoBackupOnSave: boolean;
}

export interface UISettings {
  theme: 'dark' | 'light';
  sidebarWidth: number;
  annotationPanelWidth: number;
  showWelcomeOnStartup: boolean;
}

export interface DeveloperSettings {
  enableDevTools: boolean;
  verboseLogging: boolean;
  showDebugInfo: boolean;
}

export interface FilesSettings {
  showHiddenFiles: boolean;
}

export interface Settings {
  editor: EditorSettings;
  preview: PreviewSettings;
  backup: BackupSettings;
  ui: UISettings;
  developer: DeveloperSettings;
  files: FilesSettings;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  releaseName?: string;
  publishedAt?: string;
  error?: string;
}

export type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string; releaseName?: string }
  | { status: 'not-available'; version: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

// Electron API Types
export interface ElectronAPI {
  openDirectory: () => Promise<string | null>;
  readDirectory: (path: string, options?: ReadDirectoryOptions) => Promise<FileTreeNode[]>;
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
  readMarginalia: (path: string) => Promise<{ success: boolean; data?: { lastModified?: string; annotations?: any[]; history?: any[]; [key: string]: unknown }; needsMigration?: boolean; error?: string } | null>;
  writeMarginalia: (path: string, data: any) => Promise<boolean>;
  exists: (path: string) => Promise<boolean>;
  listBackups: (path: string) => Promise<BackupListResult>;
  restoreBackup: (backupPath: string, targetPath: string) => Promise<RestoreBackupResult>;
  previewBackup: (backupPath: string) => Promise<PreviewBackupResult>;
  deleteBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  renameFile: (filePath: string, newName: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  moveFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  createBackup: (path: string) => Promise<CreateBackupResult>;
  getFileStats: (path: string) => Promise<{ success: boolean; stats?: FileStats; error?: string } | null>;
  // 開いているファイルの外部変更監視
  watchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  unwatchFile: () => Promise<{ success: boolean; error?: string }>;
  onFileChangedExternally: (callback: (filePath: string) => void) => () => void;
  listMarginaliaBackups: (path: string) => Promise<BackupListResult>;
  restoreMarginaliaBackup: (backupPath: string, filePath: string) => Promise<RestoreMarginaliaBackupResult>;
  // アップデート関連
  checkForUpdates: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  restartApp: () => void;
  getAppVersion: () => Promise<string>;
  onUpdateProgress: (
    callback: (data: { percent: number; downloadedMB: string; totalMB: string }) => void
  ) => () => void;
  // ターミナル関連
  terminalCreate: (cwd?: string) => Promise<{ sessionId: string; pid: number }>;
  terminalWrite: (sessionId: string, data: string) => Promise<void>;
  terminalResize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  terminalDestroy: (sessionId: string) => Promise<void>;
  onTerminalData: (sessionId: string, callback: (data: string) => void) => () => void;
  onTerminalExit: (sessionId: string, callback: (exitCode: number, signal: number) => void) => () => void;
  onNewTerminal: (callback: () => void) => () => void;
  onCloseActiveTab: (callback: () => void) => () => void;
  // BibTeX ファイル
  listBibFiles: (dirPath: string) => Promise<{ success: boolean; files: { path: string; content: string }[]; error?: string }>;
  // ビルドシステム関連
  checkDependencies: () => Promise<DependencyStatus>;
  detectProject: (dirPath: string) => Promise<ProjectDetectionResult>;
  runBuild: (projectRoot: string, manifestPath: string, format: string) => Promise<BuildResult>;
  listTemplates: (dirPath: string) => Promise<{ success: boolean; templates: TemplateInfo[]; error?: string }>;
  readManifest: (manifestPath: string) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
  writeManifest: (manifestPath: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  listManifests: (dirPath: string) => Promise<{ success: boolean; manifests: ManifestInfo[]; error?: string }>;
  readFileAsBase64: (filePath: string) => Promise<string>;
  openPath: (filePath: string) => Promise<string>;
  openPdfViewer: (filePath: string) => Promise<void>;
  onBuildProgress: (callback: (data: string) => void) => () => void;
  onTriggerBuild: (callback: () => void) => () => void;
  readCatalog: (dirPath: string) => Promise<{ success: boolean; catalog: CatalogData | null; error?: string }>;
  readDefaultCatalog: () => Promise<{ success: boolean; catalog: CatalogData | null; error?: string }>;
  readDefaultDemoData: () => Promise<{ success: boolean; demoData: Record<string, { manifestYaml: string; sections: { path: string; name: string; content: string | null }[] }>; templateMap: Record<string, string[]>; error?: string }>;
  listSourceFiles: (dirPath: string) => Promise<{ success: boolean; files: string[]; error?: string }>;
  initMytemp: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  createCustomTemplate: (dirPath: string, name: string, baseTemplate?: string) => Promise<{ success: boolean; error?: string }>;
  deleteCustomTemplate: (dirPath: string, name: string) => Promise<{ success: boolean; error?: string }>;
  // Quick Build / Build All / Install Sample
  quickBuildDemo: (demoStem: string, format?: string) => Promise<BuildResult>;
  runAllDemos: (format?: string) => Promise<{ success: boolean; results: Array<{ stem: string; success: boolean; outputPath?: string; error?: string }>; summary?: { total: number; success: number; failed: number }; error?: string }>;
  installSample: (demoStem: string, targetProjectDir: string) => Promise<{ success: boolean; copiedFiles?: string[]; error?: string }>;
  onBuildAllProgress: (callback: (data: { current: number; total: number; stem: string; status: string }) => void) => () => void;
  // ギャラリーウィンドウ
  openGalleryWindow: (projectDir: string) => Promise<void>;
  getGalleryProjectDir: () => Promise<string | null>;
  galleryApplyTemplate: (templateName: string) => Promise<void>;
  galleryNotifyChange: () => Promise<void>;
  onOpenGallery: (callback: () => void) => () => void;
  onGalleryApplyTemplate: (callback: (templateName: string) => void) => () => void;
  onGalleryDataChanged: (callback: () => void) => () => void;
}

// Build System Types — 実体は @marginalia/shared-types（M3 で移行）
export type {
  ManifestInfo,
  TemplateInfo,
  TemplateBundleInfo,
  CatalogData,
  DocxDirectConfig,
  ManifestData,
  BuildResult,
  DependencyStatus,
  ProjectDetectionResult,
} from '@marginalia/shared-types';

// ---------------------------------------------------------------------------
// AppStateContext (src/App.tsx) の型
// ---------------------------------------------------------------------------

export interface AppStateContextValue {
  isSidebarOpen: boolean;
  editorMode: EditorMode;
  isAnnotationPanelOpen: boolean;
  explorerCollapsed: boolean;
  buildCollapsed: boolean;
  galleryCollapsed: boolean;
  sidebarSplitRatio: number;
  viewingPdf: string | null;
  isGalleryModalOpen: boolean;
  toggleSidebar: () => void;
  setEditorMode: (mode: EditorMode) => void;
  toggleAnnotationPanel: () => void;
  toggleExplorer: () => void;
  toggleBuild: () => void;
  toggleGallery: () => void;
  setSidebarSplitRatio: (ratio: number) => void;
  setViewingPdf: (path: string | null) => void;
  openGalleryModal: () => void;
  closeGalleryModal: () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
    // preload.js が必ず注入するため non-optional として扱う
    electronAPI: ElectronAPI;
  }
}

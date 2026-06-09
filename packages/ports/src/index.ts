// @marginalia/ports
// プラットフォーム境界のポートインターフェース（純粋TS型）。
// Electron / Web / Tauri がこれらを実装し、UI/コアはこの契約のみに依存する。
import type {
  ManifestInfo,
  TemplateInfo,
  CatalogData,
  BuildResult,
  DependencyStatus,
  ProjectDetectionResult,
  FileTreeNode,
  FileStats,
  ReadDirectoryOptions,
  BackupListResult,
  RestoreBackupResult,
  PreviewBackupResult,
  CreateBackupResult,
  RestoreMarginaliaBackupResult,
} from '@marginalia/shared-types';

/** 操作結果の共通形（既存 IPC 戻り値の {success,error} を踏襲） */
export interface Result {
  success: boolean;
  error?: string;
}

/** 購読解除関数 */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// 注釈ストレージ
// ---------------------------------------------------------------------------

/**
 * 注釈サイドカー(.mrgl)のデータ。シリアライズ可能な緩い型に留め、
 * 厳密な AnnotationV2 型への変換は呼び出し側（annotation-core）が担う。
 */
export interface AnnotationFileData {
  lastModified?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IPC境界の動的データ
  annotations?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IPC境界の動的データ
  history?: any[];
  [key: string]: unknown;
}

/**
 * 注釈データの永続化ポート。
 * Electron=IPC(.mrgl ファイル) / Web=IndexedDB / Tauri=fs 等で実装を差し替える。
 */
export interface AnnotationStoragePort {
  read(
    docPath: string
  ): Promise<{
    success: boolean;
    data?: AnnotationFileData;
    needsMigration?: boolean;
    error?: string;
  } | null>;
  // 保存はシリアライズ可能な任意データを受ける（呼び出し側が厳密型 MarginaliaFileV2 を渡す）
  write(docPath: string, data: unknown): Promise<Result | boolean | void>;
}

// ---------------------------------------------------------------------------
// ファイルシステム
// ---------------------------------------------------------------------------

/**
 * ワークスペースのファイル操作ポート。
 * Electron=node:fs / Web=File System Access API / Tauri=fs crate で実装。
 */
export interface FileSystemPort {
  pickDirectory(): Promise<string | null>;
  readDirectory(path: string, options?: ReadDirectoryOptions): Promise<FileTreeNode[]>;
  readFile(path: string): Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile(path: string, content: string): Promise<Result>;
  exists(path: string): Promise<boolean>;
  getFileStats(
    path: string
  ): Promise<{ success: boolean; stats?: FileStats; error?: string } | null>;
  renameFile(
    filePath: string,
    newName: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }>;
  moveFile(
    oldPath: string,
    newPath: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }>;
  readFileAsBase64(path: string): Promise<string>;
  // ファイル本体・注釈のバックアップ
  listBackups(path: string): Promise<BackupListResult>;
  restoreBackup(backupPath: string, targetPath: string): Promise<RestoreBackupResult>;
  previewBackup(backupPath: string): Promise<PreviewBackupResult>;
  createBackup(path: string): Promise<CreateBackupResult>;
  deleteBackup(backupPath: string): Promise<Result>;
  listMarginaliaBackups(path: string): Promise<BackupListResult>;
  restoreMarginaliaBackup(
    backupPath: string,
    filePath: string
  ): Promise<RestoreMarginaliaBackupResult>;
}

/**
 * 開いているファイルの外部変更監視ポート。
 * Electron=fs.watch / Web=File System Access API or ポーリング。
 */
export interface FileWatcherPort {
  watch(filePath: string): Promise<Result>;
  unwatch(): Promise<Result>;
  onChanged(cb: (filePath: string) => void): Unsubscribe;
}

// ---------------------------------------------------------------------------
// ビルド実行
// ---------------------------------------------------------------------------

export interface BuildAllProgressData {
  current: number;
  total: number;
  stem: string;
  status: string;
}

export interface RunAllDemosResult {
  success: boolean;
  results: Array<{ stem: string; success: boolean; outputPath?: string; error?: string }>;
  summary?: { total: number; success: number; failed: number };
  error?: string;
}

/**
 * 報告書ビルドの実行ポート。
 * Electron=python/pandoc を子プロセス実行 / Web=リモートビルドAPI or 無効化。
 */
export interface BuildRunnerPort {
  detectProject(dirPath: string): Promise<ProjectDetectionResult>;
  listManifests(
    dirPath: string
  ): Promise<{ success: boolean; manifests: ManifestInfo[]; error?: string }>;
  listTemplates(
    dirPath: string
  ): Promise<{ success: boolean; templates: TemplateInfo[]; error?: string }>;
  readCatalog(
    dirPath: string
  ): Promise<{ success: boolean; catalog: CatalogData | null; error?: string }>;
  listSourceFiles(
    dirPath: string
  ): Promise<{ success: boolean; files: string[]; error?: string }>;
  listBibFiles(
    dirPath: string
  ): Promise<{ success: boolean; files: { path: string; content: string }[]; error?: string }>;
  checkDependencies(): Promise<DependencyStatus>;
  readManifest(
    manifestPath: string
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
  writeManifest(manifestPath: string, data: Record<string, unknown>): Promise<Result>;
  createCustomTemplate(dirPath: string, name: string, baseTemplate?: string): Promise<Result>;
  deleteCustomTemplate(dirPath: string, name: string): Promise<Result>;
  runBuild(projectRoot: string, manifestPath: string, format: string): Promise<BuildResult>;
  quickBuildDemo(demoStem: string, format?: string): Promise<BuildResult>;
  runAllDemos(format?: string): Promise<RunAllDemosResult>;
  installSample(
    demoStem: string,
    targetProjectDir: string
  ): Promise<{ success: boolean; copiedFiles?: string[]; error?: string }>;
  // 進捗・トリガーイベント（M5 で UIEventBus に整理予定）
  onBuildProgress(cb: (data: string) => void): Unsubscribe;
  onBuildAllProgress(cb: (data: BuildAllProgressData) => void): Unsubscribe;
  onTriggerBuild(cb: () => void): Unsubscribe;
}

// ---------------------------------------------------------------------------
// アプリ内蔵リソース解決（Electron: app.isPackaged/process.resourcesPath を隠蔽）
// ---------------------------------------------------------------------------

export interface DefaultDemoData {
  [stem: string]: {
    manifestYaml: string;
    sections: { path: string; name: string; content: string | null }[];
  };
}

export interface ResourceLocatorPort {
  readDefaultCatalog(): Promise<{ success: boolean; catalog: CatalogData | null; error?: string }>;
  readDefaultDemoData(): Promise<{
    success: boolean;
    demoData: DefaultDemoData;
    templateMap: Record<string, string[]>;
    error?: string;
  }>;
}

// ---------------------------------------------------------------------------
// ポート束
// ---------------------------------------------------------------------------

/**
 * 全プラットフォームポートの束。
 * M4 時点では annotations / fs / watcher / build / resources。
 * 以降のマイルストーンで terminal / updater / kv / bus を追加していく。
 */
export interface PlatformPorts {
  annotations: AnnotationStoragePort;
  fs: FileSystemPort;
  watcher: FileWatcherPort;
  build: BuildRunnerPort;
  resources: ResourceLocatorPort;
}

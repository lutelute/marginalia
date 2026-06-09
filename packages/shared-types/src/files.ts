// File System Types（プラットフォーム非依存）
// ファイルツリー・メタデータ・バックアップに関する型。

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isHidden?: boolean;
  isSystem?: boolean;
  children?: FileTreeNode[];
}

export interface FileStats {
  fileName?: string;
  filePath?: string;
  size?: number;
  sizeFormatted?: string;
  created?: string;
  modified?: string;
  mtime?: string;
  lines?: number;
  words?: number;
  chars?: number;
  [key: string]: unknown;
}

export interface BackupInfo {
  id: string;
  path: string;
  fileName: string;
  createdAt: string;
  /** ファイルバックアップ（listBackups）にのみ存在 */
  size?: number;
  /** 注釈バックアップ（listMarginaliaBackups）にのみ存在 */
  annotationCount?: number;
}

export type BackupListResult =
  | { success: true; backups: BackupInfo[] }
  | { success: false; error: string };

export type PreviewBackupResult =
  | { success: true; content: string; createdAt: string; fileName: string }
  | { success: false; error: string };

export type RestoreBackupResult =
  | { success: true; content: string }
  | { success: false; error: string };

export type RestoreMarginaliaBackupResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export type CreateBackupResult =
  | { success: true; backupPath: string }
  | { success: false; error: string };

export interface ReadDirectoryOptions {
  showHidden?: boolean;
  systemDirs?: string[];
}

// @marginalia/ports
// プラットフォーム境界のポートインターフェース（純粋TS型・依存ゼロ）。
// Electron / Web / Tauri がこれらを実装し、UI/コアはこの契約のみに依存する。

/** 操作結果の共通形（既存 IPC 戻り値の {success,error} を踏襲） */
export interface Result {
  success: boolean;
  error?: string;
}

/** 購読解除関数 */
export type Unsubscribe = () => void;

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

/**
 * 全プラットフォームポートの束。
 * M2 時点では annotations のみ。以降のマイルストーンで
 * fs / build / terminal / watcher / updater / kv / bus を追加していく。
 */
export interface PlatformPorts {
  annotations: AnnotationStoragePort;
}

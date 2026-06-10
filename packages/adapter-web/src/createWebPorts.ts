import type {
  PlatformPorts,
  AnnotationFileData,
  Result,
  Unsubscribe,
} from '@marginalia/ports';

/**
 * createWebPorts — PlatformPorts の Web 実装。
 *
 * ブロック化（M0〜M6b）の実証: window.electronAPI が存在しないブラウザ環境でも
 * UI ブロック（@marginalia/ui-react）がそのまま動くことを示すアダプタ。
 * apps/electron/renderer/index.tsx の createElectronPorts() をこれに
 * 差し替えるだけで <App ports={...}/> は Web に載る。
 *
 * 実装方針（プラットフォーム特性に合わせた段階対応）:
 * - annotations / kv: ストレージバックエンド（既定 localStorage、無ければメモリ）で完全動作
 * - build: checkDependencies が全 false → UI は「ビルド不可」を正しく表示（計画どおりの縮退）
 * - terminal / updater / shell / gallery: Web では未対応を明示（isAvailable=false / エラー返却）
 * - fs: 将来 File System Access API で実装予定。現状は安全な縮退値を返す
 */

/** localStorage 互換の同期 KV バックエンド（テスト・SSR ではメモリ実装を注入） */
export interface WebKeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WebPortsOptions {
  /** KV / 注釈の永続化先。省略時は localStorage（無い環境ではインメモリ） */
  storage?: WebKeyValueBackend;
  /** updater.getAppVersion() が返すバージョン文字列 */
  appVersion?: string;
}

const WEB_UNSUPPORTED = 'この機能は Web 版では利用できません';

/** 注釈サイドカーの保存キー（Electron の .mrgl ファイルに相当） */
const ANNOTATION_KEY_PREFIX = 'marginalia:web:annotations:';

function createMemoryBackend(): WebKeyValueBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function defaultBackend(): WebKeyValueBackend {
  return typeof localStorage !== 'undefined' ? localStorage : createMemoryBackend();
}

const noopUnsubscribe: Unsubscribe = () => {};

const fail = (error: string = WEB_UNSUPPORTED): Result => ({ success: false, error });

export function createWebPorts(options: WebPortsOptions = {}): PlatformPorts {
  const storage = options.storage ?? defaultBackend();
  const appVersion = options.appVersion ?? '0.0.0-web';

  return {
    // 注釈: Electron の .mrgl サイドカーをストレージバックエンドで代替（完全動作）
    annotations: {
      async read(docPath) {
        try {
          const raw = storage.getItem(ANNOTATION_KEY_PREFIX + docPath);
          if (raw === null) {
            return { success: true, data: { annotations: [], history: [] } };
          }
          return { success: true, data: JSON.parse(raw) as AnnotationFileData };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      },
      async write(docPath, data) {
        try {
          storage.setItem(ANNOTATION_KEY_PREFIX + docPath, JSON.stringify(data));
          return { success: true };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      },
    },

    // ファイルシステム: 将来 File System Access API で実装。現状は安全な縮退値
    fs: {
      pickDirectory: async () => null,
      readDirectory: async () => [],
      readFile: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      writeFile: async () => fail(),
      exists: async () => false,
      getFileStats: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      renameFile: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      moveFile: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      readFileAsBase64: async () => '',
      listBackups: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      restoreBackup: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      previewBackup: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      createBackup: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      deleteBackup: async () => fail(),
      listMarginaliaBackups: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      restoreMarginaliaBackup: async () => ({ success: false, error: WEB_UNSUPPORTED }),
    },

    // 監視対象の外部変更は Web には無い → 何もしない成功（UI は通常動作を継続）
    watcher: {
      watch: async () => ({ success: true }),
      unwatch: async () => ({ success: true }),
      onChanged: () => noopUnsubscribe,
    },

    // PTY は Web 未対応（App 側は create 失敗を try/catch で処理する設計）
    terminal: {
      create: async () => {
        throw new Error(WEB_UNSUPPORTED);
      },
      write: async () => {},
      resize: async () => {},
      destroy: async () => {},
      onData: () => noopUnsubscribe,
      onExit: () => noopUnsubscribe,
    },

    // ビルド: 依存全 false → UI が「ビルド不可」を表示する縮退（計画どおり）
    build: {
      detectProject: async () => ({ isProject: false, projectDir: null }),
      listManifests: async () => ({ success: true, manifests: [] }),
      listTemplates: async () => ({ success: true, templates: [] }),
      readCatalog: async () => ({ success: true, catalog: null }),
      listSourceFiles: async () => ({ success: true, files: [] }),
      listBibFiles: async () => ({ success: true, files: [] }),
      checkDependencies: async () => ({ python3: false, pandoc: false, xelatex: false }),
      readManifest: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      writeManifest: async () => fail(),
      createCustomTemplate: async () => fail(),
      deleteCustomTemplate: async () => fail(),
      runBuild: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      quickBuildDemo: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      runAllDemos: async () => ({ success: false, results: [], error: WEB_UNSUPPORTED }),
      installSample: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      onBuildProgress: () => noopUnsubscribe,
      onBuildAllProgress: () => noopUnsubscribe,
      onTriggerBuild: () => noopUnsubscribe,
    },

    // アプリ内蔵リソース: Web 版では同梱なし
    resources: {
      readDefaultCatalog: async () => ({ success: true, catalog: null }),
      readDefaultDemoData: async () => ({
        success: false,
        demoData: {},
        templateMap: {},
        error: WEB_UNSUPPORTED,
      }),
    },

    // ネイティブメニューは Web に無い → 購読は no-op（将来ショートカットで publish）
    bus: {
      onNewTerminal: () => noopUnsubscribe,
      onCloseActiveTab: () => noopUnsubscribe,
      onOpenGallery: () => noopUnsubscribe,
      onGalleryApplyTemplate: () => noopUnsubscribe,
      onGalleryDataChanged: () => noopUnsubscribe,
    },

    // 自動更新は Web に無い（ページリロードで常に最新）
    updater: {
      isAvailable: () => false,
      check: async () => ({ success: false, error: WEB_UNSUPPORTED }),
      download: async () => fail(),
      install: async () => fail(),
      restart: () => {},
      getAppVersion: async () => appVersion,
      onProgress: () => noopUnsubscribe,
    },

    // OS シェル連携は Web 未対応（openPath は Electron 規約で「空文字以外=エラー」）
    shell: {
      openPath: async () => WEB_UNSUPPORTED,
      openPdfViewer: async () => ({ success: false, error: WEB_UNSUPPORTED }),
    },

    // 別ウィンドウギャラリーは Web 未対応（モーダル版 GalleryModal は UI 側で動作）
    gallery: {
      openWindow: async () => {},
      getProjectDir: async () => null,
      applyTemplate: async () => {},
      notifyChange: async () => {},
    },

    // KV: ストレージバックエンドの Promise ラップ（完全動作）
    kv: {
      get: async (key) => storage.getItem(key),
      set: async (key, value) => {
        storage.setItem(key, value);
      },
      remove: async (key) => {
        storage.removeItem(key);
      },
    },
  };
}

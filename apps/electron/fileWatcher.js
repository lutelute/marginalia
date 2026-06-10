/**
 * Marginalia - 開いているファイルの外部変更検出
 *
 * fs.watch で「現在開いているファイル」と、その注釈ファイル（.mrgl）を監視し、
 * 外部（他エディタ・git pull 等）からの変更を検出してレンダラーへ通知する。
 *
 * 監視対象は3系統:
 * 1. 開いている .md ファイル本体 → onChange
 * 2. .marginalia ディレクトリ（存在する場合）→ 対象 .mrgl のイベントのみ onMarginaliaChange
 * 3. .md の親ディレクトリ → `.marginalia` ディレクトリが後から作られたとき
 *    （= 注釈だけが git pull 等で届いたとき）に 2 を張り直して onMarginaliaChange
 *
 * 設計上の注意:
 * - 監視対象は常に1ファイル分のセット（新しい watch を張る前に既存を全て閉じる）。
 * - macOS では1回の変更で fs.watch のイベントが複数回来ることがあるため、
 *   チャネルごとに 500ms のデバウンスで束ねる。
 * - 自アプリの保存による変更との区別は、保存直後の無視ガードを
 *   レンダラー側（FileContext / AnnotationContext）で行う方針（ここでは素直に通知する）。
 * - onMarginaliaChange には .mrgl のパスではなく「対応する md のパス」を渡す。
 *   レンダラーは現在開いているファイルと比較するだけでよい。
 */

const fs = require('fs');
const path = require('path');

const DEBOUNCE_MS = 500;

/** @type {import('fs').FSWatcher[]} */
let watchers = [];
/** @type {string | null} */
let currentPath = null;
/** @type {Record<string, NodeJS.Timeout | null>} */
const debounceTimers = { file: null, marginalia: null };
/** マルチ系統監視のうち .marginalia ディレクトリ監視（張り直しがあるため個別保持） */
let marginaliaDirWatcher = null;

/** 現在の watcher を全て閉じてリセットする */
function closeWatcher() {
  for (const key of Object.keys(debounceTimers)) {
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
      debounceTimers[key] = null;
    }
  }
  for (const w of watchers) {
    try {
      w.close();
    } catch {
      // close 失敗は無視
    }
  }
  watchers = [];
  if (marginaliaDirWatcher) {
    try {
      marginaliaDirWatcher.close();
    } catch {
      // close 失敗は無視
    }
    marginaliaDirWatcher = null;
  }
  currentPath = null;
}

/** チャネル別デバウンス付きでコールバックを発火する */
function fireDebounced(channel, cb) {
  if (debounceTimers[channel]) clearTimeout(debounceTimers[channel]);
  debounceTimers[channel] = setTimeout(() => {
    debounceTimers[channel] = null;
    cb();
  }, DEBOUNCE_MS);
}

/**
 * .marginalia ディレクトリの監視を張る（存在する場合のみ）。
 * 対象 .mrgl ファイル名のイベント（filename 不明時は保守的に全イベント）で通知する。
 *
 * @param {string} marginaliaPath - 対象 .mrgl のフルパス
 * @param {() => void} notify - デバウンス済み通知
 * @returns {boolean} 監視を張れたか
 */
function armMarginaliaDirWatch(marginaliaPath, notify) {
  const dir = path.dirname(marginaliaPath);
  const target = path.basename(marginaliaPath);
  if (!fs.existsSync(dir)) return false;

  try {
    marginaliaDirWatcher = fs.watch(dir, { persistent: false }, (eventType, filename) => {
      // filename が取れない環境では保守的に通知する
      if (filename && filename !== target) return;
      notify();
    });
    marginaliaDirWatcher.on('error', () => {
      // ディレクトリ削除等。親ディレクトリ監視からの再アームに任せる
      try {
        marginaliaDirWatcher.close();
      } catch {
        // close 失敗は無視
      }
      marginaliaDirWatcher = null;
    });
    return true;
  } catch {
    marginaliaDirWatcher = null;
    return false;
  }
}

/**
 * 指定ファイル（と対応する注釈ファイル）の監視を開始する。
 * 既存の watcher があれば閉じてから張り替える（1ファイル分のみ監視）。
 *
 * @param {string} filePath - 監視対象ファイル（検証済み想定）
 * @param {(filePath: string) => void} onChange - 本体変更時（デバウンス済み）
 * @param {string} [marginaliaPath] - 対応する .mrgl のフルパス（省略時は注釈監視なし）
 * @param {(filePath: string) => void} [onMarginaliaChange] - 注釈変更時（md のパスを渡す・デバウンス済み）
 * @returns {{ success: boolean, error?: string }}
 */
function watchFile(filePath, onChange, marginaliaPath, onMarginaliaChange) {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'invalid filePath' };
  }

  // 同じファイルを既に監視中なら何もしない
  if (currentPath === filePath && watchers.length > 0) {
    return { success: true };
  }

  closeWatcher();

  try {
    currentPath = filePath;

    // 1. 本体ファイルの監視
    const fileWatcherInstance = fs.watch(filePath, { persistent: false }, () => {
      fireDebounced('file', () => onChange(filePath));
    });
    fileWatcherInstance.on('error', () => {
      closeWatcher();
    });
    watchers.push(fileWatcherInstance);

    // 2. 注釈ファイル（.mrgl）の監視
    if (marginaliaPath && typeof onMarginaliaChange === 'function') {
      const notify = () => fireDebounced('marginalia', () => onMarginaliaChange(filePath));
      armMarginaliaDirWatch(marginaliaPath, notify);

      // 3. .marginalia ディレクトリ自体が後から作られるケース
      //    （注釈だけが git pull で届いた等）に備えて md の親を監視
      const parentDir = path.dirname(filePath);
      const marginaliaDirName = path.basename(path.dirname(marginaliaPath));
      try {
        const parentWatcher = fs.watch(parentDir, { persistent: false }, (eventType, filename) => {
          if (filename && filename !== marginaliaDirName) return;
          // .marginalia が現れた（or 変化した）。未監視なら張ってから通知する
          if (!marginaliaDirWatcher && armMarginaliaDirWatch(marginaliaPath, notify)) {
            notify();
          }
        });
        parentWatcher.on('error', () => {
          // 親ディレクトリ消失は本体監視のエラーでも検出されるため、ここでは黙って外す
          try {
            parentWatcher.close();
          } catch {
            // close 失敗は無視
          }
        });
        watchers.push(parentWatcher);
      } catch {
        // 親ディレクトリを監視できなくても本体監視は続行
      }
    }

    return { success: true };
  } catch (error) {
    closeWatcher();
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
}

/** 監視を停止する */
function unwatchFile() {
  closeWatcher();
  return { success: true };
}

module.exports = {
  watchFile,
  unwatchFile,
  closeWatcher,
};

/**
 * Marginalia - 開いているファイルの外部変更検出
 *
 * fs.watch で「現在開いているファイル」1つを監視し、
 * 外部（他エディタ等）からの変更を検出してレンダラーへ通知する。
 *
 * 設計上の注意:
 * - 監視対象は常に1ファイルのみ（新しい watch を張る前に既存を閉じる）。
 * - macOS では1回の変更で fs.watch のイベントが複数回来ることがあるため、
 *   500ms のデバウンスで束ねる。
 * - 自アプリの保存による変更との区別は、保存直後の無視ガードを
 *   レンダラー側（FileContext）で行う方針（ここでは素直に通知する）。
 * - パス検証は呼び出し側（main.js）で pathGuard.assertPathAllowed 済みを前提とするが、
 *   念のため受け取った filePath はそのまま fs.watch に渡す。
 */

const fs = require('fs');

const DEBOUNCE_MS = 500;

/** @type {import('fs').FSWatcher | null} */
let currentWatcher = null;
/** @type {string | null} */
let currentPath = null;
/** @type {NodeJS.Timeout | null} */
let debounceTimer = null;

/** 現在の watcher を閉じてリセットする */
function closeWatcher() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (currentWatcher) {
    try {
      currentWatcher.close();
    } catch {
      // close 失敗は無視
    }
    currentWatcher = null;
  }
  currentPath = null;
}

/**
 * 指定ファイルの監視を開始する。
 * 既存の watcher があれば閉じてから張り替える（1ファイルのみ監視）。
 *
 * @param {string} filePath - 監視対象ファイル（検証済み想定）
 * @param {(filePath: string) => void} onChange - 変更検出時のコールバック（デバウンス済み）
 * @returns {{ success: boolean, error?: string }}
 */
function watchFile(filePath, onChange) {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'invalid filePath' };
  }

  // 同じファイルを既に監視中なら何もしない
  if (currentPath === filePath && currentWatcher) {
    return { success: true };
  }

  closeWatcher();

  try {
    currentPath = filePath;
    currentWatcher = fs.watch(filePath, { persistent: false }, () => {
      // macOS では同一変更で複数回来るため debounce
      if (debounceTimer) clearTimeout(debounceTimer);
      const watchedPath = filePath;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        onChange(watchedPath);
      }, DEBOUNCE_MS);
    });

    // ファイル削除・リネーム等で watcher がエラーになっても落とさない
    currentWatcher.on('error', () => {
      closeWatcher();
    });

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

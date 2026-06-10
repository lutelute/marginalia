import { HistoryEntryV2 } from './annotations';

/**
 * .mrgl 内 history のサイズ上限（シリアライズ後バイト数）。
 * 件数上限（旧: 100件）の代わりにサイズで打ち切ることで、
 * detail 付きエントリでも長期運用時のファイル肥大を防ぐ。
 */
export const HISTORY_MAX_BYTES = 512 * 1024;

const encoder = new TextEncoder();

/**
 * 履歴を新しい順に維持したまま、シリアライズ合計が maxBytes を超える
 * 古いエントリを切り捨てる。収まっている場合は同一参照を返す
 * （React の再レンダー抑止のため）。
 */
export function truncateHistoryBySize(
  history: HistoryEntryV2[],
  maxBytes: number = HISTORY_MAX_BYTES
): HistoryEntryV2[] {
  let total = 2; // "[]" 分
  let keep = 0;

  for (const entry of history) {
    const size = encoder.encode(JSON.stringify(entry)).length + 1; // +1 はカンマ分
    if (total + size > maxBytes) break;
    total += size;
    keep++;
  }

  return keep === history.length ? history : history.slice(0, keep);
}

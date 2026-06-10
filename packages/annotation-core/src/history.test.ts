import { describe, it, expect } from 'vitest';
import { truncateHistoryBySize, HISTORY_MAX_BYTES } from './history';
import { HistoryEntryV2 } from './annotations';

function entry(i: number, padding = ''): HistoryEntryV2 {
  return {
    id: `id-${i}`,
    action: 'comment',
    summary: `エントリ${i}${padding}`,
    timestamp: '2026-06-10T00:00:00.000Z',
    annotationId: `ann-${i}`,
  };
}

describe('truncateHistoryBySize', () => {
  it('上限内なら同一参照を返す（再レンダー抑止）', () => {
    const history = [entry(1), entry(2), entry(3)];
    const result = truncateHistoryBySize(history);
    expect(result).toBe(history);
  });

  it('上限を超えたら古い（末尾の）エントリから切り捨てる', () => {
    // 1エントリ ≒ 200バイト程度 → 上限を小さくして検証
    const history = [entry(1), entry(2), entry(3), entry(4)];
    const oneEntrySize = JSON.stringify(entry(1)).length + 1;
    const result = truncateHistoryBySize(history, oneEntrySize * 2 + 2);

    expect(result.length).toBeLessThan(history.length);
    // 新しい順（先頭）が残る
    expect(result[0].id).toBe('id-1');
    expect(result.map((e) => e.id)).toEqual(
      history.slice(0, result.length).map((e) => e.id)
    );
  });

  it('マルチバイト文字をバイト数で数える', () => {
    // summary が日本語のとき .length（コード単位）よりバイト数は大きい。
    // コード単位数では収まるがバイト数では溢れる上限を与えて、
    // バイト基準で切られることを確認する
    const e = entry(1, 'あ'.repeat(100)); // 約300バイト増
    const charLen = JSON.stringify(e).length + 1 + 2;
    const result = truncateHistoryBySize([e], charLen);
    expect(result.length).toBe(0);
  });

  it('全部入らない場合は空配列', () => {
    const result = truncateHistoryBySize([entry(1)], 10);
    expect(result).toEqual([]);
  });

  it('detail 付きの大きなエントリもサイズに含める', () => {
    const big: HistoryEntryV2 = {
      ...entry(1),
      detail: { before: 'x'.repeat(1000), after: 'y'.repeat(1000) },
    };
    const small = entry(2);
    const smallSize = JSON.stringify(small).length + 1 + 2;
    // big が先頭（最新）で上限が small サイズ程度 → big の時点で溢れて空になる
    expect(truncateHistoryBySize([big, small], smallSize)).toEqual([]);
    // big を収める上限なら big だけ残る
    const bigSize = new TextEncoder().encode(JSON.stringify(big)).length + 1 + 2;
    expect(truncateHistoryBySize([big, small], bigSize).map((e) => e.id)).toEqual(['id-1']);
  });

  it('デフォルト上限は 512KB', () => {
    expect(HISTORY_MAX_BYTES).toBe(512 * 1024);
  });
});

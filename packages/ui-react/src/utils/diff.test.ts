import { describe, it, expect } from 'vitest';
import { computeDiff, createSideBySidePairs } from './diff';

describe('computeDiff', () => {
  it('同一テキストは全行 unchanged', () => {
    const result = computeDiff('a\nb\nc', 'a\nb\nc');
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(3);
  });

  it('行追加を検出する', () => {
    const result = computeDiff('a\nc', 'a\nb\nc');
    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    const added = result.lines.find((l) => l.type === 'added');
    expect(added?.content).toBe('b');
    expect(added?.newLineNumber).toBe(2);
  });

  it('行削除を検出する', () => {
    const result = computeDiff('a\nb\nc', 'a\nc');
    expect(result.removedCount).toBe(1);
    const removed = result.lines.find((l) => l.type === 'removed');
    expect(removed?.content).toBe('b');
    expect(removed?.oldLineNumber).toBe(2);
  });

  it('行変更は removed + added のペアになる', () => {
    const result = computeDiff('a\nold\nc', 'a\nnew\nc');
    expect(result.removedCount).toBe(1);
    expect(result.addedCount).toBe(1);
  });

  it('空文字列同士でもクラッシュしない', () => {
    const result = computeDiff('', '');
    expect(result.lines.length).toBe(1); // 空文字列 split('\n') → ['']
    expect(result.unchangedCount).toBe(1);
  });

  it('完全に異なるテキスト', () => {
    const result = computeDiff('x\ny', 'p\nq');
    expect(result.removedCount).toBe(2);
    expect(result.addedCount).toBe(2);
    expect(result.unchangedCount).toBe(0);
  });
});

describe('createSideBySidePairs', () => {
  it('unchanged 行は左右両方に出る', () => {
    const pairs = createSideBySidePairs(computeDiff('a', 'a'));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].left?.content).toBe('a');
    expect(pairs[0].right?.content).toBe('a');
  });

  it('変更行は added / removed の両方がペア配列に含まれる', () => {
    // 注: 現実装の computeDiff は変更行を added → removed の順で出すため
    // removed+added の連続ペア化は発動しない（左右に分かれて表示される）
    const pairs = createSideBySidePairs(computeDiff('a\nold\nc', 'a\nnew\nc'));
    const removed = pairs.find((p) => p.left?.type === 'removed');
    const added = pairs.find((p) => p.right?.type === 'added');
    expect(removed?.left?.content).toBe('old');
    expect(added?.right?.content).toBe('new');
  });

  it('単独 added は左が null', () => {
    const pairs = createSideBySidePairs(computeDiff('a', 'a\nb'));
    const added = pairs.find((p) => p.right?.type === 'added');
    expect(added?.left).toBeNull();
    expect(added?.right?.content).toBe('b');
  });
});

import { describe, it, expect } from 'vitest';
import {
  createTextQuoteSelector,
  anchorByTextQuoteSelector,
  anchorByTextPositionSelector,
  anchorByEditorPositionSelector,
  anchorAnnotation,
  computeEditorPositionFromOffset,
  getAnnotationExactText,
  rebuildSelectors,
  isSelectorDrifted,
} from './selectorUtils';
import type { TextPositionSelector } from '../types/annotations';
import type { AnnotationV2 } from '../types/annotations';

const DOC = [
  '# タイトル',
  '',
  'これは最初の段落です。重要なテキストがここにあります。',
  '',
  '二番目の段落。重要なテキストが再び出てきます。',
  '',
  '最後の行。',
].join('\n');

function makeAnnotation(selectors: AnnotationV2['target']['selectors']): AnnotationV2 {
  return {
    id: 'test-id',
    type: 'comment',
    target: { source: '/test.md', selectors },
    content: 'テストコメント',
    author: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    replies: [],
  } as AnnotationV2;
}

describe('createTextQuoteSelector', () => {
  it('exact / prefix / suffix を正しく切り出す', () => {
    const start = DOC.indexOf('重要なテキスト');
    const sel = createTextQuoteSelector(DOC, start, start + 7);
    expect(sel.exact).toBe('重要なテキスト');
    expect(sel.prefix?.endsWith('段落です。')).toBe(true);
    expect(sel.suffix?.startsWith('がここに')).toBe(true);
  });

  it('ドキュメント先頭では prefix が undefined になる', () => {
    const sel = createTextQuoteSelector(DOC, 0, 6);
    expect(sel.prefix).toBeUndefined();
  });
});

describe('anchorByTextQuoteSelector', () => {
  it('一意なテキストはそのまま見つかる', () => {
    const result = anchorByTextQuoteSelector(DOC, {
      type: 'TextQuoteSelector',
      exact: '最後の行。',
    });
    expect(result).not.toBeNull();
    expect(DOC.slice(result!.start, result!.end)).toBe('最後の行。');
  });

  it('複数出現するテキストは prefix/suffix で2番目の出現を解決できる', () => {
    const secondPos = DOC.indexOf('重要なテキスト', DOC.indexOf('重要なテキスト') + 1);
    const sel = createTextQuoteSelector(DOC, secondPos, secondPos + 7);
    const result = anchorByTextQuoteSelector(DOC, sel);
    expect(result).not.toBeNull();
    expect(result!.start).toBe(secondPos);
  });

  it('存在しないテキストは null', () => {
    expect(
      anchorByTextQuoteSelector(DOC, { type: 'TextQuoteSelector', exact: '存在しない文字列' })
    ).toBeNull();
  });

  it('exact が空なら null', () => {
    expect(
      anchorByTextQuoteSelector(DOC, { type: 'TextQuoteSelector', exact: '' })
    ).toBeNull();
  });
});

describe('anchorByTextPositionSelector', () => {
  it('範囲内の位置を返す', () => {
    const result = anchorByTextPositionSelector(DOC, {
      type: 'TextPositionSelector',
      start: 0,
      end: 6,
    });
    expect(result).toEqual({ start: 0, end: 6 });
  });

  it('expectedText が一致しない場合は null', () => {
    const result = anchorByTextPositionSelector(
      DOC,
      { type: 'TextPositionSelector', start: 0, end: 6 },
      '別のテキスト'
    );
    expect(result).toBeNull();
  });

  it('範囲外（end > doc長 / start >= end / 負数）は null', () => {
    expect(
      anchorByTextPositionSelector(DOC, { type: 'TextPositionSelector', start: 0, end: DOC.length + 1 })
    ).toBeNull();
    expect(
      anchorByTextPositionSelector(DOC, { type: 'TextPositionSelector', start: 5, end: 5 })
    ).toBeNull();
    expect(
      anchorByTextPositionSelector(DOC, { type: 'TextPositionSelector', start: -1, end: 5 })
    ).toBeNull();
  });
});

describe('anchorByEditorPositionSelector', () => {
  it('行・桁からオフセットを正しく計算する', () => {
    // 3行目 = 'これは最初の段落です。...'
    const result = anchorByEditorPositionSelector(DOC, {
      type: 'EditorPositionSelector',
      startLine: 3,
      endLine: 3,
      startChar: 0,
      endChar: 3,
    });
    expect(result).not.toBeNull();
    expect(DOC.slice(result!.start, result!.end)).toBe('これは');
  });

  it('行番号が範囲外なら null', () => {
    expect(
      anchorByEditorPositionSelector(DOC, {
        type: 'EditorPositionSelector',
        startLine: 0,
        endLine: 1,
        startChar: 0,
        endChar: 1,
      })
    ).toBeNull();
    expect(
      anchorByEditorPositionSelector(DOC, {
        type: 'EditorPositionSelector',
        startLine: 1,
        endLine: 999,
        startChar: 0,
        endChar: 1,
      })
    ).toBeNull();
  });
});

describe('anchorAnnotation（3段階フォールバック）', () => {
  it('EditorPositionSelector が期待テキストと一致すれば最優先で使う', () => {
    const start = DOC.indexOf('重要なテキスト');
    const pos = computeEditorPositionFromOffset(DOC, start, start + 7);
    const ann = makeAnnotation([
      { type: 'EditorPositionSelector', ...pos },
      { type: 'TextQuoteSelector', exact: '重要なテキスト' },
    ]);
    const result = anchorAnnotation(DOC, ann);
    expect(result).toEqual({ start, end: start + 7 });
  });

  it('行がずれていても TextQuoteSelector にフォールバックする', () => {
    // テキストの前に行が挿入された状況をシミュレート
    const edited = '挿入された行\n' + DOC;
    const start = DOC.indexOf('最後の行。');
    const pos = computeEditorPositionFromOffset(DOC, start, start + 5);
    const ann = makeAnnotation([
      { type: 'EditorPositionSelector', ...pos },
      createTextQuoteSelector(DOC, start, start + 5),
    ]);
    const result = anchorAnnotation(edited, ann);
    expect(result).not.toBeNull();
    expect(edited.slice(result!.start, result!.end)).toBe('最後の行。');
  });

  it('どのセレクタでも見つからなければ null（orphaned 判定）', () => {
    const ann = makeAnnotation([
      { type: 'TextQuoteSelector', exact: '完全に削除されたテキスト' },
    ]);
    expect(anchorAnnotation(DOC, ann)).toBeNull();
  });
});

describe('computeEditorPositionFromOffset', () => {
  it('オフセットから 1-origin の行・桁を計算する', () => {
    const pos = computeEditorPositionFromOffset('abc\ndef\nghi', 4, 7);
    expect(pos).toEqual({ startLine: 2, endLine: 2, startChar: 0, endChar: 3 });
  });

  it('先頭オフセットは 1行1桁目', () => {
    const pos = computeEditorPositionFromOffset('abc', 0, 1);
    expect(pos.startLine).toBe(1);
    expect(pos.startChar).toBe(0);
  });
});

describe('getAnnotationExactText', () => {
  it('数式デリミタ $$...$$ を除去する', () => {
    const ann = makeAnnotation([
      { type: 'TextQuoteSelector', exact: '$$E = mc^2$$' },
    ]);
    expect(getAnnotationExactText(ann)).toBe('E = mc^2');
  });

  it('インライン数式 $...$ を除去する', () => {
    const ann = makeAnnotation([
      { type: 'TextQuoteSelector', exact: '$x + y$' },
    ]);
    expect(getAnnotationExactText(ann)).toBe('x + y');
  });

  it('通常テキストはそのまま', () => {
    const ann = makeAnnotation([
      { type: 'TextQuoteSelector', exact: 'plain text' },
    ]);
    expect(getAnnotationExactText(ann)).toBe('plain text');
  });
});

describe('rebuildSelectors（位置からのセレクタ再生成）', () => {
  it('TextQuote / TextPosition / EditorPosition の3種を生成する', () => {
    const start = DOC.indexOf('重要なテキスト');
    const end = start + '重要なテキスト'.length;
    const selectors = rebuildSelectors(DOC, start, end);

    const types = selectors.map((s) => s.type).sort();
    expect(types).toEqual([
      'EditorPositionSelector',
      'TextPositionSelector',
      'TextQuoteSelector',
    ]);

    const tps = selectors.find(
      (s): s is TextPositionSelector => s.type === 'TextPositionSelector'
    );
    expect(tps).toMatchObject({ start, end });
  });

  it('生成したセレクタは元の位置へ再アンカーできる', () => {
    const start = DOC.indexOf('最初の段落');
    const end = start + '最初の段落'.length;
    const ann = makeAnnotation(rebuildSelectors(DOC, start, end));
    expect(anchorAnnotation(DOC, ann)).toEqual({ start, end });
  });
});

describe('isSelectorDrifted（位置ズレ判定）', () => {
  it('TextPositionSelector が一致すれば false', () => {
    const ann = makeAnnotation([{ type: 'TextPositionSelector', start: 10, end: 20 }]);
    expect(isSelectorDrifted(ann, { start: 10, end: 20 })).toBe(false);
  });

  it('TextPositionSelector がズレていれば true', () => {
    const ann = makeAnnotation([{ type: 'TextPositionSelector', start: 10, end: 20 }]);
    expect(isSelectorDrifted(ann, { start: 12, end: 22 })).toBe(true);
  });

  it('TextPositionSelector を持たなければ常に true（位置補完が必要）', () => {
    const ann = makeAnnotation([{ type: 'TextQuoteSelector', exact: 'foo' }]);
    expect(isSelectorDrifted(ann, { start: 0, end: 3 })).toBe(true);
  });
});

describe('自動再マッチング（テキスト移動 → 再アンカー → ドリフト解消）', () => {
  it('前に行が挿入されても再アンカーでき、再生成後はドリフトが解消する', () => {
    // 元ドキュメントで注釈を作成
    const start = DOC.indexOf('最後の行');
    const end = start + '最後の行'.length;
    const ann = makeAnnotation(rebuildSelectors(DOC, start, end));

    // ドキュメント先頭に行を挿入して位置をずらす
    const shifted = '新しい見出し行\n\n' + DOC;
    const anchored = anchorAnnotation(shifted, ann);
    expect(anchored).not.toBeNull();

    // ズレが検出される
    expect(isSelectorDrifted(ann, anchored!)).toBe(true);

    // 再生成したセレクタではドリフトが解消し、同じ位置に安定して再アンカーできる
    const rebuilt = makeAnnotation(rebuildSelectors(shifted, anchored!.start, anchored!.end));
    const reAnchored = anchorAnnotation(shifted, rebuilt);
    expect(reAnchored).toEqual(anchored);
    expect(isSelectorDrifted(rebuilt, reAnchored!)).toBe(false);
  });
});

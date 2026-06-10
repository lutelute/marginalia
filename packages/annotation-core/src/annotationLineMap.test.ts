import { describe, it, expect } from 'vitest';
import { mapAnnotationsToLines } from './annotationLineMap';
import { AnnotationV2, AnnotationStatus } from './annotations';
import { createSelectorsFromEditorSelection } from './selectorUtils';

const DOC = ['# 見出し', '', '一行目の本文です。', '二行目の本文です。', '', '最後の行。'].join('\n');

function makeAnnotation(
  exact: string,
  status: AnnotationStatus = 'active',
  doc: string = DOC
): AnnotationV2 {
  const start = doc.indexOf(exact);
  const end = start + exact.length;
  const before = doc.slice(0, start);
  const startLine = (before.match(/\n/g) || []).length + 1;
  return {
    id: `ann-${exact}`,
    type: 'comment',
    target: {
      source: '/doc.md',
      selectors: createSelectorsFromEditorSelection(doc, start, end, startLine, startLine, 0, exact.length),
    },
    content: `note on ${exact}`,
    author: 'user',
    createdAt: '2026-06-10T00:00:00.000Z',
    status,
    replies: [],
  };
}

describe('mapAnnotationsToLines', () => {
  it('注釈をアンカー先の行番号（1始まり）に割り当てる', () => {
    const byLine = mapAnnotationsToLines([makeAnnotation('一行目の本文')], DOC);
    expect(Object.keys(byLine)).toEqual(['3']);
    expect(byLine[3][0].id).toBe('ann-一行目の本文');
  });

  it('同じ行の複数注釈をまとめる', () => {
    const a1 = makeAnnotation('一行目');
    const a2 = makeAnnotation('本文です');
    const byLine = mapAnnotationsToLines([a1, a2], DOC);
    expect(byLine[3].length).toBe(2);
  });

  it('複数行にまたがる注釈は各行に登録される', () => {
    const exact = '一行目の本文です。\n二行目の本文です。';
    const start = DOC.indexOf('一行目');
    const ann: AnnotationV2 = {
      ...makeAnnotation('一行目'),
      id: 'multi',
      target: {
        source: '/doc.md',
        selectors: createSelectorsFromEditorSelection(DOC, start, start + exact.length, 3, 4, 0, 9),
      },
    };
    const byLine = mapAnnotationsToLines([ann], DOC);
    expect(byLine[3].map((a) => a.id)).toContain('multi');
    expect(byLine[4].map((a) => a.id)).toContain('multi');
  });

  it('resolved / archived は対象外', () => {
    const byLine = mapAnnotationsToLines(
      [makeAnnotation('一行目の本文', 'resolved'), makeAnnotation('二行目の本文', 'archived')],
      DOC
    );
    expect(Object.keys(byLine).length).toBe(0);
  });

  it('アンカーできない注釈はスキップ（本文から消えたテキスト）', () => {
    const ann = makeAnnotation('一行目の本文');
    const editedDoc = DOC.replace('一行目の本文です。', '全く別の内容になった。');
    const byLine = mapAnnotationsToLines([ann], editedDoc);
    expect(Object.keys(byLine).length).toBe(0);
  });

  it('編集で行が移動しても現在の docText の行に追従する', () => {
    const ann = makeAnnotation('最後の行');
    const shifted = '挿入された段落\n\n' + DOC;
    const byLine = mapAnnotationsToLines([ann], shifted);
    // 元は6行目 → 2行分下がって8行目
    expect(Object.keys(byLine)).toEqual(['8']);
  });

  it('空ドキュメントは空マップ', () => {
    expect(mapAnnotationsToLines([makeAnnotation('一行目の本文')], '')).toEqual({});
  });
});

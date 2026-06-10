import { describe, it, expect } from 'vitest';
import { generateReviewReport } from './reviewReport';
import { AnnotationV2, AnnotationStatus } from './annotations';
import { createSelectorsFromEditorSelection } from './selectorUtils';

const DOC = ['# タイトル', '', '一行目の本文です。', '二行目の本文です。'].join('\n');

function ann(
  exact: string,
  over: Partial<AnnotationV2> = {}
): AnnotationV2 {
  const start = DOC.indexOf(exact);
  const end = start + exact.length;
  return {
    id: `id-${exact}`,
    type: 'review',
    target: {
      source: '/doc.md',
      selectors: createSelectorsFromEditorSelection(DOC, start, end, 3, 3, 0, exact.length),
    },
    content: `${exact} の指摘`,
    author: '重信',
    authorId: 'u1',
    createdAt: '2026-06-10T12:34:56.000Z',
    status: 'active' as AnnotationStatus,
    replies: [],
    ...over,
  };
}

describe('generateReviewReport', () => {
  it('ヘッダにファイル名・件数サマリを含む', () => {
    const md = generateReviewReport([ann('一行目の本文')], {
      fileName: 'doc.md',
      docText: DOC,
      generatedAt: '2026-06-10T13:00:00.000Z',
    });
    expect(md).toContain('# 校閲レポート: doc.md');
    expect(md).toContain('注釈 1件（未解決 1 ・ 解決済み 0 ・ 孤立 0）');
    expect(md).toContain('生成: 2026-06-10 13:00');
  });

  it('対象テキスト・行番号・作成者・タイプを出力する', () => {
    const md = generateReviewReport([ann('一行目の本文')], { fileName: 'doc.md', docText: DOC });
    expect(md).toContain('[校閲] 重信 — L3');
    expect(md).toContain('> 一行目の本文');
    expect(md).toContain('一行目の本文 の指摘');
  });

  it('ステータス別にグループ化し、解決済み・孤立を分ける', () => {
    const resolved = ann('二行目の本文', {
      id: 'r1',
      status: 'resolved',
      resolvedAt: '2026-06-10T14:00:00.000Z',
    });
    const orphaned = ann('一行目の本文', {
      id: 'o1',
      status: 'orphaned',
      target: {
        source: '/doc.md',
        selectors: [{ type: 'TextQuoteSelector', exact: '消えたテキスト' }],
      },
    });
    const md = generateReviewReport([ann('一行目の本文'), resolved, orphaned], {
      fileName: 'doc.md',
      docText: DOC,
    });
    expect(md).toContain('## 未解決（1件）');
    expect(md).toContain('## 解決済み（1件）');
    expect(md).toContain('## 孤立（本文から対象が見つからない）（1件）');
    expect(md).toContain('解決: 2026-06-10 14:00');
  });

  it('返信スレッドを含める', () => {
    const withReply = ann('一行目の本文', {
      replies: [
        {
          id: 'rep1',
          content: '対応しました',
          author: '山田',
          createdAt: '2026-06-10T15:00:00.000Z',
        },
      ],
    });
    const md = generateReviewReport([withReply], { fileName: 'doc.md', docText: DOC });
    expect(md).toContain('**返信:**');
    expect(md).toContain('- **山田** (2026-06-10 15:00): 対応しました');
  });

  it('行番号順に並ぶ', () => {
    const a2 = ann('二行目の本文', { id: 'second', createdAt: '2026-06-10T10:00:00.000Z' });
    const a1 = ann('一行目の本文', { id: 'first', createdAt: '2026-06-10T11:00:00.000Z' });
    const md = generateReviewReport([a2, a1], { fileName: 'doc.md', docText: DOC });
    const firstIdx = md.indexOf('一行目の本文 の指摘');
    const secondIdx = md.indexOf('二行目の本文 の指摘');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it('複数行の対象テキストは引用を1行に正規化', () => {
    const exact = '一行目の本文です。\n二行目の本文です。';
    const start = DOC.indexOf('一行目');
    const multi = ann('一行目の本文', {
      id: 'multi',
      target: {
        source: '/doc.md',
        selectors: createSelectorsFromEditorSelection(DOC, start, start + exact.length, 3, 4, 0, 9),
      },
    });
    const md = generateReviewReport([multi], { fileName: 'doc.md', docText: DOC });
    expect(md).toContain('> 一行目の本文です。 二行目の本文です。');
  });

  it('注釈ゼロでも壊れない', () => {
    const md = generateReviewReport([], { fileName: 'doc.md' });
    expect(md).toContain('注釈はありません。');
  });
});

import { describe, it, expect } from 'vitest';
import { detectVersion, needsMigration, migrateAnnotation, migrateFile } from './migration';
import type { LegacyAnnotation, MarginaliaFileV1 } from './annotations';

const DOC = 'first line\nsecond line with target text\nthird line\ntarget text again';

function makeLegacy(overrides: Partial<LegacyAnnotation> = {}): LegacyAnnotation {
  return {
    id: 'legacy-1',
    type: 'comment',
    content: 'コメント本文',
    author: 'tester',
    createdAt: '2025-01-01T00:00:00.000Z',
    selectedText: 'target text',
    startLine: 2,
    endLine: 2,
    startChar: 17,
    endChar: 28,
    occurrenceIndex: 0,
    resolved: false,
    replies: [],
    ...overrides,
  } as LegacyAnnotation;
}

describe('detectVersion', () => {
  it('_version 2.0.0 を検出する', () => {
    expect(detectVersion({ _tool: 'marginalia', _version: '2.0.0' })).toBe('2.0.0');
  });

  it('_version なしは 1.0.0 とみなす', () => {
    expect(detectVersion({ _tool: 'marginalia' })).toBe('1.0.0');
  });

  it('marginalia ファイルでないものは unknown', () => {
    expect(detectVersion({ foo: 'bar' })).toBe('unknown');
    expect(detectVersion(null)).toBe('unknown');
    expect(detectVersion(undefined)).toBe('unknown');
  });
});

describe('needsMigration', () => {
  it('V1 のみ true', () => {
    expect(needsMigration({ _tool: 'marginalia', _version: '1.0.0' })).toBe(true);
    expect(needsMigration({ _tool: 'marginalia', _version: '2.0.0' })).toBe(false);
    expect(needsMigration({})).toBe(false);
  });
});

describe('migrateAnnotation', () => {
  it('ドキュメントありの場合 3種類のセレクタを生成する', () => {
    const v2 = migrateAnnotation(makeLegacy(), '/doc.md', DOC);
    const types = v2.target.selectors.map((s) => s.type).sort();
    expect(types).toEqual([
      'EditorPositionSelector',
      'TextPositionSelector',
      'TextQuoteSelector',
    ]);
  });

  it('occurrenceIndex で N 番目の出現を選ぶ', () => {
    const v2 = migrateAnnotation(makeLegacy({ occurrenceIndex: 1 }), '/doc.md', DOC);
    const tps = v2.target.selectors.find((s) => s.type === 'TextPositionSelector') as
      | { start: number; end: number }
      | undefined;
    expect(tps).toBeDefined();
    expect(DOC.slice(tps!.start, tps!.end)).toBe('target text');
    expect(tps!.start).toBe(DOC.lastIndexOf('target text'));
  });

  it('ドキュメントなしでも TextQuoteSelector は生成される', () => {
    const v2 = migrateAnnotation(makeLegacy(), '/doc.md');
    const tqs = v2.target.selectors.find((s) => s.type === 'TextQuoteSelector');
    expect(tqs).toBeDefined();
  });

  it('resolved → status resolved にマッピング', () => {
    const v2 = migrateAnnotation(makeLegacy({ resolved: true }), '/doc.md', DOC);
    expect(v2.status).toBe('resolved');
  });

  it('orphaned ステータスを引き継ぐ', () => {
    const v2 = migrateAnnotation(makeLegacy({ status: 'orphaned' } as any), '/doc.md', DOC);
    expect(v2.status).toBe('orphaned');
  });

  it('元フィールドを _migratedFrom に保存する', () => {
    const v2 = migrateAnnotation(makeLegacy(), '/doc.md', DOC);
    expect(v2._migratedFrom?.version).toBe('1.0.0');
    expect(v2._migratedFrom?.originalFields.selectedText).toBe('target text');
  });
});

describe('migrateFile', () => {
  it('V1 ファイル全体を V2 に変換する', () => {
    const v1: MarginaliaFileV1 = {
      _tool: 'marginalia',
      _version: '1.0.0',
      filePath: '/doc.md',
      fileName: 'doc.md',
      annotations: [makeLegacy()],
      history: [],
    } as unknown as MarginaliaFileV1;

    const v2 = migrateFile(v1, DOC);
    expect(v2._version).toBe('2.0.0');
    expect(v2.annotations).toHaveLength(1);
    expect(v2.filePath).toBe('/doc.md');
  });

  it('annotations が undefined でもクラッシュしない', () => {
    const v1 = {
      _tool: 'marginalia',
      _version: '1.0.0',
      filePath: '/doc.md',
      fileName: 'doc.md',
    } as unknown as MarginaliaFileV1;

    const v2 = migrateFile(v1, DOC);
    expect(v2.annotations).toEqual([]);
    expect(v2.history).toEqual([]);
  });
});

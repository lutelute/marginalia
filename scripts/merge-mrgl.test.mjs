import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import mergeMod from './merge-mrgl.js';

const { mergeMarginaliaFiles } = mergeMod;
const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'merge-mrgl.js');

function mrgl(annotations, history = []) {
  return {
    _tool: 'marginalia',
    _version: '2.1.0',
    filePath: '/doc.md',
    fileName: 'doc.md',
    lastModified: '2026-06-10T10:00:00.000Z',
    annotations,
    history,
  };
}

function ann(id, over = {}) {
  return {
    id,
    type: 'comment',
    target: { source: '/doc.md', selectors: [{ type: 'TextQuoteSelector', exact: `text-${id}` }] },
    content: `content-${id}`,
    author: 'user',
    createdAt: '2026-06-10T09:00:00.000Z',
    status: 'active',
    replies: [],
    ...over,
  };
}

describe('mergeMarginaliaFiles (3-way)', () => {
  it('両側で追加された注釈を union する', () => {
    const base = mrgl([]);
    const ours = mrgl([ann('a')]);
    const theirs = mrgl([ann('b')]);
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations.map((a) => a.id).sort()).toEqual(['a', 'b']);
  });

  it('同一注釈への返信を双方から集約する', () => {
    const base = mrgl([ann('a')]);
    const ours = mrgl([
      ann('a', { replies: [{ id: 'r1', content: 'うちの返信', author: 'A', createdAt: '2026-06-10T11:00:00.000Z' }] }),
    ]);
    const theirs = mrgl([
      ann('a', { replies: [{ id: 'r2', content: '相手の返信', author: 'B', createdAt: '2026-06-10T12:00:00.000Z' }] }),
    ]);
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations[0].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('両側で内容が変わった場合は新しい方を採用する', () => {
    const base = mrgl([ann('a')]);
    const ours = mrgl([ann('a', { content: '古い編集', updatedAt: '2026-06-10T11:00:00.000Z' })]);
    const theirs = mrgl([ann('a', { content: '新しい編集', updatedAt: '2026-06-10T12:00:00.000Z' })]);
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations[0].content).toBe('新しい編集');
  });

  it('無変更の注釈を相手が削除したら削除に従う', () => {
    const base = mrgl([ann('a'), ann('keep')]);
    const ours = mrgl([ann('a'), ann('keep')]); // 無変更
    const theirs = mrgl([ann('keep')]); // a を削除
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations.map((a) => a.id)).toEqual(['keep']);
  });

  it('変更 vs 削除は保持を優先する（校閲データを失わない）', () => {
    const base = mrgl([ann('a')]);
    const ours = mrgl([ann('a', { content: '編集済み', updatedAt: '2026-06-10T11:00:00.000Z' })]);
    const theirs = mrgl([]); // 削除
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations.map((a) => a.id)).toEqual(['a']);
    expect(merged.annotations[0].content).toBe('編集済み');
  });

  it('resolve（status変更）も新しい方が勝つ', () => {
    const base = mrgl([ann('a')]);
    const ours = mrgl([ann('a')]);
    const theirs = mrgl([ann('a', { status: 'resolved', resolvedAt: '2026-06-10T13:00:00.000Z' })]);
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations[0].status).toBe('resolved');
  });

  it('history を id union して新しい順に並べる', () => {
    const h = (id, ts) => ({ id, action: 'comment', summary: id, timestamp: ts });
    const base = mrgl([], []);
    const ours = mrgl([], [h('h1', '2026-06-10T10:00:00.000Z')]);
    const theirs = mrgl([], [h('h2', '2026-06-10T11:00:00.000Z')]);
    const merged = mergeMarginaliaFiles(base, ours, theirs);
    expect(merged.annotations).toEqual([]);
    expect(merged.history.map((e) => e.id)).toEqual(['h2', 'h1']);
  });

  it('base が null（共通祖先なし）でも union できる', () => {
    const merged = mergeMarginaliaFiles(null, mrgl([ann('a')]), mrgl([ann('b')]));
    expect(merged.annotations.length).toBe(2);
  });
});

describe('merge-mrgl CLI（git merge driver 形式）', () => {
  it('base/ours/theirs を受けて ours に結果を書き戻す', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mrgl-merge-'));
    const write = (name, data) => {
      const p = path.join(tmp, name);
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return p;
    };
    const basePath = write('base.mrgl', mrgl([ann('a')]));
    const oursPath = write('ours.mrgl', mrgl([ann('a'), ann('mine')]));
    const theirsPath = write('theirs.mrgl', mrgl([ann('a'), ann('yours')]));

    execFileSync('node', [SCRIPT, basePath, oursPath, theirsPath]);

    const result = JSON.parse(fs.readFileSync(oursPath, 'utf-8'));
    expect(result.annotations.map((a) => a.id).sort()).toEqual(['a', 'mine', 'yours']);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('JSON 破損時は exit 1（通常コンフリクトへフォールバック）', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mrgl-merge-'));
    const broken = path.join(tmp, 'broken.mrgl');
    fs.writeFileSync(broken, '{not json');
    const ok = path.join(tmp, 'ok.mrgl');
    fs.writeFileSync(ok, JSON.stringify(mrgl([])));

    let exitCode = 0;
    try {
      execFileSync('node', [SCRIPT, broken, ok, ok], { stdio: 'pipe' });
    } catch (e) {
      exitCode = e.status;
    }
    expect(exitCode).toBe(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

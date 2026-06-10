import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import fileWatcher from './fileWatcher.js';

// fs.watch のイベント到達 + 500ms デバウンスを待つヘルパー
async function waitFor(checkFn, timeoutMs = 3000, intervalMs = 50) {
  const start = Date.now();
  while (!checkFn()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// macOS の fs.watch は監視開始直後のイベントを取りこぼすことがあるため、
// 監視開始から書き込みまでに置く猶予
const WATCH_SETTLE_MS = 250;
const settle = () => new Promise((r) => setTimeout(r, WATCH_SETTLE_MS));

describe('fileWatcher 外部変更検出', () => {
  let tmpDir;
  let mdPath;
  let marginaliaDir;
  let mrglPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marginalia-watch-test-'));
    mdPath = path.join(tmpDir, 'doc.md');
    marginaliaDir = path.join(tmpDir, '.marginalia');
    mrglPath = path.join(marginaliaDir, 'doc.mrgl');
    fs.writeFileSync(mdPath, '# v1');
  });

  afterEach(() => {
    fileWatcher.closeWatcher();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('本体ファイルの変更を検出する', async () => {
    const changed = [];
    const result = fileWatcher.watchFile(mdPath, (p) => changed.push(p));
    expect(result.success).toBe(true);
    await settle();

    fs.writeFileSync(mdPath, '# v2');
    await waitFor(() => changed.length > 0);
    expect(changed[0]).toBe(mdPath);
  });

  it('.mrgl の変更を検出し、md のパスで通知する', async () => {
    fs.mkdirSync(marginaliaDir);
    fs.writeFileSync(mrglPath, '{"annotations":[]}');

    const annotationChanged = [];
    const result = fileWatcher.watchFile(
      mdPath,
      () => {},
      mrglPath,
      (p) => annotationChanged.push(p)
    );
    expect(result.success).toBe(true);
    await settle();

    fs.writeFileSync(mrglPath, '{"annotations":[{"id":"x"}]}');
    await waitFor(() => annotationChanged.length > 0);
    // .mrgl ではなく対応する md のパスが渡る
    expect(annotationChanged[0]).toBe(mdPath);
  });

  it('.marginalia ディレクトリが後から作られても検出する（注釈だけが pull で届くケース）', async () => {
    // 監視開始時点では .marginalia が存在しない
    expect(fs.existsSync(marginaliaDir)).toBe(false);

    const annotationChanged = [];
    fileWatcher.watchFile(
      mdPath,
      () => {},
      mrglPath,
      (p) => annotationChanged.push(p)
    );
    await settle();

    // 後から .marginalia/doc.mrgl が出現（git pull 相当）
    fs.mkdirSync(marginaliaDir);
    fs.writeFileSync(mrglPath, '{"annotations":[]}');

    await waitFor(() => annotationChanged.length > 0);
    expect(annotationChanged[0]).toBe(mdPath);

    // 昇格後は .mrgl の以後の変更も検出できる
    const countAfterCreate = annotationChanged.length;
    fs.writeFileSync(mrglPath, '{"annotations":[{"id":"y"}]}');
    await waitFor(() => annotationChanged.length > countAfterCreate);
  });

  it('別ファイルへ張り替えると旧ファイルのイベントは届かない', async () => {
    const otherMd = path.join(tmpDir, 'other.md');
    fs.writeFileSync(otherMd, '# other');

    const changed = [];
    fileWatcher.watchFile(mdPath, (p) => changed.push(p));
    fileWatcher.watchFile(otherMd, (p) => changed.push(p));
    await settle();

    fs.writeFileSync(otherMd, '# other v2');
    await waitFor(() => changed.length > 0);
    expect(changed.every((p) => p === otherMd)).toBe(true);
  });

  it('unwatchFile で監視が止まる', async () => {
    const changed = [];
    fileWatcher.watchFile(mdPath, (p) => changed.push(p));
    fileWatcher.unwatchFile();

    fs.writeFileSync(mdPath, '# v3');
    // デバウンス時間を超えて待っても通知が来ないこと
    await new Promise((r) => setTimeout(r, 900));
    expect(changed.length).toBe(0);
  });
});

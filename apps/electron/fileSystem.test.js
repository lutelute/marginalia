import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import fileSystem from './fileSystem.js';

describe('fileSystem 読み書き', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marginalia-fs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeFile → readFile のラウンドトリップ', async () => {
    const filePath = path.join(tmpDir, 'doc.md');
    const write = await fileSystem.writeFile(filePath, '# Hello\n日本語コンテンツ');
    expect(write.success).toBe(true);

    const read = await fileSystem.readFile(filePath);
    expect(read.success).toBe(true);
    expect(read.content).toBe('# Hello\n日本語コンテンツ');
  });

  it('書き込みは一時ファイルを残さない（アトミック書き込み）', async () => {
    const filePath = path.join(tmpDir, 'doc.md');
    await fileSystem.writeFile(filePath, 'v1');
    await fileSystem.writeFile(filePath, 'v2');

    const leftover = fs
      .readdirSync(tmpDir)
      .filter((f) => f.includes('.tmp-'));
    expect(leftover).toEqual([]);
  });

  it('存在しないディレクトリへの書き込みは success: false（throw しない）', async () => {
    const filePath = path.join(tmpDir, 'no-such-dir', 'doc.md');
    const result = await fileSystem.writeFile(filePath, 'content');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    // 失敗時に一時ファイルが残らない
    expect(fs.existsSync(path.join(tmpDir, 'no-such-dir'))).toBe(false);
  });

  it('既存ファイルの上書き時にバックアップが作成される', async () => {
    const filePath = path.join(tmpDir, 'doc.md');
    await fileSystem.writeFile(filePath, 'original');
    await fileSystem.writeFile(filePath, 'updated');

    const backupDir = path.join(tmpDir, '.marginalia', 'backups');
    expect(fs.existsSync(backupDir)).toBe(true);
    expect(fs.readdirSync(backupDir).length).toBeGreaterThan(0);
  });

  it('存在しないファイルの読み込みは success: false', async () => {
    const result = await fileSystem.readFile(path.join(tmpDir, 'missing.md'));
    expect(result.success).toBe(false);
  });

  it('NFD パスで書いたファイルを NFC パスで読める（macOS APFS）', async function () {
    // APFS 以外（Linux CI 等）ではスキップ
    if (process.platform !== 'darwin') return;

    const nfdPath = path.join(tmpDir, 'てすと'.normalize('NFD') + '.md');
    const nfcPath = path.join(tmpDir, 'てすと'.normalize('NFC') + '.md');

    const write = await fileSystem.writeFile(nfdPath, 'content');
    expect(write.success).toBe(true);

    const read = await fileSystem.readFile(nfcPath);
    expect(read.success).toBe(true);
    expect(read.content).toBe('content');
  });
});

describe('fileSystem Marginalia (.mrgl)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marginalia-mrgl-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeMarginalia → readMarginalia のラウンドトリップ', async () => {
    const mdPath = path.join(tmpDir, 'doc.md');
    fs.writeFileSync(mdPath, '# doc');

    const data = {
      _tool: 'marginalia',
      _version: '2.0.0',
      filePath: mdPath,
      fileName: 'doc.md',
      annotations: [],
      history: [],
    };

    const write = await fileSystem.writeMarginalia(mdPath, data);
    expect(write.success).toBe(true);

    const read = await fileSystem.readMarginalia(mdPath);
    expect(read.success).toBe(true);
    expect(read.data._tool).toBe('marginalia');
  });
});

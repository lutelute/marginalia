import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import pathGuard from './pathGuard.js';

describe('pathGuard', () => {
  // モジュールはシングルトンなのでテスト用ルートを登録して検証する
  const WS = path.join(os.tmpdir(), 'marginalia-test-workspace');
  pathGuard.addAllowedRoot(WS);

  it('ワークスペース配下のファイルを許可する', () => {
    expect(pathGuard.isPathAllowed(path.join(WS, 'doc.md'))).toBe(true);
    expect(pathGuard.isPathAllowed(path.join(WS, 'sub', 'dir', 'img.png'))).toBe(true);
  });

  it('ワークスペース自体を許可する', () => {
    expect(pathGuard.isPathAllowed(WS)).toBe(true);
  });

  it('../ によるパストラバーサルを拒否する', () => {
    expect(pathGuard.isPathAllowed(path.join(WS, '..', '..', 'etc', 'passwd'))).toBe(false);
    expect(pathGuard.isPathAllowed(WS + '/../outside.txt')).toBe(false);
  });

  it('ワークスペース外の絶対パスを拒否する', () => {
    expect(pathGuard.isPathAllowed('/etc/passwd')).toBe(false);
  });

  it('プレフィックスが一致するだけの兄弟ディレクトリを拒否する', () => {
    expect(pathGuard.isPathAllowed(WS + '-evil/doc.md')).toBe(false);
  });

  it('機密ディレクトリはホームをルート登録しても拒否する', () => {
    pathGuard.addAllowedRoot(os.homedir());
    expect(pathGuard.isPathAllowed(path.join(os.homedir(), '.ssh', 'id_rsa'))).toBe(false);
    expect(pathGuard.isPathAllowed(path.join(os.homedir(), '.aws', 'credentials'))).toBe(false);
  });

  it('機密ディレクトリ自体のルート登録を拒否する', () => {
    pathGuard.addAllowedRoot(path.join(os.homedir(), '.ssh'));
    expect(pathGuard.isPathAllowed(path.join(os.homedir(), '.ssh', 'id_rsa'))).toBe(false);
  });

  it('NFD/NFC が混在しても同一パスとして扱う', () => {
    const nfdName = 'か'.normalize('NFD'); // 結合文字に分解
    const nfcName = 'か'.normalize('NFC');
    const nfdAllowed = pathGuard.isPathAllowed(path.join(WS, nfdName + '.md'));
    const nfcAllowed = pathGuard.isPathAllowed(path.join(WS, nfcName + '.md'));
    expect(nfdAllowed).toBe(nfcAllowed);
    expect(nfcAllowed).toBe(true);
  });

  it('null / undefined / 非文字列を拒否する', () => {
    expect(pathGuard.isPathAllowed(null)).toBe(false);
    expect(pathGuard.isPathAllowed(undefined)).toBe(false);
    expect(pathGuard.isPathAllowed(123)).toBe(false);
    expect(pathGuard.isPathAllowed('')).toBe(false);
  });

  it('assertPathAllowed は拒否時に throw する', () => {
    expect(() => pathGuard.assertPathAllowed('/etc/passwd')).toThrow();
    expect(() => pathGuard.assertPathAllowed(path.join(WS, 'ok.md'))).not.toThrow();
  });

  it('addAllowedFileDir はファイルの親ディレクトリを許可する（タブ復元シナリオ）', () => {
    const lone = path.join(os.tmpdir(), 'marginalia-lone-dir', 'report.pdf');
    // 登録前は拒否
    expect(pathGuard.isPathAllowed(lone)).toBe(false);
    // ユーザーが開いたファイルとして親ディレクトリを登録
    pathGuard.addAllowedFileDir(lone);
    // 同ファイルと同フォルダ内の兄弟ファイルが許可される
    expect(pathGuard.isPathAllowed(lone)).toBe(true);
    expect(pathGuard.isPathAllowed(path.join(os.tmpdir(), 'marginalia-lone-dir', 'figure.png'))).toBe(
      true
    );
    // 親の外（traversal）は依然拒否
    expect(
      pathGuard.isPathAllowed(path.join(os.tmpdir(), 'marginalia-lone-dir', '..', 'secret.txt'))
    ).toBe(false);
  });

  it('addAllowedFileDir は機密ディレクトリ内のファイルでは何も許可しない', () => {
    pathGuard.addAllowedFileDir(path.join(os.homedir(), '.ssh', 'config'));
    expect(pathGuard.isPathAllowed(path.join(os.homedir(), '.ssh', 'id_rsa'))).toBe(false);
  });
});

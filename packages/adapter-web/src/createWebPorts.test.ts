import { describe, it, expect } from 'vitest';
import { createWebPorts, type WebKeyValueBackend } from './createWebPorts';
import type { PlatformPorts } from '@marginalia/ports';

/**
 * createWebPorts のユニットテスト。
 *
 * ブロック化の実証: window.electronAPI が一切存在しない環境（このテストは
 * node 環境で window 無し）で、注釈の保存・復元と KV が完全動作すること。
 */

function memoryBackend(): WebKeyValueBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe('createWebPorts', () => {
  it('PlatformPorts 契約を完全実装している（コンパイル時 + 全キー存在）', () => {
    const ports: PlatformPorts = createWebPorts({ storage: memoryBackend() });
    const groups: Array<keyof PlatformPorts> = [
      'annotations',
      'fs',
      'watcher',
      'terminal',
      'build',
      'resources',
      'bus',
      'updater',
      'shell',
      'gallery',
      'kv',
    ];
    for (const g of groups) {
      expect(ports[g]).toBeDefined();
    }
  });

  describe('annotations — electronAPI なしで注釈が保存・復元できる（ブロック化の核心）', () => {
    it('write → read のラウンドトリップで注釈が復元される', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      const annotation = {
        id: 'a1',
        type: 'comment',
        text: 'Web でも動く注釈',
        anchor: { exact: '対象テキスト' },
      };
      const payload = { version: 2, annotations: [annotation], history: [] };

      const writeResult = await ports.annotations.write('/docs/spec.md', payload);
      expect(writeResult).toEqual({ success: true });

      const readResult = await ports.annotations.read('/docs/spec.md');
      expect(readResult?.success).toBe(true);
      expect(readResult?.data?.annotations).toEqual([annotation]);
    });

    it('未保存のドキュメントは空の注釈で成功する（新規ファイルと同じ挙動）', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      const result = await ports.annotations.read('/never-saved.md');
      expect(result?.success).toBe(true);
      expect(result?.data?.annotations).toEqual([]);
    });

    it('ドキュメントごとに独立して保存される', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      await ports.annotations.write('/a.md', { annotations: [{ id: 'a' }] });
      await ports.annotations.write('/b.md', { annotations: [{ id: 'b' }] });

      const a = await ports.annotations.read('/a.md');
      const b = await ports.annotations.read('/b.md');
      expect(a?.data?.annotations?.[0]).toEqual({ id: 'a' });
      expect(b?.data?.annotations?.[0]).toEqual({ id: 'b' });
    });

    it('壊れた保存データは success:false でエラーを返す（例外を投げない）', async () => {
      const storage = memoryBackend();
      storage.setItem('marginalia:web:annotations:/broken.md', '{not json');
      const ports = createWebPorts({ storage });
      const result = await ports.annotations.read('/broken.md');
      expect(result?.success).toBe(false);
      expect(result?.error).toBeTruthy();
    });
  });

  describe('kv — 設定・レイアウトの永続化が動作する', () => {
    it('set → get → remove のラウンドトリップ', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      await ports.kv.set('sidebarWidth', '250');
      await expect(ports.kv.get('sidebarWidth')).resolves.toBe('250');
      await ports.kv.remove('sidebarWidth');
      await expect(ports.kv.get('sidebarWidth')).resolves.toBeNull();
    });
  });

  describe('プラットフォーム縮退（Web で未対応の機能は安全に縮退する）', () => {
    it('updater は利用不可を明示し、バージョンは注入値を返す', async () => {
      const ports = createWebPorts({ storage: memoryBackend(), appVersion: '1.6.0' });
      expect(ports.updater.isAvailable()).toBe(false);
      await expect(ports.updater.getAppVersion()).resolves.toBe('1.6.0');
      const check = await ports.updater.check();
      expect(check.success).toBe(false);
    });

    it('build.checkDependencies は全 false（UI がビルド不可表示に縮退）', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      const deps = await ports.build.checkDependencies();
      expect(deps).toEqual({ python3: false, pandoc: false, xelatex: false });
    });

    it('terminal.create は明示的に失敗する（App 側の try/catch 設計と整合）', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      await expect(ports.terminal.create()).rejects.toThrow();
    });

    it('fs は安全な縮退値を返す（クラッシュしない）', async () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      await expect(ports.fs.exists('/any.md')).resolves.toBe(false);
      await expect(ports.fs.readDirectory('/dir')).resolves.toEqual([]);
      const read = await ports.fs.readFile('/any.md');
      expect(read.success).toBe(false);
    });

    it('bus の購読は no-op の解除関数を返す（呼んでも例外にならない）', () => {
      const ports = createWebPorts({ storage: memoryBackend() });
      const unsub = ports.bus.onNewTerminal(() => {});
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });
});

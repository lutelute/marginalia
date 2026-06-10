import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElectronPorts } from './createElectronPorts';
import type { PlatformPorts } from '@marginalia/ports';

/**
 * createElectronPorts のユニットテスト。
 *
 * ブリッジの契約は「window.electronAPI の対応メソッドへ引数を透過し、
 * 戻り値をそのまま返す」こと。全11ポートグループの委譲を表で検証する。
 * preload 側の実装はモックし、Electron 実行環境には依存しない。
 */

// preload が公開する electronAPI の全メソッド名（createElectronPorts が参照するもの）
const API_METHODS = [
  // annotations
  'readMarginalia',
  'writeMarginalia',
  // fs
  'openDirectory',
  'readDirectory',
  'readFile',
  'writeFile',
  'exists',
  'getFileStats',
  'renameFile',
  'moveFile',
  'readFileAsBase64',
  'listBackups',
  'restoreBackup',
  'previewBackup',
  'createBackup',
  'deleteBackup',
  'listMarginaliaBackups',
  'restoreMarginaliaBackup',
  // watcher
  'watchFile',
  'unwatchFile',
  'onFileChangedExternally',
  'onMarginaliaChangedExternally',
  // terminal
  'terminalCreate',
  'terminalWrite',
  'terminalResize',
  'terminalDestroy',
  'onTerminalData',
  'onTerminalExit',
  // build
  'detectProject',
  'listManifests',
  'listTemplates',
  'readCatalog',
  'listSourceFiles',
  'listBibFiles',
  'checkDependencies',
  'readManifest',
  'writeManifest',
  'createCustomTemplate',
  'deleteCustomTemplate',
  'runBuild',
  'quickBuildDemo',
  'runAllDemos',
  'installSample',
  'onBuildProgress',
  'onBuildAllProgress',
  'onTriggerBuild',
  // resources
  'readDefaultCatalog',
  'readDefaultDemoData',
  // bus
  'onNewTerminal',
  'onCloseActiveTab',
  'onOpenGallery',
  'onGalleryApplyTemplate',
  'onGalleryDataChanged',
  // updater
  'checkForUpdates',
  'downloadUpdate',
  'installUpdate',
  'restartApp',
  'getAppVersion',
  'onUpdateProgress',
  // shell
  'openPath',
  'openPdfViewer',
  // gallery
  'openGalleryWindow',
  'getGalleryProjectDir',
  'galleryApplyTemplate',
  'galleryNotifyChange',
] as const;

type MockApi = Record<(typeof API_METHODS)[number], ReturnType<typeof vi.fn>>;

/** 各メソッドが固有のセンチネル値を返すモック electronAPI を構築する */
function buildMockApi(): MockApi {
  const api = {} as MockApi;
  for (const name of API_METHODS) {
    api[name] = vi.fn(() => `ret:${name}`);
  }
  return api;
}

// 委譲ケース表: [説明, ポート呼び出し, 対応する electronAPI メソッド名, 期待引数]
const cb = () => {};
const DELEGATIONS: Array<[string, (p: PlatformPorts) => unknown, keyof MockApi, unknown[]]> = [
  // annotations
  ['annotations.read', (p) => p.annotations.read('/doc.md'), 'readMarginalia', ['/doc.md']],
  [
    'annotations.write',
    (p) => p.annotations.write('/doc.md', { annotations: [] }),
    'writeMarginalia',
    ['/doc.md', { annotations: [] }],
  ],
  // fs
  ['fs.pickDirectory', (p) => p.fs.pickDirectory(), 'openDirectory', []],
  [
    'fs.readDirectory',
    (p) => p.fs.readDirectory('/dir', { showHidden: true }),
    'readDirectory',
    ['/dir', { showHidden: true }],
  ],
  ['fs.readFile', (p) => p.fs.readFile('/a.md'), 'readFile', ['/a.md']],
  ['fs.writeFile', (p) => p.fs.writeFile('/a.md', 'body'), 'writeFile', ['/a.md', 'body']],
  ['fs.exists', (p) => p.fs.exists('/a.md'), 'exists', ['/a.md']],
  ['fs.getFileStats', (p) => p.fs.getFileStats('/a.md'), 'getFileStats', ['/a.md']],
  ['fs.renameFile', (p) => p.fs.renameFile('/a.md', 'b.md'), 'renameFile', ['/a.md', 'b.md']],
  ['fs.moveFile', (p) => p.fs.moveFile('/a.md', '/b/a.md'), 'moveFile', ['/a.md', '/b/a.md']],
  ['fs.readFileAsBase64', (p) => p.fs.readFileAsBase64('/img.png'), 'readFileAsBase64', ['/img.png']],
  ['fs.listBackups', (p) => p.fs.listBackups('/a.md'), 'listBackups', ['/a.md']],
  [
    'fs.restoreBackup',
    (p) => p.fs.restoreBackup('/bk/a.bak', '/a.md'),
    'restoreBackup',
    ['/bk/a.bak', '/a.md'],
  ],
  ['fs.previewBackup', (p) => p.fs.previewBackup('/bk/a.bak'), 'previewBackup', ['/bk/a.bak']],
  ['fs.createBackup', (p) => p.fs.createBackup('/a.md'), 'createBackup', ['/a.md']],
  ['fs.deleteBackup', (p) => p.fs.deleteBackup('/bk/a.bak'), 'deleteBackup', ['/bk/a.bak']],
  [
    'fs.listMarginaliaBackups',
    (p) => p.fs.listMarginaliaBackups('/a.md'),
    'listMarginaliaBackups',
    ['/a.md'],
  ],
  [
    'fs.restoreMarginaliaBackup',
    (p) => p.fs.restoreMarginaliaBackup('/bk/a.mrgl.bak', '/a.md'),
    'restoreMarginaliaBackup',
    ['/bk/a.mrgl.bak', '/a.md'],
  ],
  // watcher
  ['watcher.watch', (p) => p.watcher.watch('/a.md'), 'watchFile', ['/a.md']],
  ['watcher.unwatch', (p) => p.watcher.unwatch(), 'unwatchFile', []],
  ['watcher.onChanged', (p) => p.watcher.onChanged(cb), 'onFileChangedExternally', [cb]],
  [
    'watcher.onAnnotationsChanged',
    (p) => p.watcher.onAnnotationsChanged(cb),
    'onMarginaliaChangedExternally',
    [cb],
  ],
  // terminal
  ['terminal.create', (p) => p.terminal.create('/cwd'), 'terminalCreate', ['/cwd']],
  ['terminal.write', (p) => p.terminal.write('s1', 'ls\n'), 'terminalWrite', ['s1', 'ls\n']],
  ['terminal.resize', (p) => p.terminal.resize('s1', 80, 24), 'terminalResize', ['s1', 80, 24]],
  ['terminal.destroy', (p) => p.terminal.destroy('s1'), 'terminalDestroy', ['s1']],
  ['terminal.onData', (p) => p.terminal.onData('s1', cb), 'onTerminalData', ['s1', cb]],
  ['terminal.onExit', (p) => p.terminal.onExit('s1', cb), 'onTerminalExit', ['s1', cb]],
  // build
  ['build.detectProject', (p) => p.build.detectProject('/proj'), 'detectProject', ['/proj']],
  ['build.listManifests', (p) => p.build.listManifests('/proj'), 'listManifests', ['/proj']],
  ['build.listTemplates', (p) => p.build.listTemplates('/proj'), 'listTemplates', ['/proj']],
  ['build.readCatalog', (p) => p.build.readCatalog('/proj'), 'readCatalog', ['/proj']],
  ['build.listSourceFiles', (p) => p.build.listSourceFiles('/proj'), 'listSourceFiles', ['/proj']],
  ['build.listBibFiles', (p) => p.build.listBibFiles('/proj'), 'listBibFiles', ['/proj']],
  ['build.checkDependencies', (p) => p.build.checkDependencies(), 'checkDependencies', []],
  ['build.readManifest', (p) => p.build.readManifest('/m.yaml'), 'readManifest', ['/m.yaml']],
  [
    'build.writeManifest',
    (p) => p.build.writeManifest('/m.yaml', { title: 't' }),
    'writeManifest',
    ['/m.yaml', { title: 't' }],
  ],
  [
    'build.createCustomTemplate',
    (p) => p.build.createCustomTemplate('/proj', 'mine', 'base'),
    'createCustomTemplate',
    ['/proj', 'mine', 'base'],
  ],
  [
    'build.deleteCustomTemplate',
    (p) => p.build.deleteCustomTemplate('/proj', 'mine'),
    'deleteCustomTemplate',
    ['/proj', 'mine'],
  ],
  [
    'build.runBuild',
    (p) => p.build.runBuild('/proj', '/m.yaml', 'pdf'),
    'runBuild',
    ['/proj', '/m.yaml', 'pdf'],
  ],
  [
    'build.quickBuildDemo',
    (p) => p.build.quickBuildDemo('demo-report', 'pdf'),
    'quickBuildDemo',
    ['demo-report', 'pdf'],
  ],
  ['build.runAllDemos', (p) => p.build.runAllDemos('pdf'), 'runAllDemos', ['pdf']],
  [
    'build.installSample',
    (p) => p.build.installSample('demo-report', '/proj'),
    'installSample',
    ['demo-report', '/proj'],
  ],
  ['build.onBuildProgress', (p) => p.build.onBuildProgress(cb), 'onBuildProgress', [cb]],
  ['build.onBuildAllProgress', (p) => p.build.onBuildAllProgress(cb), 'onBuildAllProgress', [cb]],
  ['build.onTriggerBuild', (p) => p.build.onTriggerBuild(cb), 'onTriggerBuild', [cb]],
  // resources
  ['resources.readDefaultCatalog', (p) => p.resources.readDefaultCatalog(), 'readDefaultCatalog', []],
  [
    'resources.readDefaultDemoData',
    (p) => p.resources.readDefaultDemoData(),
    'readDefaultDemoData',
    [],
  ],
  // bus
  ['bus.onNewTerminal', (p) => p.bus.onNewTerminal(cb), 'onNewTerminal', [cb]],
  ['bus.onCloseActiveTab', (p) => p.bus.onCloseActiveTab(cb), 'onCloseActiveTab', [cb]],
  ['bus.onOpenGallery', (p) => p.bus.onOpenGallery(cb), 'onOpenGallery', [cb]],
  [
    'bus.onGalleryApplyTemplate',
    (p) => p.bus.onGalleryApplyTemplate(cb),
    'onGalleryApplyTemplate',
    [cb],
  ],
  ['bus.onGalleryDataChanged', (p) => p.bus.onGalleryDataChanged(cb), 'onGalleryDataChanged', [cb]],
  // updater
  ['updater.check', (p) => p.updater.check(), 'checkForUpdates', []],
  [
    'updater.download',
    (p) => p.updater.download('https://example.com/app.dmg'),
    'downloadUpdate',
    ['https://example.com/app.dmg'],
  ],
  ['updater.install', (p) => p.updater.install(), 'installUpdate', []],
  ['updater.restart', (p) => p.updater.restart(), 'restartApp', []],
  ['updater.getAppVersion', (p) => p.updater.getAppVersion(), 'getAppVersion', []],
  ['updater.onProgress', (p) => p.updater.onProgress(cb), 'onUpdateProgress', [cb]],
  // shell
  ['shell.openPath', (p) => p.shell.openPath('/file.pdf'), 'openPath', ['/file.pdf']],
  ['shell.openPdfViewer', (p) => p.shell.openPdfViewer('/file.pdf'), 'openPdfViewer', ['/file.pdf']],
  // gallery
  ['gallery.openWindow', (p) => p.gallery.openWindow('/proj'), 'openGalleryWindow', ['/proj']],
  ['gallery.getProjectDir', (p) => p.gallery.getProjectDir(), 'getGalleryProjectDir', []],
  [
    'gallery.applyTemplate',
    (p) => p.gallery.applyTemplate('ieee'),
    'galleryApplyTemplate',
    ['ieee'],
  ],
  ['gallery.notifyChange', (p) => p.gallery.notifyChange(), 'galleryNotifyChange', []],
];

describe('createElectronPorts', () => {
  let api: MockApi;
  let ports: PlatformPorts;

  beforeEach(() => {
    api = buildMockApi();
    vi.stubGlobal('window', { electronAPI: api });
    ports = createElectronPorts();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('electronAPI への委譲（引数透過・戻り値透過）', () => {
    for (const [label, invoke, apiMethod, expectedArgs] of DELEGATIONS) {
      it(label, () => {
        const result = invoke(ports);
        expect(api[apiMethod]).toHaveBeenCalledTimes(1);
        expect(api[apiMethod]).toHaveBeenCalledWith(...expectedArgs);
        expect(result).toBe(`ret:${apiMethod}`);
      });
    }
  });

  describe('kv（localStorage の Promise ラップ）', () => {
    it('get/set/remove が localStorage に委譲され Promise を返す', async () => {
      const storage = {
        getItem: vi.fn(() => 'stored-value'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', storage);

      await expect(ports.kv.get('theme')).resolves.toBe('stored-value');
      expect(storage.getItem).toHaveBeenCalledWith('theme');

      await expect(ports.kv.set('theme', 'dark')).resolves.toBeUndefined();
      expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark');

      await expect(ports.kv.remove('theme')).resolves.toBeUndefined();
      expect(storage.removeItem).toHaveBeenCalledWith('theme');
    });
  });

  describe('updater.isAvailable', () => {
    it('window.electronAPI が存在すれば true', () => {
      expect(ports.updater.isAvailable()).toBe(true);
    });

    it('window が無い環境（Web 等）では false', () => {
      vi.unstubAllGlobals();
      expect(ports.updater.isAvailable()).toBe(false);
    });
  });

  describe('遅延バインディング（生成タイミング非依存）', () => {
    it('createElectronPorts() を electronAPI 注入前に呼んでも、呼び出し時点の API に委譲される', () => {
      vi.unstubAllGlobals();
      const early = createElectronPorts(); // electronAPI がまだ無い時点で生成
      const lateApi = buildMockApi();
      vi.stubGlobal('window', { electronAPI: lateApi });

      const result = early.annotations.read('/late.md');
      expect(lateApi.readMarginalia).toHaveBeenCalledWith('/late.md');
      expect(result).toBe('ret:readMarginalia');
    });
  });
});

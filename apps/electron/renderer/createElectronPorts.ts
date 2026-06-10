import type { PlatformPorts, UpdateCheckData } from '@marginalia/ports';

/**
 * 既存 window.electronAPI を PlatformPorts に適合させる薄いブリッジ。
 *
 * これがブロック化の「壊さない鍵」: preload / main.js を無改修のまま、
 * renderer 側だけをポート経由に段階移行できる。各メソッドは呼び出し時に
 * window.electronAPI を参照するため、生成タイミングに依存しない。
 *
 * 将来 Web/Tauri 対応時は createWebPorts() / createTauriPorts() を同じ
 * PlatformPorts を返す factory として用意し、アプリ起動点で差し替える。
 */
export function createElectronPorts(): PlatformPorts {
  const api = () => window.electronAPI;
  return {
    annotations: {
      read: (docPath) => api().readMarginalia(docPath),
      write: (docPath, data) => api().writeMarginalia(docPath, data),
    },
    fs: {
      pickDirectory: () => api().openDirectory(),
      readDirectory: (path, options) => api().readDirectory(path, options),
      readFile: (path) => api().readFile(path),
      writeFile: (path, content) => api().writeFile(path, content),
      exists: (path) => api().exists(path),
      getFileStats: (path) => api().getFileStats(path),
      renameFile: (filePath, newName) => api().renameFile(filePath, newName),
      moveFile: (oldPath, newPath) => api().moveFile(oldPath, newPath),
      readFileAsBase64: (path) => api().readFileAsBase64(path),
      listBackups: (path) => api().listBackups(path),
      restoreBackup: (backupPath, targetPath) => api().restoreBackup(backupPath, targetPath),
      previewBackup: (backupPath) => api().previewBackup(backupPath),
      createBackup: (path) => api().createBackup(path),
      deleteBackup: (backupPath) => api().deleteBackup(backupPath),
      listMarginaliaBackups: (path) => api().listMarginaliaBackups(path),
      restoreMarginaliaBackup: (backupPath, filePath) =>
        api().restoreMarginaliaBackup(backupPath, filePath),
    },
    watcher: {
      watch: (filePath) => api().watchFile(filePath),
      unwatch: () => api().unwatchFile(),
      onChanged: (cb) => api().onFileChangedExternally(cb),
      onAnnotationsChanged: (cb) => api().onMarginaliaChangedExternally(cb),
    },
    terminal: {
      create: (cwd) => api().terminalCreate(cwd),
      write: (sessionId, data) => api().terminalWrite(sessionId, data),
      resize: (sessionId, cols, rows) => api().terminalResize(sessionId, cols, rows),
      destroy: (sessionId) => api().terminalDestroy(sessionId),
      onData: (sessionId, cb) => api().onTerminalData(sessionId, cb),
      onExit: (sessionId, cb) => api().onTerminalExit(sessionId, cb),
    },
    build: {
      detectProject: (dirPath) => api().detectProject(dirPath),
      listManifests: (dirPath) => api().listManifests(dirPath),
      listTemplates: (dirPath) => api().listTemplates(dirPath),
      readCatalog: (dirPath) => api().readCatalog(dirPath),
      listSourceFiles: (dirPath) => api().listSourceFiles(dirPath),
      listBibFiles: (dirPath) => api().listBibFiles(dirPath),
      checkDependencies: () => api().checkDependencies(),
      readManifest: (manifestPath) => api().readManifest(manifestPath),
      writeManifest: (manifestPath, data) => api().writeManifest(manifestPath, data),
      createCustomTemplate: (dirPath, name, baseTemplate) =>
        api().createCustomTemplate(dirPath, name, baseTemplate),
      deleteCustomTemplate: (dirPath, name) => api().deleteCustomTemplate(dirPath, name),
      runBuild: (projectRoot, manifestPath, format) =>
        api().runBuild(projectRoot, manifestPath, format),
      quickBuildDemo: (demoStem, format) => api().quickBuildDemo(demoStem, format),
      runAllDemos: (format) => api().runAllDemos(format),
      installSample: (demoStem, targetProjectDir) =>
        api().installSample(demoStem, targetProjectDir),
      onBuildProgress: (cb) => api().onBuildProgress(cb),
      onBuildAllProgress: (cb) => api().onBuildAllProgress(cb),
      onTriggerBuild: (cb) => api().onTriggerBuild(cb),
    },
    resources: {
      readDefaultCatalog: () => api().readDefaultCatalog(),
      readDefaultDemoData: () => api().readDefaultDemoData(),
    },
    bus: {
      onNewTerminal: (cb) => api().onNewTerminal(cb),
      onCloseActiveTab: (cb) => api().onCloseActiveTab(cb),
      onOpenGallery: (cb) => api().onOpenGallery(cb),
      onGalleryApplyTemplate: (cb) => api().onGalleryApplyTemplate(cb),
      onGalleryDataChanged: (cb) => api().onGalleryDataChanged(cb),
    },
    updater: {
      isAvailable: () => typeof window !== 'undefined' && window.electronAPI !== undefined,
      check: () =>
        api().checkForUpdates() as Promise<{ success: boolean; data?: UpdateCheckData; error?: string }>,
      download: (downloadUrl) => api().downloadUpdate(downloadUrl),
      install: () => api().installUpdate(),
      restart: () => api().restartApp(),
      getAppVersion: () => api().getAppVersion(),
      onProgress: (cb) => api().onUpdateProgress(cb),
    },
    shell: {
      openPath: (filePath) => api().openPath(filePath),
      openPdfViewer: (filePath) => api().openPdfViewer(filePath),
    },
    gallery: {
      openWindow: (projectDir) => api().openGalleryWindow(projectDir),
      getProjectDir: () => api().getGalleryProjectDir(),
      applyTemplate: (templateName) => api().galleryApplyTemplate(templateName),
      notifyChange: () => api().galleryNotifyChange(),
    },
    // localStorage 同期バックエンドを Promise でラップ（Web では IndexedDB 等に差し替え可能）
    kv: {
      get: (key) => Promise.resolve(localStorage.getItem(key)),
      set: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
      remove: (key) => Promise.resolve(localStorage.removeItem(key)),
    },
  };
}

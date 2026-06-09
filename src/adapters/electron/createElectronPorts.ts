import type { PlatformPorts } from '@marginalia/ports';

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
  return {
    annotations: {
      read: (docPath) => window.electronAPI.readMarginalia(docPath),
      write: (docPath, data) => window.electronAPI.writeMarginalia(docPath, data),
    },
  };
}

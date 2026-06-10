// @marginalia/ui-react — プラットフォーム非依存の UI ブロック。
// アプリ側（apps/electron/renderer 等）が createXxxPorts() を組み立てて
// <App ports={...} /> に注入する。Web/Tauri へはポート実装を差し替えるだけで載る。
import './styles/global.css';

export { default as App } from './App';
export { default as ErrorBoundary } from './components/common/ErrorBoundary';

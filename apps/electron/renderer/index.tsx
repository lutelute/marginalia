import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, ErrorBoundary } from '@marginalia/ui-react';
import { createElectronPorts } from './createElectronPorts';

// Electron 固有のポート実装を組み立てる。
// Web/Tauri 版は createWebPorts() / createTauriPorts() に差し替えるだけでよい。
const ports = createElectronPorts();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary name="アプリケーション">
      <App ports={ports} />
    </ErrorBoundary>
  </React.StrictMode>
);

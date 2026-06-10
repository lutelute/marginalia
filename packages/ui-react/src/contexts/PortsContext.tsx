import React, { createContext, useContext } from 'react';
import type { PlatformPorts } from '@marginalia/ports';

/**
 * プラットフォームポートを React ツリーに供給する Context。
 * 各 Context Provider は usePorts() でポートを取得し、
 * window.electronAPI への直接依存を排除する。
 */
const PortsContext = createContext<PlatformPorts | null>(null);

export function PortsProvider({
  ports,
  children,
}: {
  ports: PlatformPorts;
  children: React.ReactNode;
}) {
  return <PortsContext.Provider value={ports}>{children}</PortsContext.Provider>;
}

export function usePorts(): PlatformPorts {
  const ctx = useContext(PortsContext);
  if (!ctx) {
    throw new Error('usePorts must be used within a PortsProvider');
  }
  return ctx;
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBuild } from '../../contexts/BuildContext';
import { useTab } from '../../contexts/TabContext';

type SubTab = 'build' | 'templates';

/** マニフェスト名 + フォーマットから出力パスを算出 */
function getOutputPath(projectDir: string, manifestPath: string, fmt: string) {
  const name = manifestPath.split('/').pop()?.replace(/\.ya?ml$/, '') || '';
  return `${projectDir}/output/${name}.${fmt}`;
}

function SidebarGallery({ onOpenFullGallery }: { onOpenFullGallery: () => void }) {
  const {
    effectiveCatalog, projectDir,
    runAllDemos,
    buildStatus, buildAllStatus, buildAllResults, buildAllProgress,
    // ProjectPanel から吸収
    isProject, manifests, buildResult, buildLog, runBuild,
  } = useBuild();
  const { openTab } = useTab();

  const [installError] = useState<string | null>(null);

  // サブタブ: プロジェクトがあれば 'build' をデフォルトに
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(isProject ? 'build' : 'templates');

  // ProjectPanel から移植: ビルド設定関連 state
  const [buildingManifest, setBuildingManifest] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [existingOutputs, setExistingOutputs] = useState<Record<string, string>>({});

  // isProject が変わったらタブを切り替え
  useEffect(() => {
    if (isProject) setActiveSubTab('build');
    else setActiveSubTab('templates');
  }, [isProject]);

  // 出力ファイルの存在チェック
  const checkOutputs = useCallback(async () => {
    if (!projectDir || manifests.length === 0) return;
    const found: Record<string, string> = {};
    for (const m of manifests) {
      for (const fmt of (m.output || ['pdf'])) {
        const p = getOutputPath(projectDir, m.path, fmt);
        try {
          if (await window.electronAPI?.exists(p)) {
            found[`${m.path}:${fmt}`] = p;
          }
        } catch { /* ignore */ }
      }
    }
    setExistingOutputs(found);
  }, [projectDir, manifests]);

  useEffect(() => { checkOutputs(); }, [checkOutputs]);
  useEffect(() => {
    if (buildStatus === 'success') checkOutputs();
  }, [buildStatus, checkOutputs]);

  useEffect(() => {
    if (logRef.current && showLog) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [buildLog, showLog]);

  useEffect(() => {
    if (buildStatus === 'building') setShowLog(true);
  }, [buildStatus]);

  const handleBuild = async (e: React.MouseEvent, manifestPath: string, format: string) => {
    e.stopPropagation();
    setBuildingManifest(manifestPath + ':' + format);
    await runBuild(manifestPath, format);
    setBuildingManifest(null);
  };

  const handleOpenManifest = (manifestPath: string) => {
    openTab(manifestPath);
  };

  const handleOpenOutput = (e: React.MouseEvent, outputPath: string) => {
    e.stopPropagation();
    if (outputPath.endsWith('.pdf')) {
      openTab(outputPath);
    } else {
      window.electronAPI?.openPath(outputPath);
    }
  };

  // テンプレートタブ用
  const templates = effectiveCatalog?.templates ? Object.entries(effectiveCatalog.templates) : [];

  const handleBuildAll = () => {
    runAllDemos('pdf');
  };

  // サブタブ表示判定: プロジェクトがあればビルド設定タブも表示
  const showSubTabs = isProject;

  return (
    <div className="sidebar-gallery">
      {/* サブタブ (プロジェクト時のみ2タブ) */}
      {showSubTabs && (
        <div className="sg-sub-tabs">
          <button
            className={`sg-sub-tab ${activeSubTab === 'build' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('build')}
          >
            <BuildSmallIcon /> Build
          </button>
          <button
            className={`sg-sub-tab ${activeSubTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('templates')}
          >
            <TemplateSmallIcon /> Templates
          </button>
        </div>
      )}

      {/* コンテンツ領域 */}
      <div className="sidebar-gallery-list">
        {activeSubTab === 'build' && isProject ? (
          /* ビルド設定タブ */
          <div className="sg-build-content">
            {manifests.length === 0 ? (
              <div className="sg-build-empty">
                projects/ にビルド設定ファイルがありません
              </div>
            ) : (
              <div className="sg-manifest-cards">
                {manifests.map((manifest) => (
                  <div
                    key={manifest.path}
                    className="sg-manifest-card"
                    onClick={() => handleOpenManifest(manifest.path)}
                    title="クリックでエディタで開く"
                  >
                    <div className="sg-manifest-top">
                      <YamlIcon />
                      <span className="sg-manifest-title">{manifest.title}</span>
                    </div>
                    <div className="sg-manifest-meta">
                      {manifest.template && (
                        <span className="sg-manifest-tag">{manifest.template}</span>
                      )}
                      <span className="sg-manifest-info">
                        {manifest.sectionCount} sections
                      </span>
                    </div>
                    <div className="sg-manifest-bottom">
                      {(manifest.output || ['pdf']).map((fmt) => {
                        const key = `${manifest.path}:${fmt}`;
                        const outputPath = existingOutputs[key];
                        return (
                          <div key={fmt} className="sg-manifest-format">
                            <button
                              className="sg-build-btn"
                              onClick={(e) => handleBuild(e, manifest.path, fmt)}
                              disabled={buildStatus === 'building'}
                              title={`${fmt.toUpperCase()} をビルド`}
                            >
                              {buildingManifest === key ? (
                                <Spinner />
                              ) : (
                                <><BuildSmallIcon /> {fmt.toUpperCase()}</>
                              )}
                            </button>
                            {outputPath && (
                              <button
                                className="sg-open-btn"
                                onClick={(e) => handleOpenOutput(e, outputPath)}
                                title={outputPath.split('/').pop()}
                              >
                                <OpenIcon /> Open
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ビルド結果 */}
            {buildStatus !== 'idle' && (
              <div className="sg-build-result-section">
                <div className="sg-build-result-header">
                  Result
                  {buildLog.length > 0 && (
                    <button className="sg-toggle-log-btn" onClick={() => setShowLog(!showLog)}>
                      {showLog ? 'Hide Log' : 'Show Log'}
                    </button>
                  )}
                </div>
                <div className={`sg-build-result sg-build-result--${buildStatus}`}>
                  {buildStatus === 'building' && (
                    <div className="sg-build-result-content"><Spinner /><span>Building...</span></div>
                  )}
                  {buildStatus === 'success' && buildResult && (
                    <div className="sg-build-result-content">
                      <SuccessIcon /><span>Success</span>
                      {buildResult.outputPath && (
                        <button
                          className="sg-open-output-btn"
                          onClick={(e) => {
                            const outputPath = buildResult.outputPath;
                            if (outputPath) handleOpenOutput(e, outputPath);
                          }}
                        >
                          <OpenIcon /> {buildResult.outputPath.split('/').pop()}
                        </button>
                      )}
                    </div>
                  )}
                  {buildStatus === 'error' && buildResult && (
                    <div className="sg-build-result-content">
                      <ErrorIcon /><span>Failed</span>
                      {buildResult.error && (
                        <div className="sg-build-error-msg">{buildResult.error}</div>
                      )}
                    </div>
                  )}
                </div>
                {showLog && buildLog.length > 0 && (
                  <div className="sg-build-log" ref={logRef}>
                    {buildLog.map((line, i) => (
                      <div key={i} className="sg-build-log-line">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* テンプレートギャラリー (プレビュー + 誘導) */
          <>
            {templates.length === 0 ? (
              <div className="sidebar-gallery-empty">
                <span>No templates</span>
              </div>
            ) : (
              <div className="sg-template-cards">
                {templates.slice(0, 4).map(([name, tmpl]) => (
                  <div
                    key={name}
                    className="sg-template-card"
                    onClick={onOpenFullGallery}
                    title={tmpl.description || name}
                  >
                    <div className="sg-template-card-preview">
                      {tmpl.preview && projectDir ? (
                        <iframe
                          src={`local-file://${projectDir}/output/${tmpl.preview}`}
                          title={name}
                          className="sg-template-card-iframe"
                        />
                      ) : (
                        <div className="sg-template-card-placeholder">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="sg-template-card-body">
                      <div className="sg-template-card-top">
                        <span className={`sidebar-gallery-type-dot tg-dot-${tmpl.type || 'other'}`} />
                        <span className="sg-template-card-name">{name}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.length > 4 && (
                  <div className="sg-template-card sg-template-card-more" onClick={onOpenFullGallery}>
                    <div className="sg-template-card-preview">
                      <div className="sg-template-card-placeholder">
                        <span className="sg-more-count">+{templates.length - 4}</span>
                      </div>
                    </div>
                    <div className="sg-template-card-body">
                      <span className="sg-template-card-name">more...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* フッター */}
      <div className="sidebar-gallery-footer">
        <button
          className="sidebar-gallery-build-all-btn"
          onClick={handleBuildAll}
          disabled={buildAllStatus === 'running'}
          title="Build all demo templates"
        >
          {buildAllStatus === 'running'
            ? `Building ${buildAllProgress?.current || 0}/${buildAllProgress?.total || '?'}...`
            : 'Build All'}
        </button>

        {buildAllStatus === 'completed' && buildAllResults.length > 0 && (
          <div className="sidebar-gallery-build-all-summary">
            <span className="sidebar-gallery-summary-ok">
              {buildAllResults.filter(r => r.success).length} OK
            </span>
            {buildAllResults.filter(r => !r.success).length > 0 && (
              <span className="sidebar-gallery-summary-fail">
                {buildAllResults.filter(r => !r.success).length} FAIL
              </span>
            )}
          </div>
        )}

        {installError && (
          <div className="sidebar-gallery-install-error">{installError}</div>
        )}

        <button className="sidebar-gallery-full-btn" onClick={onOpenFullGallery} title="Template Gallery (⌘⇧T)">
          See All Templates →
        </button>
      </div>
      <style>{`
        .sidebar-gallery {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* サブタブ */
        .sg-sub-tabs {
          display: flex;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-color);
        }
        .sg-sub-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sg-sub-tab:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .sg-sub-tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }

        /* ビルド設定タブ */
        .sg-build-content {
          padding: 4px 0;
        }
        .sg-build-empty {
          padding: 12px;
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
        }
        .sg-manifest-cards {
          padding: 0 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sg-manifest-card {
          border: 1px solid var(--border-color);
          border-radius: 5px;
          padding: 6px 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sg-manifest-card:hover {
          border-color: var(--accent-color);
          background: var(--bg-hover);
        }
        .sg-manifest-top {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 3px;
        }
        .sg-manifest-top svg {
          flex-shrink: 0;
          color: var(--text-muted);
        }
        .sg-manifest-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sg-manifest-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 4px;
          padding-left: 19px;
        }
        .sg-manifest-tag {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 3px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
        }
        .sg-manifest-info {
          font-size: 9px;
          color: var(--text-muted);
        }
        .sg-manifest-bottom {
          display: flex;
          gap: 4px;
          padding-left: 19px;
        }
        .sg-manifest-format {
          display: flex;
          gap: 2px;
        }
        .sg-build-btn {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          min-width: 32px;
          justify-content: center;
        }
        .sg-build-btn:hover:not(:disabled) {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .sg-build-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sg-open-btn {
          font-size: 9px;
          padding: 2px 5px;
          border-radius: 3px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .sg-open-btn:hover {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.5);
          color: var(--text-primary);
        }

        /* ビルド結果 */
        .sg-build-result-section {
          margin-top: 6px;
          padding: 0 6px;
        }
        .sg-build-result-header {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          padding: 4px 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sg-toggle-log-btn {
          font-size: 8px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 1px 3px;
          border-radius: 2px;
          text-transform: none;
          letter-spacing: 0;
          font-weight: 400;
        }
        .sg-toggle-log-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .sg-build-result {
          padding: 6px;
          border-radius: 4px;
          font-size: 11px;
        }
        .sg-build-result--building {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .sg-build-result--success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .sg-build-result--error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .sg-build-result-content {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .sg-open-output-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 3px;
          padding: 2px 5px;
          border-radius: 3px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.05);
          color: var(--text-primary);
          font-size: 10px;
          cursor: pointer;
        }
        .sg-open-output-btn:hover {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
        }
        .sg-build-error-msg {
          width: 100%;
          font-size: 10px;
          color: var(--error-color);
          margin-top: 3px;
          white-space: pre-wrap;
          max-height: 80px;
          overflow-y: auto;
        }
        .sg-build-log {
          margin-top: 4px;
          padding: 4px 6px;
          border-radius: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          font-family: 'Menlo', 'Monaco', monospace;
          font-size: 9px;
          line-height: 1.5;
          max-height: 120px;
          overflow-y: auto;
          color: var(--text-muted);
        }
        .sg-build-log-line {
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* テンプレートギャラリー */
        .sidebar-gallery-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          padding-bottom: 68px;
        }
        .sidebar-gallery-empty {
          padding: 12px;
          color: var(--text-muted);
          font-size: 11px;
          text-align: center;
        }

        /* テンプレートカードグリッド */
        .sg-template-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px 6px;
        }
        .sg-template-card {
          border: 1px solid var(--border-color);
          border-radius: 5px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sg-template-card:hover {
          border-color: var(--accent-color);
        }
        .sg-template-card.expanded {
          border-color: var(--accent-color);
          background: var(--bg-hover);
          grid-column: 1 / -1;
        }
        .sg-template-card-preview {
          height: 56px;
          overflow: hidden;
          background: var(--bg-secondary);
          position: relative;
        }
        .sg-template-card-iframe {
          width: 200%;
          height: 200%;
          border: none;
          transform: scale(0.5);
          transform-origin: top left;
          pointer-events: none;
        }
        .sg-template-card-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sg-template-card-body {
          padding: 4px 6px;
        }
        .sg-template-card-top {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sg-template-card-name {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sg-template-card-desc {
          font-size: 9px;
          color: var(--text-muted);
          line-height: 1.3;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sg-template-card-more {
          border-style: dashed;
          opacity: 0.7;
        }
        .sg-template-card-more:hover {
          opacity: 1;
        }
        .sg-more-count {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .sidebar-gallery-type-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .tg-dot-report { background: #3b82f6; }
        .tg-dot-paper { background: #22c55e; }
        .tg-dot-conference { background: #a855f7; }
        .tg-dot-minutes { background: #f97316; }
        .tg-dot-proposal { background: #ec4899; }
        .tg-dot-techspec { background: #14b8a6; }
        .tg-dot-other { background: #6b7280; }

        .sidebar-gallery-action-btn {
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
        }
        .sidebar-gallery-action-btn:hover:not(:disabled) {
          background: var(--bg-active);
          color: var(--text-primary);
        }
        .sidebar-gallery-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .sidebar-gallery-build-btn:hover:not(:disabled) {
          border-color: var(--accent-color);
          color: var(--accent-color);
        }
        .sidebar-gallery-install-btn:hover:not(:disabled) {
          border-color: #22c55e;
          color: #22c55e;
        }

        /* フッター（絶対配置で常に下部表示） */
        .sidebar-gallery-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 6px 8px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
        }
        .sidebar-gallery-build-all-btn {
          width: 100%;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sidebar-gallery-build-all-btn:hover:not(:disabled) {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .sidebar-gallery-build-all-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: var(--bg-hover);
        }
        .sidebar-gallery-build-all-summary {
          display: flex;
          gap: 8px;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 0;
        }
        .sidebar-gallery-summary-ok {
          color: #22c55e;
        }
        .sidebar-gallery-summary-fail {
          color: #ef4444;
        }
        .sidebar-gallery-install-error {
          font-size: 10px;
          color: #ef4444;
          text-align: center;
          padding: 2px 4px;
        }
        .sidebar-gallery-full-btn {
          width: 100%;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sidebar-gallery-full-btn:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// --- Icons ---

function BuildSmallIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function TemplateSmallIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function YamlIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default SidebarGallery;

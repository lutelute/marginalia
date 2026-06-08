import { useState, useCallback } from 'react';
import { useBuild } from '../../contexts/BuildContext';
import SampleExplorer from './SampleExplorer';
import BuildGuides from './BuildGuides';
import { getDemoStem } from './templateGalleryUtils';
import type { SourceFilter, GalleryTab, PreviewTab, TemplateGalleryProps } from './templateGalleryUtils';
import { templateGalleryStyles } from './templateGalleryStyles';

function TemplateGallery({ onApplyTemplate, onPopOut, onClose, isModal, isWindow }: TemplateGalleryProps = {}) {
  const { effectiveCatalog, projectDir, manifestData, selectedManifestPath, updateManifestData, saveManifest, createCustomTemplate, deleteCustomTemplate, defaultDemoData, defaultTemplateMap, quickBuildDemo, installSample, buildStatus } = useBuild();
  const catalog = effectiveCatalog;
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('pdf');
  const [previewYaml, setPreviewYaml] = useState<string | null>(null);
  const [previewMdSections, setPreviewMdSections] = useState<{name: string; content: string}[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [galleryTab, setGalleryTab] = useState<GalleryTab>('templates');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [baseTemplate, setBaseTemplate] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const [installingDemo, setInstallingDemo] = useState<string | null>(null);
  const [installFeedback, setInstallFeedback] = useState<{ stem: string; ok: boolean; msg: string } | null>(null);

  // テンプレートに紐づくデモの stem を取得
  const demoStemFor = useCallback((templateName: string) => {
    return getDemoStem(templateName, catalog, defaultTemplateMap);
  }, [catalog, defaultTemplateMap]);

  // テンプレートのセクション数を取得
  const getSectionCount = useCallback((templateName: string) => {
    const stem = demoStemFor(templateName);
    if (!stem) return 0;
    // projectDir がある場合はファイルから後で確認
    if (defaultDemoData?.[stem]) return defaultDemoData[stem].sections.length;
    return 0;
  }, [demoStemFor, defaultDemoData]);

  // プレビューモーダル展開時にYAML/MDデータをロード
  const loadPreviewData = useCallback(async (templateName: string) => {
    if (!catalog?.templates[templateName]) return;
    setPreviewLoading(true);
    setPreviewYaml(null);
    setPreviewMdSections([]);

    const stem = demoStemFor(templateName);

    // 1) projectDir がある場合はファイルシステムから読み込み
    if (projectDir && stem) {
      const manifestPath = `${projectDir}/projects/${stem}.yaml`;
      try {
        const yamlResult = await window.electronAPI.readFile(manifestPath);
        const yamlText = yamlResult.content ?? '';
        setPreviewYaml(yamlText);

        const sectionsMatch = yamlText.match(/^sections:\s*\n((?:\s+-\s+.+\n?)*)/m);
        if (sectionsMatch) {
          const sectionLines = sectionsMatch[1].match(/^\s+-\s+(.+)$/gm) || [];
          const sectionPaths = sectionLines.map(l => l.replace(/^\s+-\s+/, '').trim());

          const mdResults: {name: string; content: string}[] = [];
          for (const sp of sectionPaths) {
            try {
              const fullPath = `${projectDir}/${sp}`;
              const mdResult = await window.electronAPI.readFile(fullPath);
              mdResults.push({ name: sp.split('/').pop() || sp, content: mdResult.content ?? '' });
            } catch {
              mdResults.push({ name: sp.split('/').pop() || sp, content: '(読み込み失敗)' });
            }
          }
          setPreviewMdSections(mdResults);
        }
        setPreviewLoading(false);
        return;
      } catch {
        // ファイルが無ければ fallback へ
      }
    }

    // 2) defaultDemoData にフォールバック
    if (stem && defaultDemoData?.[stem]) {
      const demo = defaultDemoData[stem];
      setPreviewYaml(demo.manifestYaml);
      setPreviewMdSections(
        demo.sections.flatMap(s =>
          s.content !== null ? [{ name: s.name, content: s.content }] : []
        )
      );
    }

    setPreviewLoading(false);
  }, [projectDir, catalog, demoStemFor, defaultDemoData]);

  const handleExpandPreview = useCallback((name: string) => {
    if (previewTemplate === name) {
      setPreviewTemplate(null);
      return;
    }
    setPreviewTemplate(name);
    setPreviewTab(projectDir ? 'pdf' : 'yaml');
    loadPreviewData(name);
  }, [previewTemplate, loadPreviewData]);

  // ガード: フックは全て上で宣言済みなので、ここで早期 return しても安全
  if (!catalog || !catalog.templates) {
    return (
      <div className="template-gallery-empty">
        <p>テンプレートカタログが見つかりません</p>
      </div>
    );
  }

  const allTemplates = Object.entries(catalog.templates);
  const templates = allTemplates.filter(([, tmpl]) => {
    if (sourceFilter === 'all') return true;
    return tmpl._source === sourceFilter;
  });

  const builtinCount = allTemplates.filter(([, t]) => t._source === 'builtin').length;
  const customCount = allTemplates.filter(([, t]) => t._source === 'custom').length;

  const handleApply = async (templateName: string) => {
    if (onApplyTemplate) {
      onApplyTemplate(templateName);
      return;
    }
    if (!manifestData || !selectedManifestPath) return;
    const updatedData = { ...manifestData, template: templateName };
    updateManifestData(updatedData);

    const ok = await saveManifest(selectedManifestPath, updatedData);
    if (ok) {
      setApplyFeedback(templateName);
      setTimeout(() => setApplyFeedback(null), 2000);
    }
  };

  const handleCreate = async () => {
    if (!newTemplateName.trim()) return;
    setCreating(true);
    const result = await createCustomTemplate(newTemplateName.trim(), baseTemplate || undefined);
    setCreating(false);
    if (result.success) {
      setShowCreateDialog(false);
      setNewTemplateName('');
      setBaseTemplate('');
      if (isWindow) window.electronAPI?.galleryNotifyChange();
    } else {
      alert(result.error || '作成に失敗しました');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`カスタムテンプレート "${name}" を削除しますか?`)) return;
    setDeleting(name);
    await deleteCustomTemplate(name);
    setDeleting(null);
    if (isWindow) window.electronAPI?.galleryNotifyChange();
  };

  return (
    <div className="template-gallery-container">
      <div className="template-gallery-header">
        <h2>Template Gallery</h2>
        <span className="template-gallery-count">{templates.length} templates</span>
        <button className="tg-create-btn" onClick={() => setShowCreateDialog(true)} title={!projectDir ? 'プロジェクトを開いてから作成してください' : 'カスタムテンプレートを作成'} disabled={!projectDir}>
          + 作成
        </button>
        <div className="tg-header-actions">
          {(isModal) && onPopOut && (
            <button className="tg-header-btn" onClick={onPopOut} title="別ウィンドウで開く">
              <PopOutIcon />
            </button>
          )}
          {(isModal || isWindow) && onClose && (
            <button className="tg-header-btn" onClick={onClose} title="閉じる">
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* メインタブ切替 */}
      <div className="tg-main-tabs">
        <button className={`tg-main-tab ${galleryTab === 'templates' ? 'active' : ''}`} onClick={() => setGalleryTab('templates')}>
          <TemplatesTabIcon />
          テンプレート
        </button>
        <button className={`tg-main-tab ${galleryTab === 'samples' ? 'active' : ''}`} onClick={() => setGalleryTab('samples')}>
          <SamplesTabIcon />
          サンプル
        </button>
        <button className={`tg-main-tab ${galleryTab === 'guides' ? 'active' : ''}`} onClick={() => setGalleryTab('guides')}>
          <GuidesTabIcon />
          ビルドガイド
        </button>
      </div>

      {galleryTab === 'templates' ? (
        <>
          {/* フィルタ切替 */}
          <div className="tg-filter-bar">
            <button className={`tg-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>
              すべて ({allTemplates.length})
            </button>
            <button className={`tg-filter-btn ${sourceFilter === 'builtin' ? 'active' : ''}`} onClick={() => setSourceFilter('builtin')}>
              共通 ({builtinCount})
            </button>
            <button className={`tg-filter-btn ${sourceFilter === 'custom' ? 'active' : ''}`} onClick={() => setSourceFilter('custom')}>
              カスタム ({customCount})
            </button>
          </div>

          <div className="template-gallery-grid">
            {templates.map(([name, tmpl]) => (
              <div key={name} className={`template-gallery-card ${manifestData?.template === name ? 'selected' : ''}`}>
                {/* PDF Thumbnail */}
                {tmpl.preview && projectDir ? (
                  <div className="template-gallery-preview" onClick={() => handleExpandPreview(name)}>
                    <iframe
                      src={`local-file://${projectDir}/output/${tmpl.preview}`}
                      title={name}
                      className="template-gallery-iframe"
                    />
                    <div className="template-gallery-preview-overlay">Click to expand</div>
                  </div>
                ) : (
                  <div className="template-gallery-no-preview">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>No Preview</span>
                  </div>
                )}

                {/* Card Content */}
                <div className="template-gallery-card-body">
                  <div className="template-gallery-card-header">
                    <span className={`template-gallery-type-badge tg-type-${tmpl.type || 'other'}`}>
                      {tmpl.type || 'other'}
                    </span>
                    <span className={`tg-source-badge tg-source-${tmpl._source || 'builtin'}`}>
                      {tmpl._source === 'custom' ? 'custom' : 'builtin'}
                    </span>
                    <span className="template-gallery-card-name">{name}</span>
                  </div>

                  {tmpl.description && (
                    <p className="template-gallery-card-desc">{tmpl.description}</p>
                  )}

                  {tmpl.features && tmpl.features.length > 0 && (
                    <div className="template-gallery-tags">
                      {tmpl.features.map(f => (
                        <span key={f} className="template-gallery-feature-tag">{f}</span>
                      ))}
                    </div>
                  )}

                  {tmpl.styles && tmpl.styles.length > 0 && (
                    <div className="template-gallery-tags">
                      {tmpl.styles.map(s => (
                        <span key={s} className="template-gallery-style-tag">{s}</span>
                      ))}
                    </div>
                  )}

                  {getSectionCount(name) > 0 && (
                    <div className="tg-section-indicator">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span>{getSectionCount(name)} .md sections</span>
                    </div>
                  )}

                  <div className="tg-card-actions">
                    <button
                      className="template-gallery-apply-btn"
                      onClick={() => handleApply(name)}
                      disabled={!selectedManifestPath && !onApplyTemplate}
                      title={!projectDir ? 'プロジェクトを開いてから適用してください' : !selectedManifestPath ? 'マニフェストを選択してください' : `${name} をマニフェストに適用`}
                    >
                      {applyFeedback === name ? '適用済み ✓' : manifestData?.template === name ? 'Applied' : 'Apply'}
                    </button>
                    {(() => {
                      const demoStem = demoStemFor(name);
                      if (!demoStem) return null;
                      return (
                        <>
                          <button
                            className="tg-quick-build-btn"
                            onClick={() => quickBuildDemo(demoStem, 'pdf')}
                            disabled={buildStatus === 'building'}
                            title={`${demoStem} をビルド`}
                          >
                            {buildStatus === 'building' ? '...' : 'Build'}
                          </button>
                          {projectDir && (
                            <button
                              className="tg-install-btn"
                              onClick={async () => {
                                setInstallingDemo(demoStem);
                                const result = await installSample(demoStem);
                                setInstallingDemo(null);
                                setInstallFeedback({
                                  stem: demoStem,
                                  ok: result.success,
                                  msg: result.success ? 'Installed' : (result.error || 'Failed'),
                                });
                                setTimeout(() => setInstallFeedback(null), 3000);
                              }}
                              disabled={installingDemo === demoStem}
                              title={`${demoStem} をプロジェクトにインストール`}
                            >
                              {installingDemo === demoStem ? '...' : installFeedback?.stem === demoStem ? (installFeedback.ok ? 'Installed ✓' : 'Error') : 'Install'}
                            </button>
                          )}
                        </>
                      );
                    })()}
                    {tmpl._source === 'custom' && (
                      <button
                        className="tg-delete-btn"
                        onClick={() => handleDelete(name)}
                        disabled={deleting === name}
                        title="カスタムテンプレートを削除"
                      >
                        {deleting === name ? '...' : '削除'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : galleryTab === 'samples' ? (
        <SampleExplorer
          defaultTemplateMap={defaultTemplateMap}
          defaultDemoData={defaultDemoData}
          quickBuildDemo={quickBuildDemo}
          installSample={installSample}
          buildStatus={buildStatus}
          projectDir={projectDir}
        />
      ) : (
        <BuildGuides />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="template-gallery-modal" onClick={() => setShowCreateDialog(false)}>
          <div className="tg-create-dialog" onClick={e => e.stopPropagation()}>
            <div className="template-gallery-modal-header">
              <span>カスタムテンプレート作成</span>
              <button onClick={() => setShowCreateDialog(false)}>✕</button>
            </div>
            <div className="tg-create-form">
              <label className="tg-create-label">
                テンプレート名
                <input
                  className="tg-create-input"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="my-weekly-report"
                  autoFocus
                />
              </label>
              <label className="tg-create-label">
                ベーステンプレート (任意)
                <select
                  className="tg-create-input"
                  value={baseTemplate}
                  onChange={e => setBaseTemplate(e.target.value)}
                >
                  <option value="">-- なし (空テンプレート) --</option>
                  {allTemplates.map(([n]) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button
                className="tg-create-submit"
                onClick={handleCreate}
                disabled={creating || !newTemplateName.trim()}
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded preview modal with tabs */}
      {previewTemplate && (
        <div className="template-gallery-modal" onClick={() => setPreviewTemplate(null)}>
          <div className="template-gallery-modal-content" onClick={e => e.stopPropagation()}>
            <div className="template-gallery-modal-header">
              <span>{previewTemplate}</span>
              <div className="tg-preview-tabs">
                <button className={`tg-preview-tab ${previewTab === 'pdf' ? 'active' : ''}`} onClick={() => setPreviewTab('pdf')}>PDF</button>
                <button className={`tg-preview-tab ${previewTab === 'yaml' ? 'active' : ''}`} onClick={() => setPreviewTab('yaml')}>YAML</button>
                <button className={`tg-preview-tab ${previewTab === 'md' ? 'active' : ''}`} onClick={() => setPreviewTab('md')}>Markdown</button>
              </div>
              <button onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>

            {previewTab === 'pdf' && (
              catalog.templates[previewTemplate]?.preview && projectDir ? (
                <iframe
                  src={`local-file://${projectDir}/output/${catalog.templates[previewTemplate].preview}`}
                  title={previewTemplate}
                  className="template-gallery-modal-iframe"
                />
              ) : (
                <div className="tg-preview-empty">
                  {!projectDir ? 'PDF プレビューにはプロジェクトフォルダが必要です' : 'No Preview'}
                </div>
              )
            )}

            {previewTab === 'yaml' && (
              <div className="tg-preview-code-container">
                {previewLoading ? (
                  <div className="tg-preview-empty">読み込み中...</div>
                ) : previewYaml ? (
                  <pre className="tg-preview-code">{previewYaml}</pre>
                ) : (
                  <div className="tg-preview-empty">対応するマニフェストが見つかりません</div>
                )}
              </div>
            )}

            {previewTab === 'md' && (
              <div className="tg-preview-code-container">
                {previewLoading ? (
                  <div className="tg-preview-empty">読み込み中...</div>
                ) : previewMdSections.length > 0 ? (
                  previewMdSections.map((section, i) => (
                    <div key={i} className="tg-preview-md-section">
                      <div className="tg-preview-md-filename">{section.name}</div>
                      <pre className="tg-preview-code">{section.content}</pre>
                    </div>
                  ))
                ) : (
                  <div className="tg-preview-empty">マークダウンセクションが見つかりません</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{templateGalleryStyles}</style>
    </div>
  );
}

function TemplatesTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SamplesTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function GuidesTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PopOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default TemplateGallery;

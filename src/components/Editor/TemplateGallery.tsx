import React, { useState } from 'react';
import { useBuild } from '../../contexts/BuildContext';

type SourceFilter = 'all' | 'builtin' | 'custom';

function TemplateGallery() {
  const { catalog, projectDir, manifestData, selectedManifestPath, updateManifestData, createCustomTemplate, deleteCustomTemplate } = useBuild();
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [baseTemplate, setBaseTemplate] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleApply = (templateName: string) => {
    if (!manifestData || !selectedManifestPath) return;
    updateManifestData({ ...manifestData, template: templateName });
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
    } else {
      alert(result.error || '作成に失敗しました');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`カスタムテンプレート "${name}" を削除しますか?`)) return;
    setDeleting(name);
    await deleteCustomTemplate(name);
    setDeleting(null);
  };

  return (
    <div className="template-gallery-container">
      <div className="template-gallery-header">
        <h2>Template Gallery</h2>
        <span className="template-gallery-count">{templates.length} templates</span>
        <button className="tg-create-btn" onClick={() => setShowCreateDialog(true)} title="カスタムテンプレートを作成">
          + 作成
        </button>
      </div>

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
              <div className="template-gallery-preview" onClick={() => setPreviewTemplate(previewTemplate === name ? null : name)}>
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

              <div className="tg-card-actions">
                <button
                  className="template-gallery-apply-btn"
                  onClick={() => handleApply(name)}
                  disabled={!selectedManifestPath}
                  title={!selectedManifestPath ? 'マニフェストを選択してください' : `${name} をマニフェストに適用`}
                >
                  {manifestData?.template === name ? 'Applied' : 'Apply'}
                </button>
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

      {/* Expanded preview modal */}
      {previewTemplate && projectDir && catalog.templates[previewTemplate]?.preview && (
        <div className="template-gallery-modal" onClick={() => setPreviewTemplate(null)}>
          <div className="template-gallery-modal-content" onClick={e => e.stopPropagation()}>
            <div className="template-gallery-modal-header">
              <span>{previewTemplate}</span>
              <button onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>
            <iframe
              src={`local-file://${projectDir}/templates/${catalog.templates[previewTemplate].preview}`}
              title={previewTemplate}
              className="template-gallery-modal-iframe"
            />
          </div>
        </div>
      )}

      <style>{`
        .template-gallery-container {
          height: 100%;
          overflow-y: auto;
          padding: 20px;
          background-color: var(--bg-primary);
        }
        .template-gallery-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .template-gallery-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .template-gallery-count {
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .tg-create-btn {
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid var(--accent-color);
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        }
        .tg-create-btn:hover {
          background: var(--accent-hover);
        }
        .tg-filter-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
        }
        .tg-filter-btn {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }
        .tg-filter-btn.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .tg-filter-btn:hover:not(.active) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .template-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .template-gallery-card {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-secondary);
          transition: all 0.2s;
        }
        .template-gallery-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .template-gallery-card.selected {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
        }
        .template-gallery-preview {
          height: 200px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          background: white;
        }
        .template-gallery-iframe {
          width: 200%;
          height: 400px;
          border: none;
          transform: scale(0.5);
          transform-origin: top left;
          pointer-events: none;
        }
        .template-gallery-preview-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 4px;
          text-align: center;
          font-size: 10px;
          color: white;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .template-gallery-preview:hover .template-gallery-preview-overlay {
          opacity: 1;
        }
        .template-gallery-no-preview {
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 12px;
        }
        .template-gallery-card-body {
          padding: 12px;
        }
        .template-gallery-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .template-gallery-card-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .template-gallery-type-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .tg-source-badge {
          font-size: 8px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .tg-source-builtin {
          background-color: rgba(107, 114, 128, 0.15);
          color: #9ca3af;
        }
        .tg-source-custom {
          background-color: rgba(251, 191, 36, 0.2);
          color: #f59e0b;
        }
        .tg-type-report { background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .tg-type-paper { background-color: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .tg-type-conference { background-color: rgba(168, 85, 247, 0.15); color: #a855f7; }
        .tg-type-minutes { background-color: rgba(249, 115, 22, 0.15); color: #f97316; }
        .tg-type-proposal { background-color: rgba(236, 72, 153, 0.15); color: #ec4899; }
        .tg-type-techspec { background-color: rgba(20, 184, 166, 0.15); color: #14b8a6; }
        .tg-type-other { background-color: rgba(107, 114, 128, 0.15); color: #6b7280; }
        .template-gallery-card-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
          margin: 0 0 8px 0;
        }
        .template-gallery-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        .template-gallery-feature-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .template-gallery-style-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--text-muted);
        }
        .tg-card-actions {
          display: flex;
          gap: 6px;
        }
        .template-gallery-apply-btn {
          flex: 1;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--accent-color);
          background: var(--accent-color);
          color: white;
          cursor: pointer;
          transition: all 0.15s;
        }
        .template-gallery-apply-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .template-gallery-apply-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tg-delete-btn {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: transparent;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tg-delete-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
        }
        .tg-delete-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .template-gallery-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          font-size: 14px;
        }
        .template-gallery-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .template-gallery-modal-content {
          width: 80%;
          height: 85%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .template-gallery-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
        }
        .template-gallery-modal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .template-gallery-modal-header button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .template-gallery-modal-iframe {
          flex: 1;
          width: 100%;
          border: none;
        }
        .tg-create-dialog {
          width: 400px;
          background: var(--bg-secondary);
          border-radius: 8px;
          overflow: hidden;
        }
        .tg-create-form {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tg-create-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .tg-create-input {
          padding: 6px 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .tg-create-input:focus {
          border-color: var(--accent-color);
        }
        .tg-create-submit {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
        }
        .tg-create-submit:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .tg-create-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default TemplateGallery;

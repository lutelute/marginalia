import { useState } from 'react';
import type { SampleExplorerProps, SelectedFile } from './templateGalleryUtils';

function SampleExplorer({ defaultTemplateMap, defaultDemoData, quickBuildDemo, installSample, buildStatus, projectDir }: SampleExplorerProps) {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [expandedStems, setExpandedStems] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [installingDemo, setInstallingDemo] = useState<string | null>(null);
  const [installFeedback, setInstallFeedback] = useState<{ stem: string; ok: boolean } | null>(null);

  const templateNames = defaultTemplateMap ? Object.keys(defaultTemplateMap) : [];

  const toggleTemplate = (name: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleStem = (stem: string) => {
    setExpandedStems(prev => {
      const next = new Set(prev);
      if (next.has(stem)) next.delete(stem);
      else next.add(stem);
      return next;
    });
  };

  const getFileContent = (): { filename: string; content: string } | null => {
    if (!selectedFile || !defaultDemoData) return null;
    const demo = defaultDemoData[selectedFile.stem];
    if (!demo) return null;

    if (selectedFile.type === 'yaml') {
      return { filename: `${selectedFile.stem}.yaml`, content: demo.manifestYaml };
    }
    if (selectedFile.type === 'md' && selectedFile.sectionIndex !== undefined) {
      const section = demo.sections[selectedFile.sectionIndex];
      if (!section || !section.content) return null;
      return { filename: section.name, content: section.content };
    }
    return null;
  };

  const handleInstall = async (stem: string) => {
    setInstallingDemo(stem);
    const result = await installSample(stem);
    setInstallingDemo(null);
    setInstallFeedback({ stem, ok: result.success });
    setTimeout(() => setInstallFeedback(null), 3000);
  };

  const fileData = getFileContent();

  return (
    <div className="se-container">
      {/* 左ペイン: ツリー */}
      <div className="se-tree-pane">
        {templateNames.length === 0 ? (
          <div className="se-empty">No samples available</div>
        ) : (
          templateNames.map(tmplName => {
            const stems = defaultTemplateMap?.[tmplName] || [];
            const isExpanded = expandedTemplates.has(tmplName);
            return (
              <div key={tmplName} className="se-template-group">
                <div className="se-template-header" onClick={() => toggleTemplate(tmplName)}>
                  <span className={`se-chevron ${isExpanded ? 'open' : ''}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                  <span className="se-template-name">{tmplName}</span>
                </div>
                {isExpanded && stems.map(stem => {
                  const demo = defaultDemoData?.[stem];
                  if (!demo) return null;
                  const isStemExpanded = expandedStems.has(stem);
                  return (
                    <div key={stem} className="se-stem-group">
                      <div className="se-stem-header" onClick={() => toggleStem(stem)}>
                        <span className={`se-chevron ${isStemExpanded ? 'open' : ''}`}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                        <span className="se-stem-name">{stem}</span>
                      </div>
                      {isStemExpanded && (
                        <div className="se-file-list">
                          {/* YAML */}
                          <div
                            className={`se-file-item ${selectedFile?.stem === stem && selectedFile?.type === 'yaml' ? 'selected' : ''}`}
                            onClick={() => setSelectedFile({ type: 'yaml', stem })}
                          >
                            <YamlFileIcon />
                            <span>{stem}.yaml</span>
                          </div>
                          {/* MD sections */}
                          {demo.sections.map((section, i) => (
                            <div
                              key={i}
                              className={`se-file-item ${selectedFile?.stem === stem && selectedFile?.type === 'md' && selectedFile?.sectionIndex === i ? 'selected' : ''}`}
                              onClick={() => setSelectedFile({ type: 'md', stem, sectionIndex: i })}
                            >
                              <MdFileIcon />
                              <span>{section.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* 右ペイン: ファイル内容 */}
      <div className="se-content-pane">
        {fileData ? (
          <>
            <div className="se-content-header">
              <span className="se-content-filename">{fileData.filename}</span>
            </div>
            <div className="se-content-body">
              <pre className="tg-preview-code">{fileData.content}</pre>
            </div>
            {/* フッター: Build / Install */}
            {selectedFile && (
              <div className="se-content-footer">
                <button
                  className="tg-quick-build-btn"
                  onClick={() => quickBuildDemo(selectedFile.stem, 'pdf')}
                  disabled={buildStatus === 'building'}
                >
                  {buildStatus === 'building' ? '...' : 'Build'}
                </button>
                {projectDir && (
                  <button
                    className="tg-install-btn"
                    onClick={() => handleInstall(selectedFile.stem)}
                    disabled={installingDemo === selectedFile.stem}
                  >
                    {installingDemo === selectedFile.stem ? '...' :
                      installFeedback?.stem === selectedFile.stem ?
                        (installFeedback.ok ? 'Installed' : 'Error') : 'Install'}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="se-content-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>ファイルを選択してください</span>
          </div>
        )}
      </div>
    </div>
  );
}

function YamlFileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function MdFileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export default SampleExplorer;

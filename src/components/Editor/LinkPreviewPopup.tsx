import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LinkPreviewPopupProps {
  href: string;
  position: { x: number; y: number };
  rootPath: string;
  currentFile: string;
  onClose: () => void;
}

function LinkPreviewPopup({ href, position, rootPath, currentFile, onClose }: LinkPreviewPopupProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // 外部リンクかどうかを判定
  const isExternalLink = href.startsWith('http://') || href.startsWith('https://');

  // 内部リンクのパスを解決
  const resolveInternalPath = (linkHref: string): string | null => {
    if (isExternalLink) return null;
    if (linkHref.startsWith('#')) return null;

    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    let targetPath: string;

    if (linkHref.startsWith('/')) {
      targetPath = rootPath + linkHref;
    } else {
      targetPath = currentDir + '/' + linkHref;
    }

    // パスを正規化
    const parts = targetPath.split('/');
    const normalized: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else if (part !== '.') {
        normalized.push(part);
      }
    }
    targetPath = normalized.join('/');

    // .mdファイルのみ対象
    if (!targetPath.endsWith('.md') && !targetPath.endsWith('.markdown')) {
      targetPath += '.md';
    }

    return targetPath;
  };

  // ファイル内容を読み込む
  useEffect(() => {
    const loadContent = async () => {
      const targetPath = resolveInternalPath(href);

      if (!targetPath) {
        setError('プレビューできないリンクです');
        setLoading(false);
        return;
      }

      try {
        const result = await window.electronAPI?.readFile(targetPath);
        if (result?.success) {
          // 最初の500文字程度を抽出
          const preview = (result.content ?? '').slice(0, 1000);
          setContent(preview);
        } else {
          setError('ファイルが見つかりません');
        }
      } catch {
        setError('読み込みエラー');
      }
      setLoading(false);
    };

    loadContent();
  }, [href, rootPath, currentFile]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 外部リンクの場合はシンプルな表示
  if (isExternalLink) {
    return (
      <div
        ref={popupRef}
        className="link-preview-popup external"
        style={{ top: position.y, left: position.x }}
      >
        <div className="preview-header">
          <span className="external-icon">🔗</span>
          <span className="external-label">外部リンク</span>
        </div>
        <div className="external-url">{href}</div>

        <style>{linkPreviewStyles}</style>
      </div>
    );
  }

  const fileName = resolveInternalPath(href)?.split('/').pop() || href;

  return (
    <div
      ref={popupRef}
      className="link-preview-popup"
      style={{ top: position.y, left: position.x }}
    >
      <div className="preview-header">
        <span className="file-icon">📄</span>
        <span className="file-name">{fileName}</span>
      </div>

      {loading && <div className="preview-loading">読み込み中...</div>}

      {error && <div className="preview-error">{error}</div>}

      {content && (
        <div className="preview-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}

      <style>{linkPreviewStyles}</style>
    </div>
  );
}

const linkPreviewStyles = `
  .link-preview-popup {
    position: absolute;
    width: 320px;
    max-height: 300px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 200;
    overflow: hidden;
    animation: popupFadeIn 0.2s ease-out;
  }

  @keyframes popupFadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
  }

  .file-icon, .external-icon {
    font-size: 14px;
  }

  .file-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .external-label {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .external-url {
    padding: 12px 14px;
    font-size: 11px;
    color: var(--accent-color);
    word-break: break-all;
  }

  .preview-loading,
  .preview-error {
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .preview-error {
    color: var(--error-color);
  }

  .preview-content {
    max-height: 220px;
    overflow-y: auto;
    padding: 12px 14px;
    font-size: 12px;
    line-height: 1.6;
  }

  .preview-content h1,
  .preview-content h2,
  .preview-content h3 {
    font-size: 1.1em;
    margin: 8px 0;
    color: var(--text-primary);
  }

  .preview-content p {
    margin: 6px 0;
    color: var(--text-secondary);
  }

  .preview-content code {
    background-color: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .preview-content a {
    color: var(--accent-color);
  }

  .preview-content ul, .preview-content ol {
    margin: 6px 0;
    padding-left: 1.5em;
  }

  .preview-content blockquote {
    margin: 6px 0;
    padding-left: 10px;
    border-left: 3px solid var(--border-color);
    color: var(--text-muted);
  }
`;

export default LinkPreviewPopup;

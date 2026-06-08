import { useState, useEffect, useCallback } from 'react';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import { ToastProvider } from '../contexts/ToastContext';
import { BuildProvider, useBuild } from '../contexts/BuildContext';
import { useAppState } from '../contexts/AppStateContext';
import TemplateGallery from './Editor/TemplateGallery';
import ToastContainer from './common/ToastContainer';

// --- ギャラリー専用ウィンドウ ---
export function GalleryWindowApp() {
  const [projectDir, setProjectDir] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.getGalleryProjectDir().then((dir) => setProjectDir(dir));
  }, []);

  if (!projectDir) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>
        Loading...
      </div>
    );
  }

  return (
    <SettingsProvider>
      <ToastProvider>
        <BuildProvider rootPath={projectDir}>
          <GalleryWindowContent />
        </BuildProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

function GalleryWindowContent() {
  const { effectiveTheme } = useSettings();

  useEffect(() => {
    if (effectiveTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [effectiveTheme]);

  const handleApply = useCallback((templateName: string) => {
    window.electronAPI?.galleryApplyTemplate(templateName);
  }, []);

  const handleClose = useCallback(() => {
    window.close();
  }, []);

  return (
    <div className="gallery-window-root">
      <TemplateGallery
        isWindow
        onApplyTemplate={handleApply}
        onClose={handleClose}
      />
      <ToastContainer />
      <style>{`
        .gallery-window-root {
          height: 100vh;
          padding-top: 28px;
        }
        .gallery-window-root .template-gallery-container {
          height: 100%;
        }
      `}</style>
    </div>
  );
}

// --- ギャラリーモーダル ---
export function GalleryModal() {
  const { isGalleryModalOpen, closeGalleryModal } = useAppState();
  const { projectDir } = useBuild();

  const handlePopOut = useCallback(() => {
    closeGalleryModal();
    if (projectDir) {
      window.electronAPI?.openGalleryWindow(projectDir);
    }
  }, [closeGalleryModal, projectDir]);

  useEffect(() => {
    if (!isGalleryModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGalleryModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryModalOpen, closeGalleryModal]);

  if (!isGalleryModalOpen) return null;

  return (
    <div className="gallery-modal-overlay" onClick={closeGalleryModal}>
      <div className="gallery-modal-body" onClick={(e) => e.stopPropagation()}>
        <TemplateGallery
          isModal
          onPopOut={handlePopOut}
          onClose={closeGalleryModal}
        />
      </div>
      <style>{`
        .gallery-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 900;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
        }
        .gallery-modal-body {
          width: 90%;
          max-width: 1100px;
          height: 85%;
          max-height: 800px;
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-primary);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
        }
        .gallery-modal-body .template-gallery-container {
          height: 100%;
        }
      `}</style>
    </div>
  );
}

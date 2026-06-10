// Shared types and pure helpers for the Template Gallery family of components.

export type SourceFilter = 'all' | 'builtin' | 'custom';
export type GalleryTab = 'templates' | 'guides' | 'samples';
export type PreviewTab = 'pdf' | 'yaml' | 'md';

export interface TemplateGalleryProps {
  onApplyTemplate?: (name: string) => void;
  onPopOut?: () => void;
  onClose?: () => void;
  isModal?: boolean;
  isWindow?: boolean;
}

export type DefaultTemplateMap = Record<string, string[]> | null;

export type DefaultDemoData = Record<
  string,
  { manifestYaml: string; sections: { path: string; name: string; content: string | null }[] }
> | null;

export interface SampleExplorerProps {
  defaultTemplateMap: DefaultTemplateMap;
  defaultDemoData: DefaultDemoData;
  quickBuildDemo: (stem: string, fmt: string) => void;
  installSample: (stem: string) => Promise<{ success: boolean; error?: string }>;
  buildStatus: string;
  projectDir: string | null;
}

export interface SelectedFile {
  type: 'yaml' | 'md';
  stem: string;
  sectionIndex?: number;
}

/**
 * テンプレートに紐づくデモの stem を取得する純粋ヘルパー。
 * catalog の template 定義と defaultTemplateMap から stem を導出する。
 */
export function getDemoStem(
  templateName: string,
  catalog: { templates: Record<string, { preview?: string }> } | null | undefined,
  defaultTemplateMap: Record<string, string[]> | null | undefined,
): string | null {
  const tmpl = catalog?.templates[templateName];
  if (!tmpl) return null;
  // preview フィールドから stem を導出
  const previewFile = tmpl.preview; // e.g. "demo-report.pdf"
  if (previewFile) return previewFile.replace(/\.[^/.]+$/, '');
  // preview がなければ templateMap から取得
  if (defaultTemplateMap?.[templateName]?.length) return defaultTemplateMap[templateName][0];
  return null;
}

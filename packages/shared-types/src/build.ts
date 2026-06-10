// Build System Types（プラットフォーム非依存）
// 報告書ビルドシステムのマニフェスト・テンプレート・結果に関する型。

export interface ManifestInfo {
  name: string;
  path: string;
  fileName: string;
  title: string;
  template: string;
  style?: string;
  output: string[];
  sections: string[];
  sectionCount: number;
}

export interface TemplateInfo {
  name: string;
  path?: string;
  description?: string;
  type?: string;
  styles?: string[];
  features?: string[];
}

export interface TemplateBundleInfo {
  pandoc?: { pdf?: string; docx?: string };
  'python-docx'?: { docx?: string };
}

export interface CatalogData {
  templates: Record<
    string,
    {
      description: string;
      type: string;
      styles?: string[];
      features?: string[];
      preview?: string;
      bundle?: TemplateBundleInfo;
      _source?: 'builtin' | 'custom';
    }
  >;
  common_params?: Record<string, unknown>;
}

export interface DocxDirectConfig {
  'anchor-heading'?: string;
  'chapter-prefix'?: string | null;
  'crossref-mode'?: 'seq' | 'text';
  'first-line-indent'?: number;
  'page-break-before-h2'?: boolean;
}

export interface ManifestData {
  title: string;
  subtitle?: string;
  author?: string | string[];
  date?: string;
  template: string;
  style?: string;
  output: string[];
  sections: string[];
  lang?: string;
  toc?: boolean;
  organization?: string;
  version?: string;
  abstract?: string;
  'docx-engine'?: 'pandoc' | 'python-docx';
  'docx-direct'?: DocxDirectConfig;
  [key: string]: unknown;
}

export interface BuildResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}

export interface DependencyStatus {
  python3: boolean;
  pandoc: boolean;
  xelatex: boolean;
  'python-docx'?: boolean;
  lxml?: boolean;
}

export interface ProjectDetectionResult {
  isProject: boolean;
  projectDir: string | null;
  /** 'standalone' = フォルダ直下のマニフェストを同梱ツールチェーンでビルドする形態 */
  mode?: 'standalone';
}

/** 論文プロジェクト雛形生成の結果 */
export interface ScaffoldResult {
  success: boolean;
  created: string[];
  skipped: string[];
  error?: string;
}

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { PROJECT_ROOT, TEMPLATES_DIR, resolveManifest, hasWorkspace, getWorkspace } from '../config.js';

export interface Manifest {
  title: string;
  template: string;
  output: string[];
  sections?: string[];
  source?: string;
  subtitle?: string;
  author?: string | string[];
  date?: string;
  lang?: string;
  toc?: boolean;
  abstract?: string;
  keywords?: string[];
  bibliography?: string;
  csl?: string;
  [key: string]: unknown;
}

export interface TemplateCatalogEntry {
  description: string;
  type: string;
  features?: string[];
  preview?: string;
  bundle?: Record<string, Record<string, string>>;
}

export type TemplateCatalog = Record<string, TemplateCatalogEntry>;

/**
 * マニフェストパスを解決する。
 * ワークスペース設定済み → そのフォルダからの相対
 * 未設定 → projects/ からの相対
 */
export function resolveManifestPath(manifestPath?: string): string {
  return resolveManifest(manifestPath);
}

/** マニフェストYAMLを読み込む */
export function loadManifest(manifestPath?: string): Manifest {
  const resolved = resolveManifestPath(manifestPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`マニフェストが見つかりません: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  const manifest = yaml.load(content) as Manifest;
  if (!manifest || !manifest.title) {
    throw new Error(`無効なマニフェスト: ${resolved}`);
  }
  return manifest;
}

/** マニフェストから全セクションファイルのパスを解決して返す */
export function resolveSectionPaths(manifest: Manifest, manifestPath?: string): string[] {
  // セクションの相対パスの基準ディレクトリ
  const baseDir = hasWorkspace()
    ? getWorkspace().projectFolder
    : PROJECT_ROOT;

  const paths: string[] = [];
  if (manifest.sections) {
    for (const s of manifest.sections) {
      paths.push(path.isAbsolute(s) ? s : path.join(baseDir, s));
    }
  } else if (manifest.source) {
    const s = manifest.source;
    paths.push(path.isAbsolute(s) ? s : path.join(baseDir, s));
  }
  return paths;
}

/** テンプレートカタログを読み込む */
export function loadCatalog(): TemplateCatalog {
  const catalogPath = path.join(TEMPLATES_DIR, 'catalog.yaml');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`テンプレートカタログが見つかりません: ${catalogPath}`);
  }
  const content = fs.readFileSync(catalogPath, 'utf-8');
  const raw = yaml.load(content) as Record<string, unknown>;

  const catalog: TemplateCatalog = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === 'object' && 'description' in (value as object)) {
      catalog[key] = value as TemplateCatalogEntry;
    }
  }
  return catalog;
}

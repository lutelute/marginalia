import fs from 'fs';
import path from 'path';
import { loadCatalog } from '../utils/manifest.js';
import { TEMPLATES_DIR } from '../config.js';

export function getTemplateDetail(templateName: string) {
  const catalog = loadCatalog();
  const entry = catalog[templateName];

  if (!entry) {
    const available = Object.keys(catalog).join(', ');
    throw new Error(`テンプレート "${templateName}" が見つかりません。利用可能: ${available}`);
  }

  // LaTeXテンプレートの構造情報を取得
  let latexInfo: Record<string, string> | null = null;
  const latexPath = path.join(TEMPLATES_DIR, 'latex', `${templateName}.latex`);
  if (fs.existsSync(latexPath)) {
    const content = fs.readFileSync(latexPath, 'utf-8');

    const extractMatch = (re: RegExp) => {
      const m = content.match(re);
      return m ? m[1] : undefined;
    };

    latexInfo = {};
    const docclass = extractMatch(/\\documentclass(?:\[.*?\])?\{(.+?)\}/);
    if (docclass) latexInfo.documentclass = docclass;

    const geometry = extractMatch(/\\geometry\{(.+?)\}/s);
    if (geometry) latexInfo.geometry = geometry;

    // 使用パッケージ一覧
    const packages: string[] = [];
    const pkgRe = /\\usepackage(?:\[.*?\])?\{(.+?)\}/g;
    let m: RegExpExecArray | null;
    while ((m = pkgRe.exec(content)) !== null) {
      packages.push(m[1]);
    }
    if (packages.length) latexInfo.packages = packages.join(', ');
  }

  return {
    name: templateName,
    description: entry.description,
    type: entry.type,
    features: entry.features || [],
    bundle: entry.bundle || {},
    latexInfo,
    latexTemplatePath: fs.existsSync(latexPath) ? latexPath : null,
  };
}

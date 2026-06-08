import fs from 'fs';
import path from 'path';
import { loadManifest, loadCatalog, resolveSectionPaths, resolveManifestPath } from '../utils/manifest.js';
import { PROJECT_ROOT } from '../config.js';

export function getManifestInfo(manifestPath?: string) {
  const manifest = loadManifest(manifestPath);
  const catalog = loadCatalog();
  const resolved = resolveManifestPath(manifestPath);

  // テンプレート情報
  const templateInfo = catalog[manifest.template] || null;

  // セクションファイルの存在チェック
  const sectionPaths = resolveSectionPaths(manifest);
  const sectionStatus = sectionPaths.map(p => ({
    path: p,
    exists: fs.existsSync(p),
    size: fs.existsSync(p) ? fs.statSync(p).size : 0,
  }));

  // 参考文献ファイルのチェック
  let bibStatus = null;
  if (manifest.bibliography) {
    const bibPath = path.isAbsolute(manifest.bibliography)
      ? manifest.bibliography
      : path.join(PROJECT_ROOT, manifest.bibliography);
    bibStatus = { path: bibPath, exists: fs.existsSync(bibPath) };
  }

  return {
    manifestPath: resolved,
    manifest,
    templateInfo,
    sections: sectionStatus,
    bibliography: bibStatus,
    allSectionsExist: sectionStatus.every(s => s.exists),
  };
}

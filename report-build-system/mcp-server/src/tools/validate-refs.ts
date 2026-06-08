import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';
import { scanCrossRefs } from '../utils/crossref-scanner.js';

export function validateRefs(manifestPath?: string) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  return scanCrossRefs(sectionPaths);
}

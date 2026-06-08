import fs from 'fs';
import path from 'path';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';
import { parseBibKeys } from '../utils/bib-parser.js';
import { PROJECT_ROOT } from '../config.js';

interface CitationReport {
  bibFile: string;
  bibEntries: Array<{ key: string; type: string }>;
  citedKeys: Array<{ key: string; file: string; line: number }>;
  uncitedEntries: string[];
  undefinedCitations: Array<{ key: string; file: string; line: number }>;
}

export function checkCitations(manifestPath?: string): CitationReport {
  const manifest = loadManifest(manifestPath);

  if (!manifest.bibliography) {
    throw new Error('マニフェストに bibliography が指定されていません');
  }

  const bibPath = path.isAbsolute(manifest.bibliography)
    ? manifest.bibliography
    : path.join(PROJECT_ROOT, manifest.bibliography);

  const bibEntries = parseBibKeys(bibPath);
  const bibKeySet = new Set(bibEntries.map(e => e.key));

  const sectionPaths = resolveSectionPaths(manifest);
  const citedKeys: CitationReport['citedKeys'] = [];

  // Pandoc citation syntax: [@key] or [@key1; @key2] or @key
  const citationRe = /@([a-zA-Z][a-zA-Z0-9_:./-]*)/g;

  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // ディレクティブ内の @ref は除外
      if (lines[i].match(/<!--.*-->/)) {
        // @fig:, @tbl:, @eq: は相互参照なので除外
        const line = lines[i].replace(/@(fig|tbl|eq):[a-zA-Z0-9_-]+/g, '');
        let m: RegExpExecArray | null;
        while ((m = citationRe.exec(line)) !== null) {
          citedKeys.push({ key: m[1], file: filePath, line: i + 1 });
        }
        citationRe.lastIndex = 0;
        continue;
      }

      // 通常行
      const line = lines[i].replace(/@(fig|tbl|eq):[a-zA-Z0-9_-]+/g, '');
      let m: RegExpExecArray | null;
      while ((m = citationRe.exec(line)) !== null) {
        citedKeys.push({ key: m[1], file: filePath, line: i + 1 });
      }
      citationRe.lastIndex = 0;
    }
  }

  const citedKeySet = new Set(citedKeys.map(c => c.key));
  const uncitedEntries = bibEntries
    .filter(e => !citedKeySet.has(e.key))
    .map(e => e.key);
  const undefinedCitations = citedKeys.filter(c => !bibKeySet.has(c.key));

  return {
    bibFile: bibPath,
    bibEntries: bibEntries.map(e => ({ key: e.key, type: e.type })),
    citedKeys,
    uncitedEntries,
    undefinedCitations,
  };
}

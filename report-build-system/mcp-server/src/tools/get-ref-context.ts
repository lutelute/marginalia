import fs from 'fs';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';

interface RefContext {
  label: string;
  file: string;
  line: number;
  before: string[];
  matchLine: string;
  after: string[];
}

export function getRefContext(
  manifestPath?: string,
  label?: string,
  contextLines: number = 3,
) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  const results: RefContext[] = [];

  const refRe = label
    ? new RegExp(`(?:<!--\\s*ref\\s*:\\s*${escapeRegex(label)}\\s*-->|@${escapeRegex(label)})`, 'g')
    : /(?:<!--\s*ref\s*:\s*(.+?)\s*-->|@(fig|tbl|eq):[a-zA-Z0-9_-]+)/g;

  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!refRe.test(lines[i])) continue;
      refRe.lastIndex = 0; // reset

      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length - 1, i + contextLines);

      // ラベルを抽出
      const labelMatch = lines[i].match(/(?:<!--\s*ref\s*:\s*(.+?)\s*-->|@((?:fig|tbl|eq):[a-zA-Z0-9_-]+))/);
      const foundLabel = labelMatch ? (labelMatch[1] || labelMatch[2] || '') : '';

      results.push({
        label: label || foundLabel,
        file: filePath,
        line: i + 1,
        before: lines.slice(start, i),
        matchLine: lines[i],
        after: lines.slice(i + 1, end + 1),
      });
    }
  }

  return results;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import fs from 'fs';
import path from 'path';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';
import { extractSentences } from '../utils/markdown-parser.js';

export function listSentences(
  manifestPath?: string,
  sectionFilter?: string,
  format: 'markdown_table' | 'tsv' = 'markdown_table',
) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  const allSentences: Array<{
    section: string;
    paragraph: number;
    sentence: string;
    line: number;
  }> = [];

  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    const sectionName = path.basename(filePath, '.md');
    if (sectionFilter && !sectionName.includes(sectionFilter)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const sentences = extractSentences(content, sectionName);
    for (const s of sentences) {
      allSentences.push({
        section: s.section,
        paragraph: s.paragraph,
        sentence: s.text,
        line: s.line,
      });
    }
  }

  if (format === 'tsv') {
    const header = 'セクション\t段落\t行\t文章\tステータス';
    const rows = allSentences.map(s =>
      `${s.section}\t${s.paragraph}\t${s.line}\t${s.sentence}\t`
    );
    return header + '\n' + rows.join('\n');
  }

  // Markdown table
  const lines: string[] = [];
  lines.push('| セクション | 段落 | 行 | 文章 | ステータス |');
  lines.push('|---|---|---|---|---|');
  for (const s of allSentences) {
    const escaped = s.sentence.replace(/\|/g, '\\|');
    lines.push(`| ${s.section} | ${s.paragraph} | ${s.line} | ${escaped} | |`);
  }
  return lines.join('\n');
}

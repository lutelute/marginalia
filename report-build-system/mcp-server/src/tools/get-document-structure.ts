import fs from 'fs';
import path from 'path';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';
import { extractHeadings, countWords } from '../utils/markdown-parser.js';
import { parseDirectives } from '../utils/directive-parser.js';

interface SectionInfo {
  file: string;
  name: string;
  headings: Array<{ level: number; text: string; line: number }>;
  words: { japanese: number; english: number; total: number };
  directives: { figures: number; tables: number; equations: number; refs: number };
}

export function getDocumentStructure(manifestPath?: string) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  const sections: SectionInfo[] = [];

  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) {
      sections.push({
        file: filePath,
        name: path.basename(filePath, '.md'),
        headings: [],
        words: { japanese: 0, english: 0, total: 0 },
        directives: { figures: 0, tables: 0, equations: 0, refs: 0 },
      });
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const headings = extractHeadings(content);
    const words = countWords(content);
    const directives = parseDirectives(content);

    sections.push({
      file: filePath,
      name: path.basename(filePath, '.md'),
      headings,
      words,
      directives: {
        figures: directives.filter(d => d.type === 'figure').length,
        tables: directives.filter(d => d.type === 'table').length,
        equations: directives.filter(d => d.type === 'equation').length,
        refs: directives.filter(d => d.type === 'ref').length,
      },
    });
  }

  const totalWords = sections.reduce((acc, s) => ({
    japanese: acc.japanese + s.words.japanese,
    english: acc.english + s.words.english,
    total: acc.total + s.words.total,
  }), { japanese: 0, english: 0, total: 0 });

  return {
    title: manifest.title,
    template: manifest.template,
    sections,
    totalSections: sections.length,
    totalWords,
  };
}

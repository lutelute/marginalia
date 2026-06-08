import fs from 'fs';
import { parseDirectives, getLabel } from './directive-parser.js';

export interface LabelInfo {
  label: string;
  prefix: string;
  type: string;
  file: string;
  line: number;
}

export interface RefInfo {
  label: string;
  file: string;
  line: number;
  context: string;
}

export interface CrossRefReport {
  definitions: LabelInfo[];
  references: RefInfo[];
  unresolved: RefInfo[];
  unreferenced: LabelInfo[];
}

const REF_PATTERNS = [
  /<!--\s*ref\s*:\s*(.+?)\s*-->/g,
  /@(fig|tbl|eq):([a-zA-Z0-9_-]+)/g,
];

/** ファイル群から全ラベル定義と参照を収集し、整合性レポートを返す */
export function scanCrossRefs(filePaths: string[]): CrossRefReport {
  const definitions: LabelInfo[] = [];
  const references: RefInfo[] = [];

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // ディレクティブからラベル定義を収集
    const directives = parseDirectives(content);
    for (const d of directives) {
      const label = getLabel(d);
      if (!label) continue;
      if (d.type === 'figure') {
        definitions.push({ label: `fig:${label}`, prefix: 'fig', type: 'figure', file: filePath, line: d.line });
      } else if (d.type === 'table') {
        definitions.push({ label: `tbl:${label}`, prefix: 'tbl', type: 'table', file: filePath, line: d.line });
      } else if (d.type === 'equation') {
        definitions.push({ label: `eq:${label}`, prefix: 'eq', type: 'equation', file: filePath, line: d.line });
      }
    }

    // 参照を収集: <!-- ref: label --> パターン
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // <!-- ref: xxx -->
      const refDirectiveRe = /<!--\s*ref\s*:\s*(.+?)\s*-->/g;
      let m: RegExpExecArray | null;
      while ((m = refDirectiveRe.exec(line)) !== null) {
        references.push({
          label: m[1].trim(),
          file: filePath,
          line: i + 1,
          context: line.trim(),
        });
      }

      // @fig:xxx, @tbl:xxx, @eq:xxx
      const atRefRe = /@(fig|tbl|eq):([a-zA-Z0-9_-]+)/g;
      while ((m = atRefRe.exec(line)) !== null) {
        references.push({
          label: `${m[1]}:${m[2]}`,
          file: filePath,
          line: i + 1,
          context: line.trim(),
        });
      }
    }
  }

  const definedLabels = new Set(definitions.map(d => d.label));
  const referencedLabels = new Set(references.map(r => r.label));

  const unresolved = references.filter(r => !definedLabels.has(r.label));
  const unreferenced = definitions.filter(d => !referencedLabels.has(d.label));

  return { definitions, references, unresolved, unreferenced };
}

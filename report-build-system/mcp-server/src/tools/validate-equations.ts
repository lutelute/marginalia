import fs from 'fs';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';
import { parseDirectives, getLabel, getLatex } from '../utils/directive-parser.js';

interface EquationInfo {
  label: string;
  latex: string;
  file: string;
  line: number;
  referenced: boolean;
  issues: string[];
}

export function validateEquations(manifestPath?: string) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  const equations: EquationInfo[] = [];
  const allRefs = new Set<string>();

  // 全ファイルから参照を収集
  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const refRe = /(?:<!--\s*ref\s*:\s*(eq:[a-zA-Z0-9_-]+)\s*-->|@eq:([a-zA-Z0-9_-]+))/g;
    let m: RegExpExecArray | null;
    while ((m = refRe.exec(content)) !== null) {
      allRefs.add(m[1] || `eq:${m[2]}`);
    }
  }

  // 数式ディレクティブを検証
  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const directives = parseDirectives(content);

    for (const d of directives) {
      if (d.type !== 'equation') continue;
      const label = getLabel(d);
      const latex = getLatex(d);
      const issues: string[] = [];

      if (!label) issues.push('ラベルが未指定');
      if (!latex) issues.push('LaTeX式が未指定');

      // 基本的な構文チェック
      if (latex) {
        const opens = (latex.match(/\{/g) || []).length;
        const closes = (latex.match(/\}/g) || []).length;
        if (opens !== closes) issues.push(`波括弧の不一致: { ${opens}個, } ${closes}個`);
      }

      equations.push({
        label: label || '(unknown)',
        latex: latex || '',
        file: filePath,
        line: d.line,
        referenced: label ? allRefs.has(`eq:${label}`) : false,
        issues,
      });
    }
  }

  return {
    equations,
    totalEquations: equations.length,
    withIssues: equations.filter(e => e.issues.length > 0).length,
    unreferenced: equations.filter(e => !e.referenced).length,
  };
}

/**
 * ディレクティブパーサー — Python directives/parser.py のTypeScript移植
 *
 * サポートするディレクティブ:
 *   figure     <!-- figure: label | path | caption | width -->
 *   equation   <!-- equation: label | latex -->
 *   table      <!-- table: label | caption --> ... <!-- /table -->
 *   algorithm  <!-- algorithm: label | caption --> ... <!-- /algorithm -->
 *   ref        <!-- ref: label -->
 *   pagebreak  <!-- pagebreak -->
 */

export type DirectiveType =
  | 'figure' | 'equation' | 'table' | 'algorithm'
  | 'ref' | 'pagebreak' | 'style' | 'raw-docx';

export interface Directive {
  type: DirectiveType;
  args: string[];
  body?: string;
  line: number;
}

// ヘルパーアクセサ
export function getLabel(d: Directive): string | undefined {
  return d.args[0]?.trim();
}

export function getCaption(d: Directive): string | undefined {
  if (d.type === 'figure') return d.args[2]?.trim();
  if (d.type === 'table' || d.type === 'algorithm') return d.args[1]?.trim();
  return undefined;
}

export function getLatex(d: Directive): string | undefined {
  if (d.type === 'equation') return d.args[1]?.trim();
  return undefined;
}

const DIRECTIVE_RE = /<!--\s*(\/?\w[\w-]*)(?:\s*:\s*(.+?))?\s*-->/s;

const DIRECTIVE_NAMES = new Set<string>([
  'figure', 'equation', 'table', '/table',
  'algorithm', '/algorithm',
  'ref', 'pagebreak',
  'raw-docx', '/raw-docx', 'style',
]);

const BLOCK_END_MAP: Record<string, string> = {
  'table': '/table',
  'algorithm': '/algorithm',
  'raw-docx': '/raw-docx',
};

/** Markdownテキストから全ディレクティブをパースする */
export function parseDirectives(text: string): Directive[] {
  const results: Directive[] = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const match = DIRECTIVE_RE.exec(lines[i]);
    if (!match) { i++; continue; }

    const name = match[1].trim().toLowerCase();
    const rawArgs = match[2] || '';

    if (!DIRECTIVE_NAMES.has(name)) { i++; continue; }

    const args = rawArgs ? rawArgs.split('|').map(a => a.trim()) : [];
    const endTag = BLOCK_END_MAP[name];

    if (endTag) {
      const bodyLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const endMatch = DIRECTIVE_RE.exec(lines[j]);
        if (endMatch && endMatch[1].trim().toLowerCase() === endTag) break;
        bodyLines.push(lines[j]);
        j++;
      }
      results.push({
        type: name as DirectiveType,
        args,
        body: bodyLines.join('\n'),
        line: i + 1,
      });
      i = j + 1;
      continue;
    }

    results.push({ type: name as DirectiveType, args, line: i + 1 });
    i++;
  }

  return results;
}

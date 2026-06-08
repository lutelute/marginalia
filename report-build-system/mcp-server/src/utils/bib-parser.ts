import fs from 'fs';

export interface BibEntry {
  key: string;
  type: string;
  line: number;
}

/**
 * BibTeXファイルからエントリキーを抽出する（簡易パーサー）
 * フルパーサーではなく @type{key, パターンのみ抽出
 */
export function parseBibKeys(bibPath: string): BibEntry[] {
  if (!fs.existsSync(bibPath)) {
    throw new Error(`BibTeXファイルが見つかりません: ${bibPath}`);
  }

  const content = fs.readFileSync(bibPath, 'utf-8');
  const entries: BibEntry[] = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)/g;
  const lines = content.split('\n');

  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const type = m[1].toLowerCase();
    if (type === 'comment' || type === 'string' || type === 'preamble') continue;

    // 行番号を算出
    const pos = m.index;
    const lineNum = content.substring(0, pos).split('\n').length;

    entries.push({ key: m[2], type, line: lineNum });
  }

  return entries;
}

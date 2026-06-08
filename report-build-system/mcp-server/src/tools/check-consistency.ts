import fs from 'fs';
import { loadManifest, resolveSectionPaths } from '../utils/manifest.js';

interface ConsistencyRule {
  variants: string[];
  preferred: string;
}

interface Inconsistency {
  rule: string;
  preferred: string;
  occurrences: Array<{ variant: string; count: number; files: string[] }>;
}

// 組み込みルール
const BUILTIN_RULES: ConsistencyRule[] = [
  { variants: ['Figure', 'Fig.', 'figure', 'fig.'], preferred: 'Fig.' },
  { variants: ['Table', 'Tbl.', 'table', 'tbl.'], preferred: 'Table' },
  { variants: ['Equation', 'Eq.', 'equation', 'eq.'], preferred: 'Eq.' },
  { variants: ['Section', 'Sec.', 'section', 'sec.'], preferred: 'Section' },
  { variants: ['および', '及び'], preferred: 'および' },
  { variants: ['おこなう', '行う'], preferred: '行う' },
  { variants: ['できる', '出来る'], preferred: 'できる' },
  { variants: ['ため', '為'], preferred: 'ため' },
  { variants: ['すべて', '全て'], preferred: 'すべて' },
  { variants: ['わかる', '分かる', '判る'], preferred: 'わかる' },
];

export function checkConsistency(
  manifestPath?: string,
  customRules?: ConsistencyRule[],
) {
  const manifest = loadManifest(manifestPath);
  const sectionPaths = resolveSectionPaths(manifest);
  const rules = [...BUILTIN_RULES, ...(customRules || [])];
  const inconsistencies: Inconsistency[] = [];

  // 全ファイルの内容を読み込み
  const fileContents: Array<{ path: string; content: string }> = [];
  for (const filePath of sectionPaths) {
    if (!fs.existsSync(filePath)) continue;
    fileContents.push({ path: filePath, content: fs.readFileSync(filePath, 'utf-8') });
  }

  for (const rule of rules) {
    const occurrences: Map<string, { count: number; files: Set<string> }> = new Map();

    for (const variant of rule.variants) {
      for (const { path: filePath, content } of fileContents) {
        // 単語境界を考慮した検索（日本語は境界なし）
        const isAscii = /^[a-zA-Z.]/.test(variant);
        const re = isAscii
          ? new RegExp(`\\b${escapeRegex(variant)}\\b`, 'g')
          : new RegExp(escapeRegex(variant), 'g');

        const matches = content.match(re);
        if (matches && matches.length > 0) {
          if (!occurrences.has(variant)) {
            occurrences.set(variant, { count: 0, files: new Set() });
          }
          const entry = occurrences.get(variant)!;
          entry.count += matches.length;
          entry.files.add(filePath);
        }
      }
    }

    // 2つ以上のバリアントが使われている場合のみ報告
    if (occurrences.size > 1) {
      inconsistencies.push({
        rule: rule.variants.join(' / '),
        preferred: rule.preferred,
        occurrences: Array.from(occurrences.entries()).map(([variant, info]) => ({
          variant,
          count: info.count,
          files: Array.from(info.files),
        })),
      });
    }
  }

  return {
    inconsistencies,
    totalRulesChecked: rules.length,
    issuesFound: inconsistencies.length,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

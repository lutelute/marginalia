import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { hasWorkspace, getMgPath } from '../config.js';
import { resolveManifestPath } from '../utils/manifest.js';

type NomenCategory = 'abbreviation' | 'symbol' | 'term';

interface NomenEntry {
  term: string;
  definition: string;
  category: NomenCategory;
}

interface NomenStore {
  entries: NomenEntry[];
}

function getNomenPath(manifestPath?: string): string {
  // ワークスペースがあれば mg_output/ 内に保存
  if (hasWorkspace()) {
    return path.join(getMgPath(''), 'nomenclature.yaml');
  }
  // フォールバック: マニフェストと同じディレクトリの .marginalia/ 内
  const resolved = resolveManifestPath(manifestPath);
  const dir = path.dirname(resolved);
  const stem = path.basename(resolved, path.extname(resolved));
  const nomenDir = path.join(dir, '.marginalia');
  if (!fs.existsSync(nomenDir)) fs.mkdirSync(nomenDir, { recursive: true });
  return path.join(nomenDir, `${stem}-nomenclature.yaml`);
}

function loadStore(nomenPath: string): NomenStore {
  if (!fs.existsSync(nomenPath)) return { entries: [] };
  const content = fs.readFileSync(nomenPath, 'utf-8');
  return (yaml.load(content) as NomenStore) || { entries: [] };
}

function saveStore(nomenPath: string, store: NomenStore): void {
  fs.writeFileSync(nomenPath, yaml.dump(store), 'utf-8');
}

export function manageNomenclature(
  action: 'add' | 'list' | 'generate' | 'remove',
  manifestPath?: string,
  term?: string,
  definition?: string,
  category: NomenCategory = 'term',
) {
  const nomenPath = getNomenPath(manifestPath);
  const store = loadStore(nomenPath);

  switch (action) {
    case 'add': {
      if (!term || !definition) throw new Error('term と definition は必須です');
      const existing = store.entries.findIndex(e => e.term === term);
      if (existing >= 0) {
        store.entries[existing] = { term, definition, category };
      } else {
        store.entries.push({ term, definition, category });
      }
      saveStore(nomenPath, store);
      return { action: 'added', term, definition, category, total: store.entries.length };
    }

    case 'remove': {
      if (!term) throw new Error('term は必須です');
      const idx = store.entries.findIndex(e => e.term === term);
      if (idx < 0) throw new Error(`用語が見つかりません: ${term}`);
      store.entries.splice(idx, 1);
      saveStore(nomenPath, store);
      return { action: 'removed', term, total: store.entries.length };
    }

    case 'list': {
      return {
        entries: store.entries,
        total: store.entries.length,
        byCategory: {
          abbreviation: store.entries.filter(e => e.category === 'abbreviation').length,
          symbol: store.entries.filter(e => e.category === 'symbol').length,
          term: store.entries.filter(e => e.category === 'term').length,
        },
      };
    }

    case 'generate': {
      const sorted = [...store.entries].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.term.localeCompare(b.term);
      });

      const categoryLabel: Record<NomenCategory, string> = {
        abbreviation: '略語',
        symbol: '記号',
        term: '用語',
      };

      const lines: string[] = ['## Nomenclature', ''];
      let currentCat: NomenCategory | '' = '';
      for (const entry of sorted) {
        if (entry.category !== currentCat) {
          currentCat = entry.category;
          lines.push(`### ${categoryLabel[currentCat]}`);
          lines.push('');
          lines.push('| 記号/略語 | 説明 |');
          lines.push('|---|---|');
        }
        lines.push(`| ${entry.term} | ${entry.definition} |`);
      }

      return { markdown: lines.join('\n'), total: sorted.length };
    }
  }
}

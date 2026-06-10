#!/usr/bin/env node
/**
 * Marginalia: .mrgl（注釈ファイル）の git 3-way マージドライバ
 *
 * Usage (git merge driver):
 *   node scripts/merge-mrgl.js <base> <ours> <theirs>
 *   マージ結果は <ours> に上書きされる（git の %A 規約）
 *
 * Setup:
 *   .gitattributes:
 *     *.mrgl merge=mrgl
 *   各クローンで一度:
 *     git config merge.mrgl.driver "node scripts/merge-mrgl.js %O %A %B"
 *     git config merge.mrgl.name "Marginalia annotation merge"
 *
 * マージ方針（校閲データを失わない方向に倒す）:
 * - annotations は id で突き合わせて union
 *   - 片側にしか無い: base にも無ければ「新規」として採用。
 *     base に有る場合は「相手側が削除」だが、自側が base から変更していれば残す
 *     （変更 vs 削除の競合は保持を優先）
 *   - 両側に有って内容が異なる: 実効タイムスタンプ（updatedAt/resolvedAt/
 *     createdAt/最終返信の新しい方）が新しい方を土台に、replies は id union
 * - history は id で union し、新しい順
 * - 解決不能な構造（JSON 破損等）は exit 1 で通常コンフリクトに委ねる
 */

const fs = require('fs');

/** 注釈の「実効タイムスタンプ」: 内容の新しさ比較に使う */
function effectiveTimestamp(annotation) {
  const candidates = [
    annotation.updatedAt,
    annotation.resolvedAt,
    annotation.createdAt,
    ...(annotation.replies || []).map((r) => r.createdAt),
  ].filter(Boolean);
  return candidates.sort().pop() || '';
}

/** replies を id で union し createdAt 順に並べる */
function mergeReplies(a = [], b = []) {
  const byId = new Map();
  for (const reply of [...a, ...b]) {
    if (!byId.has(reply.id)) byId.set(reply.id, reply);
  }
  return [...byId.values()].sort((x, y) =>
    String(x.createdAt || '').localeCompare(String(y.createdAt || ''))
  );
}

/** 2つの注釈（同 id）をマージ: 新しい方を土台に replies を union */
function mergeAnnotationPair(ours, theirs) {
  if (JSON.stringify(ours) === JSON.stringify(theirs)) return ours;
  const newer = effectiveTimestamp(theirs) > effectiveTimestamp(ours) ? theirs : ours;
  return { ...newer, replies: mergeReplies(ours.replies, theirs.replies) };
}

/** base からの変更有無（簡易: JSON 文字列比較） */
function changedFromBase(annotation, baseAnnotation) {
  if (!baseAnnotation) return true; // base に無い = 新規 = 変更扱い
  return JSON.stringify(annotation) !== JSON.stringify(baseAnnotation);
}

/**
 * .mrgl の 3-way マージ本体。
 * @param {object|null} base - 共通祖先（無い場合 null）
 * @param {object} ours
 * @param {object} theirs
 * @returns {object} マージ結果（ours のメタを土台にする）
 */
function mergeMarginaliaFiles(base, ours, theirs) {
  const baseById = new Map((base?.annotations || []).map((a) => [a.id, a]));
  const oursById = new Map((ours.annotations || []).map((a) => [a.id, a]));
  const theirsById = new Map((theirs.annotations || []).map((a) => [a.id, a]));

  const ids = new Set([...oursById.keys(), ...theirsById.keys()]);
  const mergedAnnotations = [];

  for (const id of ids) {
    const o = oursById.get(id);
    const t = theirsById.get(id);
    const b = baseById.get(id);

    if (o && t) {
      mergedAnnotations.push(mergeAnnotationPair(o, t));
    } else {
      const present = o || t;
      if (!b) {
        // どちらかが新規追加した注釈
        mergedAnnotations.push(present);
      } else if (changedFromBase(present, b)) {
        // 相手側は削除したが、自側が変更している → 変更 vs 削除は保持を優先
        mergedAnnotations.push(present);
      }
      // base から無変更のまま相手側が削除 → 削除に従う（push しない）
    }
  }

  // 表示安定のため作成日時順に整列
  mergedAnnotations.sort((a, c) =>
    String(a.createdAt || '').localeCompare(String(c.createdAt || ''))
  );

  // history: id union → 新しい順
  const historyById = new Map();
  for (const entry of [...(ours.history || []), ...(theirs.history || [])]) {
    if (!historyById.has(entry.id)) historyById.set(entry.id, entry);
  }
  const mergedHistory = [...historyById.values()].sort((a, c) =>
    String(c.timestamp || '').localeCompare(String(a.timestamp || ''))
  );

  const lastModified =
    [ours.lastModified, theirs.lastModified].filter(Boolean).sort().pop() ||
    new Date().toISOString();

  return {
    ...ours,
    _tool: 'marginalia',
    _version: '2.1.0',
    lastModified,
    annotations: mergedAnnotations,
    history: mergedHistory,
  };
}

function readJson(path) {
  const text = fs.readFileSync(path, 'utf-8');
  // git の空祖先（新規ファイル同士の衝突）は空ファイルになる
  if (!text.trim()) return null;
  return JSON.parse(text);
}

function main() {
  const [basePath, oursPath, theirsPath] = process.argv.slice(2);
  if (!basePath || !oursPath || !theirsPath) {
    console.error('Usage: merge-mrgl.js <base> <ours> <theirs>');
    process.exit(2);
  }

  try {
    const base = readJson(basePath);
    const ours = readJson(oursPath);
    const theirs = readJson(theirsPath);

    if (!ours || !theirs) {
      // 片側が空 = 内容のある側を採用
      const result = ours || theirs;
      if (!result) process.exit(1);
      fs.writeFileSync(oursPath, JSON.stringify(result, null, 2) + '\n');
      process.exit(0);
    }

    const merged = mergeMarginaliaFiles(base, ours, theirs);
    fs.writeFileSync(oursPath, JSON.stringify(merged, null, 2) + '\n');
    process.exit(0);
  } catch (error) {
    // 解析不能なら通常のコンフリクトに委ねる
    console.error(`merge-mrgl: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mergeMarginaliaFiles, mergeReplies, effectiveTimestamp };

import { AnnotationV2, AnnotationReply } from './annotations';
import { ANNOTATION_TYPE_MAP } from './annotationTypes';
import {
  anchorAnnotation,
  computeEditorPositionFromOffset,
  getAnnotationExactText,
} from './selectorUtils';

export interface ReviewReportOptions {
  /** レポート見出しに使うファイル名（例: paper.md） */
  fileName: string;
  /** 行番号解決に使う本文。省略時は行番号なしで出力 */
  docText?: string;
  /** 生成時刻（ISO 8601）。省略時は現在時刻 */
  generatedAt?: string;
}

interface ReportEntry {
  annotation: AnnotationV2;
  line: number | null;
}

const STATUS_GROUPS: { title: string; statuses: AnnotationV2['status'][] }[] = [
  { title: '未解決', statuses: ['active', 'kept'] },
  { title: '解決済み', statuses: ['resolved', 'archived'] },
  { title: '孤立（本文から対象が見つからない）', statuses: ['orphaned'] },
];

function typeLabel(annotation: AnnotationV2): string {
  return ANNOTATION_TYPE_MAP[annotation.type]?.label || annotation.type;
}

function formatDate(iso: string): string {
  // ISO 8601 → YYYY-MM-DD HH:mm（ローカルではなく素朴な切り出し。共有文書での安定性優先）
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : iso;
}

function formatReply(reply: AnnotationReply): string {
  return `- **${reply.author}** (${formatDate(reply.createdAt)}): ${reply.content}`;
}

function formatEntry(entry: ReportEntry, index: number): string {
  const { annotation, line } = entry;
  const lines: string[] = [];
  const location = line !== null ? ` — L${line}` : '';
  lines.push(`### ${index}. [${typeLabel(annotation)}] ${annotation.author}${location}`);
  lines.push('');

  const exact = getAnnotationExactText(annotation);
  if (exact) {
    // 引用は1行に正規化（複数行選択でもレポートが崩れないように）
    const quoted = exact.replace(/\s*\n\s*/g, ' ').trim();
    lines.push(`> ${quoted}`);
    lines.push('');
  }

  lines.push(annotation.content);
  lines.push('');
  lines.push(`作成: ${formatDate(annotation.createdAt)}${annotation.resolvedAt ? ` / 解決: ${formatDate(annotation.resolvedAt)}` : ''}`);

  if (annotation.replies.length > 0) {
    lines.push('');
    lines.push('**返信:**');
    lines.push('');
    for (const reply of annotation.replies) {
      lines.push(formatReply(reply));
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * 注釈一覧から共同執筆者への申し送り用の校閲レポート（Markdown）を生成する。
 * ステータス別（未解決 → 解決済み → 孤立）にグループ化し、各注釈の
 * 対象テキスト・行番号・返信スレッドを含める。
 */
export function generateReviewReport(
  annotations: AnnotationV2[],
  options: ReviewReportOptions
): string {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const docText = options.docText;

  // 行番号を解決（docText があるときのみ）
  const entries: ReportEntry[] = annotations.map((annotation) => {
    let line: number | null = null;
    if (docText) {
      const anchored = anchorAnnotation(docText, annotation);
      if (anchored) {
        line = computeEditorPositionFromOffset(docText, anchored.start, anchored.end).startLine;
      }
    }
    return { annotation, line };
  });

  const unresolvedCount = entries.filter((e) =>
    e.annotation.status === 'active' || e.annotation.status === 'kept'
  ).length;
  const resolvedCount = entries.filter((e) =>
    e.annotation.status === 'resolved' || e.annotation.status === 'archived'
  ).length;
  const orphanedCount = entries.filter((e) => e.annotation.status === 'orphaned').length;

  const out: string[] = [];
  out.push(`# 校閲レポート: ${options.fileName}`);
  out.push('');
  out.push(
    `生成: ${formatDate(generatedAt)} / 注釈 ${annotations.length}件` +
      `（未解決 ${unresolvedCount} ・ 解決済み ${resolvedCount} ・ 孤立 ${orphanedCount}）`
  );
  out.push('');

  for (const group of STATUS_GROUPS) {
    const groupEntries = entries
      .filter((e) => group.statuses.includes(e.annotation.status))
      // 行番号順（行なしは末尾）、同行は作成日時順
      .sort((a, b) => {
        if (a.line !== null && b.line !== null && a.line !== b.line) return a.line - b.line;
        if (a.line === null && b.line !== null) return 1;
        if (a.line !== null && b.line === null) return -1;
        return a.annotation.createdAt.localeCompare(b.annotation.createdAt);
      });

    if (groupEntries.length === 0) continue;

    out.push(`## ${group.title}（${groupEntries.length}件）`);
    out.push('');
    groupEntries.forEach((entry, i) => {
      out.push(formatEntry(entry, i + 1));
    });
  }

  if (annotations.length === 0) {
    out.push('注釈はありません。');
    out.push('');
  }

  return out.join('\n');
}

import fs from 'fs';

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface Sentence {
  text: string;
  section: string;
  paragraph: number;
  line: number;
}

/** Markdownからヘッダー一覧を抽出 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m) {
      headings.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

/**
 * Markdownから文章を分割して抽出する。
 * 日本語: 「。」で分割
 * 英語: ". " で分割（Fig. / et al. / e.g. / i.e. 等は例外）
 */
export function extractSentences(content: string, sectionName: string): Sentence[] {
  const sentences: Sentence[] = [];
  const lines = content.split('\n');

  // ディレクティブ・コードブロック・見出し・空行を除外
  let inCodeBlock = false;
  let paragraph = 0;
  let currentParagraph: string[] = [];
  let paragraphStartLine = 0;

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;
    const text = currentParagraph.join(' ');
    const split = splitSentences(text);
    for (const s of split) {
      if (s.trim()) {
        sentences.push({
          text: s.trim(),
          section: sectionName,
          paragraph,
          line: paragraphStartLine,
        });
      }
    }
    currentParagraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    if (line.match(/^#{1,6}\s/)) { flushParagraph(); paragraph++; continue; }
    if (line.match(/^<!--/)) continue;
    if (line.match(/^\s*\|/)) continue;  // テーブル行
    if (line.trim() === '') { flushParagraph(); continue; }

    if (currentParagraph.length === 0) paragraphStartLine = i + 1;
    currentParagraph.push(line.trim());
  }
  flushParagraph();

  return sentences;
}

// 略語パターン（文末のピリオドと間違えないように）
const ABBREVIATIONS = /(?:Fig|Figs|Eq|Eqs|Ref|Refs|et al|e\.g|i\.e|Dr|Mr|Mrs|Ms|Prof|Vol|No|pp|vs|etc)\./g;

function splitSentences(text: string): string[] {
  // 略語のピリオドを一時的に保護
  let protected_ = text;
  const placeholders: string[] = [];
  protected_ = protected_.replace(ABBREVIATIONS, (match) => {
    const idx = placeholders.length;
    placeholders.push(match);
    return `__ABBR${idx}__`;
  });

  // 日本語の「。」と英語の ". " で分割
  const parts = protected_.split(/(?<=。)|(?<=\.)\s+/);

  // プレースホルダーを復元
  return parts.map(p => {
    let restored = p;
    for (let i = 0; i < placeholders.length; i++) {
      restored = restored.replace(`__ABBR${i}__`, placeholders[i]);
    }
    return restored;
  });
}

/** ファイルの語数を数える（日本語は文字数、英語は単語数） */
export function countWords(content: string): { japanese: number; english: number; total: number } {
  // コードブロック・ディレクティブを除外
  const cleaned = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\|.*\|$/gm, '');

  const japanese = (cleaned.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;
  const english = (cleaned.match(/[a-zA-Z]+/g) || []).length;

  return { japanese, english, total: japanese + english };
}

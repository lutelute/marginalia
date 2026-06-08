import { Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { Compartment } from '@codemirror/state';
import { createMarkdownCompletions } from '../../codemirror/completions';
import { annotationField, flashHighlightField } from './annotationDecorations';
import { useBuild } from '../../contexts/BuildContext';

// Markdownシンタックスハイライト（カラフル版）
export const markdownHighlightStyle = HighlightStyle.define([
  // 見出し - シアン/ブルー系
  { tag: tags.heading1, color: '#61afef', fontWeight: 'bold', fontSize: '1.4em' },
  { tag: tags.heading2, color: '#56b6c2', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: tags.heading3, color: '#98c379', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: tags.heading4, color: '#e5c07b', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#d19a66', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#c678dd', fontWeight: 'bold' },
  // 強調
  { tag: tags.strong, color: '#e5c07b', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#c678dd', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: '#5c6370', textDecoration: 'line-through' },
  // リンク
  { tag: tags.link, color: '#61afef', textDecoration: 'underline' },
  { tag: tags.url, color: '#56b6c2' },
  // コード
  { tag: tags.monospace, color: '#98c379', backgroundColor: 'rgba(152, 195, 121, 0.1)' },
  // 引用
  { tag: tags.quote, color: '#5c6370', fontStyle: 'italic' },
  // リスト
  { tag: tags.list, color: '#e06c75' },
  // コメント（HTML）
  { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
  // メタ情報（---など）
  { tag: tags.meta, color: '#c678dd' },
  { tag: tags.processingInstruction, color: '#c678dd' },
  // 特殊文字
  { tag: tags.special(tags.string), color: '#98c379' },
  // 区切り線
  { tag: tags.contentSeparator, color: '#5c6370' },
]);

export const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
  },
  '.cm-scroller': {
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '16px 0',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bg-tertiary)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(0, 120, 212, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(0, 120, 212, 0.5) !important',
  },
  '.cm-cursor, .cm-cursor-primary': {
    borderLeftColor: 'var(--accent-color)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  // オートコンプリートパネルのスタイル
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--bg-secondary) !important',
    border: '1px solid var(--border-color) !important',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  '.cm-tooltip-autocomplete ul li': {
    color: 'var(--text-primary)',
    padding: '2px 8px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--accent-color) !important',
    color: 'white',
  },
  '.cm-completionLabel': {
    fontSize: '13px',
  },
  '.cm-completionDetail': {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
});

export const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  },
}, { dark: true });

// Markdown Lint
export const markdownLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;
  const text = doc.toString();
  const lines = text.split('\n');

  let inCodeFence = false;
  let codeFenceStart = -1;
  let lastHeadingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // コードフェンス検出
    if (trimmed.startsWith('```')) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceStart = i;
      } else {
        inCodeFence = false;
        codeFenceStart = -1;
      }
      continue;
    }

    // コードフェンス内はスキップ
    if (inCodeFence) continue;

    // 見出しレベルの飛び検出
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        const docLine = doc.line(i + 1);
        diagnostics.push({
          from: docLine.from,
          to: docLine.from + headingMatch[0].length,
          severity: 'warning',
          message: `見出しレベルが h${lastHeadingLevel} から h${level} に飛んでいます`,
        });
      }
      lastHeadingLevel = level;
    }

    // 空リンク検出
    const emptyLinkRe = /\[([^\]]*)\]\(\s*\)/g;
    let match;
    while ((match = emptyLinkRe.exec(line)) !== null) {
      const docLine = doc.line(i + 1);
      diagnostics.push({
        from: docLine.from + match.index,
        to: docLine.from + match.index + match[0].length,
        severity: 'warning',
        message: 'リンク先が空です',
      });
    }
  }

  // 閉じられていないコードフェンス
  if (inCodeFence && codeFenceStart >= 0) {
    const docLine = doc.line(codeFenceStart + 1);
    diagnostics.push({
      from: docLine.from,
      to: docLine.to,
      severity: 'error',
      message: 'コードフェンスが閉じられていません',
    });
  }

  return diagnostics;
});

// オートコンプリート用の Compartment (動的再設定用)
export const completionCompartment = new Compartment();

type BuildData = ReturnType<typeof useBuild>;

interface BuildEditorExtensionsParams {
  catalog: BuildData['catalog'];
  sourceFiles: BuildData['sourceFiles'];
  bibEntries: BuildData['bibEntries'];
  updateListener: Extension;
}

// エディタ拡張の組み立て（EditorState 作成時に使用）
export function buildEditorExtensions({
  catalog,
  sourceFiles,
  bibEntries,
  updateListener,
}: BuildEditorExtensionsParams): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection({ cursorBlinkRate: 530 }),
    history(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(markdownHighlightStyle),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    theme,
    darkTheme,
    updateListener,
    EditorView.lineWrapping,
    // 注釈ハイライト用StateField
    annotationField,
    flashHighlightField,
    // Markdown lint
    markdownLinter,
    lintGutter(),
    // オートコンプリート
    completionCompartment.of(createMarkdownCompletions({
      catalog,
      sourceFiles,
      fileTree: sourceFiles,
      bibEntries: bibEntries || [],
      crossRefLabels: [],
    })),
  ];
}

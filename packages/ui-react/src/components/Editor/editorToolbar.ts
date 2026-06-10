import { AnnotationType } from '../../types/annotations';

// ツールバーのボタン定義
export interface ToolbarItem {
  id: string;
  label?: string;
  icon?: string;
  before?: string;
  after?: string;
  shortcut?: string;
  line?: boolean;
  block?: boolean;
  template?: string;
}

export const TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: 'bold', label: '太字', icon: 'B', before: '**', after: '**', shortcut: 'Cmd+B' },
  { id: 'italic', label: '斜体', icon: 'I', before: '*', after: '*', shortcut: 'Cmd+I' },
  { id: 'strike', label: '取消線', icon: 'S', before: '~~', after: '~~' },
  { id: 'divider1' },
  { id: 'h1', label: '見出し1', icon: 'H1', before: '# ', after: '', line: true },
  { id: 'h2', label: '見出し2', icon: 'H2', before: '## ', after: '', line: true },
  { id: 'h3', label: '見出し3', icon: 'H3', before: '### ', after: '', line: true },
  { id: 'divider2' },
  { id: 'ul', label: '箇条書き', icon: '•', before: '- ', after: '', line: true },
  { id: 'ol', label: '番号リスト', icon: '1.', before: '1. ', after: '', line: true },
  { id: 'task', label: 'タスク', icon: '☑', before: '- [ ] ', after: '', line: true },
  { id: 'divider3' },
  { id: 'quote', label: '引用', icon: '"', before: '> ', after: '', line: true },
  { id: 'code', label: 'コード', icon: '<>', before: '`', after: '`' },
  { id: 'codeblock', label: 'コードブロック', icon: '{ }', before: '```\n', after: '\n```', block: true },
  { id: 'divider4' },
  { id: 'link', label: 'リンク', icon: '🔗', before: '[', after: '](url)' },
  { id: 'image', label: '画像', icon: '🖼', before: '![alt](', after: ')' },
  { id: 'table', label: '表', icon: '⊞', template: '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| A | B | C |\n' },
  { id: 'divider5' },
  { id: 'math', label: '数式', icon: '∑', before: '$', after: '$' },
  { id: 'mathblock', label: '数式ブロック', icon: '∫', before: '$$\n', after: '\n$$', block: true },
  { id: 'color', label: '色', icon: '🎨', before: '<span style="color: red">', after: '</span>' },
];

export const ANNOTATION_TYPES: { id: AnnotationType; label: string; icon: string; color: string }[] = [
  { id: 'comment', label: 'コメント', icon: '💬', color: 'var(--comment-color)' },
  { id: 'review', label: '校閲', icon: '✏️', color: 'var(--review-color)' },
  { id: 'pending', label: '保留', icon: '⏳', color: 'var(--pending-color)' },
  { id: 'discussion', label: '議論', icon: '💭', color: 'var(--discussion-color)' },
];

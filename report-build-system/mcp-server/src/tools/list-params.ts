interface ParamDef {
  name: string;
  type: string;
  description: string;
  required: boolean;
  category: string;
}

const PARAMS: ParamDef[] = [
  // Required
  { name: 'title', type: 'string', description: 'ドキュメントタイトル', required: true, category: '必須' },
  { name: 'template', type: 'string', description: 'テンプレート名 (report, paper, conference等)', required: true, category: '必須' },
  { name: 'output', type: 'string[]', description: '出力形式 (pdf, docx)', required: true, category: '必須' },
  { name: 'sections', type: 'string[]', description: 'Markdownファイルのパスリスト (改ページ付き結合)', required: false, category: 'ソース' },
  { name: 'source', type: 'string', description: '単一Markdownソースファイルのパス', required: false, category: 'ソース' },

  // Common
  { name: 'subtitle', type: 'string', description: 'サブタイトル', required: false, category: 'メタデータ' },
  { name: 'author', type: 'string | string[]', description: '著者名', required: false, category: 'メタデータ' },
  { name: 'date', type: 'string', description: '日付 (YYYY-MM-DD)', required: false, category: 'メタデータ' },
  { name: 'lang', type: 'string', description: '言語コード (ja, en)', required: false, category: 'メタデータ' },
  { name: 'abstract', type: 'string', description: 'アブストラクト', required: false, category: 'メタデータ' },
  { name: 'keywords', type: 'string[]', description: 'キーワードリスト', required: false, category: 'メタデータ' },
  { name: 'toc', type: 'boolean', description: '目次の生成', required: false, category: 'メタデータ' },
  { name: 'toc-depth', type: 'number', description: '目次の深さ', required: false, category: 'メタデータ' },
  { name: 'organization', type: 'string', description: '組織名', required: false, category: 'メタデータ' },

  // Style
  { name: 'style', type: 'string', description: 'テンプレートスタイルバリアント (modern, minimal等)', required: false, category: 'スタイル' },
  { name: 'fontsize', type: 'string', description: 'フォントサイズ (10pt, 11pt, 12pt)', required: false, category: 'スタイル' },
  { name: 'primary-color', type: 'string', description: '見出し色 RGB ("0,51,102")', required: false, category: 'スタイル' },
  { name: 'accent-color', type: 'string', description: 'アクセント色 RGB', required: false, category: 'スタイル' },
  { name: 'margin', type: 'string', description: '余白 ("2.5cm")', required: false, category: 'スタイル' },
  { name: 'line-spacing', type: 'number', description: '行間 (1, 1.5, 2)', required: false, category: 'スタイル' },
  { name: 'numbering', type: 'boolean', description: 'セクション番号', required: false, category: 'スタイル' },
  { name: 'mainfont', type: 'string', description: '本文フォント', required: false, category: 'フォント' },
  { name: 'sansfont', type: 'string', description: 'サンセリフフォント', required: false, category: 'フォント' },
  { name: 'monofont', type: 'string', description: '等幅フォント', required: false, category: 'フォント' },

  // Bibliography
  { name: 'bibliography', type: 'string', description: 'BibTeXファイルパス (.bib)', required: false, category: '参考文献' },
  { name: 'csl', type: 'string', description: 'CSLスタイルファイルパス', required: false, category: '参考文献' },

  // Engine
  { name: 'pdf-engine', type: 'string', description: 'PDFエンジン (xelatex / lualatex)', required: false, category: 'エンジン' },
  { name: 'crossref', type: 'string', description: '相互参照フィルタ (builtin / pandoc-crossref)', required: false, category: 'エンジン' },

  // Thesis
  { name: 'university', type: 'string', description: '大学・学部名', required: false, category: '論文' },
  { name: 'lab', type: 'string', description: '研究室名', required: false, category: '論文' },
  { name: 'advisors', type: 'string[]', description: '指導教員リスト', required: false, category: '論文' },
];

export function listParams(template?: string) {
  if (!template) return PARAMS;
  // テンプレートに応じたフィルタリング（将来拡張）
  return PARAMS;
}

#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { buildDocument } from './tools/build-document.js';
import { listTemplates } from './tools/list-templates.js';
import { listParams } from './tools/list-params.js';
import { insertEquation } from './tools/insert-equation.js';
import { insertTable } from './tools/insert-table.js';
import { insertFigure } from './tools/insert-figure.js';
import { validateRefs } from './tools/validate-refs.js';
import { validateEquations } from './tools/validate-equations.js';
import { getRefContext } from './tools/get-ref-context.js';
import { listSentences } from './tools/list-sentences.js';
import { checkConsistency } from './tools/check-consistency.js';
import { checkCitations } from './tools/check-citations.js';
import { manageNomenclature } from './tools/manage-nomenclature.js';
import { getDocumentStructure } from './tools/get-document-structure.js';
import { getManifestInfo } from './tools/get-manifest-info.js';
import { getTemplateDetail } from './tools/get-template-detail.js';
import { setWorkspace, hasWorkspace, getWorkspace, getMgPath } from './config.js';

const server = new McpServer({
  name: 'marginalia-build',
  version: '1.0.0',
});

// ============================================================
// 0. プロジェクト設定 (最初に呼ぶ)
// ============================================================

server.tool(
  'set_project',
  'フォルダを指定してプロジェクトを開く。マニフェストYAMLを自動検出し、作業ディレクトリ (.marginalia-build/) を作成する。他のツールを使う前にこれを呼ぶ。',
  {
    folder: z.string().describe('論文フォルダの絶対パス'),
  },
  async ({ folder }) => {
    const ws = setWorkspace(folder);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          projectFolder: ws.projectFolder,
          manifestPath: ws.manifestPath,
          mgOutput: ws.mgOutput,
          message: 'プロジェクトを設定しました。manifest_path を省略すると自動検出されたマニフェストが使われます。成果物は mg_output/ に出力されます。',
        }, null, 2),
      }],
    };
  },
);

server.tool(
  'get_project_status',
  '現在のプロジェクト設定状態を確認する',
  {},
  async () => {
    if (!hasWorkspace()) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ active: false, message: 'set_project でフォルダを指定してください' }) }],
      };
    }
    const ws = getWorkspace();
    return {
      content: [{ type: 'text', text: JSON.stringify({
        active: true,
        projectFolder: ws.projectFolder,
        manifestPath: ws.manifestPath,
        mgOutput: ws.mgOutput,
      }, null, 2) }],
    };
  },
);

// ============================================================
// 1. ビルド系
// ============================================================

server.tool(
  'build_document',
  'マニフェストYAMLからPDF/DOCXをビルドする。set_project済みなら manifest_path 省略可。',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
    format: z.enum(['pdf', 'docx']).optional().describe('出力形式 (省略で全形式)'),
  },
  async ({ manifest_path, format }) => {
    const result = await buildDocument(manifest_path, format);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'list_templates',
  '利用可能なテンプレート一覧を取得する（LaTeX/DOCX）',
  {},
  async () => {
    const result = listTemplates();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'list_params',
  'マニフェストYAMLで使用可能なパラメータ一覧を取得する',
  {
    template: z.string().optional().describe('テンプレート名でフィルタ'),
  },
  async ({ template }) => {
    const result = listParams(template);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// 2. 数式系
// ============================================================

server.tool(
  'insert_equation',
  'LaTeX数式ディレクティブを生成する（ラベル・番号付き）',
  {
    label: z.string().describe('数式ラベル (例: "energy_balance")'),
    latex: z.string().describe('LaTeX数式 (例: "E = mc^2")'),
  },
  async ({ label, latex }) => {
    const result = insertEquation(label, latex);
    return { content: [{ type: 'text', text: result }] };
  },
);

server.tool(
  'validate_equations',
  'Markdownファイル内の数式ディレクティブを検証する（構文・参照チェック）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
  },
  async ({ manifest_path }) => {
    const result = validateEquations(manifest_path);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// 3. 表・図系
// ============================================================

server.tool(
  'insert_table',
  'Markdown表ディレクティブを生成する（ラベル・キャプション付き）',
  {
    label: z.string().describe('テーブルラベル'),
    caption: z.string().describe('テーブルキャプション'),
    headers: z.array(z.string()).describe('列ヘッダー'),
    rows: z.array(z.array(z.string())).describe('行データ'),
    alignment: z.array(z.enum(['left', 'center', 'right'])).optional().describe('列の揃え方'),
  },
  async ({ label, caption, headers, rows, alignment }) => {
    const result = insertTable(label, caption, headers, rows, alignment);
    return { content: [{ type: 'text', text: result }] };
  },
);

server.tool(
  'insert_figure',
  '図ディレクティブを生成する（ラベル・パス・キャプション・幅指定）',
  {
    label: z.string().describe('図ラベル'),
    image_path: z.string().describe('画像ファイルパス'),
    caption: z.string().describe('図キャプション'),
    width: z.string().optional().describe('表示幅 (例: "80%", "0.8\\textwidth")'),
  },
  async ({ label, image_path, caption, width }) => {
    const result = insertFigure(label, image_path, caption, width);
    return { content: [{ type: 'text', text: result }] };
  },
);

// ============================================================
// 4. 相互参照系
// ============================================================

server.tool(
  'validate_refs',
  '相互参照の整合性を検証する（未定義・未使用のラベルを検出）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
  },
  async ({ manifest_path }) => {
    const result = validateRefs(manifest_path);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'get_ref_context',
  '参照・引用の前後文脈を取得する（前後の確認）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
    label: z.string().optional().describe('特定ラベル (省略で全参照)'),
    context_lines: z.number().int().min(1).max(10).default(3).describe('前後の行数'),
  },
  async ({ manifest_path, label, context_lines }) => {
    const result = getRefContext(manifest_path, label, context_lines);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// 5. 校正系
// ============================================================

server.tool(
  'list_sentences',
  '文章をセクション別にリスト化して校正確認用テーブルを生成する',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
    section_filter: z.string().optional().describe('セクション名フィルタ'),
    format: z.enum(['markdown_table', 'tsv']).default('markdown_table').describe('出力形式'),
  },
  async ({ manifest_path, section_filter, format }) => {
    const result = listSentences(manifest_path, section_filter, format);
    return { content: [{ type: 'text', text: result }] };
  },
);

server.tool(
  'check_consistency',
  '用語・表記の一貫性をチェックする（表記ゆれ検出）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
    custom_rules: z.array(z.object({
      variants: z.array(z.string()),
      preferred: z.string(),
    })).optional().describe('カスタム一貫性ルール'),
  },
  async ({ manifest_path, custom_rules }) => {
    const result = checkConsistency(manifest_path, custom_rules);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'check_citations',
  '引用・参考文献の整合性をチェックする（BibTeXと本文の照合）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
  },
  async ({ manifest_path }) => {
    const result = checkCitations(manifest_path);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// 6. 用語集系
// ============================================================

server.tool(
  'manage_nomenclature',
  '用語集・略語リストを管理する（追加・一覧・Markdown生成）',
  {
    action: z.enum(['add', 'list', 'generate', 'remove']).describe('操作 (add/list/generate/remove)'),
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
    term: z.string().optional().describe('用語・略語 (add/remove時)'),
    definition: z.string().optional().describe('定義 (add時)'),
    category: z.enum(['abbreviation', 'symbol', 'term']).default('term').describe('カテゴリ'),
  },
  async ({ action, manifest_path, term, definition, category }) => {
    const result = manageNomenclature(action, manifest_path, term, definition, category);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// 7. 文書構造系
// ============================================================

server.tool(
  'get_document_structure',
  'マニフェストの文書構造を取得する（セクション・見出し一覧・語数）',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
  },
  async ({ manifest_path }) => {
    const result = getDocumentStructure(manifest_path);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'get_manifest_info',
  'マニフェストYAMLの内容を解析・表示する',
  {
    manifest_path: z.string().optional().describe('マニフェストYAMLのパス (set_project済みなら省略可)'),
  },
  async ({ manifest_path }) => {
    const result = getManifestInfo(manifest_path);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'get_template_detail',
  'テンプレートの詳細情報を取得する（使用可能パラメータ・LaTeX構造）',
  {
    template_name: z.string().describe('テンプレート名 (例: "conference", "report")'),
  },
  async ({ template_name }) => {
    const result = getTemplateDetail(template_name);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

// ============================================================
// サーバー起動
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP Server error:', err);
  process.exit(1);
});

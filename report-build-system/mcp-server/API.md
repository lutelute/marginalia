# marginalia-build MCP API Reference

## 概要

報告書ビルドシステムのMCPツール群。Markdown論文の執筆・ビルド・校正を支援する。  
全18ツール (ワークスペース2 + ビルド3 + 数式2 + 表図2 + 相互参照2 + 校正3 + 用語集1 + 文書構造3)

---

## 0. ワークスペース

### `set_project`

**最初に呼ぶ。** フォルダを指定してプロジェクトを開く。マニフェストYAMLを自動検出し、作業ディレクトリを作成する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `folder` | string | Yes | 論文フォルダの絶対パス |

**動作**:
1. フォルダ直下の `*.yaml` を自動検出 → マニフェストとして使用
2. `.marginalia-build/` を作成 (成果物・用語集・校正・ログの格納先)
3. `.gitignore` に `.marginalia-build/` を自動追記

**フォルダ構成ルール**:
```
my-research/                 ← 指定するフォルダ
├── manifest.yaml            ← 自動検出
├── src/
│   ├── 01-intro.md
│   └── 02-method.md
├── images/
├── refs.bib
└── mg_output/               ← Marginalia専用ディレクトリ (自動作成)
    ├── pdf/                 ← PDF出力
    ├── docx/                ← DOCX出力
    ├── nomenclature.yaml    ← 用語集データ
    ├── proofreading/        ← 校正テーブル出力
    └── logs/                ← ビルドログ
```

- `mg_output/` は `.gitignore` に自動追記される
- ソースファイル (src/, images/, refs.bib) はMCPが書き換えない

**戻り値**: `{ projectFolder, manifestPath, mgOutput }`

---

### `get_project_status`

現在のプロジェクト設定状態を確認する。

| パラメータ | なし |
|---|---|

**戻り値**: `{ active, projectFolder, manifestPath, mgOutput }`

---

> **Note**: `set_project` 後は全ツールの `manifest_path` が省略可能になる。

---

## 1. ビルド系

### `build_document`

マニフェストYAMLからPDF/DOCXをビルドする。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス (projects/からの相対 or 絶対) |
| `format` | `"pdf"` \| `"docx"` | No | 出力形式 (省略でマニフェスト定義の全形式) |

**戻り値**: `{ success, stdout, stderr, outputFiles[], duration }`

```
build_document("demo-report.yaml", "pdf")
```

---

### `list_templates`

利用可能なテンプレート一覧を取得する。

| パラメータ | なし |
|---|---|

**戻り値**: `[{ name, description, type, features[], formats[] }]`

---

### `list_params`

マニフェストYAMLで使用可能なパラメータ一覧を取得する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `template` | string | No | テンプレート名でフィルタ |

**戻り値**: `[{ name, type, description, required, category }]`

---

## 2. 数式系

### `insert_equation`

LaTeX数式ディレクティブを生成する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `label` | string | Yes | 数式ラベル (例: `"energy_balance"`) |
| `latex` | string | Yes | LaTeX数式 (例: `"E = mc^2"`) |

**戻り値**: `<!-- equation: energy_balance | E = mc^2 -->`

---

### `validate_equations`

全セクション内の数式ディレクティブを検証する（構文・参照チェック）。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |

**戻り値**: `{ equations[], totalEquations, withIssues, unreferenced }`

各equationに `{ label, latex, file, line, referenced, issues[] }` を含む。

---

## 3. 表・図系

### `insert_table`

Markdown表ディレクティブを生成する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `label` | string | Yes | テーブルラベル |
| `caption` | string | Yes | テーブルキャプション |
| `headers` | string[] | Yes | 列ヘッダー |
| `rows` | string[][] | Yes | 行データ |
| `alignment` | ("left"\|"center"\|"right")[] | No | 列の揃え方 |

**戻り値**: 完全なテーブルディレクティブブロック

```
insert_table("results", "実験結果", ["手法", "精度"], [["提案手法", "95.2%"]])
```

出力:
```markdown
<!-- table: results | 実験結果 -->
| 手法 | 精度 |
|:--- |:--- |
| 提案手法 | 95.2% |
<!-- /table -->
```

---

### `insert_figure`

図ディレクティブを生成する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `label` | string | Yes | 図ラベル |
| `image_path` | string | Yes | 画像ファイルパス |
| `caption` | string | Yes | 図キャプション |
| `width` | string | No | 表示幅 (例: `"80%"`, `"0.8\textwidth"`) |

**戻り値**: `<!-- figure: label | path | caption | width -->`

---

## 4. 相互参照系

### `validate_refs`

相互参照の整合性を検証する。未定義・未使用のラベルを検出。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |

**戻り値**: `{ definitions[], references[], unresolved[], unreferenced[] }`

- `definitions`: 定義済みラベル (fig:X, tbl:X, eq:X)
- `unresolved`: 参照先が未定義のラベル
- `unreferenced`: 定義されているが未参照のラベル

---

### `get_ref_context`

参照・引用の前後文脈を取得する（前後の確認）。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |
| `label` | string | No | 特定ラベル (省略で全参照) |
| `context_lines` | number | No | 前後の行数 (default: 3, max: 10) |

**戻り値**: `[{ label, file, line, before[], matchLine, after[] }]`

---

## 5. 校正系

### `list_sentences`

文章をセクション別にリスト化して校正確認用テーブルを生成する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |
| `section_filter` | string | No | セクション名フィルタ |
| `format` | `"markdown_table"` \| `"tsv"` | No | 出力形式 (default: markdown_table) |

**戻り値**: Markdown表 or TSV

```
| セクション | 段落 | 行 | 文章 | ステータス |
|---|---|---|---|---|
| 01-intro | 1 | 3 | 本研究では... | |
```

文分割ルール: 日本語「。」、英語「. 」で分割。略語 (Fig., et al., e.g.) は除外。

---

### `check_consistency`

用語・表記の一貫性をチェックする（表記ゆれ検出）。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |
| `custom_rules` | `[{variants[], preferred}]` | No | カスタムルール |

**組み込みルール**:
- Figure / Fig. / figure / fig.
- Table / Tbl. / table / tbl.
- Equation / Eq. / equation / eq.
- および / 及び
- おこなう / 行う
- できる / 出来る
- ため / 為
- すべて / 全て
- わかる / 分かる / 判る

**戻り値**: `{ inconsistencies[], totalRulesChecked, issuesFound }`

---

### `check_citations`

引用・参考文献の整合性をチェックする（BibTeXと本文の照合）。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |

**前提**: マニフェストに `bibliography` フィールドが必要。

**戻り値**: `{ bibFile, bibEntries[], citedKeys[], uncitedEntries[], undefinedCitations[] }`

- `uncitedEntries`: .bibにあるが本文で未引用
- `undefinedCitations`: 本文で引用されているが.bibに未定義

---

## 6. 用語集系

### `manage_nomenclature`

用語集・略語リストを管理する。データは `projects/.marginalia/<manifest名>-nomenclature.yaml` に保存。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `action` | `"add"` \| `"list"` \| `"generate"` \| `"remove"` | Yes | 操作 |
| `manifest_path` | string | Yes | マニフェストYAMLのパス |
| `term` | string | add/remove時 | 用語・略語 |
| `definition` | string | add時 | 定義 |
| `category` | `"abbreviation"` \| `"symbol"` \| `"term"` | No | カテゴリ (default: term) |

**アクション別戻り値**:
- `add`: `{ action, term, definition, category, total }`
- `remove`: `{ action, term, total }`
- `list`: `{ entries[], total, byCategory }`
- `generate`: `{ markdown, total }` — カテゴリ別にソートされたMarkdown表

---

## 7. 文書構造系

### `get_document_structure`

マニフェストの文書構造を取得する（セクション・見出し一覧・語数）。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |

**戻り値**: `{ title, template, sections[], totalSections, totalWords }`

各sectionに `{ file, name, headings[], words, directives }` を含む。

---

### `get_manifest_info`

マニフェストYAMLの内容を解析・表示する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `manifest_path` | string | Yes | マニフェストYAMLのパス |

**戻り値**: `{ manifestPath, manifest, templateInfo, sections[], bibliography, allSectionsExist }`

セクションファイルの存在確認・参考文献ファイルのチェックを含む。

---

### `get_template_detail`

テンプレートの詳細情報を取得する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `template_name` | string | Yes | テンプレート名 (例: `"conference"`) |

**戻り値**: `{ name, description, type, features[], bundle, latexInfo, latexTemplatePath }`

`latexInfo` にはdocumentclass、geometry、使用パッケージ一覧を含む。

---

## ディレクティブ構文リファレンス

MCP経由で `insert_*` ツールが生成するディレクティブの書式:

```markdown
<!-- figure: label | path | caption | width -->
<!-- equation: label | latex -->
<!-- table: label | caption -->
| header1 | header2 |
|---|---|
| data1 | data2 |
<!-- /table -->
<!-- ref: fig:label -->
<!-- ref: tbl:label -->
<!-- ref: eq:label -->
<!-- pagebreak -->
```

本文中での参照構文: `@fig:label`, `@tbl:label`, `@eq:label`

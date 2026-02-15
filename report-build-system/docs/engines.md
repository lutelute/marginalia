# エンジン選択ガイド

## 概要

報告書ビルドシステムは 2 つの DOCX 生成エンジンを提供します:

| エンジン | YAML 値 | 特徴 |
|---------|---------|------|
| **Pandoc** (デフォルト) | `pandoc` | シンプル、PDF/DOCX 両対応 |
| **python-docx** | `python-docx` | 高品質 DOCX、SEQ フィールド自動採番、OMML 数式 |

## エンジン選択方法

マニフェスト YAML に `docx-engine` フィールドを追加:

```yaml
title: "報告書タイトル"
template: report
output: [docx]
docx-engine: python-docx    # 'pandoc' (default) | 'python-docx'
```

省略時は `pandoc` が使われます。PDF 出力は常に Pandoc を使用します。

## Pandoc エンジン

### 長所
- Pandoc がインストール済みなら追加依存なし
- PDF と DOCX を同じマークダウンから生成
- `reference-doc` によるスタイル制御

### 短所
- DOCX の細かいレイアウト制御が難しい
- 自動採番は crossref.lua ベース (Word フィールドではない)

### 使用テンプレート
`templates/docx/{template}-reference.docx`

## python-docx エンジン

### 長所
- **SEQ フィールド** による Word ネイティブの自動採番 (図・表・数式)
- **OMML 数式** で Word 上で編集可能な数式
- **テンプレート注入** — 既存の Word テンプレートの指定箇所にコンテンツを挿入
- **ブックマーク + REF フィールド** による相互参照
- Word で開いたときにフィールドを更新するだけで番号が正しくなる

### 短所
- 追加依存: `python-docx`, `lxml`
- PDF 出力は不可 (DOCX のみ)
- マークダウンの一部記法 (脚注、ネスト引用など) は未対応

### インストール

```bash
pip install python-docx lxml
# or
pip install -r report-build-system/requirements.txt
```

### 使用テンプレート
`templates/docx/{template}-inject.docx`

## python-docx 設定オプション

`docx-direct` フィールドで詳細設定:

```yaml
docx-engine: python-docx
docx-direct:
  anchor-heading: "第5章 考察"     # テンプレート内の注入開始位置
  chapter-prefix: "5"               # 図5-1, 表5-2 のプレフィックス
  crossref-mode: seq                # 'seq' (SEQフィールド) | 'text' (プレーンテキスト)
  first-line-indent: 11             # 本文字下げ (pt)
  page-break-before-h2: true        # ## の前に改ページ
```

### パラメータ詳細

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `anchor-heading` | (末尾に追加) | テンプレート内で、この見出しの後にコンテンツを注入 |
| `chapter-prefix` | (グローバル採番) | 採番プレフィックス。`"5"` → 図5-1, 図5-2... |
| `crossref-mode` | `seq` | `seq`: Word SEQ/REF フィールド、`text`: プレーンテキスト |
| `first-line-indent` | `0` | 本文段落の字下げ (ポイント単位) |
| `page-break-before-h2` | `false` | `##` 見出しの前に改ページを挿入 |

## テンプレートバンドル

`templates/catalog.yaml` でテンプレートごとに利用可能なエンジンを定義:

```yaml
report:
  description: "標準ビジネス報告書"
  type: report
  bundle:
    pandoc:
      pdf: latex/report.latex
      docx: docx/report-reference.docx
    python-docx:
      docx: docx/report-inject.docx
```

`bundle` が定義されていないテンプレートは従来のファイル名規約でフォールバックします。
GUI ではバンドル情報から python-docx の利用可否を判定し、未対応テンプレートではグレーアウト表示します。

## 依存関係チェック

GUI (Build パネル) はアプリ起動時に以下を自動チェックします:

- `python3` — Python 3 ランタイム
- `pandoc` — Pandoc コマンド
- `xelatex` — XeLaTeX (PDF 用)
- `python-docx` — Python モジュール (`import docx`)
- `lxml` — Python モジュール (`import lxml`)

python-docx / lxml が未インストールの場合、エンジン選択でツールチップ警告が表示されます。

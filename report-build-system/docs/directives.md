# ディレクティブ構文リファレンス

HTML コメント形式のディレクティブを使って、Pandoc / python-docx 両エンジンで図・数式・表・相互参照などを統一的に記述できます。

## 基本構文

```
<!-- directive: arg1 | arg2 | arg3 -->
```

引数はパイプ `|` で区切ります。

## ディレクティブ一覧

### figure — 図挿入

```markdown
<!-- figure: fig-overview | images/overview.png | システム概要図 | 80% -->
```

| 引数 | 必須 | 説明 |
|------|------|------|
| label | Yes | 相互参照用ラベル (`fig:` プレフィックスは自動付与) |
| path | Yes | 画像ファイルパス (プロジェクトルートからの相対パス) |
| caption | No | 図キャプション |
| width | No | 表示幅 (`80%`, `6in` など) |

### equation — 数式挿入

```markdown
<!-- equation: eq-euler | e^{i\pi} + 1 = 0 -->
```

| 引数 | 必須 | 説明 |
|------|------|------|
| label | Yes | 相互参照用ラベル (`eq:` プレフィックスは自動付与) |
| latex | Yes | LaTeX 数式文字列 |

- Pandoc: `DisplayMath` として出力
- python-docx: OMML (Office MathML) に変換して埋め込み

### table — 表挿入

```markdown
<!-- table: tbl-results | 実験結果 -->
| 手法 | 精度 | 速度 |
|------|------|------|
| A    | 95%  | 1.2s |
| B    | 92%  | 0.8s |
<!-- /table -->
```

開始タグと終了タグ `<!-- /table -->` の間にマークダウン表を記述します。

| 引数 | 必須 | 説明 |
|------|------|------|
| label | Yes | 相互参照用ラベル (`tbl:` プレフィックスは自動付与) |
| caption | No | 表キャプション |

### algorithm — アルゴリズム挿入

```markdown
<!-- algorithm: alg-sort | バブルソート -->
1. 配列 A[0..n-1] を入力
2. i = 0 から n-2 まで:
3.   j = 0 から n-i-2 まで:
4.     A[j] > A[j+1] ならば swap
<!-- /algorithm -->
```

| 引数 | 必須 | 説明 |
|------|------|------|
| label | Yes | 相互参照用ラベル (`alg:` プレフィックスは自動付与) |
| caption | No | アルゴリズムキャプション |

### ref — 相互参照

```markdown
<!-- ref: fig:fig-overview --> を参照してください。
```

| 引数 | 必須 | 説明 |
|------|------|------|
| label | Yes | 参照先ラベル (例: `fig:fig-overview`, `eq:eq-euler`, `tbl:tbl-results`) |

- Pandoc: `@fig:label` テキストに変換 (crossref.lua が解決)
- python-docx (`crossref-mode: seq`): REF フィールドとして埋め込み

### pagebreak — 改ページ

```markdown
<!-- pagebreak -->
```

引数なし。両エンジンで改ページを挿入します。

### raw-docx — Word XML 直接注入

```markdown
<!-- raw-docx -->
<w:p><w:r><w:t>直接挿入されるテキスト</w:t></w:r></w:p>
<!-- /raw-docx -->
```

python-docx エンジン専用。Pandoc パスでは無視されます。

### style — Word スタイル指定

```markdown
<!-- style: Quote | これは引用テキストです -->
```

| 引数 | 必須 | 説明 |
|------|------|------|
| StyleName | Yes | Word のスタイル名 |
| text | Yes | スタイルを適用するテキスト |

python-docx エンジン専用。Pandoc パスでは無視されます。

## フィルタ適用順序 (Pandoc)

```
metadata-defaults → cjk-font → directives → crossref → layout
```

## エンジン別の対応状況

| ディレクティブ | Pandoc | python-docx |
|---------------|--------|-------------|
| figure | Image + crossref attr | 画像挿入 + SEQ フィールド |
| equation | DisplayMath | OMML 変換 + SEQ フィールド |
| table | Div wrapper + crossref | Word Table + SEQ キャプション |
| algorithm | Div wrapper | テキスト + キャプション |
| ref | `@label` テキスト | REF フィールド or プレーンテキスト |
| pagebreak | `\newpage` / OOXML break | page break 挿入 |
| raw-docx | 無視 (Null) | XML 直接注入 |
| style | 無視 (Null) | スタイル適用 |

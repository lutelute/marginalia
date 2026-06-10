import { useState } from 'react';

function BuildGuides() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="tg-guides">
      {/* PDF */}
      <div className={`tg-guide-card ${expanded === 'pdf' ? 'expanded' : ''}`}>
        <div className="tg-guide-card-header" onClick={() => toggle('pdf')}>
          <div className="tg-guide-icon tg-guide-icon-pdf">PDF</div>
          <div className="tg-guide-title-area">
            <h3>PDF ビルド</h3>
            <p>Pandoc + XeLaTeX でマークダウンから高品質な PDF を生成</p>
          </div>
          <span className={`tg-guide-chevron ${expanded === 'pdf' ? 'open' : ''}`}>
            <ChevronIcon />
          </span>
        </div>
        {expanded === 'pdf' && (
          <div className="tg-guide-body">
            <div className="tg-guide-section">
              <h4>必要な環境</h4>
              <div className="tg-guide-deps">
                <span className="tg-guide-dep">Python 3</span>
                <span className="tg-guide-dep">Pandoc</span>
                <span className="tg-guide-dep">XeLaTeX</span>
              </div>
            </div>

            <div className="tg-guide-section">
              <h4>ビルド手順</h4>
              <ol className="tg-guide-steps">
                <li><strong>マニフェスト作成</strong> — サイドバー BUILD セクションで新規マニフェスト (YAML) を作成</li>
                <li><strong>テンプレート選択</strong> — 「テンプレート」タブからテンプレートを選び Apply</li>
                <li><strong>セクション指定</strong> — sections に含める Markdown ファイルを順番に記述</li>
                <li><strong>出力形式</strong> — output に <code>pdf</code> を指定</li>
                <li><strong>ビルド実行</strong> — <code>Cmd+Shift+B</code> または BUILD パネルのビルドボタン</li>
              </ol>
            </div>

            <div className="tg-guide-section">
              <h4>サンプルマニフェスト</h4>
              <pre className="tg-guide-code">{`title: "技術報告書 - Q4レビュー"
subtitle: "2026年度 第4四半期"
author: "開発チーム"
date: "2026-01-15"
template: report
style: modern
output: [pdf]
lang: ja
toc: true
fontsize: 11pt

sections:
  - 01-introduction.md
  - 02-methodology.md
  - 03-results.md
  - 04-conclusion.md

# オプション
primary-color: "0,51,102"
numbering: true
bibliography: references.bib
csl: ieee.csl`}</pre>
            </div>

            <div className="tg-guide-section">
              <h4>フロー</h4>
              <div className="tg-guide-flow">
                <span className="tg-guide-flow-step">Markdown</span>
                <span className="tg-guide-flow-arrow">&rarr;</span>
                <span className="tg-guide-flow-step">Pandoc + Lua フィルタ</span>
                <span className="tg-guide-flow-arrow">&rarr;</span>
                <span className="tg-guide-flow-step">LaTeX テンプレート</span>
                <span className="tg-guide-flow-arrow">&rarr;</span>
                <span className="tg-guide-flow-step">XeLaTeX</span>
                <span className="tg-guide-flow-arrow">&rarr;</span>
                <span className="tg-guide-flow-step tg-guide-flow-output">PDF</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DOCX */}
      <div className={`tg-guide-card ${expanded === 'docx' ? 'expanded' : ''}`}>
        <div className="tg-guide-card-header" onClick={() => toggle('docx')}>
          <div className="tg-guide-icon tg-guide-icon-docx">DOCX</div>
          <div className="tg-guide-title-area">
            <h3>DOCX ビルド</h3>
            <p>Pandoc リファレンス方式 / python-docx 直接生成の2エンジン対応</p>
          </div>
          <span className={`tg-guide-chevron ${expanded === 'docx' ? 'open' : ''}`}>
            <ChevronIcon />
          </span>
        </div>
        {expanded === 'docx' && (
          <div className="tg-guide-body">
            <div className="tg-guide-section">
              <h4>必要な環境</h4>
              <div className="tg-guide-deps">
                <span className="tg-guide-dep">Python 3</span>
                <span className="tg-guide-dep">Pandoc</span>
                <span className="tg-guide-dep tg-guide-dep-opt">python-docx (任意)</span>
                <span className="tg-guide-dep tg-guide-dep-opt">lxml (任意)</span>
              </div>
            </div>

            <div className="tg-guide-section">
              <h4>2つのエンジン</h4>
              <div className="tg-guide-engines">
                <div className="tg-guide-engine">
                  <h5>Pandoc (デフォルト)</h5>
                  <p>Word リファレンステンプレートのスタイルを継承。汎用的で安定。</p>
                  <code>docx-engine: pandoc</code>
                </div>
                <div className="tg-guide-engine">
                  <h5>python-docx (高度)</h5>
                  <p>Word XML を直接操作。SEQ フィールド、数式 (OMML)、図表自動番号付けに対応。</p>
                  <code>docx-engine: python-docx</code>
                </div>
              </div>
            </div>

            <div className="tg-guide-section">
              <h4>サンプルマニフェスト (Pandoc)</h4>
              <pre className="tg-guide-code">{`title: "週次報告書"
author: "山田太郎"
date: "2026-02-10"
template: report
output: [docx]
lang: ja

sections:
  - summary.md
  - progress.md
  - issues.md`}</pre>
            </div>

            <div className="tg-guide-section">
              <h4>サンプルマニフェスト (python-docx)</h4>
              <pre className="tg-guide-code">{`title: "設計仕様書 v2.1"
author: "設計部"
template: techspec
output: [docx]
docx-engine: python-docx
lang: ja

docx-direct:
  anchor-heading: "1. はじめに"
  chapter-prefix: null
  crossref-mode: seq
  first-line-indent: 10
  page-break-before-h2: true

sections:
  - 01-overview.md
  - 02-architecture.md
  - 03-api-spec.md`}</pre>
            </div>

            <div className="tg-guide-section">
              <h4>ディレクティブ (python-docx 専用)</h4>
              <div className="tg-guide-directives">
                <div className="tg-guide-directive">
                  <code>&lt;!-- figure: path/to/img.png --&gt;</code>
                  <span>図の挿入 + 自動番号</span>
                </div>
                <div className="tg-guide-directive">
                  <code>&lt;!-- table: caption text --&gt;</code>
                  <span>表キャプション + 自動番号</span>
                </div>
                <div className="tg-guide-directive">
                  <code>&lt;!-- equation --&gt;</code>
                  <span>LaTeX 数式 → OMML 変換</span>
                </div>
                <div className="tg-guide-directive">
                  <code>&lt;!-- ref: fig:label --&gt;</code>
                  <span>相互参照</span>
                </div>
                <div className="tg-guide-directive">
                  <code>&lt;!-- pagebreak --&gt;</code>
                  <span>改ページ</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* YAML Manifest */}
      <div className={`tg-guide-card ${expanded === 'yaml' ? 'expanded' : ''}`}>
        <div className="tg-guide-card-header" onClick={() => toggle('yaml')}>
          <div className="tg-guide-icon tg-guide-icon-yaml">YAML</div>
          <div className="tg-guide-title-area">
            <h3>YAML マニフェスト リファレンス</h3>
            <p>マニフェストで使用可能な全フィールドの一覧</p>
          </div>
          <span className={`tg-guide-chevron ${expanded === 'yaml' ? 'open' : ''}`}>
            <ChevronIcon />
          </span>
        </div>
        {expanded === 'yaml' && (
          <div className="tg-guide-body">
            <div className="tg-guide-section">
              <h4>必須フィールド</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>型</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>title</code></td><td>string</td><td>ドキュメントタイトル</td></tr>
                  <tr><td><code>template</code></td><td>string</td><td>使用テンプレート名 (report, paper, etc.)</td></tr>
                  <tr><td><code>output</code></td><td>string[]</td><td>出力形式 [pdf], [docx], [pdf, docx]</td></tr>
                  <tr><td><code>sections</code></td><td>string[]</td><td>ソース MD ファイル (順番に結合)</td></tr>
                </tbody>
              </table>
            </div>

            <div className="tg-guide-section">
              <h4>メタデータ</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>型</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>subtitle</code></td><td>string</td><td>サブタイトル</td></tr>
                  <tr><td><code>author</code></td><td>string | string[]</td><td>著者 (複数可)</td></tr>
                  <tr><td><code>date</code></td><td>string</td><td>日付</td></tr>
                  <tr><td><code>lang</code></td><td>string</td><td>言語 (ja, en)</td></tr>
                  <tr><td><code>abstract</code></td><td>string</td><td>要旨・概要</td></tr>
                  <tr><td><code>organization</code></td><td>string</td><td>組織名</td></tr>
                  <tr><td><code>version</code></td><td>string</td><td>ドキュメントバージョン</td></tr>
                  <tr><td><code>keywords</code></td><td>string[]</td><td>キーワード (論文用)</td></tr>
                </tbody>
              </table>
            </div>

            <div className="tg-guide-section">
              <h4>レイアウト・スタイル</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>型</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>style</code></td><td>string</td><td>スタイルバリアント (modern, minimal, etc.)</td></tr>
                  <tr><td><code>toc</code></td><td>boolean</td><td>目次を生成</td></tr>
                  <tr><td><code>numbering</code></td><td>boolean</td><td>セクション番号を付与</td></tr>
                  <tr><td><code>fontsize</code></td><td>string</td><td>フォントサイズ (11pt, 12pt)</td></tr>
                  <tr><td><code>margin</code></td><td>string</td><td>余白 (2.5cm)</td></tr>
                  <tr><td><code>line-spacing</code></td><td>number</td><td>行間 (1, 1.5, 2)</td></tr>
                  <tr><td><code>primary-color</code></td><td>string</td><td>メインカラー RGB ("0,51,102")</td></tr>
                  <tr><td><code>accent-color</code></td><td>string</td><td>アクセントカラー RGB</td></tr>
                </tbody>
              </table>
            </div>

            <div className="tg-guide-section">
              <h4>フォント</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>mainfont</code></td><td>本文フォント</td></tr>
                  <tr><td><code>sansfont</code></td><td>サンセリフフォント</td></tr>
                  <tr><td><code>monofont</code></td><td>等幅フォント</td></tr>
                  <tr><td><code>cjk-mainfont</code></td><td>CJK (日本語) フォント</td></tr>
                </tbody>
              </table>
            </div>

            <div className="tg-guide-section">
              <h4>参考文献</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>bibliography</code></td><td>.bib ファイルパス (citeproc 有効化)</td></tr>
                  <tr><td><code>csl</code></td><td>CSL スタイルファイル (ieee.csl 等)</td></tr>
                  <tr><td><code>crossref</code></td><td>相互参照エンジン (builtin / pandoc-crossref)</td></tr>
                </tbody>
              </table>
            </div>

            <div className="tg-guide-section">
              <h4>エンジン設定</h4>
              <table className="tg-guide-table">
                <thead><tr><th>フィールド</th><th>デフォルト</th><th>説明</th></tr></thead>
                <tbody>
                  <tr><td><code>pdf-engine</code></td><td>xelatex</td><td>PDF エンジン (xelatex / lualatex)</td></tr>
                  <tr><td><code>docx-engine</code></td><td>pandoc</td><td>DOCX エンジン (pandoc / python-docx)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default BuildGuides;

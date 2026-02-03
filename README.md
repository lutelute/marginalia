# Marginalia

<p align="center">
  <img src="build/icon.svg" width="128" height="128" alt="Marginalia Logo">
</p>

<p align="center">
  <strong>Markdown編集ツール</strong><br>
  校閲・コメント・バージョン管理機能付き
</p>

<p align="center">
  <a href="https://github.com/yourusername/Marginalia/releases">
    <img src="https://img.shields.io/github/v/release/yourusername/Marginalia?style=flat-square" alt="Release">
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
</p>

---

## 機能

- **ファイルツリー**: フォルダを開いてMarkdownファイルを一覧表示
- **エディタ**: CodeMirror 6ベースのシンタックスハイライト付きエディタ
- **プレビュー**: リアルタイムMarkdownプレビュー（GFM対応）
- **注釈システム**: テキスト選択で4種類の注釈を追加可能
  - コメント: 一般的なメモ
  - 校閲: 修正提案
  - 保留: 後で検討
  - 議論: スレッド形式の議論
- **履歴管理**: 操作履歴の自動記録

## セットアップ

```bash
npm install
npm run dev
```

## 使い方

1. 左サイドバーの「フォルダを開く」でMarkdownファイルがあるディレクトリを選択
2. ファイルツリーからファイルをクリックして開く
3. 中央ペインでテキストを編集、右側でプレビューを確認
4. テキストを選択すると右パネルに注釈追加フォームが表示される
5. 注釈は `.marginalia/` フォルダに自動保存される

## 技術スタック

- Electron
- React
- Vite
- CodeMirror 6
- react-markdown + remark-gfm

## ディレクトリ構成

```
Marginalia_simple/
├── electron/          # Electronメインプロセス
├── src/
│   ├── components/    # Reactコンポーネント
│   ├── contexts/      # 状態管理
│   ├── hooks/         # カスタムフック
│   └── styles/        # スタイル
└── .marginalia/       # 注釈データ（自動生成）
```

## ショートカット

- `Cmd/Ctrl + S`: ファイル保存
- `Cmd/Ctrl + ,`: 設定を開く

## インストール

### リリース版（推奨）

[Releases](https://github.com/yourusername/Marginalia/releases) から最新版をダウンロード:

- **macOS**: `Marginalia-x.x.x.dmg` または `.zip`
- **Windows**: `Marginalia-Setup-x.x.x.exe` または `.portable.exe`
- **Linux**: `Marginalia-x.x.x.AppImage` または `.deb`

### 開発版

```bash
git clone https://github.com/yourusername/Marginalia.git
cd Marginalia
npm install
npm run dev
```

## ビルド

```bash
# 本番ビルド
npm run build:prod

# パッケージ作成
npm run package:mac     # macOS
npm run package:win     # Windows
npm run package:linux   # Linux
```

## アップデート

新しいバージョンがリリースされた場合:

1. [Releases](https://github.com/yourusername/Marginalia/releases) ページを確認
2. 最新版をダウンロードしてインストール
3. 注釈データ（`.marginalia/`）は保持されます

## ライセンス

MIT

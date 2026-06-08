**Marginalia v2.0**

報告書ビルドシステム統合

機能仕様書・実装計画書

Document ID: SPEC-MARG-2026-001

Version: 1.0 \| Status: Draft

Date: 2026-02-09

**1. 概要**

**1.1 目的**

Marginalia（ElectronデスクトップMarkdownエディタ）に「報告書ビルドシステム」との統合機能を追加し、MDファイルの編集からPDF/DOCX生成までをシームレスに行えるようにする。

BSJ（Bull Shit Jobs）排除の原則に基づき、レイアウト調整・フォント設定・章番号管理などの手作業を完全に自動化する。

**1.2 スコープ**

  ---------------------- ---------------------------------------- ------------
  **機能**               **内容**                                 **優先度**
  プロジェクト検出       projects/\*.yamlを自動検出してUIに表示   P0
  ビルド実行             python3 buildをIPC経由で実行、結果表示   P0
  テンプレート選択       カタログからテンプレートを視覚的に選択   P1
  マニフェストエディタ   YAMLマニフェストのビジュアル編集UI       P1
  PDFプレビュー          ビルド済みPDFをアプリ内でプレビュー      P2
  ライブプレビュー       MD編集中に統合後のプレビューを表示       P2
  ---------------------- ---------------------------------------- ------------

**1.3 前提条件**

-   報告書ビルドシステム（buildスクリプト、テンプレート、フィルタ）が同一フォルダ内に存在

-   python3、pandoc、xelatexがシステムにインストール済み

-   Marginalia v1.2.0以上

**2. アーキテクチャ**

**2.1 システム構成図**

> Marginalia App
>
> ├─ Sidebar (FileTree) ── ファイルツリー + プロジェクトパネル \[NEW\]
>
> ├─ Editor (CodeMirror) ── MD編集 + ビルドボタン \[NEW\]
>
> ├─ Preview ──────── MDプレビュー / PDFプレビュー \[NEW\]
>
> └─ Annotations ────── 注釈パネル
>
> Electron Main Process
>
> ├─ fileSystem.js ──── 既存のFS操作
>
> └─ buildSystem.js ─── ビルド実行ハンドラ \[NEW\]

**2.2 新規ファイル一覧**

  ------------------------------------------- -------------------------------- ---------------
  **ファイル**                                **役割**                         **レイヤー**
  electron/buildSystem.js                     ビルド実行・IPCハンドラ          Main Process
  src/contexts/BuildContext.tsx               ビルド状態管理                   React Context
  src/components/Sidebar/ProjectPanel.tsx     プロジェクト一覧・ビルドボタン   UI Component
  src/components/Sidebar/ManifestEditor.tsx   YAMLマニフェスト編集UI           UI Component
  src/components/Editor/BuildOutput.tsx       ビルド結果・ログ表示             UI Component
  src/components/Editor/PdfPreview.tsx        PDFプレビューアー                UI Component
  ------------------------------------------- -------------------------------- ---------------

**2.3 既存ファイル変更一覧**

  ------------------------------------- -----------------------------------------------------
  **ファイル**                          **変更内容**
  electron/main.js                      buildSystem.jsのrequire追加、IPCハンドラ登録（6行）
  electron/preload.js                   build APIのcontextBridge公開（5行）
  electron/fileSystem.js                readDirectoryにyaml拡張子対応追加（1行）
  src/App.tsx                           BuildProvider追加、ProjectPanelタブ追加
  src/components/Sidebar/FileTree.tsx   .yamlファイルのアイコン区別
  ------------------------------------- -----------------------------------------------------

**3. 機能仕様**

**3.1 ビルドシステムIPC (electron/buildSystem.js)**

新規Electronメインプロセスモジュール。child\_process.execFileでpython3 buildを実行する。

**IPCチャネル定義**

  ---------------------- ------------------------------------- ----------------------------------------------
  **チャネル**           **引数**                              **戻り値**
  build:run              { projectRoot, manifest?, format? }   { success, stdout, stderr, outputFiles\[\] }
  build:list-templates   { projectRoot }                       { templates\[\] }
  build:list-params      {}                                    { params: string }
  build:read-manifest    { manifestPath }                      { manifest: object }
  build:write-manifest   { manifestPath, data }                { success }
  build:detect-project   { dirPath }                           { isProject, manifests\[\], templates\[\] }
  ---------------------- ------------------------------------- ----------------------------------------------

**build:run 詳細仕様**

実行フロー:

1.  projectRootからbuildスクリプトの存在を確認

2.  child\_process.execFile(\'python3\', \[\'build\', \...args\])を実行

3.  stdout/stderrをリアルタイムでレンダラーに送信（IPC event）

4.  output/ディレクトリをスキャンして生成ファイル一覧を返却

> // electron/buildSystem.js コア実装イメージ
>
> const { execFile } = require(\'child\_process\');
>
> async function runBuild(projectRoot, manifest, format) {
>
> const buildScript = path.join(projectRoot, \'build\');
>
> const args = manifest ? \[manifest\] : \[\];
>
> if (format) args.push(\`\--\${format}\`);
>
> return new Promise((resolve) =\> {
>
> const proc = execFile(\'python3\', \[buildScript, \...args\],
>
> { cwd: projectRoot, maxBuffer: 10 \* 1024 \* 1024 },
>
> (error, stdout, stderr) =\> {
>
> resolve({ success: !error, stdout, stderr });
>
> });
>
> // リアルタイム出力はIPC eventで送信
>
> proc.stdout.on(\'data\', (data) =\> { /\* send to renderer \*/ });
>
> });
>
> }

**build:detect-project 詳細仕様**

フォルダを開いたときに自動で報告書プロジェクトかどうかを判定する。

判定条件: buildスクリプトが存在 AND projects/ディレクトリが存在 AND templates/ディレクトリが存在

**3.2 BuildContext (src/contexts/BuildContext.tsx)**

React Contextでビルド状態を管理する。FileContextと同じuseReducerパターン。

**ステート定義**

  ---------------- ------------------------------------------------------ --------------------------------------
  **プロパティ**   **型**                                                 **説明**
  isProject        boolean                                                現在のフォルダがビルドプロジェクトか
  manifests        ManifestInfo\[\]                                       検出されたyamlマニフェスト一覧
  templates        TemplateInfo\[\]                                       利用可能なテンプレート一覧
  buildStatus      \'idle\' \| \'building\' \| \'success\' \| \'error\'   ビルド状態
  buildOutput      string                                                 ビルドログ（stdout + stderr）
  lastBuildFiles   string\[\]                                             最後のビルドで生成されたファイル
  ---------------- ------------------------------------------------------ --------------------------------------

**アクション**

  ----------------- -------------------- -----------------------------------------
  **アクション**    **引数**             **動作**
  detectProject()   dirPath              フォルダ開時に自動実行、isProjectを設定
  runBuild()        manifest?, format?   ビルド実行、ステータス更新
  loadManifest()    manifestPath         YAMLを読み込みパース
  saveManifest()    manifestPath, data   YAMLを書き出し
  ----------------- -------------------- -----------------------------------------

**3.3 ProjectPanel (src/components/Sidebar/ProjectPanel.tsx)**

サイドバーに「プロジェクト」タブを追加。ファイルツリーと切り替え可能。

**UI構成**

-   マニフェスト一覧: projects/\*.yamlをカード形式で表示

-   各カード: タイトル、テンプレート名、セクション数、出力形式を表示

-   ビルドボタン: 各マニフェストに「PDF」「DOCX」「全て」ボタン

-   ステータス表示: building中はスピナー、成功は✓、失敗は✗

-   出力ファイルリンク: ビルド後にoutput/\*.pdfをクリックで開ける

**3.4 ManifestEditor (src/components/Sidebar/ManifestEditor.tsx)**

YAMLマニフェストをビジュアルに編集するUIコンポーネント。

**UI要素**

-   タイトル/サブタイトル/著者/日付: テキスト入力

-   テンプレート選択: ドロップダウン（catalog.yamlから読み込み）

-   スタイル選択: テンプレートに応じたスタイルバリエーション

-   セクション一覧: src/のファイルをドラッグ&ドロップで並べ替え

-   出力形式: PDF/DOCXチェックボックス

-   カスタムパラメータ: primary-color、margin等のオプション設定

**3.5 BuildOutput (src/components/Editor/BuildOutput.tsx)**

ビルド実行結果を表示するパネル。プレビューエリアの下部または切り替えタブで表示。

-   リアルタイムログ: stdout/stderrをストリーム表示

-   ステータスバー: 「Building\...」「✓ 3 files built」「✗ Error」

-   出力ファイルリスト: クリックでshell.openPath()で開く

**3.6 PdfPreview (src/components/Editor/PdfPreview.tsx)**

PDFファイルをアプリ内の\<iframe\>またにpdf.jsで表示。

-   ElectronのwebPreferences.plugins: trueでChromium内蔵PDFビューアを使用

-   またはpdf.jsライブラリで独自レンダリング

-   ビルド完了時に自動で最新PDFを表示

**4. preload.js 変更仕様**

electronAPIオブジェクトに以下を追加:

> // ビルドシステムAPI
>
> detectProject: (dirPath) =\>
>
> ipcRenderer.invoke(\'build:detect-project\', dirPath),
>
> runBuild: (projectRoot, manifest, format) =\>
>
> ipcRenderer.invoke(\'build:run\', { projectRoot, manifest, format }),
>
> listTemplates: (projectRoot) =\>
>
> ipcRenderer.invoke(\'build:list-templates\', { projectRoot }),
>
> readManifest: (manifestPath) =\>
>
> ipcRenderer.invoke(\'build:read-manifest\', { manifestPath }),
>
> writeManifest: (manifestPath, data) =\>
>
> ipcRenderer.invoke(\'build:write-manifest\', { manifestPath, data }),
>
> onBuildProgress: (callback) =\> {
>
> ipcRenderer.on(\'build-progress\', (event, data) =\> callback(data));
>
> return () =\> ipcRenderer.removeAllListeners(\'build-progress\');
>
> },

**5. 実装計画**

**5.1 Phase 1: ビルド基盤（推定 3-4時間）**

最小限のビルド実行機能を実装する。

  ---------- ------------------------------------------------------- -----------------------------------------------
  **Step**   **作業内容**                                            **対象ファイル**
  1          electron/buildSystem.js作成（IPCハンドラ）              electron/buildSystem.js (new)
  2          main.jsにIPC登録追加                                    electron/main.js
  3          preload.jsにbuildAPI公開                                electron/preload.js
  4          BuildContext.tsx作成                                    src/contexts/BuildContext.tsx (new)
  5          App.tsxにBuildProvider追加                              src/App.tsx
  6          ProjectPanel.tsx作成（マニフェスト一覧+ビルドボタン）   src/components/Sidebar/ProjectPanel.tsx (new)
  7          サイドバーにタブ切り替え追加                            src/App.tsx, src/styles/
  ---------- ------------------------------------------------------- -----------------------------------------------

**5.2 Phase 2: マニフェスト編集（推定 4-5時間）**

マニフェストのビジュアル編集UIを実装する。

  ---------- -------------------------------------- -------------------------------------------------
  **Step**   **作業内容**                           **対象ファイル**
  1          ManifestEditor.tsx作成（フォームUI）   src/components/Sidebar/ManifestEditor.tsx (new)
  2          テンプレートカタログ読み込み           electron/buildSystem.js
  3          セクションドラッグ&ドロップ並べ替え    ManifestEditor.tsx
  4          YAML読み書きテスト                     統合テスト
  ---------- -------------------------------------- -------------------------------------------------

**5.3 Phase 3: プレビュー（推定 3-4時間）**

PDFプレビューとビルド出力パネルを実装する。

  ---------- ---------------------------------------- ---------------------------------------------
  **Step**   **作業内容**                             **対象ファイル**
  1          BuildOutput.tsx作成（ログ表示）          src/components/Editor/BuildOutput.tsx (new)
  2          PdfPreview.tsx作成                       src/components/Editor/PdfPreview.tsx (new)
  3          エディタエリアとのレイアウト統合         src/App.tsx, CSS
  4          shell.openPathで外部ビューアー開き対応   electron/main.js
  ---------- ---------------------------------------- ---------------------------------------------

**6. データ構造**

**6.1 ManifestInfo 型**

> interface ManifestInfo {
>
> path: string; // projects/demo-report.yaml
>
> name: string; // demo-report
>
> title: string; // 月次進捗報告書
>
> template: string; // report
>
> style?: string; // modern
>
> output: string\[\]; // \[\'pdf\', \'docx\'\]
>
> sections: string\[\]; // \[\'src/demo/01-overview.md\', \...\]
>
> sectionCount: number; // 5
>
> }

**6.2 TemplateInfo 型**

> interface TemplateInfo {
>
> name: string; // report
>
> description: string; // 標準ビジネス報告書
>
> type: string; // report
>
> styles: string\[\]; // \[\'modern\', \'minimal\'\]
>
> features: string\[\]; // \[\'toc\', \'subtitle\', \'organization\'\]
>
> }

**6.3 BuildResult 型**

> interface BuildResult {
>
> success: boolean;
>
> stdout: string;
>
> stderr: string;
>
> outputFiles: Array\<{
>
> path: string; // output/demo-report.pdf
>
> format: string; // pdf
>
> size: number; // 61575
>
> }\>;
>
> duration: number; // ミリ秒
>
> }

**7. 実装注意事項**

**7.1 既存コードへの影響最小化**

-   既存のFileContext、AnnotationContextには一切変更を加えない

-   BuildContextは完全に独立した新規Contextとして追加

-   main.jsへの変更はrequireとIPC登録のみ（6行程度）

-   preload.jsへの追加はcontextBridgeの拡張のみ（5行程度）

**7.2 プロジェクト検出のタイミング**

FileContextのopenDirectory()が呼ばれた後、BuildContextのdetectProject()を実行する。isProject === trueの場合のみプロジェクトパネルを有効化する。通常のMarkdownフォルダを開いた場合は従来の動作のまま。

**7.3 ビルド環境の検証**

python3、pandoc、xelatexの存在をビルド前に検証し、不足の場合はトーストで通知する。

> // buildSystem.js
>
> async function checkDependencies() {
>
> const checks = \[\'python3 \--version\', \'pandoc \--version\', \'xelatex \--version\'\];
>
> // \... 各コマンドの存在確認
>
> }

**7.4 Unicode NFC/NFD問題**

macOSのファイルシステムはNFD（濁点分解）を使用する。ファイルパスの比較時にString.normalize(\'NFC\')を適用すること。特に日本語フォルダ名を含むプロジェクトで問題になる。

**7.5 テスト方針**

-   報告書ビルドシステムのprojects/ディレクトリをテストフィクスチャとして使用

-   detect-projectの判定ロジックを単体テスト

-   ビルド実行の統合テストは実際のpython3 + pandoc環境が必要

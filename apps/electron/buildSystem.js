const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// 同梱ビルドツールチェーン
// ---------------------------------------------------------------------------

/**
 * アプリ同梱の report-build-system の場所を返す。
 * パッケージ版: <resources>/report-build-system（extraResources で同梱）
 * 開発時: リポジトリ直下の report-build-system/
 */
function getBundledToolchainDir() {
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'report-build-system'));
  }
  candidates.push(path.join(__dirname, '..', '..', 'report-build-system'));
  return candidates;
}

async function resolveBundledToolchain() {
  for (const dir of getBundledToolchainDir()) {
    if (await exists(path.join(dir, 'build'))) {
      return dir;
    }
  }
  return null;
}

/**
 * YAML がビルド可能なマニフェスト（title + template + sections/source）かを判定
 */
function isManifestShaped(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      data.title &&
      data.template &&
      (data.sections || data.source)
  );
}

/**
 * フォルダ直下のマニフェスト形 YAML を列挙（スタンドアロン論文フォルダ用）
 */
async function listStandaloneManifests(dirPath) {
  const manifests = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return manifests;
  }
  for (const e of entries) {
    if (!e.isFile() || !/\.ya?ml$/i.test(e.name) || e.name.startsWith('.')) continue;
    const filePath = path.join(dirPath, e.name);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);
      if (isManifestShaped(data)) {
        manifests.push({ filePath, name: e.name, data });
      }
    } catch {
      // 壊れた yaml はスキップ
    }
  }
  return manifests;
}

// ---------------------------------------------------------------------------
// プロジェクト検出
// ---------------------------------------------------------------------------

/**
 * dirPath が報告書ビルドプロジェクトかどうかを判定
 * 条件: `build` スクリプト + `projects/` + `templates/` の存在
 * @returns {{ isProject: boolean, projectDir: string|null }}
 */
async function detectProject(dirPath) {
  try {
    // まず dirPath 直下をチェック
    const [hasBuild, hasProjects, hasTemplates] = await Promise.all([
      exists(path.join(dirPath, 'build')),
      isDirectory(path.join(dirPath, 'projects')),
      isDirectory(path.join(dirPath, 'templates')),
    ]);

    if (hasBuild && hasProjects && hasTemplates) {
      return { isProject: true, projectDir: dirPath };
    }

    // report-build-system/ サブディレクトリもチェック
    const subDir = path.join(dirPath, 'report-build-system');
    const [hasBuild2, hasProjects2, hasTemplates2] = await Promise.all([
      exists(path.join(subDir, 'build')),
      isDirectory(path.join(subDir, 'projects')),
      isDirectory(path.join(subDir, 'templates')),
    ]);

    if (hasBuild2 && hasProjects2 && hasTemplates2) {
      return { isProject: true, projectDir: subDir };
    }

    // スタンドアロン論文フォルダ: フォルダ直下にマニフェスト形 YAML があり、
    // アプリ同梱のツールチェーンでビルドできる場合
    const standalone = await listStandaloneManifests(dirPath);
    if (standalone.length > 0 && (await resolveBundledToolchain())) {
      return { isProject: true, projectDir: dirPath, mode: 'standalone' };
    }

    return { isProject: false, projectDir: null };
  } catch {
    return { isProject: false, projectDir: null };
  }
}

// ---------------------------------------------------------------------------
// マニフェスト一覧・読み書き
// ---------------------------------------------------------------------------

/**
 * projects/*.yaml を走査してマニフェスト一覧を返却
 * @returns {{ success: boolean, manifests: Array<{ name: string, path: string }> }}
 */
async function listManifests(dirPath) {
  try {
    const projectsDir = path.join(dirPath, 'projects');

    // projects/ が無い場合はスタンドアロン論文フォルダとして直下を走査
    if (!(await isDirectory(projectsDir))) {
      const standalone = await listStandaloneManifests(dirPath);
      const manifests = standalone.map(({ filePath, name, data }) => ({
        name: name.replace(/\.ya?ml$/, ''),
        path: filePath,
        fileName: name,
        title: data.title || name.replace(/\.ya?ml$/, ''),
        template: data.template || '',
        style: data.style || '',
        output: Array.isArray(data.output) ? data.output : data.output ? [data.output] : ['pdf'],
        sections: Array.isArray(data.sections) ? data.sections : [],
        sectionCount: Array.isArray(data.sections) ? data.sections.length : 0,
      }));
      return { success: true, manifests };
    }

    const entries = await fs.readdir(projectsDir, { withFileTypes: true });

    const yamlFiles = entries.filter(
      (e) => e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml'))
    );

    const manifests = [];
    for (const e of yamlFiles) {
      const filePath = path.join(projectsDir, e.name);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);
        manifests.push({
          name: e.name.replace(/\.ya?ml$/, ''),
          path: filePath,
          fileName: e.name,
          title: data.title || e.name.replace(/\.ya?ml$/, ''),
          template: data.template || '',
          style: data.style || '',
          output: Array.isArray(data.output) ? data.output : data.output ? [data.output] : ['pdf'],
          sections: Array.isArray(data.sections) ? data.sections : [],
          sectionCount: Array.isArray(data.sections) ? data.sections.length : 0,
        });
      } catch {
        manifests.push({
          name: e.name.replace(/\.ya?ml$/, ''),
          path: filePath,
          fileName: e.name,
          title: e.name.replace(/\.ya?ml$/, ''),
          template: '',
          style: '',
          output: ['pdf'],
          sections: [],
          sectionCount: 0,
        });
      }
    }

    return { success: true, manifests };
  } catch (error) {
    return { success: false, manifests: [], error: error.message };
  }
}

/**
 * YAML マニフェストを読み込み
 * @returns {{ success: boolean, data: object }}
 */
async function readManifest(manifestPath) {
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const data = yaml.load(content);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * YAML マニフェストを書き出し
 * @returns {{ success: boolean }}
 */
async function writeManifest(manifestPath, data) {
  try {
    const content = yaml.dump(data, { lineWidth: -1, noRefs: true });
    await fs.writeFile(manifestPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// テンプレート一覧
// ---------------------------------------------------------------------------

/**
 * templates/ を走査してテンプレート一覧を返却
 * @returns {{ success: boolean, templates: Array<{ name: string, path: string }> }}
 */
async function listTemplates(dirPath) {
  try {
    let templatesDir = path.join(dirPath, 'templates');
    if (!(await isDirectory(templatesDir))) {
      const bundled = await resolveBundledToolchain();
      if (bundled) templatesDir = path.join(bundled, 'templates');
    }
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });

    const templates = entries
      .filter((e) => e.isFile())
      .map((e) => ({
        name: e.name,
        path: path.join(templatesDir, e.name),
      }));

    return { success: true, templates };
  } catch (error) {
    return { success: false, templates: [], error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 依存関係チェック
// ---------------------------------------------------------------------------

/**
 * python3, pandoc, xelatex の存在を確認
 * @returns {{ python3: boolean, pandoc: boolean, xelatex: boolean }}
 */
async function checkDependencies() {
  const [python3, pandoc, xelatex] = await Promise.all([
    commandExists('python3'),
    commandExists('pandoc'),
    commandExists('xelatex'),
  ]);

  // Check python-docx and lxml availability
  let pythonDocx = false;
  let lxml = false;
  if (python3) {
    [pythonDocx, lxml] = await Promise.all([
      pythonModuleExists('docx'),
      pythonModuleExists('lxml'),
    ]);
  }

  return { python3, pandoc, xelatex, 'python-docx': pythonDocx, lxml };
}

/**
 * コマンドが PATH 上に存在するか確認
 */
function commandExists(cmd) {
  return new Promise((resolve) => {
    const which = process.platform === 'win32' ? 'where' : 'which';
    execFile(which, [cmd], (error) => {
      resolve(!error);
    });
  });
}

/**
 * Python モジュールがインポート可能か確認
 */
function pythonModuleExists(moduleName) {
  return new Promise((resolve) => {
    execFile('python3', ['-c', `import ${moduleName}`], (error) => {
      resolve(!error);
    });
  });
}

// ---------------------------------------------------------------------------
// ビルド実行
// ---------------------------------------------------------------------------

/**
 * ビルドスクリプトを実行
 * @param {string} projectRoot - プロジェクトルート
 * @param {string} manifestPath - マニフェストファイルのパス
 * @param {string} format - 出力フォーマット ('pdf' | 'docx')
 * @param {function} onProgress - 進捗コールバック (optional)
 * @returns {{ success: boolean, outputPath?: string, error?: string, stdout?: string, stderr?: string }}
 */
const ALLOWED_FORMATS = ['pdf', 'docx'];

async function runBuild(projectRoot, manifestPath, format, onProgress) {
  // format はホワイトリスト検証（任意引数の注入防止）
  if (format && !ALLOWED_FORMATS.includes(format)) {
    return { success: false, error: `不正な出力フォーマット: ${format}` };
  }

  // ローカルに build スクリプトが無いスタンドアロン論文フォルダは
  // 同梱ツールチェーンでビルドし、成果物は <projectRoot>/mg_output/<fmt>/ に出す
  const localBuildScript = path.join(projectRoot, 'build');
  const isStandalone = !(await exists(localBuildScript));
  let buildScript = localBuildScript;
  const env = { ...process.env };
  const ext = format || 'pdf';
  const manifestName = path.basename(manifestPath, path.extname(manifestPath));
  let expectedOutputPath = path.join(projectRoot, 'output', `${manifestName}.${ext}`);

  if (isStandalone) {
    const bundled = await resolveBundledToolchain();
    if (!bundled) {
      return { success: false, error: 'ビルドツールチェーンが見つかりません（アプリ同梱リソース欠落）' };
    }
    buildScript = path.join(bundled, 'build');
    const outputDir = path.join(projectRoot, 'mg_output', ext);
    env.MARGINALIA_OUTPUT_DIR = outputDir;
    expectedOutputPath = path.join(outputDir, `${manifestName}.${ext}`);
  }

  const args = [buildScript, manifestPath];
  if (format) args.push(`--${format}`);

  // venv の Python を優先、なければシステム python3
  const venvPython = path.join(projectRoot, '.venv', 'bin', 'python3');
  const pythonCmd = (await exists(venvPython)) ? venvPython : 'python3';

  return new Promise((resolve) => {
    const child = execFile(pythonCmd, args, {
      cwd: projectRoot,
      env,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 300000, // 5分タイムアウト
    }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          stdout: stdout || '',
          stderr: stderr || '',
        });
        return;
      }

      resolve({
        success: true,
        outputPath: expectedOutputPath,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });

    // 進捗情報を stdout / stderr 両方からリアルタイムで拾う
    if (onProgress) {
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          onProgress(data.toString());
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          onProgress(data.toString());
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// テンプレートカタログ
// ---------------------------------------------------------------------------

/**
 * templates/catalog.yaml + mytemp/catalog.yaml をマージして読み込み
 * 各テンプレートに _source: 'builtin' | 'custom' を付与
 * @returns {{ success: boolean, catalog: object }}
 */
async function readCatalog(dirPath) {
  try {
    // --- 共通テンプレート (builtin) ---
    // ローカルに templates/ が無いスタンドアロンフォルダはバンドル版を使う
    let catalogBase = dirPath;
    if (!(await exists(path.join(dirPath, 'templates', 'catalog.yaml')))) {
      const bundled = await resolveBundledToolchain();
      if (bundled) catalogBase = bundled;
    }
    const builtinPath = path.join(catalogBase, 'templates', 'catalog.yaml');
    const builtinContent = await fs.readFile(builtinPath, 'utf-8');
    let builtinData = yaml.load(builtinContent);
    if (builtinData && !builtinData.templates) {
      builtinData = { templates: builtinData };
    }

    // builtin テンプレートに _source を付与
    const merged = {};
    if (builtinData && builtinData.templates) {
      for (const [name, tmpl] of Object.entries(builtinData.templates)) {
        merged[name] = { ...tmpl, _source: 'builtin' };
      }
    }

    // --- カスタムテンプレート (custom) ---
    const customPath = path.join(dirPath, 'mytemp', 'catalog.yaml');
    if (await exists(customPath)) {
      const customContent = await fs.readFile(customPath, 'utf-8');
      let customData = yaml.load(customContent);
      if (customData && !customData.templates) {
        customData = { templates: customData };
      }
      if (customData && customData.templates) {
        for (const [name, tmpl] of Object.entries(customData.templates)) {
          merged[name] = { ...tmpl, _source: 'custom' };
        }
      }
    }

    const catalog = {
      templates: merged,
      common_params: builtinData?.common_params || {},
    };

    return { success: true, catalog };
  } catch (error) {
    return { success: false, catalog: null, error: error.message };
  }
}

/**
 * mytemp ディレクトリを初期化
 */
async function initMytemp(dirPath) {
  try {
    const mytempDir = path.join(dirPath, 'mytemp');
    await fs.mkdir(mytempDir, { recursive: true });
    await fs.mkdir(path.join(mytempDir, 'latex'), { recursive: true });
    await fs.mkdir(path.join(mytempDir, 'docx'), { recursive: true });
    await fs.mkdir(path.join(mytempDir, 'previews'), { recursive: true });

    const catalogPath = path.join(mytempDir, 'catalog.yaml');
    if (!(await exists(catalogPath))) {
      await fs.writeFile(catalogPath, '# Custom Templates\n', 'utf-8');
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 既存テンプレートをベースにカスタムテンプレートを作成
 * @param {string} dirPath - プロジェクトルート
 * @param {string} name - 新テンプレート名
 * @param {string} baseTemplate - コピー元テンプレート名 (省略時は空テンプレート)
 */
async function createCustomTemplate(dirPath, name, baseTemplate) {
  try {
    // mytemp 初期化
    await initMytemp(dirPath);

    const mytempDir = path.join(dirPath, 'mytemp');
    const catalogPath = path.join(mytempDir, 'catalog.yaml');

    // 既存カスタムカタログ読み込み
    let customTemplates = {};
    try {
      const content = await fs.readFile(catalogPath, 'utf-8');
      const data = yaml.load(content);
      if (data && typeof data === 'object') {
        customTemplates = data.templates || data;
        if (customTemplates.templates) customTemplates = customTemplates.templates;
      }
    } catch {
      // 空ファイルまたはパースエラー
    }

    // 重複チェック
    if (customTemplates[name]) {
      return { success: false, error: `テンプレート "${name}" は既に存在します` };
    }

    // ベーステンプレート情報を取得
    let newEntry = {
      description: `${name} (カスタム)`,
      type: 'report',
      features: [],
      bundle: {},
    };

    if (baseTemplate) {
      // 共通カタログからベースを読む
      const builtinCatalogPath = path.join(dirPath, 'templates', 'catalog.yaml');
      const builtinContent = await fs.readFile(builtinCatalogPath, 'utf-8');
      let builtinData = yaml.load(builtinContent);
      if (builtinData && !builtinData.templates) {
        builtinData = { templates: builtinData };
      }
      const baseTmpl = builtinData?.templates?.[baseTemplate] || customTemplates[baseTemplate];

      if (baseTmpl) {
        newEntry = {
          description: `${baseTmpl.description || baseTemplate} (カスタムコピー)`,
          type: baseTmpl.type || 'report',
          features: baseTmpl.features ? [...baseTmpl.features] : [],
          styles: baseTmpl.styles ? [...baseTmpl.styles] : undefined,
          bundle: {},
        };

        // バンドルファイルのコピー
        if (baseTmpl.bundle) {
          const newBundle = {};
          for (const [engine, formats] of Object.entries(baseTmpl.bundle)) {
            newBundle[engine] = {};
            for (const [fmt, srcRelPath] of Object.entries(formats)) {
              // コピー元パスを解決（builtin は templates/ 下、custom は mytemp/ 下）
              const isCustomBase = customTemplates[baseTemplate] !== undefined;
              const srcBase = isCustomBase
                ? path.join(dirPath, 'mytemp')
                : path.join(dirPath, 'templates');
              const srcFullPath = path.join(srcBase, srcRelPath);

              // コピー先パスを決定
              const ext = path.extname(srcRelPath);
              const destRelPath = `${fmt}/${name}${ext}`;
              const destFullPath = path.join(mytempDir, destRelPath);

              // ディレクトリ確保してコピー
              await fs.mkdir(path.dirname(destFullPath), { recursive: true });
              try {
                await fs.copyFile(srcFullPath, destFullPath);
              } catch {
                // コピー元が存在しない場合はスキップ
              }

              newBundle[engine][fmt] = destRelPath;
            }
          }
          newEntry.bundle = newBundle;
        }
      }
    }

    // カタログに追加
    customTemplates[name] = newEntry;
    const yamlContent = yaml.dump(customTemplates, { lineWidth: -1, noRefs: true });
    await fs.writeFile(catalogPath, yamlContent, 'utf-8');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * カスタムテンプレートを削除
 * @param {string} dirPath - プロジェクトルート
 * @param {string} name - 削除対象テンプレート名
 */
async function deleteCustomTemplate(dirPath, name) {
  try {
    const mytempDir = path.join(dirPath, 'mytemp');
    const catalogPath = path.join(mytempDir, 'catalog.yaml');

    if (!(await exists(catalogPath))) {
      return { success: false, error: 'カスタムカタログが存在しません' };
    }

    const content = await fs.readFile(catalogPath, 'utf-8');
    let data = yaml.load(content);
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'カタログが空です' };
    }

    // templates ラッパーの有無を判定
    const templates = data.templates || data;
    if (!templates[name]) {
      return { success: false, error: `テンプレート "${name}" が見つかりません` };
    }

    // バンドルファイルを削除
    const tmpl = templates[name];
    if (tmpl.bundle) {
      for (const formats of Object.values(tmpl.bundle)) {
        for (const relPath of Object.values(formats)) {
          const fullPath = path.join(mytempDir, relPath);
          try { await fs.unlink(fullPath); } catch { /* ファイルが無ければスキップ */ }
        }
      }
    }

    // カタログからエントリ削除
    delete templates[name];
    const yamlContent = yaml.dump(templates, { lineWidth: -1, noRefs: true });
    await fs.writeFile(catalogPath, yamlContent, 'utf-8');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// ソースファイル一覧
// ---------------------------------------------------------------------------

/**
 * src/ 配下の .md ファイルを再帰走査
 * @returns {{ success: boolean, files: string[] }}
 */
async function listSourceFiles(dirPath) {
  try {
    const srcDir = path.join(dirPath, 'src');
    const files = await walkMdFiles(srcDir, dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, files: [], error: error.message };
  }
}

async function walkMdFiles(dir, rootDir) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await walkMdFiles(fullPath, rootDir);
        results.push(...sub);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.relative(rootDir, fullPath));
      }
    }
  } catch {
    // ディレクトリが存在しない場合は空
  }
  return results.sort();
}

// ---------------------------------------------------------------------------
// 論文プロジェクトの雛形生成
// ---------------------------------------------------------------------------

const SCAFFOLD_FILES = (title) => ({
  'paper.yaml': `title: "${title}"
author:
  - "著者名, 所属"
date: "${new Date().toISOString().slice(0, 10)}"
template: paper
output: [pdf, docx]
lang: ja
bibliography: references.bib
abstract: |
  ここに要旨を書きます。

sections:
  - 01-intro.md
  - 02-method.md
`,
  '01-intro.md': `# はじめに

本文をここに書きます。引用は [@sample2026] のように書くと references.bib から解決されます。

インライン数式 $E = mc^2$ と、番号付きのディスプレイ数式が使えます:

<!-- equation: eq-sample | \\mathcal{L}(\\theta) = -\\sum_{i=1}^{N} \\log p_\\theta(y_i \\mid x_i) -->

本文中から <!-- ref: eq:eq-sample --> のように参照できます。
`,
  '02-method.md': `# 提案手法

図は figures/ に置いて、次のように挿入します:

<!-- figure: fig-overview | figures/overview.png | システム概要図 | 70% -->

<!-- ref: fig:fig-overview --> に全体構成を示します。

表はキャプション付きで挿入できます:

<!-- table: tbl-result | 実験結果 -->
| 手法 | 精度 |
|------|------|
| 提案手法 | 92.0% |
<!-- /table -->

結果を <!-- ref: tbl:tbl-result --> に示します。
`,
  'references.bib': `@article{sample2026,
  title={Sample Reference Title},
  author={Author, A. and Author, B.},
  journal={Journal of Examples},
  year={2026}
}
`,
});

/**
 * 論文プロジェクトの雛形を生成する。既存ファイルは上書きしない。
 * @returns {{ success: boolean, created: string[], skipped: string[] }}
 */
async function scaffoldPaperProject(dirPath, title) {
  try {
    const files = SCAFFOLD_FILES(title || '論文タイトル');
    const created = [];
    const skipped = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(dirPath, name);
      if (await exists(filePath)) {
        skipped.push(name);
        continue;
      }
      await fs.writeFile(filePath, content, 'utf-8');
      created.push(name);
    }

    // figures/ ディレクトリ
    const figuresDir = path.join(dirPath, 'figures');
    if (!(await exists(figuresDir))) {
      await fs.mkdir(figuresDir, { recursive: true });
      created.push('figures/');
    }

    return { success: true, created, skipped };
  } catch (error) {
    return { success: false, created: [], skipped: [], error: error.message };
  }
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// BibTeX ファイル一覧
// ---------------------------------------------------------------------------

/**
 * プロジェクト内の .bib ファイルを探索し、内容を返却
 * @returns {{ success: boolean, files: Array<{ path: string, content: string }> }}
 */
async function listBibFiles(dirPath) {
  try {
    const results = [];
    await walkBibFiles(dirPath, results);
    return { success: true, files: results };
  } catch (error) {
    return { success: false, files: [], error: error.message };
  }
}

async function walkBibFiles(dir, results) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walkBibFiles(fullPath, results);
      } else if (entry.isFile() && entry.name.endsWith('.bib')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        results.push({ path: fullPath, content });
      }
    }
  } catch {
    // ディレクトリアクセスエラーはスキップ
  }
}

module.exports = {
  detectProject,
  scaffoldPaperProject,
  listManifests,
  listTemplates,
  readManifest,
  writeManifest,
  checkDependencies,
  runBuild,
  readCatalog,
  listSourceFiles,
  listBibFiles,
  initMytemp,
  createCustomTemplate,
  deleteCustomTemplate,
};

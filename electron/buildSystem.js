const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const yaml = require('js-yaml');

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
    const templatesDir = path.join(dirPath, 'templates');
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
function runBuild(projectRoot, manifestPath, format, onProgress) {
  return new Promise(async (resolve) => {
    const args = [path.join(projectRoot, 'build'), manifestPath];
    if (format) args.push(`--${format}`);

    // venv の Python を優先、なければシステム python3
    const venvPython = path.join(projectRoot, '.venv', 'bin', 'python3');
    const pythonCmd = await exists(venvPython) ? venvPython : 'python3';

    // マニフェスト名から出力パスを算出
    const manifestName = path.basename(manifestPath, path.extname(manifestPath));
    const ext = format || 'pdf';
    const expectedOutputPath = path.join(projectRoot, 'output', `${manifestName}.${ext}`);

    const child = execFile(pythonCmd, args, {
      cwd: projectRoot,
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
    const builtinPath = path.join(dirPath, 'templates', 'catalog.yaml');
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

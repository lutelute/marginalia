import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** report-build-system/ ディレクトリへの絶対パス */
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/** templates/ ディレクトリ */
export const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');

/** build スクリプトパス */
export const BUILD_SCRIPT = path.join(PROJECT_ROOT, 'build');

// ============================================================
// ワークスペース管理
// ============================================================
//
// Marginaliaでフォルダを開く → set_project で指定
// プロジェクトフォルダ直下に mg_output/ を作成
//
// フォルダ構成:
//   my-research/                  ← ユーザーのプロジェクトフォルダ
//   ├── manifest.yaml             ← マニフェスト (自動検出)
//   ├── src/
//   │   ├── 01-intro.md
//   │   └── 02-method.md
//   ├── images/
//   ├── refs.bib
//   └── mg_output/                ← Marginalia専用ディレクトリ (自動作成)
//       ├── pdf/                  ← PDF出力
//       ├── docx/                 ← DOCX出力
//       ├── nomenclature.yaml     ← 用語集データ
//       ├── proofreading/         ← 校正テーブル
//       └── logs/                 ← ビルドログ

/** Marginalia専用ディレクトリ名 */
export const MG_OUTPUT_DIR = 'mg_output';

/** 現在のワークスペース状態 */
interface WorkspaceState {
  /** ユーザーのプロジェクトフォルダ絶対パス */
  projectFolder: string;
  /** 自動検出されたマニフェストYAML絶対パス */
  manifestPath: string;
  /** mg_output/ の絶対パス */
  mgOutput: string;
}

let currentWorkspace: WorkspaceState | null = null;

/** ワークスペースを初期化する */
export function setWorkspace(folderPath: string): WorkspaceState {
  const absFolder = path.resolve(folderPath);
  if (!fs.existsSync(absFolder)) {
    throw new Error(`フォルダが見つかりません: ${absFolder}`);
  }

  // マニフェスト自動検出: フォルダ直下の *.yaml
  const yamlFiles = fs.readdirSync(absFolder)
    .filter(f => (f.endsWith('.yaml') || f.endsWith('.yml')) && !f.startsWith('.'))
    .sort();

  if (yamlFiles.length === 0) {
    throw new Error(`マニフェストYAMLが見つかりません: ${absFolder}`);
  }

  const manifestPath = path.join(absFolder, yamlFiles[0]);

  // mg_output/ とサブディレクトリを作成
  const mgOutput = path.join(absFolder, MG_OUTPUT_DIR);
  for (const sub of ['pdf', 'docx', 'proofreading', 'logs']) {
    const dir = path.join(mgOutput, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // .gitignore に mg_output/ を追記 (まだなければ)
  const gitignorePath = path.join(absFolder, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(MG_OUTPUT_DIR)) {
      fs.appendFileSync(gitignorePath, `\n${MG_OUTPUT_DIR}/\n`);
    }
  }

  currentWorkspace = { projectFolder: absFolder, manifestPath, mgOutput };
  return currentWorkspace;
}

/** 現在のワークスペースを取得 (未設定ならエラー) */
export function getWorkspace(): WorkspaceState {
  if (!currentWorkspace) {
    throw new Error('ワークスペースが未設定です。先に set_project を呼んでフォルダを指定してください。');
  }
  return currentWorkspace;
}

/** ワークスペースが設定済みかどうか */
export function hasWorkspace(): boolean {
  return currentWorkspace !== null;
}

/** mg_output/ 内のサブディレクトリパスを取得 */
export function getMgPath(sub: 'pdf' | 'docx' | 'proofreading' | 'logs' | ''): string {
  const ws = getWorkspace();
  return sub ? path.join(ws.mgOutput, sub) : ws.mgOutput;
}

/** マニフェストパスを解決する (ワークスペース対応版) */
export function resolveManifest(manifestPath?: string): string {
  if (manifestPath) {
    if (path.isAbsolute(manifestPath)) return manifestPath;
    if (currentWorkspace) return path.join(currentWorkspace.projectFolder, manifestPath);
    return path.join(PROJECT_ROOT, 'projects', manifestPath);
  }
  return getWorkspace().manifestPath;
}

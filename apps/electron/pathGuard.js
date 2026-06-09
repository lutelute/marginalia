/**
 * Marginalia - パス検証モジュール
 *
 * レンダラーから渡されるファイルパスを検証し、
 * ワークスペース（ユーザーが開いたフォルダ）外への
 * パストラバーサルを防ぐ。
 *
 * 信頼モデル:
 * - 「フォルダを開く」操作（dialog / readDirectory）でルートを登録し、
 *   ファイル単位のアクセス（読み取り・プレビュー・外部オープン等）は
 *   登録済みルート配下のみ許可する。
 * - 悪意ある Markdown コンテンツ（local-file:// 参照や iframe 等）が
 *   ワークスペース外のファイルを読み出すことを防ぐのが主目的。
 * - 機密ディレクトリ（~/.ssh 等）はルート登録に関わらず常に拒否する。
 */

const path = require('path');
const os = require('os');

/** 登録済みワークスペースルート */
const allowedRoots = new Set();

/** ルート登録の有無に関わらず常にアクセスを拒否するディレクトリ */
const DENY_DIRS = [
  path.join(os.homedir(), '.ssh'),
  path.join(os.homedir(), '.gnupg'),
  path.join(os.homedir(), '.aws'),
  path.join(os.homedir(), '.config', 'gh'),
  path.join(os.homedir(), '.kube'),
];

/**
 * パスを正規化（NFC統一 + path.normalize + 絶対化）
 * macOS の NFD ファイル名問題への対策を兼ねる
 */
function canonicalize(p) {
  return path.resolve(path.normalize(String(p).normalize('NFC')));
}

/** parent が child を含む（または同一）かどうか */
function contains(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * ワークスペースルートを登録する。
 * 「フォルダを開く」相当の操作時にのみ呼ぶこと。
 */
function addAllowedRoot(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return;
  const resolved = canonicalize(dirPath);
  // 機密ディレクトリ自体をルート登録するのは拒否
  if (DENY_DIRS.some((d) => contains(d, resolved))) return;
  allowedRoots.add(resolved);
}

/**
 * ユーザーが明示的に開いたファイルの「親ディレクトリ」を許可ルートに登録する。
 *
 * 信頼モデル: タブ復元・ファイルを開く等、ユーザー操作起点で読み込まれる
 * ファイルは信頼できる。その親ディレクトリを登録することで、
 * フォルダ未オープン状態での起動直後にPDFタブや相対パス画像が
 * pathGuard に弾かれる問題を防ぐ。
 *
 * 注意: これは「信頼された読み込みハンドラ（readFile / readFileAsBase64 /
 * openPdfViewer）」からのみ呼ぶこと。local-file プロトコル（未信頼の
 * Markdown コンテンツ由来）からは呼ばない＝任意ファイル読み出しは引き続き
 * 登録済みルート配下に限定される。
 */
function addAllowedFileDir(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  let resolved;
  try {
    resolved = canonicalize(filePath);
  } catch {
    return;
  }
  addAllowedRoot(path.dirname(resolved));
}

/** 登録済みルート配下かどうか（機密ディレクトリは常に拒否） */
function isPathAllowed(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  let resolved;
  try {
    resolved = canonicalize(filePath);
  } catch {
    return false;
  }
  if (DENY_DIRS.some((d) => contains(d, resolved))) return false;
  for (const root of allowedRoots) {
    if (contains(root, resolved)) return true;
  }
  return false;
}

/**
 * 許可されていないパスなら Error を投げる
 * @param {string} filePath
 * @param {string} label - エラーメッセージ用のラベル
 */
function assertPathAllowed(filePath, label = 'ファイル') {
  if (!isPathAllowed(filePath)) {
    throw new Error(`${label}へのアクセスが拒否されました（ワークスペース外）: ${filePath}`);
  }
}

/** 登録済みルート一覧（デバッグ用） */
function getAllowedRoots() {
  return [...allowedRoots];
}

module.exports = {
  addAllowedRoot,
  addAllowedFileDir,
  isPathAllowed,
  assertPathAllowed,
  getAllowedRoots,
  canonicalize,
};

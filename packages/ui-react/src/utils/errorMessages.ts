/**
 * 技術的なエラーメッセージをユーザー向けの日本語メッセージに変換するユーティリティ。
 *
 * 設計方針:
 * - UI（Toast / エラー表示）には人間に分かりやすい日本語を出す。
 * - 情報は失わない: 未知のエラーは元のメッセージを「エラー: 」付きで返す。
 * - 元の技術的メッセージは握りつぶさず、呼び出し側で必ず console.error にログとして残すこと。
 *   例:
 *     try { ... } catch (e) {
 *       console.error('[saveFile] failed:', e);            // 技術ログは維持
 *       dispatch({ type: 'SET_ERROR', payload: humanizeError(e) }); // UI は日本語
 *     }
 */

/** Node.js の errno 例外で code を持つことがあるため、緩く判定する。 */
interface ErrnoLike {
  code?: unknown;
  message?: unknown;
  name?: unknown;
}

/** 既知の errno コード → ユーザー向け日本語メッセージ。 */
const ERRNO_MESSAGES: Record<string, string> = {
  ENOENT: 'ファイルが見つかりません',
  EACCES: 'アクセス権限がありません',
  EPERM: 'アクセス権限がありません',
  ENOSPC: 'ディスクの空き容量が不足しています',
  EBUSY: 'ファイルが他のプログラムで使用中です',
  EMFILE: '開いているファイルが多すぎます',
  ENFILE: '開いているファイルが多すぎます',
  EISDIR: '指定された対象はフォルダです（ファイルを指定してください）',
  ENOTDIR: '指定された対象はフォルダではありません',
  EEXIST: '同名のファイルまたはフォルダが既に存在します',
  EROFS: '書き込みできません（読み取り専用です）',
  ENAMETOOLONG: 'ファイル名が長すぎます',
  ECONNREFUSED: 'サーバーに接続できません',
  ETIMEDOUT: '処理がタイムアウトしました',
};

/** メッセージ本文から errno コードを抽出する（"ENOENT: no such file..." 等）。 */
function extractErrnoCode(text: string): string | undefined {
  const match = text.match(/\b(E[A-Z]+)\b/);
  if (match && ERRNO_MESSAGES[match[1]]) {
    return match[1];
  }
  return undefined;
}

/** JSON / YAML / パース系のエラーかどうかを判定する。 */
function isParseError(name: string, text: string): boolean {
  if (name === 'SyntaxError') return true;
  return /JSON|Unexpected token|Unexpected end of (JSON|input)|YAMLException|parse|構文/i.test(
    text
  );
}

/**
 * 任意のエラー値をユーザー向けの日本語メッセージに変換する。
 *
 * - Error / 文字列 / その他オブジェクトを受け取れる。
 * - 既知の errno（ENOENT 等）やパースエラーは固定の日本語に変換する。
 * - 未知のエラーは情報を失わないよう「エラー: <元メッセージ>」で返す。
 *
 * 注意: この関数はログ出力を行わない。技術的詳細は呼び出し側で
 * console.error 等に残すこと（上部のコメント参照）。
 */
export function humanizeError(error: unknown): string {
  // 1. errno コード（Error オブジェクトの code プロパティ優先）
  const errnoCode =
    typeof (error as ErrnoLike)?.code === 'string'
      ? ((error as ErrnoLike).code as string)
      : undefined;
  if (errnoCode && ERRNO_MESSAGES[errnoCode]) {
    return ERRNO_MESSAGES[errnoCode];
  }

  // 2. 生メッセージの取り出し
  let rawMessage: string;
  let errorName = '';
  if (error instanceof Error) {
    rawMessage = error.message || '';
    errorName = error.name || '';
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else if (error == null) {
    return '不明なエラーが発生しました';
  } else {
    const maybe = error as ErrnoLike;
    rawMessage =
      typeof maybe.message === 'string' ? maybe.message : String(error);
    errorName = typeof maybe.name === 'string' ? maybe.name : '';
  }

  const trimmed = rawMessage.trim();

  // 3. メッセージ本文に埋め込まれた errno コード
  const embeddedCode = extractErrnoCode(trimmed);
  if (embeddedCode) {
    return ERRNO_MESSAGES[embeddedCode];
  }

  // 4. パース系（JSON / YAML / 構文）エラー → 形式破損
  if (isParseError(errorName, trimmed)) {
    return 'ファイルの形式が壊れています';
  }

  // 5. 空メッセージ
  if (!trimmed) {
    return '不明なエラーが発生しました';
  }

  // 6. 未知のエラー: 情報を失わないよう元メッセージを保持
  return `エラー: ${trimmed}`;
}

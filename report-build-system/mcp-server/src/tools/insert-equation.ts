const LABEL_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

export function insertEquation(label: string, latex: string): string {
  if (!LABEL_RE.test(label)) {
    throw new Error(`無効なラベル: "${label}" (英数字・アンダースコア・ハイフンのみ)`);
  }
  return `<!-- equation: ${label} | ${latex} -->`;
}

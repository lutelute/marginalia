/**
 * ホバーカード（注釈プレビュー）の位置計算ユーティリティ
 *
 * エディタ（MarkdownEditor）とプレビュー（AnnotatedPreview）の双方で
 * 同じ水平クランプ計算が重複していたため共通化する。
 * position: fixed のカードがビューポート左右にはみ出さないよう、
 * 中心 X 座標からカード左端 X を算出してクランプする。
 */

/** ホバーカードの幅（CSS .ahc-* / .hover-card 側と一致させること） */
export const HOVER_CARD_WIDTH = 320;

/** ビューポート端との最小マージン */
export const HOVER_CARD_MARGIN = 8;

/**
 * カードの中心に置きたい X 座標を渡すと、ビューポート内に収まる
 * カード左端の X 座標を返す。
 *
 * @param centerX カードを中央寄せしたい基準 X（要素中心やマウス X）
 * @param cardWidth カード幅（既定 320）
 * @param margin ビューポート端からの最小マージン（既定 8）
 */
export function clampHoverCardX(
  centerX: number,
  cardWidth: number = HOVER_CARD_WIDTH,
  margin: number = HOVER_CARD_MARGIN
): number {
  const left = centerX - cardWidth / 2;
  return Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));
}

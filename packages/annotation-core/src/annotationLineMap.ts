import { AnnotationV2 } from './annotations';
import { anchorAnnotation, computeEditorPositionFromOffset } from './selectorUtils';

/**
 * 注釈をドキュメントの行番号（1始まり）にマッピングする。
 * 差分ビュー等で「この行に注釈がある」を表示するために使う。
 *
 * - resolved / archived は対象外（決着済みのため）
 * - アンカーできない注釈（orphaned 等）はスキップ
 * - 複数行にまたがる注釈は各行に登録される
 */
export function mapAnnotationsToLines(
  annotations: AnnotationV2[],
  docText: string
): Record<number, AnnotationV2[]> {
  const byLine: Record<number, AnnotationV2[]> = {};
  if (!docText) return byLine;

  for (const annotation of annotations) {
    if (annotation.status === 'resolved' || annotation.status === 'archived') continue;

    const anchored = anchorAnnotation(docText, annotation);
    if (!anchored) continue;

    const { startLine, endLine } = computeEditorPositionFromOffset(
      docText,
      anchored.start,
      anchored.end
    );

    for (let line = startLine; line <= endLine; line++) {
      (byLine[line] ||= []).push(annotation);
    }
  }

  return byLine;
}

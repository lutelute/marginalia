import { AnnotationV2, AnnotationType } from '../../types/annotations';
import { getAnnotationExactText } from '../../utils/selectorUtils';

export function getAnnotationColor(type: AnnotationType): string {
  switch (type) {
    case 'comment': return 'rgba(255, 193, 7, 0.3)';
    case 'review': return 'rgba(156, 39, 176, 0.3)';
    case 'pending': return 'rgba(33, 150, 243, 0.3)';
    case 'discussion': return 'rgba(76, 175, 80, 0.3)';
    default: return 'rgba(255, 193, 7, 0.3)';
  }
}

// 注釈をMarkdownに埋め込む（V2対応）
export function embedAnnotationsToMarkdown(md: string, annots: AnnotationV2[]): string {
  let result = md;
  const unresolvedAnnots = annots.filter(a => a.status === 'active');

  // V2: TextQuoteSelectorのexactを使用
  const sorted = [...unresolvedAnnots].sort((a, b) => {
    const aText = getAnnotationExactText(a);
    const bText = getAnnotationExactText(b);
    return (bText?.length || 0) - (aText?.length || 0);
  });

  for (const annot of sorted) {
    const selectedText = getAnnotationExactText(annot);
    if (!selectedText) continue;
    const color = getAnnotationColor(annot.type);
    const styledText = `<mark style="background-color: ${color}; padding: 2px 4px;" title="${annot.type}: ${annot.content.replace(/"/g, '&quot;')}">${selectedText}</mark>`;
    result = result.replace(selectedText, styledText);
  }

  return result;
}

// HTMLとして注釈付きでエクスポート
export function generateHTMLWithAnnotations(md: string, annots: AnnotationV2[], currentFile: string | null): string {
  const styledMd = embedAnnotationsToMarkdown(md, annots);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentFile?.split('/').pop() || 'Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: Menlo, Monaco, monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    mark { border-radius: 3px; }
  </style>
</head>
<body>
${styledMd}
</body>
</html>`;
}

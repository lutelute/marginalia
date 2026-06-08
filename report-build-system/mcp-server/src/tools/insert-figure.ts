export function insertFigure(
  label: string,
  imagePath: string,
  caption: string,
  width?: string,
): string {
  const parts = [label, imagePath, caption];
  if (width) parts.push(width);
  return `<!-- figure: ${parts.join(' | ')} -->`;
}

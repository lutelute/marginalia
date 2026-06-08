type Alignment = 'left' | 'center' | 'right';

export function insertTable(
  label: string,
  caption: string,
  headers: string[],
  rows: string[][],
  alignment?: Alignment[],
): string {
  const aligns = alignment || headers.map(() => 'left' as Alignment);

  const alignMarker = (a: Alignment) => {
    switch (a) {
      case 'left': return ':---';
      case 'center': return ':---:';
      case 'right': return '---:';
    }
  };

  const lines: string[] = [];
  lines.push(`<!-- table: ${label} | ${caption} -->`);
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${aligns.map(alignMarker).join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push(`<!-- /table -->`);

  return lines.join('\n');
}

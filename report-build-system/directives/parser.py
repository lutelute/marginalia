"""
Directive parser for HTML-comment-based document directives.

Supported directives
--------------------
figure     <!-- figure: label | path | caption | width -->
equation   <!-- equation: label | latex -->
table      <!-- table: label | caption --> ... <!-- /table -->
algorithm  <!-- algorithm: label | caption --> ... <!-- /algorithm -->
ref        <!-- ref: label -->
pagebreak  <!-- pagebreak -->
raw-docx   <!-- raw-docx --> ... <!-- /raw-docx -->
style      <!-- style: StyleName | text -->
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class DirectiveType(Enum):
    FIGURE = 'figure'
    EQUATION = 'equation'
    TABLE = 'table'
    TABLE_END = '/table'
    ALGORITHM = 'algorithm'
    ALGORITHM_END = '/algorithm'
    REF = 'ref'
    PAGEBREAK = 'pagebreak'
    RAW_DOCX = 'raw-docx'
    RAW_DOCX_END = '/raw-docx'
    STYLE = 'style'


@dataclass
class Directive:
    """Parsed directive from an HTML comment."""
    type: DirectiveType
    args: List[str] = field(default_factory=list)
    body: Optional[str] = None  # For block directives (table, algorithm, raw-docx)
    line: int = 0  # Source line number

    # Convenience accessors
    @property
    def label(self) -> Optional[str]:
        return self.args[0].strip() if self.args else None

    @property
    def path(self) -> Optional[str]:
        return self.args[1].strip() if len(self.args) > 1 else None

    @property
    def caption(self) -> Optional[str]:
        if self.type == DirectiveType.FIGURE:
            return self.args[2].strip() if len(self.args) > 2 else None
        if self.type in (DirectiveType.TABLE, DirectiveType.ALGORITHM):
            return self.args[1].strip() if len(self.args) > 1 else None
        return None

    @property
    def width(self) -> Optional[str]:
        return self.args[3].strip() if len(self.args) > 3 else None

    @property
    def latex(self) -> Optional[str]:
        """For equation directives."""
        return self.args[1].strip() if len(self.args) > 1 else None

    @property
    def style_name(self) -> Optional[str]:
        """For style directives."""
        return self.args[0].strip() if self.args else None

    @property
    def style_text(self) -> Optional[str]:
        """For style directives."""
        return self.args[1].strip() if len(self.args) > 1 else None


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Matches <!-- directive_name: args --> or <!-- directive_name -->
_DIRECTIVE_RE = re.compile(
    r'<!--\s*'
    r'(/?\w[\w-]*)'        # directive name (with optional leading /)
    r'(?:\s*:\s*(.+?))?'   # optional colon + arguments
    r'\s*-->',
    re.DOTALL,
)

# Block directive end tags
_BLOCK_END_MAP = {
    'table': '/table',
    'algorithm': '/algorithm',
    'raw-docx': '/raw-docx',
}

_DIRECTIVE_NAMES = {e.value for e in DirectiveType}


def parse_directives(text: str) -> List[Directive]:
    """Parse all directives from markdown text.

    Block directives (table, algorithm, raw-docx) capture everything between
    the opening and closing tags as ``body``.

    Returns a list of Directive objects in document order.
    """
    results: List[Directive] = []
    lines = text.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i]
        m = _DIRECTIVE_RE.search(line)
        if not m:
            i += 1
            continue

        name = m.group(1).strip().lower()
        raw_args = m.group(2) or ''

        if name not in _DIRECTIVE_NAMES:
            i += 1
            continue

        args = [a.strip() for a in raw_args.split('|')] if raw_args else []
        dtype = DirectiveType(name)

        # Handle block directives
        end_tag = _BLOCK_END_MAP.get(name)
        if end_tag:
            body_lines = []
            j = i + 1
            while j < len(lines):
                end_m = _DIRECTIVE_RE.search(lines[j])
                if end_m and end_m.group(1).strip().lower() == end_tag:
                    break
                body_lines.append(lines[j])
                j += 1
            results.append(Directive(
                type=dtype,
                args=args,
                body='\n'.join(body_lines),
                line=i + 1,
            ))
            i = j + 1  # skip past end tag
            continue

        results.append(Directive(type=dtype, args=args, line=i + 1))
        i += 1

    return results

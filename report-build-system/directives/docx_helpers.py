"""
DOCX helper utilities for the python-docx engine.

Provides:
- OMML (Office MathML) conversion from LaTeX
- SEQ field insertion for auto-numbering (figures, tables, equations)
- Bookmark creation for cross-references
- Style application helpers
"""

from typing import Optional
from lxml import etree

# ---------------------------------------------------------------------------
# XML namespaces
# ---------------------------------------------------------------------------

NSMAP = {
    'w':   'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r':   'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'wp':  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a':   'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'm':   'http://schemas.openxmlformats.org/officeDocument/2006/math',
}


def _qn(tag: str) -> str:
    """Expand a namespace-prefixed tag like 'w:p' to full Clark notation."""
    prefix, local = tag.split(':')
    return f'{{{NSMAP[prefix]}}}{local}'


# ---------------------------------------------------------------------------
# SEQ field for auto-numbering
# ---------------------------------------------------------------------------

def make_seq_field(
    seq_name: str,
    prefix: Optional[str] = None,
    bookmark_name: Optional[str] = None,
) -> etree._Element:
    """Create a Word SEQ field run element for auto-numbering.

    Produces XML like:
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText> SEQ Figure </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>1</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>

    If prefix is given, the text before the number becomes "prefix-".
    If bookmark_name is given, wraps the number in a bookmark.

    Returns a list of <w:r> elements to insert into a <w:p>.
    """
    runs = []

    # Prefix text run
    if prefix:
        r = etree.SubElement(etree.Element('dummy'), _qn('w:r'))
        t = etree.SubElement(r, _qn('w:t'))
        t.set(_qn('w:space'), 'preserve')  # preserve trailing space
        t.text = f'{prefix}-'
        runs.append(r)

    # Bookmark start
    if bookmark_name:
        bm_start = etree.Element(_qn('w:bookmarkStart'))
        bm_start.set(_qn('w:id'), str(hash(bookmark_name) % 2**31))
        bm_start.set(_qn('w:name'), bookmark_name)
        runs.append(bm_start)

    # Field begin
    r_begin = etree.Element(_qn('w:r'))
    fc_begin = etree.SubElement(r_begin, _qn('w:fldChar'))
    fc_begin.set(_qn('w:fldCharType'), 'begin')
    runs.append(r_begin)

    # Field instruction
    r_instr = etree.Element(_qn('w:r'))
    instr = etree.SubElement(r_instr, _qn('w:instrText'))
    instr.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    instr.text = f' SEQ {seq_name} '
    runs.append(r_instr)

    # Field separate
    r_sep = etree.Element(_qn('w:r'))
    fc_sep = etree.SubElement(r_sep, _qn('w:fldChar'))
    fc_sep.set(_qn('w:fldCharType'), 'separate')
    runs.append(r_sep)

    # Placeholder value (Word updates on open)
    r_val = etree.Element(_qn('w:r'))
    t_val = etree.SubElement(r_val, _qn('w:t'))
    t_val.text = '#'
    runs.append(r_val)

    # Field end
    r_end = etree.Element(_qn('w:r'))
    fc_end = etree.SubElement(r_end, _qn('w:fldChar'))
    fc_end.set(_qn('w:fldCharType'), 'end')
    runs.append(r_end)

    # Bookmark end
    if bookmark_name:
        bm_end = etree.Element(_qn('w:bookmarkEnd'))
        bm_end.set(_qn('w:id'), str(hash(bookmark_name) % 2**31))
        runs.append(bm_end)

    return runs


def make_ref_field(bookmark_name: str) -> list:
    """Create a REF field that references a bookmark (for cross-references).

    Returns a list of <w:r> elements.
    """
    runs = []

    r_begin = etree.Element(_qn('w:r'))
    fc_begin = etree.SubElement(r_begin, _qn('w:fldChar'))
    fc_begin.set(_qn('w:fldCharType'), 'begin')
    runs.append(r_begin)

    r_instr = etree.Element(_qn('w:r'))
    instr = etree.SubElement(r_instr, _qn('w:instrText'))
    instr.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    instr.text = f' REF {bookmark_name} \\h '
    runs.append(r_instr)

    r_sep = etree.Element(_qn('w:r'))
    fc_sep = etree.SubElement(r_sep, _qn('w:fldChar'))
    fc_sep.set(_qn('w:fldCharType'), 'separate')
    runs.append(r_sep)

    r_val = etree.Element(_qn('w:r'))
    t_val = etree.SubElement(r_val, _qn('w:t'))
    t_val.text = '??'
    runs.append(r_val)

    r_end = etree.Element(_qn('w:r'))
    fc_end = etree.SubElement(r_end, _qn('w:fldChar'))
    fc_end.set(_qn('w:fldCharType'), 'end')
    runs.append(r_end)

    return runs


# ---------------------------------------------------------------------------
# LaTeX → OMML conversion
# ---------------------------------------------------------------------------

# Minimal LaTeX-to-OMML cache
_omml_cache: dict = {}


def latex_to_omml(latex_str: str) -> Optional[etree._Element]:
    """Convert a LaTeX math string to Office MathML (OMML).

    Uses pandoc as a conversion bridge:
        LaTeX → pandoc → docx → extract OMML

    Results are cached.
    """
    if latex_str in _omml_cache:
        return _omml_cache[latex_str]

    import subprocess
    import tempfile
    import zipfile
    import os

    md_content = f'$${latex_str}$$'

    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.md', delete=False, encoding='utf-8'
        ) as tmp_in:
            tmp_in.write(md_content)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace('.md', '.docx')

        subprocess.run(
            ['pandoc', tmp_in_path, '-o', tmp_out_path],
            capture_output=True, check=True,
        )

        with zipfile.ZipFile(tmp_out_path) as zf:
            doc_xml = zf.read('word/document.xml')

        tree = etree.fromstring(doc_xml)
        # Find the first m:oMathPara or m:oMath element
        math_el = tree.find('.//' + _qn('m:oMathPara'))
        if math_el is None:
            math_el = tree.find('.//' + _qn('m:oMath'))

        _omml_cache[latex_str] = math_el
        return math_el

    except Exception:
        _omml_cache[latex_str] = None
        return None

    finally:
        for p in (tmp_in_path, tmp_out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Paragraph helpers
# ---------------------------------------------------------------------------

def add_page_break(document) -> None:
    """Insert a page break into a python-docx Document."""
    from docx.oxml.ns import qn
    p = document.add_paragraph()
    run = p.add_run()
    br = etree.SubElement(run._element, qn('w:br'))
    br.set(qn('w:type'), 'page')


def set_paragraph_style(paragraph, style_name: str) -> None:
    """Apply a named Word style to a paragraph."""
    try:
        paragraph.style = style_name
    except KeyError:
        pass  # Style doesn't exist in template — skip silently

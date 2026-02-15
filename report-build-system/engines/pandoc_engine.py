"""
Pandoc-based build engine.

Extracted from the original ``build`` script's ``build_output()`` function.
Handles PDF (via XeLaTeX / LuaLaTeX) and DOCX (via reference-doc) output.
"""

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from . import BuildEngine, register_engine


@register_engine('pandoc')
class PandocEngine(BuildEngine):
    """Build documents using Pandoc."""

    # -----------------------------------------------------------------
    # BuildEngine interface
    # -----------------------------------------------------------------

    def build(
        self,
        manifest: Dict[str, Any],
        format_type: str,
        content: str,
        manifest_path: Path,
        project_root: Path,
    ) -> bool:
        template = manifest.get('template', 'report')
        style = manifest.get('style')
        output_dir = project_root / 'output'
        output_dir.mkdir(exist_ok=True)

        manifest_name = manifest_path.stem

        # Construct styled template name
        styled_template = f"{template}-{style}" if style else template

        # Resolve template file
        template_path = self._resolve_template_path(
            template, styled_template, style, format_type, project_root, manifest
        )
        if template_path is None:
            return False

        # Determine output path
        ext = format_type
        output_path = output_dir / f"{manifest_name}.{ext}"

        # Build Pandoc command
        cmd = self._build_command(
            manifest, format_type, template_path, output_path, project_root
        )

        # Write temp file and execute
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.md', delete=False, encoding='utf-8'
        ) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            rel_output = output_path.relative_to(project_root)
            print(f"Building {rel_output}... ", end='', flush=True)

            cmd.insert(1, tmp_path)  # input file right after 'pandoc'

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print("FAILED")
                print(f"ERROR: Pandoc failed with exit code {result.returncode}")
                if result.stderr:
                    print("STDERR:")
                    print(result.stderr)
                return False

            print("\u2713")
            return True
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def check_dependencies(self) -> Dict[str, bool]:
        return {
            'pandoc': _command_exists('pandoc'),
            'xelatex': _command_exists('xelatex'),
        }

    def resolve_template(
        self,
        manifest: Dict[str, Any],
        format_type: str,
        project_root: Path,
    ) -> Optional[Path]:
        template = manifest.get('template', 'report')
        style = manifest.get('style')
        styled_template = f"{template}-{style}" if style else template
        return self._resolve_template_path(
            template, styled_template, style, format_type, project_root, manifest
        )

    # -----------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------

    def _resolve_template_path(
        self,
        template: str,
        styled_template: str,
        style: Optional[str],
        format_type: str,
        project_root: Path,
        manifest: Dict[str, Any],
    ) -> Optional[Path]:
        """Resolve the template file path, trying styled variant first."""

        # Check bundle info first
        bundle = manifest.get('_bundle')
        if bundle and 'pandoc' in bundle:
            pandoc_bundle = bundle['pandoc']
            bundle_file = pandoc_bundle.get(format_type)
            if bundle_file:
                p = project_root / 'templates' / bundle_file
                if p.exists():
                    return p

        if format_type == 'pdf':
            styled_path = project_root / 'templates' / 'latex' / f"{styled_template}.latex"
            base_path = project_root / 'templates' / 'latex' / f"{template}.latex"
        else:
            styled_path = project_root / 'templates' / 'docx' / f"{styled_template}-reference.docx"
            base_path = project_root / 'templates' / 'docx' / f"{template}-reference.docx"

        if styled_path.exists():
            return styled_path
        if style:
            if base_path.exists():
                print(f"WARNING: Styled template not found: {styled_path}, using base template: {base_path}")
                return base_path
            print(f"ERROR: Template not found: {base_path}")
            return None
        if base_path.exists():
            return base_path

        print(f"ERROR: Template not found: {base_path}")
        return None

    def _build_command(
        self,
        manifest: Dict[str, Any],
        format_type: str,
        template_path: Path,
        output_path: Path,
        project_root: Path,
    ) -> list:
        """Assemble the pandoc CLI arguments."""
        template = manifest.get('template', 'report')
        engine = manifest.get('pdf-engine', 'xelatex')

        cmd = ['pandoc', '-f', 'markdown']

        if format_type == 'docx':
            cmd.extend(['-t', 'docx'])

        if format_type == 'pdf':
            cmd.extend([f'--pdf-engine={engine}'])
            cmd.extend([f'--template={template_path}'])
        else:
            cmd.extend([f'--reference-doc={template_path}'])

        # Filters
        filters_dir = project_root / 'filters'

        if (filters_dir / 'metadata-defaults.lua').exists():
            cmd.extend([f'--lua-filter={filters_dir / "metadata-defaults.lua"}'])

        # cjk-font.lua: skip for lualatex
        if format_type == 'pdf' and engine != 'lualatex' and (filters_dir / 'cjk-font.lua').exists():
            cmd.extend([f'--lua-filter={filters_dir / "cjk-font.lua"}'])

        # Directives filter (inserted before crossref)
        if (filters_dir / 'directives.lua').exists():
            cmd.extend([f'--lua-filter={filters_dir / "directives.lua"}'])

        # Cross-reference
        crossref_mode = manifest.get('crossref', 'builtin')
        if crossref_mode == 'pandoc-crossref':
            cmd.extend(['--filter', 'pandoc-crossref'])
        else:
            if (filters_dir / 'crossref.lua').exists():
                cmd.extend([f'--lua-filter={filters_dir / "crossref.lua"}'])

        if (filters_dir / 'layout.lua').exists():
            cmd.extend([f'--lua-filter={filters_dir / "layout.lua"}'])

        # Bibliography / citeproc
        bib = manifest.get('bibliography')
        if bib:
            bib_path = Path(bib)
            if not bib_path.is_absolute():
                bib_path = project_root / bib_path
            cmd.extend([f'--bibliography={bib_path}'])
            cmd.append('--citeproc')

        csl = manifest.get('csl')
        if csl:
            csl_path = Path(csl)
            if not csl_path.is_absolute():
                csl_path = project_root / csl_path
            cmd.extend([f'--csl={csl_path}'])

        # Conference heading shift
        if 'conference' in template:
            cmd.extend(['--shift-heading-level-by=-1'])

        if manifest.get('numbering'):
            cmd.append('--number-sections')

        if manifest.get('toc'):
            cmd.append('--toc')

        cmd.extend(['-o', str(output_path)])
        return cmd


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _command_exists(cmd: str) -> bool:
    """Check if a command is available on PATH."""
    import shutil
    return shutil.which(cmd) is not None

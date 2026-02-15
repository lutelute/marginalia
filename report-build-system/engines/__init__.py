"""
Build engine abstraction layer.

Provides a registry of build engines (Pandoc, python-docx, etc.)
that can be selected via manifest YAML `docx-engine` field.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Engine registry
# ---------------------------------------------------------------------------

_ENGINE_REGISTRY: Dict[str, type] = {}


def register_engine(name: str):
    """Decorator to register an engine class by name."""
    def decorator(cls):
        _ENGINE_REGISTRY[name] = cls
        return cls
    return decorator


def get_engine(name: str) -> 'BuildEngine':
    """Instantiate a registered engine by name."""
    cls = _ENGINE_REGISTRY.get(name)
    if cls is None:
        available = ', '.join(sorted(_ENGINE_REGISTRY.keys()))
        raise ValueError(f"Unknown engine '{name}'. Available: {available}")
    return cls()


def list_engines():
    """Return list of registered engine names."""
    return sorted(_ENGINE_REGISTRY.keys())


# ---------------------------------------------------------------------------
# Abstract base class
# ---------------------------------------------------------------------------

class BuildEngine(ABC):
    """Abstract base class for document build engines."""

    @abstractmethod
    def build(
        self,
        manifest: Dict[str, Any],
        format_type: str,
        content: str,
        manifest_path: Path,
        project_root: Path,
    ) -> bool:
        """Build a single output file.

        Args:
            manifest: Parsed YAML manifest dict.
            format_type: 'pdf' or 'docx'.
            content: Concatenated markdown content (with YAML front matter).
            manifest_path: Path to the manifest YAML file.
            project_root: Root of the build-system project.

        Returns:
            True on success.
        """
        ...

    @abstractmethod
    def check_dependencies(self) -> Dict[str, bool]:
        """Check that required external tools are available.

        Returns:
            Dict mapping dependency name to availability boolean.
        """
        ...

    def resolve_template(
        self,
        manifest: Dict[str, Any],
        format_type: str,
        project_root: Path,
    ) -> Optional[Path]:
        """Resolve template path from manifest + catalog bundle info.

        Default implementation returns None (engine-specific logic needed).
        """
        return None


# ---------------------------------------------------------------------------
# Auto-import engines so they self-register
# ---------------------------------------------------------------------------

from . import pandoc_engine  # noqa: E402, F401
try:
    from . import docx_engine  # noqa: E402, F401
except ImportError:
    # python-docx not installed — docx_engine won't be available
    pass

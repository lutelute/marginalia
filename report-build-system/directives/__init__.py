"""
Directive parsing for HTML-comment-based document directives.

Directives use ``<!-- directive: args -->`` syntax and are processed
by both the Pandoc Lua filter and the python-docx engine.
"""

from .parser import Directive, DirectiveType, parse_directives  # noqa: F401

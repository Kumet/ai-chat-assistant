from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from ..models import AnalysisResponseModel, DependencyEdgeModel, SymbolKind, SymbolModel

PROJECT_ROOT = Path(__file__).resolve().parents[4]
CODE_DIRECTORIES = [PROJECT_ROOT / "apps", PROJECT_ROOT / "packages"]
IGNORED_DIR_NAMES = {
    "node_modules",
    "__pycache__",
    ".git",
    ".pnpm-store",
    ".turbo",
    ".next",
    "dist",
    "build",
    "coverage",
}
SNIPPET_CONTEXT_LINES = 8
TS_FUNCTION_PATTERN = re.compile(r"(?:export\s+)?function\s+(?P<name>[A-Za-z0-9_]+)\s*\(")
TS_CLASS_PATTERN = re.compile(r"(?:export\s+)?class\s+(?P<name>[A-Za-z0-9_]+)")
TS_CALL_PATTERN = re.compile(r"(?P<name>[A-Za-z0-9_]+)\s*\(")

_ANALYSIS_CACHE: AnalysisResponseModel | None = None


@dataclass
class SymbolDraft:
    id: str
    name: str
    file_path: str
    kind: SymbolKind
    line: int
    column: int
    source: str
    source_start_line: int = 1
    references: set[str] = field(default_factory=set)


class PythonSymbolVisitor(ast.NodeVisitor):
    def __init__(self, file_path: Path, source: str) -> None:
        self.file_path = file_path
        self.source = source
        self.symbols: list[SymbolDraft] = []
        self._current: SymbolDraft | None = None

    def _push_symbol(self, name: str, kind: SymbolKind, node: ast.AST) -> None:
        identifier = f"{self.file_path}:{name}:{node.lineno}:{getattr(node, 'col_offset', 0)}"
        snippet, start_line = extract_snippet(self.source, node.lineno)
        symbol = SymbolDraft(
            id=identifier,
            name=name,
            file_path=str(self.file_path.relative_to(PROJECT_ROOT)),
            kind=kind,
            line=node.lineno,
            column=getattr(node, "col_offset", 0),
            source=snippet,
            source_start_line=start_line,
        )
        self.symbols.append(symbol)
        self._current = symbol

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:  # type: ignore[override]
        previous = self._current
        self._push_symbol(node.name, SymbolKind.FUNCTION, node)
        self.generic_visit(node)
        self._current = previous

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:  # type: ignore[override]
        previous = self._current
        self._push_symbol(node.name, SymbolKind.FUNCTION, node)
        self.generic_visit(node)
        self._current = previous

    def visit_ClassDef(self, node: ast.ClassDef) -> None:  # type: ignore[override]
        previous = self._current
        self._push_symbol(node.name, SymbolKind.CLASS, node)
        self.generic_visit(node)
        self._current = previous

    def visit_Call(self, node: ast.Call) -> None:  # type: ignore[override]
        if self._current is not None and isinstance(node.func, ast.Name):
            self._current.references.add(node.func.id)
        self.generic_visit(node)


def analyze_python_file(file_path: Path) -> Iterable[SymbolDraft]:
    source = file_path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    visitor = PythonSymbolVisitor(file_path, source)
    visitor.visit(tree)
    return visitor.symbols


def extract_snippet(source: str, center_line: int) -> tuple[str, int]:
    lines = source.splitlines()
    if not lines:
        return source, 1
    start_index = max(0, center_line - 1 - SNIPPET_CONTEXT_LINES)
    end_index = min(len(lines), center_line - 1 + SNIPPET_CONTEXT_LINES + 1)
    snippet = "\n".join(lines[start_index:end_index])
    return snippet, start_index + 1


def _build_ts_symbol(
    *, file_path: Path, source: str, match: re.Match[str], kind: SymbolKind
) -> SymbolDraft:
    name = match.group("name")
    line = source.count("\n", 0, match.start()) + 1
    column = match.start() - source.rfind("\n", 0, match.start()) - 1
    identifier = f"{file_path}:{name}:{line}:{column}"
    snippet, start_line = extract_snippet(source, line)
    return SymbolDraft(
        id=identifier,
        name=name,
        file_path=str(file_path.relative_to(PROJECT_ROOT)),
        kind=kind,
        line=line,
        column=column,
        source=snippet,
        source_start_line=start_line,
    )


def analyze_typescript_file(file_path: Path) -> Iterable[SymbolDraft]:
    source = file_path.read_text(encoding="utf-8")
    symbols: list[SymbolDraft] = []
    for match in TS_FUNCTION_PATTERN.finditer(source):
        symbols.append(
            _build_ts_symbol(
                file_path=file_path,
                source=source,
                match=match,
                kind=SymbolKind.FUNCTION,
            )
        )

    for match in TS_CLASS_PATTERN.finditer(source):
        symbols.append(
            _build_ts_symbol(
                file_path=file_path,
                source=source,
                match=match,
                kind=SymbolKind.CLASS,
            )
        )

    if not symbols:
        return symbols

    references = set(
        call.group("name")
        for call in TS_CALL_PATTERN.finditer(source)
        if call.group("name") not in {"if", "for", "while", "switch", "return"}
    )
    for symbol in symbols:
        symbol.references.update(references - {symbol.name})
    return symbols


def iter_code_files() -> Iterable[Path]:
    for base in CODE_DIRECTORIES:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in {".py", ".ts", ".tsx"}:
                if any(name in IGNORED_DIR_NAMES for name in path.parts):
                    continue
                yield path


def analyse_repository() -> AnalysisResponseModel:
    global _ANALYSIS_CACHE
    if _ANALYSIS_CACHE is not None:
        return _ANALYSIS_CACHE

    drafts: list[SymbolDraft] = []
    for file_path in iter_code_files():
        if file_path.suffix == ".py":
            drafts.extend(analyze_python_file(file_path))
        else:
            drafts.extend(analyze_typescript_file(file_path))

    symbol_lookup: dict[str, list[SymbolDraft]] = {}
    for draft in drafts:
        symbol_lookup.setdefault(draft.name, []).append(draft)

    edges: set[tuple[str, str]] = set()
    for draft in drafts:
        for reference in draft.references:
            candidates = symbol_lookup.get(reference)
            if not candidates:
                continue
            target = candidates[0]
            if draft.id == target.id:
                continue
            edges.add((draft.id, target.id))

    result = AnalysisResponseModel(
        symbols=[
            SymbolModel(
                id=draft.id,
                name=draft.name,
                filePath=draft.file_path,
                kind=draft.kind,
                line=draft.line,
                column=draft.column,
                source=draft.source,
                sourceStartLine=draft.source_start_line,
            )
            for draft in drafts
        ],
        edges=[
            DependencyEdgeModel(source=source, target=target)
            for source, target in sorted(edges)
        ],
    )
    _ANALYSIS_CACHE = result
    return result

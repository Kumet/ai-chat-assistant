from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SymbolKind(str, Enum):
    FUNCTION = "function"
    CLASS = "class"
    MODULE = "module"
    UNKNOWN = "unknown"


class SymbolModel(BaseModel):
    id: str
    name: str
    filePath: str
    kind: SymbolKind
    line: int
    column: int
    source: str
    sourceStartLine: int = 1


class DependencyEdgeModel(BaseModel):
    source: str
    target: str
    label: Optional[str] = None


class AnalysisResponseModel(BaseModel):
    symbols: list[SymbolModel]
    edges: list[DependencyEdgeModel]

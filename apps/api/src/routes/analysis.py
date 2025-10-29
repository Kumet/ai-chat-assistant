"""Dependency graph analysis endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

from ..models import AnalysisResponseModel
from ..services.analysis import analyse_repository, was_cache_hit

router = APIRouter(prefix="/graph", tags=["analysis"])


@router.get("/analyze", response_model=AnalysisResponseModel)
async def analyze_repository(request: Request) -> AnalysisResponseModel:
    """Analyze the repository and return AST-based dependency graph."""

    result = analyse_repository()
    request.state.slo_tokens = len(result.symbols)
    request.state.slo_cache_hit = was_cache_hit()
    return result

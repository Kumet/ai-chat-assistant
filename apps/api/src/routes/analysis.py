"""Dependency graph analysis endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from ..models import AnalysisResponseModel
from ..services.analysis import analyse_repository

router = APIRouter(prefix="/graph", tags=["analysis"])


@router.get("/analyze", response_model=AnalysisResponseModel)
async def analyze_repository() -> AnalysisResponseModel:
    """Analyze the repository and return AST-based dependency graph."""

    return analyse_repository()

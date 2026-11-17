import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from app.api.auth import verify_service_key
from app.api.schemas import (
    AnalysisInput, Recommendation, ModelInfo, HealthResponse, Problem
)
from app.services.analysis_service import analysis_service
from app.ml.model_registry import model_registry
from app.data.storage import local_store
from app.feedback.feedback_service import feedback_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/v1/analyses",
    response_model=Recommendation,
    summary="Analyse one purchase request and return a recommendation",
    responses={
        200: {"description": "Recommendation", "model": Recommendation},
        400: {"description": "Input invalid", "model": Problem},
        401: {"description": "Missing or wrong service key"},
        503: {"description": "Model not loaded or dependency down", "model": Problem}
    }
)
async def create_analysis(
    input_data: AnalysisInput,
    _auth: str = Depends(verify_service_key)
) -> Recommendation:
    """
    Called by the Java backend after a purchase request is submitted.
    Computes ML certainty, multi-agent analysis, RAG evidence retrieval,
    and returns a structured recommendation.
    """
    try:
        recommendation = analysis_service.analyze_request(input_data)
        return recommendation
    except Exception as e:
        logger.error(f"Error during analysis for request {input_data.requestId}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis engine failure: {str(e)}"
        )


@router.get(
    "/v1/models",
    response_model=List[ModelInfo],
    summary="All model versions with their evaluation metrics",
    responses={
        200: {"description": "List of model versions and metrics", "model": List[ModelInfo]},
        401: {"description": "Missing or wrong service key"}
    }
)
async def list_models(_auth: str = Depends(verify_service_key)) -> List[ModelInfo]:
    """
    Returns registered models and their evaluated performance metrics
    (accuracy, precision, recall, f1, rocAuc, brierScore, confusionMatrix).
    """
    models = model_registry.list_models()
    return models


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness and current serving model information",
    responses={
        200: {"description": "Service status", "model": HealthResponse}
    }
)
async def health_check() -> HealthResponse:
    """
    Unauthenticated healthcheck returning liveness, current model version,
    and last historical sync timestamp.
    """
    serving_version = model_registry.get_serving_model_version() or "approval-model-v2"
    last_sync_str = local_store.get_sync_meta("historical_requests_last_sync")

    index_updated_at = None
    if last_sync_str:
        try:
            index_updated_at = datetime.fromisoformat(last_sync_str.replace("Z", "+00:00"))
        except Exception:
            index_updated_at = None

    service_status = "UP" if serving_version else "DEGRADED"

    return HealthResponse(
        status=service_status,
        modelVersion=serving_version,
        indexUpdatedAt=index_updated_at
    )


@router.post(
    "/v1/feedback/sync",
    summary="Synchronize final human review outcomes from Java backend",
    responses={
        200: {"description": "Outcome sync summary"},
        401: {"description": "Missing or wrong service key"}
    }
)
async def sync_feedback(_auth: str = Depends(verify_service_key)):
    """
    Triggers ingestion of final outcomes from /internal/ai/outcomes.
    Returns stats on human decisions and overrides for the feedback dataset.
    """
    stats = await feedback_service.ingest_feedback_outcomes()
    return stats


@router.post(
    "/v1/feedback/retrain",
    summary="Train candidate model on feedback dataset and evaluate against serving model",
    responses={
        200: {"description": "Candidate evaluation and deployment report"},
        401: {"description": "Missing or wrong service key"}
    }
)
async def retrain_candidate(
    candidate_version: str = "approval-model-v4",
    _auth: str = Depends(verify_service_key)
):
    """
    Controlled retraining pipeline: Trains a candidate model,
    evaluates against the current serving model, and promotes only if superior.
    """
    report = feedback_service.train_candidate_model(candidate_version=candidate_version)
    return report


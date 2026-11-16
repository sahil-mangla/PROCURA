import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import router
from app.api.schemas import Problem
from app.ml.train import train_and_register_all_models
from app.ml.model_registry import model_registry
from app.data.backend_client import backend_sync_client
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("procura-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PROCURA AI/ML Service...")

    # Ensure baseline models are trained and available in registry
    serving_version = model_registry.get_serving_model_version()
    if not serving_version:
        logger.info("No active model found in registry. Executing training pipeline...")
        train_and_register_all_models()
    else:
        logger.info(f"Serving active model version: {serving_version}")

    # Attempt initial historical data sync in background
    try:
        logger.info("Attempting initial sync with Java backend...")
        await backend_sync_client.sync_historical_requests()
        await backend_sync_client.sync_outcomes()
    except Exception as e:
        logger.warning(f"Initial backend sync skipped or deferred: {e}")

    yield
    logger.info("PROCURA AI/ML Service shutting down.")


app = FastAPI(
    title="PROCURA AI/ML Recommendation Service",
    description="Intelligent multi-agent & ML service for procurement evaluation",
    version="0.1.0",
    lifespan=lifespan
)

# Custom exception handlers for RFC 7807 Problem Details (application/problem+json)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    problem = Problem(
        type="https://procura.local/errors/validation",
        title="Validation Failed",
        status=status.HTTP_400_BAD_REQUEST,
        detail=str(exc.errors()),
        code="VALIDATION_FAILED"
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=problem.model_dump(),
        media_type="application/problem+json"
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    problem = Problem(
        type=f"https://procura.local/errors/{exc.status_code}",
        title="Request Error",
        status=exc.status_code,
        detail=str(exc.detail),
        code=str(exc.detail) if isinstance(exc.detail, str) else "ERROR"
    )
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(),
        media_type="application/problem+json",
        headers=headers
    )


app.include_router(router)


from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class CategoryEnum(str, Enum):
    IT_EQUIPMENT = "IT_EQUIPMENT"
    SOFTWARE = "SOFTWARE"
    OFFICE_FURNITURE = "OFFICE_FURNITURE"
    OFFICE_SUPPLIES = "OFFICE_SUPPLIES"
    SERVICES = "SERVICES"
    TRAVEL = "TRAVEL"
    MAINTENANCE = "MAINTENANCE"
    OTHER = "OTHER"


class PriorityEnum(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class RecommendationEnum(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ToneEnum(str, Enum):
    SUPPORTS = "SUPPORTS"
    CONCERN = "CONCERN"


class ReviewTriggerCodeEnum(str, Enum):
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    AMOUNT_ANOMALY = "AMOUNT_ANOMALY"
    UNFAMILIAR_VENDOR = "UNFAMILIAR_VENDOR"
    BUDGET_PRESSURE = "BUDGET_PRESSURE"
    UNUSUAL_FREQUENCY = "UNUSUAL_FREQUENCY"
    INSUFFICIENT_HISTORY = "INSUFFICIENT_HISTORY"


class ModelStatusEnum(str, Enum):
    SERVING = "SERVING"
    CANDIDATE = "CANDIDATE"
    RETIRED = "RETIRED"


class ItemInput(BaseModel):
    description: str
    quantity: int = Field(..., ge=1)
    unitPrice: float = Field(..., ge=0)


class AnalysisInput(BaseModel):
    requestId: str
    departmentId: int
    amount: float = Field(..., ge=0)
    currency: str = Field(default="INR")
    category: str
    priority: Optional[str] = Field(default="NORMAL")
    vendorId: int
    budgetTotal: float = Field(..., ge=0)
    budgetRemaining: float = Field(..., ge=0)
    title: Optional[str] = None
    requestDescription: Optional[str] = None
    submittedAt: datetime
    items: List[ItemInput] = Field(default_factory=list)


class Reason(BaseModel):
    code: str
    text: str
    tone: ToneEnum
    evidenceIds: List[str] = Field(default_factory=list)


class ReviewTrigger(BaseModel):
    code: ReviewTriggerCodeEnum
    text: str


class Evidence(BaseModel):
    requestId: str
    summary: str
    amount: float = Field(..., ge=0)
    outcome: str = Field(..., description="APPROVED or REJECTED")
    similarity: float = Field(..., ge=0.0, le=1.0)


class AgentVersions(BaseModel):
    budget: str = Field(default="v1")
    historical: str = Field(default="v1")
    risk: str = Field(default="v1")


class Recommendation(BaseModel):
    requestId: str
    recommendation: RecommendationEnum
    confidence: float = Field(..., ge=0.0, le=1.0)
    riskLevel: RiskLevelEnum
    requiresHumanReview: bool
    reviewThreshold: float = Field(default=0.80, ge=0.0, le=1.0)
    reasons: List[Reason] = Field(..., min_length=1)
    reviewTriggers: List[ReviewTrigger] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    modelVersion: str
    agentVersions: AgentVersions
    analysedAt: datetime


class ConfusionMatrix(BaseModel):
    tp: int = 0
    fp: int = 0
    tn: int = 0
    fn: int = 0


class Metrics(BaseModel):
    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0
    rocAuc: float = 0.0
    brierScore: float = 0.0
    confusionMatrix: ConfusionMatrix = Field(default_factory=ConfusionMatrix)


class ModelInfo(BaseModel):
    version: str
    algorithm: str
    status: ModelStatusEnum
    trainedAt: datetime
    trainingRows: int
    metrics: Metrics


class HealthResponse(BaseModel):
    status: str = Field(..., description="UP or DEGRADED")
    modelVersion: str
    indexUpdatedAt: Optional[datetime] = None


class Problem(BaseModel):
    type: Optional[str] = None
    title: str
    status: int
    detail: Optional[str] = None
    code: Optional[str] = None


# ---------- Backend Internal Ingestion DTOs ----------

class HistoricalRequestExportItem(BaseModel):
    requestId: str
    title: Optional[str] = None
    description: Optional[str] = None
    departmentId: int
    category: str
    priority: Optional[str] = "NORMAL"
    amount: float
    currency: str = "INR"
    vendorId: int
    itemCount: Optional[int] = 1
    submittedAt: Optional[datetime] = None
    budgetTotalAtSubmit: Optional[float] = None
    budgetRemainingAtSubmit: Optional[float] = None
    outcome: str = "APPROVED"  # APPROVED | REJECTED
    rejectedAtStage: Optional[str] = None
    updatedAt: Optional[datetime] = None


class HistoricalRequestExportResponse(BaseModel):
    nextCursor: Optional[str] = None
    items: List[HistoricalRequestExportItem] = Field(default_factory=list)


class OutcomeExportItem(BaseModel):
    requestId: str
    analysisId: Optional[int] = None
    modelVersion: Optional[str] = None
    aiRecommendation: Optional[str] = None
    aiConfidence: Optional[float] = None
    finalOutcome: str  # APPROVED | REJECTED
    override: bool = False
    overrideReason: Optional[str] = None
    decidedAt: Optional[datetime] = None


class OutcomeExportResponse(BaseModel):
    nextCursor: Optional[str] = None
    items: List[OutcomeExportItem] = Field(default_factory=list)


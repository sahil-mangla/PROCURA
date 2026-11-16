import logging
from typing import Dict, Any
from app.api.schemas import AnalysisInput, Recommendation
from app.agents.orchestrator import orchestrator

logger = logging.getLogger(__name__)

class AnalysisService:
    """
    Facade service coordinating request validation and analysis execution.
    """

    def __init__(self, orchestrator_instance=None):
        self.orchestrator = orchestrator_instance or orchestrator

    def analyze_request(self, analysis_input: AnalysisInput) -> Recommendation:
        logger.info(f"Analyzing purchase request {analysis_input.requestId} for department {analysis_input.departmentId}")
        recommendation = self.orchestrator.orchestrate(analysis_input)
        logger.info(
            f"Finished analysis for {analysis_input.requestId}: "
            f"Recommendation={recommendation.recommendation}, "
            f"Confidence={recommendation.confidence}, "
            f"RequiresReview={recommendation.requiresHumanReview}"
        )
        return recommendation

analysis_service = AnalysisService()


from datetime import datetime, timezone
from typing import Dict, Any, List
from app.api.schemas import (
    AnalysisInput, Recommendation, Reason, ReviewTrigger, Evidence,
    AgentVersions, RecommendationEnum, RiskLevelEnum, ReviewTriggerCodeEnum
)
from app.ml.predict import prediction_service
from app.agents.budget_agent import budget_agent
from app.agents.historical_agent import historical_agent
from app.agents.risk_agent import risk_agent
from app.config import settings

class DecisionOrchestrator:
    """
    Multi-agent orchestrator that fuses ML predictive probability with
    budget, precedent, and risk agents into a compliant structured recommendation.
    """

    def __init__(
        self,
        pred_service=None,
        b_agent=None,
        h_agent=None,
        r_agent=None,
        review_threshold: float = None
    ):
        self.prediction_service = pred_service or prediction_service
        self.budget_agent = b_agent or budget_agent
        self.historical_agent = h_agent or historical_agent
        self.risk_agent = r_agent or risk_agent
        self.review_threshold = review_threshold if review_threshold is not None else settings.default_review_threshold

    def orchestrate(self, req: AnalysisInput) -> Recommendation:
        # 1. Run ML prediction and feature extraction
        ml_result = self.prediction_service.predict(req)
        features = ml_result["features"]
        ml_recommendation = ml_result["recommendation"]
        ml_confidence = ml_result["confidence"]
        model_version = ml_result["modelVersion"]

        # 2. Run specialized agents
        b_out = self.budget_agent.analyze(req, features)
        h_out = self.historical_agent.analyze(req, features)
        r_out = self.risk_agent.analyze(req, features)

        # 3. Aggregate reasons and deduplicate by code
        all_reasons: List[Reason] = []
        seen_reason_codes = set()
        for r in (b_out["reasons"] + h_out["reasons"] + r_out["reasons"]):
            if r.code not in seen_reason_codes:
                all_reasons.append(r)
                seen_reason_codes.add(r.code)

        if not all_reasons:
            all_reasons.append(Reason(
                code="STANDARD_EVALUATION",
                text="Automated evaluation completed against department baseline",
                tone=ml_recommendation == RecommendationEnum.APPROVE and "SUPPORTS" or "CONCERN",
                evidenceIds=[]
            ))

        # 4. Aggregate triggers
        all_triggers: List[ReviewTrigger] = []
        seen_trigger_codes = set()

        # Check low confidence against threshold
        if ml_confidence < self.review_threshold:
            conf_pct = int(round(ml_confidence * 100))
            thresh_pct = int(round(self.review_threshold * 100))
            low_conf_trigger = ReviewTrigger(
                code=ReviewTriggerCodeEnum.LOW_CONFIDENCE,
                text=f"Confidence is {conf_pct}%, below the {thresh_pct}% threshold"
            )
            all_triggers.append(low_conf_trigger)
            seen_trigger_codes.add(low_conf_trigger.code)

        for t in (b_out["triggers"] + h_out["triggers"] + r_out["triggers"]):
            if t.code not in seen_trigger_codes:
                all_triggers.append(t)
                seen_trigger_codes.add(t.code)

        # 5. Determine Overall Risk Level
        agent_risks = [b_out["risk"], h_out["risk"], r_out["risk"]]
        if "HIGH" in agent_risks or ml_result["approval_probability"] < 0.30:
            risk_level = RiskLevelEnum.HIGH
        elif "MEDIUM" in agent_risks or ml_confidence < 0.75:
            risk_level = RiskLevelEnum.MEDIUM
        else:
            risk_level = RiskLevelEnum.LOW

        # 6. Recommendation override logic:
        # If budget is severely exceeded, recommendation cannot be APPROVE
        if features.get("is_budget_exceeded", 0.0) > 0.5:
            final_recommendation = RecommendationEnum.REJECT
        else:
            final_recommendation = ml_recommendation

        # 7. Requires human review if any triggers fired
        requires_human_review = len(all_triggers) > 0

        # Evidence from historical agent
        evidence = h_out.get("evidence", [])

        now = datetime.now(timezone.utc)

        return Recommendation(
            requestId=req.requestId,
            recommendation=final_recommendation,
            confidence=ml_confidence,
            riskLevel=risk_level,
            requiresHumanReview=requires_human_review,
            reviewThreshold=self.review_threshold,
            reasons=all_reasons,
            reviewTriggers=all_triggers,
            evidence=evidence,
            modelVersion=model_version,
            agentVersions=AgentVersions(
                budget=self.budget_agent.version,
                historical=self.historical_agent.version,
                risk=self.risk_agent.version
            ),
            analysedAt=now
        )

orchestrator = DecisionOrchestrator()


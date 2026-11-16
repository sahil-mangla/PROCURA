from typing import Dict, Any, List
from app.api.schemas import AnalysisInput, Reason, ReviewTrigger, Evidence, ToneEnum, ReviewTriggerCodeEnum
from app.rag.retrieval import historical_retriever

class HistoricalAgent:
    """
    Specialized agent analyzing precedents, category approval patterns,
    and retrieved similar historical requests.
    """
    version = "v1"

    def __init__(self, retriever=None):
        self.retriever = retriever or historical_retriever

    def analyze(self, req: AnalysisInput, features: Dict[str, float]) -> Dict[str, Any]:
        reasons: List[Reason] = []
        triggers: List[ReviewTrigger] = []

        # Retrieve similar historical cases via RAG
        evidence_list = self.retriever.retrieve_similar_cases(req, top_k=3)

        if not evidence_list:
            reasons.append(Reason(
                code="INSUFFICIENT_HISTORY",
                text="Limited historical precedents found for this department and category",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.INSUFFICIENT_HISTORY,
                text="Insufficient historical request data to compare precedent"
            ))
            return {
                "risk": "MEDIUM",
                "reasons": reasons,
                "triggers": triggers,
                "evidence": []
            }

        approved_cases = [e for e in evidence_list if e.outcome == "APPROVED"]
        rejected_cases = [e for e in evidence_list if e.outcome == "REJECTED"]
        all_ids = [e.requestId for e in evidence_list]

        if len(approved_cases) >= len(rejected_cases):
            reasons.append(Reason(
                code="SIMILAR_MOSTLY_APPROVED",
                text="Similar historical requests were mostly approved",
                tone=ToneEnum.SUPPORTS,
                evidenceIds=[e.requestId for e in approved_cases]
            ))
            risk = "LOW"
        else:
            reasons.append(Reason(
                code="SIMILAR_MOSTLY_REJECTED",
                text="Similar historical requests in this category were previously rejected",
                tone=ToneEnum.CONCERN,
                evidenceIds=[e.requestId for e in rejected_cases]
            ))
            risk = "HIGH"

        # Check department general approval rate
        dept_rate = features.get("dept_approval_rate", 0.75)
        if dept_rate < 0.40:
            reasons.append(Reason(
                code="DEPARTMENT_LOW_APPROVAL_RATE",
                text=f"Department has a low historical approval rate of {dept_rate * 100:.0f}%",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))

        return {
            "risk": risk,
            "reasons": reasons,
            "triggers": triggers,
            "evidence": evidence_list
        }

historical_agent = HistoricalAgent()


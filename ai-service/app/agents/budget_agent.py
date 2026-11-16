from typing import Dict, Any, List
from app.api.schemas import AnalysisInput, Reason, ReviewTrigger, ToneEnum, ReviewTriggerCodeEnum

class BudgetAgent:
    """
    Specialized agent analyzing department budget utilization, remaining allocation,
    and fiscal overruns.
    """
    version = "v1"

    def analyze(self, req: AnalysisInput, features: Dict[str, float]) -> Dict[str, Any]:
        amount = req.amount
        total = req.budgetTotal
        remaining = req.budgetRemaining

        reasons: List[Reason] = []
        triggers: List[ReviewTrigger] = []

        is_exceeded = amount > remaining
        current_utilization = (total - remaining) / max(total, 1.0)
        projected_remaining = remaining - amount
        projected_utilization = (total - projected_remaining) / max(total, 1.0)

        if is_exceeded:
            reasons.append(Reason(
                code="EXCEEDS_REMAINING_BUDGET",
                text=f"Request amount (₹{amount:,.2f}) exceeds remaining department budget (₹{remaining:,.2f})",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.BUDGET_PRESSURE,
                text="Request exceeds available department budget"
            ))
            risk = "HIGH"
        elif projected_utilization > 0.90:
            reasons.append(Reason(
                code="HIGH_BUDGET_UTILISATION",
                text=f"Projected department budget utilization reaches {projected_utilization * 100:.1f}%",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.BUDGET_PRESSURE,
                text=f"Budget pressure: projected utilization reaches {projected_utilization * 100:.0f}%"
            ))
            risk = "MEDIUM"
        else:
            reasons.append(Reason(
                code="WITHIN_BUDGET",
                text="Within remaining department budget",
                tone=ToneEnum.SUPPORTS,
                evidenceIds=[]
            ))
            risk = "LOW"

        # Check historical department overrun patterns
        past_overruns = int(features.get("past_overruns_count", 0))
        if past_overruns > 0:
            reasons.append(Reason(
                code="PAST_BUDGET_OVERRUNS",
                text=f"Department has a history of {past_overruns} prior budget overruns",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))

        return {
            "risk": risk,
            "reasons": reasons,
            "triggers": triggers,
            "utilization": current_utilization,
            "projected_utilization": projected_utilization
        }

budget_agent = BudgetAgent()


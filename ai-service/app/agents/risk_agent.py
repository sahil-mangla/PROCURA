from typing import Dict, Any, List
from app.api.schemas import AnalysisInput, Reason, ReviewTrigger, ToneEnum, ReviewTriggerCodeEnum

class RiskAgent:
    """
    Specialized agent detecting anomalies in amount, vendor unfamiliarity,
    and atypical procurement patterns.
    """
    version = "v1"

    def analyze(self, req: AnalysisInput, features: Dict[str, float]) -> Dict[str, Any]:
        reasons: List[Reason] = []
        triggers: List[ReviewTrigger] = []

        amount = req.amount
        dept_avg = features.get("dept_avg_amount", 50000.0)
        vendor_orders = features.get("vendor_order_count", 0.0)
        is_unfamiliar_vendor = features.get("vendor_is_unfamiliar", 0.0) > 0.5
        ratio_to_avg = features.get("amount_to_dept_avg_ratio", 1.0)

        risk_score = 0

        # 1. Amount anomaly checks
        if ratio_to_avg >= 2.0 and amount > 50000.0:
            reasons.append(Reason(
                code="AMOUNT_ABOVE_AVERAGE",
                text=f"Request is {ratio_to_avg:.1f}x the department's historical average (₹{dept_avg:,.2f})",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.AMOUNT_ANOMALY,
                text=f"Amount is {ratio_to_avg:.1f}x higher than department historical average"
            ))
            risk_score += 2
        elif ratio_to_avg <= 1.2:
            reasons.append(Reason(
                code="AMOUNT_TYPICAL",
                text="Typical order amount for this department and category",
                tone=ToneEnum.SUPPORTS,
                evidenceIds=[]
            ))

        # 2. Vendor unfamiliarity checks
        if is_unfamiliar_vendor or vendor_orders == 0:
            reasons.append(Reason(
                code="VENDOR_UNFAMILIAR",
                text="New or unfamiliar vendor with limited prior completed orders",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.UNFAMILIAR_VENDOR,
                text="Vendor has no verified history of completed purchase orders"
            ))
            risk_score += 1
        else:
            reasons.append(Reason(
                code="VENDOR_ESTABLISHED",
                text=f"Vendor is established with {int(vendor_orders)} prior orders",
                tone=ToneEnum.SUPPORTS,
                evidenceIds=[]
            ))

        # 3. Request frequency check
        freq = features.get("request_frequency", 0.0)
        is_unusual_freq = features.get("is_unusual_frequency", 0.0) > 0.5
        if is_unusual_freq or freq >= 15:
            reasons.append(Reason(
                code="UNUSUAL_FREQUENCY",
                text=f"High request frequency detected: {int(freq)} recent requests for this vendor",
                tone=ToneEnum.CONCERN,
                evidenceIds=[]
            ))
            triggers.append(ReviewTrigger(
                code=ReviewTriggerCodeEnum.UNUSUAL_FREQUENCY,
                text=f"Atypical submission frequency: {int(freq)} recent requests for vendor"
            ))
            risk_score += 1

        # 4. Overall Risk Assessment
        if risk_score >= 2:
            risk = "HIGH"
        elif risk_score == 1:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        return {
            "risk": risk,
            "reasons": reasons,
            "triggers": triggers
        }

risk_agent = RiskAgent()


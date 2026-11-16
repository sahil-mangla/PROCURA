import pytest
from datetime import datetime, timezone
from app.api.schemas import AnalysisInput, ItemInput, ReviewTriggerCodeEnum
from app.agents.budget_agent import budget_agent
from app.agents.risk_agent import risk_agent
from app.agents.historical_agent import historical_agent
from app.agents.orchestrator import orchestrator
from app.ml.features import extract_features_from_dict

def test_budget_agent():
    # Case 1: Exceeds remaining budget
    req_over = AnalysisInput(
        requestId="T-B1",
        departmentId=1,
        amount=150000.0,
        currency="INR",
        category="SERVICES",
        vendorId=1,
        budgetTotal=500000.0,
        budgetRemaining=100000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    feats = extract_features_from_dict(req_over.model_dump())
    res_over = budget_agent.analyze(req_over, feats)
    assert res_over["risk"] == "HIGH"
    codes = [r.code for r in res_over["reasons"]]
    assert "EXCEEDS_REMAINING_BUDGET" in codes
    triggers = [t.code for t in res_over["triggers"]]
    assert ReviewTriggerCodeEnum.BUDGET_PRESSURE in triggers

    # Case 2: Healthy budget
    req_healthy = AnalysisInput(
        requestId="T-B2",
        departmentId=1,
        amount=25000.0,
        currency="INR",
        category="SERVICES",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=800000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    feats_h = extract_features_from_dict(req_healthy.model_dump())
    res_healthy = budget_agent.analyze(req_healthy, feats_h)
    assert res_healthy["risk"] == "LOW"
    codes_h = [r.code for r in res_healthy["reasons"]]
    assert "WITHIN_BUDGET" in codes_h


def test_risk_agent_unfamiliar_vendor():
    req = AnalysisInput(
        requestId="T-R1",
        departmentId=1,
        amount=85000.0,
        currency="INR",
        category="IT_EQUIPMENT",
        vendorId=99,  # Non-existent/unfamiliar vendor
        budgetTotal=1000000.0,
        budgetRemaining=700000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    feats = extract_features_from_dict(req.model_dump())
    res = risk_agent.analyze(req, feats)
    trigger_codes = [t.code for t in res["triggers"]]
    assert ReviewTriggerCodeEnum.UNFAMILIAR_VENDOR in trigger_codes


def test_orchestrator_synthesis():
    req = AnalysisInput(
        requestId="PR-1024",
        departmentId=1,
        amount=85000.0,
        currency="INR",
        category="IT_EQUIPMENT",
        priority="HIGH",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=715000.0,
        title="Developer 4K Monitors",
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    rec = orchestrator.orchestrate(req)
    assert rec.requestId == "PR-1024"
    assert rec.recommendation in ["APPROVE", "REJECT"]
    assert len(rec.reasons) >= 1
    assert rec.agentVersions.budget == "v1"
    assert rec.agentVersions.historical == "v1"
    assert rec.agentVersions.risk == "v1"


def test_budget_agent_past_overruns():
    req = AnalysisInput(
        requestId="T-B3",
        departmentId=1,
        amount=25000.0,
        currency="INR",
        category="SERVICES",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=800000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    feats = {"past_overruns_count": 3.0}
    res = budget_agent.analyze(req, feats)
    codes = [r.code for r in res["reasons"]]
    assert "PAST_BUDGET_OVERRUNS" in codes


def test_risk_agent_unusual_frequency():
    req = AnalysisInput(
        requestId="T-R2",
        departmentId=1,
        amount=25000.0,
        currency="INR",
        category="SERVICES",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=800000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )
    feats = {
        "dept_avg_amount": 50000.0,
        "amount_to_dept_avg_ratio": 0.5,
        "vendor_order_count": 20.0,
        "vendor_is_unfamiliar": 0.0,
        "request_frequency": 18.0,
        "is_unusual_frequency": 1.0
    }
    res = risk_agent.analyze(req, feats)
    trigger_codes = [t.code for t in res["triggers"]]
    assert ReviewTriggerCodeEnum.UNUSUAL_FREQUENCY in trigger_codes
    reason_codes = [r.code for r in res["reasons"]]
    assert "UNUSUAL_FREQUENCY" in reason_codes


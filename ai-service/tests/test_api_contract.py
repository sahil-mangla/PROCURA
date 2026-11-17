import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

SERVICE_KEY = settings.service_key

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["UP", "DEGRADED"]
    assert "modelVersion" in data
    assert data["modelVersion"] is not None


def test_analyses_missing_auth():
    payload = {
        "requestId": "PR-1024",
        "departmentId": 1,
        "amount": 85000.0,
        "currency": "INR",
        "category": "IT_EQUIPMENT",
        "vendorId": 1,
        "budgetTotal": 1000000.0,
        "budgetRemaining": 715000.0,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "items": [{"description": "Monitor", "quantity": 2, "unitPrice": 42500.0}]
    }
    response = client.post("/v1/analyses", json=payload)
    assert response.status_code == 401


def test_analyses_invalid_auth():
    payload = {
        "requestId": "PR-1024",
        "departmentId": 1,
        "amount": 85000.0,
        "currency": "INR",
        "category": "IT_EQUIPMENT",
        "vendorId": 1,
        "budgetTotal": 1000000.0,
        "budgetRemaining": 715000.0,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "items": []
    }
    response = client.post("/v1/analyses", json=payload, headers={"X-Service-Key": "wrong-key"})
    assert response.status_code == 401


def test_analyses_successful_contract():
    payload = {
        "requestId": "PR-1024",
        "departmentId": 1,
        "amount": 85000.0,
        "currency": "INR",
        "category": "IT_EQUIPMENT",
        "priority": "HIGH",
        "vendorId": 1,
        "budgetTotal": 1000000.0,
        "budgetRemaining": 715000.0,
        "title": "External Developer 4K Monitors",
        "requestDescription": "High resolution monitors for software development team",
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "items": [
            {"description": "27-inch 4K IPS Developer Monitor", "quantity": 2, "unitPrice": 42500.0}
        ]
    }
    response = client.post(
        "/v1/analyses",
        json=payload,
        headers={"X-Service-Key": SERVICE_KEY}
    )
    assert response.status_code == 200
    data = response.json()

    # Verify all fields required by contracts/ai-service.yaml
    assert data["requestId"] == "PR-1024"
    assert data["recommendation"] in ["APPROVE", "REJECT"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["riskLevel"] in ["LOW", "MEDIUM", "HIGH"]
    assert isinstance(data["requiresHumanReview"], bool)
    assert data["reviewThreshold"] == 0.80

    # Reasons validation
    assert len(data["reasons"]) >= 1
    for r in data["reasons"]:
        assert "code" in r and r["code"]
        assert "text" in r and r["text"]
        assert r["tone"] in ["SUPPORTS", "CONCERN"]
        assert isinstance(r["evidenceIds"], list)

    # Review triggers validation
    assert isinstance(data["reviewTriggers"], list)
    for t in data["reviewTriggers"]:
        assert t["code"] in [
            "LOW_CONFIDENCE", "AMOUNT_ANOMALY", "UNFAMILIAR_VENDOR",
            "BUDGET_PRESSURE", "UNUSUAL_FREQUENCY", "INSUFFICIENT_HISTORY"
        ]
        assert "text" in t

    # Evidence validation
    assert isinstance(data["evidence"], list)
    for ev in data["evidence"]:
        assert "requestId" in ev
        assert "summary" in ev
        assert ev["amount"] >= 0
        assert ev["outcome"] in ["APPROVED", "REJECTED"]
        assert 0.0 <= ev["similarity"] <= 1.0

    # Model and agent versions
    assert "modelVersion" in data
    assert data["agentVersions"]["budget"] == "v1"
    assert data["agentVersions"]["historical"] == "v1"
    assert data["agentVersions"]["risk"] == "v1"
    assert "analysedAt" in data


def test_analyses_exceeds_budget_triggers_review():
    payload = {
        "requestId": "PR-9999",
        "departmentId": 1,
        "amount": 950000.0,  # Far exceeds remaining
        "currency": "INR",
        "category": "OFFICE_FURNITURE",
        "vendorId": 3,
        "budgetTotal": 1000000.0,
        "budgetRemaining": 50000.0,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "items": [{"description": "Luxury Lounge", "quantity": 1, "unitPrice": 950000.0}]
    }
    response = client.post(
        "/v1/analyses",
        json=payload,
        headers={"X-Service-Key": SERVICE_KEY}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommendation"] == "REJECT"
    assert data["riskLevel"] == "HIGH"
    assert data["requiresHumanReview"] is True
    trigger_codes = [t["code"] for t in data["reviewTriggers"]]
    assert "BUDGET_PRESSURE" in trigger_codes


def test_list_models_endpoint():
    response = client.get("/v1/models", headers={"X-Service-Key": SERVICE_KEY})
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 2
    versions = [m["version"] for m in models]
    assert "approval-model-v1" in versions
    assert "approval-model-v2" in versions

    for m in models:
        metrics = m["metrics"]
        assert 0.0 <= metrics["accuracy"] <= 1.0
        assert 0.0 <= metrics["f1"] <= 1.0
        assert 0.0 <= metrics["rocAuc"] <= 1.0
        assert 0.0 <= metrics["brierScore"] <= 1.0
        cm = metrics["confusionMatrix"]
        assert cm["tp"] >= 0
        assert cm["tn"] >= 0


def test_feedback_endpoints():
    # Feedback sync
    sync_res = client.post("/v1/feedback/sync", headers={"X-Service-Key": SERVICE_KEY})
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert "total_outcomes" in sync_data

    # Feedback retrain
    retrain_res = client.post("/v1/feedback/retrain?candidate_version=approval-model-v4", headers={"X-Service-Key": SERVICE_KEY})
    assert retrain_res.status_code == 200
    retrain_data = retrain_res.json()
    assert "candidateVersion" in retrain_data
    assert "candidateF1" in retrain_data


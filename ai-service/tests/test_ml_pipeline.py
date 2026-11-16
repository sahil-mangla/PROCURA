import pytest
import numpy as np
from app.ml.features import extract_features_from_dict, build_training_features, FEATURE_COLUMNS
from app.ml.evaluate import evaluate_model
from app.ml.predict import prediction_service
from app.api.schemas import AnalysisInput, ItemInput
from datetime import datetime, timezone

def test_feature_extraction():
    sample_req = {
        "requestId": "PR-TEST-1",
        "departmentId": 1,
        "amount": 75000.0,
        "category": "IT_EQUIPMENT",
        "priority": "HIGH",
        "vendorId": 1,
        "budgetTotal": 1000000.0,
        "budgetRemaining": 600000.0,
        "items": [{"description": "Laptop", "quantity": 1, "unitPrice": 75000.0}]
    }

    feats = extract_features_from_dict(sample_req)
    for col in FEATURE_COLUMNS:
        assert col in feats, f"Missing feature column: {col}"

    assert feats["request_amount"] == 75000.0
    assert feats["budget_utilization"] == pytest.approx(0.40, rel=1e-2)
    assert feats["is_budget_exceeded"] == 0.0
    assert feats["cat_it_equipment"] == 1.0
    assert feats["cat_software"] == 0.0


def test_evaluate_model_metrics():
    y_true = np.array([1, 1, 1, 0, 0])
    y_pred = np.array([1, 1, 0, 0, 1])
    y_prob = np.array([0.9, 0.8, 0.4, 0.2, 0.7])

    metrics = evaluate_model(y_true, y_pred, y_prob)
    assert 0.0 <= metrics.accuracy <= 1.0
    assert 0.0 <= metrics.f1 <= 1.0
    assert 0.0 <= metrics.rocAuc <= 1.0
    assert 0.0 <= metrics.brierScore <= 1.0
    assert metrics.confusionMatrix.tp == 2
    assert metrics.confusionMatrix.fp == 1
    assert metrics.confusionMatrix.tn == 1
    assert metrics.confusionMatrix.fn == 1


def test_prediction_service():
    analysis_input = AnalysisInput(
        requestId="PR-TEST-PREDICT",
        departmentId=1,
        amount=50000.0,
        currency="INR",
        category="IT_EQUIPMENT",
        priority="NORMAL",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=700000.0,
        submittedAt=datetime.now(timezone.utc),
        items=[ItemInput(description="Keyboard", quantity=5, unitPrice=10000.0)]
    )

    pred = prediction_service.predict(analysis_input)
    assert pred["recommendation"] in ["APPROVE", "REJECT"]
    assert 0.0 <= pred["confidence"] <= 1.0
    assert 0.0 <= pred["approval_probability"] <= 1.0
    assert "approval-model" in pred["modelVersion"]


def test_model_registry_contains_xgboost_and_baseline():
    from app.ml.model_registry import model_registry
    models = model_registry.list_models()
    versions = [m.version for m in models]
    algorithms = [m.algorithm for m in models]

    assert "approval-model-v1" in versions
    assert "approval-model-v2" in versions
    assert "approval-model-v3" in versions
    assert "logistic_regression" in algorithms
    assert "random_forest_calibrated" in algorithms
    assert "xgboost_calibrated" in algorithms

    serving_version = model_registry.get_serving_model_version()
    assert serving_version in ["approval-model-v2", "approval-model-v3"]


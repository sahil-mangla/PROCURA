import pytest
from datetime import datetime, timezone
from app.api.schemas import AnalysisInput
from app.rag.retrieval import historical_retriever, calculate_case_similarity

def test_retrieval_returns_grounded_evidence():
    req = AnalysisInput(
        requestId="PR-TEST-RAG",
        departmentId=1,
        amount=115000.0,
        currency="INR",
        category="IT_EQUIPMENT",
        priority="NORMAL",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=700000.0,
        title="Developer Laptops",
        requestDescription="High performance laptops for software engineers",
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )

    evidence_list = historical_retriever.retrieve_similar_cases(req, top_k=3)
    assert len(evidence_list) >= 1

    # Check first evidence item is properly grounded
    first = evidence_list[0]
    assert first.requestId.startswith("PR-") or first.requestId.startswith("SYN-")
    assert first.outcome in ["APPROVED", "REJECTED"]
    assert 0.0 <= first.similarity <= 1.0
    assert first.amount > 0


def test_similarity_calculation():
    req = AnalysisInput(
        requestId="PR-1",
        departmentId=1,
        amount=100000.0,
        currency="INR",
        category="IT_EQUIPMENT",
        vendorId=1,
        budgetTotal=1000000.0,
        budgetRemaining=500000.0,
        title="Laptops",
        submittedAt=datetime.now(timezone.utc),
        items=[]
    )

    matching_hist = {
        "request_id": "PR-1001",
        "department_id": 1,
        "amount": 120000.0,
        "category": "IT_EQUIPMENT",
        "title": "Laptops for Engineering Team"
    }

    sim = calculate_case_similarity(req, matching_hist)
    assert sim > 0.60


# PROCURA — AI/ML Recommendation Service

Python-based intelligent recommendation, multi-agent evaluation, and RAG service for PROCURA.

> **AI recommends. Deterministic business rules and authorized humans control approval.**
> This service acts as a non-authoritative advisory engine for purchase requests submitted in the Java backend.

---

## 1. Architecture Overview

```text
Java Backend (Submit Event)
          │
          │ POST /v1/analyses (Header: X-Service-Key)
          ▼
┌────────────────────────────────────────────────────────┐
│                   Python AI Service                    │
│                                                        │
│  1. Feature Engineering & Calibrated ML Inference      │
│     - Approval Probability & Confidence Estimation     │
│                                                        │
│  2. Specialized Multi-Agent Intelligence               │
│     ├── Budget Agent: Utilization & overrun analysis   │
│     ├── Historical Agent: Precedent & category patterns│
│     └── Risk Agent: Anomaly & vendor checks            │
│                                                        │
│  3. RAG Historical Retrieval                           │
│     └── Verified case grounding (PR-1001, etc.)        │
│                                                        │
│  4. Decision Orchestration                             │
│     └── Structured Reasons + Explicit Review Triggers  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
              Recommendation JSON Response
```

---

## 2. API Contracts & Endpoints

All endpoints except `/health` require the `X-Service-Key` HTTP header.

### `POST /v1/analyses`
Analyzes a purchase request submitted by the backend.
- **Request Body**: `AnalysisInput` (`requestId`, `departmentId`, `amount`, `currency`, `category`, `vendorId`, `budgetTotal`, `budgetRemaining`, `items`, etc.)
- **Response**: `Recommendation`
  - `recommendation`: `APPROVE` or `REJECT`
  - `confidence`: Decimal in `[0.0, 1.0]` representing certainty in the recommendation
  - `riskLevel`: `LOW` | `MEDIUM` | `HIGH`
  - `requiresHumanReview`: `true` if any review triggers fired or confidence is below threshold
  - `reviewThreshold`: Default `0.80`
  - `reasons`: Structured array of `{ code, text, tone: "SUPPORTS" | "CONCERN", evidenceIds: [...] }`
  - `reviewTriggers`: Array of `{ code, text }` (e.g. `LOW_CONFIDENCE`, `AMOUNT_ANOMALY`, `UNFAMILIAR_VENDOR`, `BUDGET_PRESSURE`, `INSUFFICIENT_HISTORY`)
  - `evidence`: Grounded historical cases `{ requestId, summary, amount, outcome, similarity }`
  - `modelVersion`: e.g. `approval-model-v2`
  - `agentVersions`: `{ budget: "v1", historical: "v1", risk: "v1" }`
  - `analysedAt`: ISO 8601 timestamp

### `GET /v1/models`
Returns list of registered model versions and their held-out test evaluation metrics.
- Evaluated metrics: `accuracy`, `precision`, `recall`, `f1`, `rocAuc`, `brierScore`, `confusionMatrix` (`tp`, `fp`, `tn`, `fn`).

### `GET /health`
Liveness and readiness check. Returns serving status (`UP` / `DEGRADED`), `modelVersion`, and `indexUpdatedAt`.

---

## 3. Machine Learning & Model Registry

The service implements a measurable model progression:

| Model Version | Algorithm | Status | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Brier Score |
|---|---|---|---|---|---|---|---|---|
| `approval-model-v1` | Logistic Regression (Standardized) | RETIRED | ~94.6% | ~98.6% | ~95.5% | ~0.970 | ~0.951 | ~0.041 |
| `approval-model-v2` | Calibrated Random Forest (Sigmoid) | SERVING | ~98.3% | ~98.2% | 100% | ~0.991 | ~0.977 | ~0.019 |
| `approval-model-v3` | Calibrated XGBoost (Sigmoid) | CANDIDATE | ~97.9% | ~98.2% | ~99.5% | ~0.989 | ~0.952 | ~0.020 |

- **Model Comparison**: Explicitly compares linear baseline (Logistic Regression) vs non-linear ensemble (Random Forest) vs boosted trees (XGBoost).
- **Probability Calibration**: Uses `CalibratedClassifierCV` to ensure predicted probabilities correspond to true certainty (minimizing Brier score).
- **Target Leakage Prevention**: Feature extraction utilizes only submit-time snapshots and historical aggregates. Final human decisions and downstream workflow states are strictly excluded from features.

---

## 4. Multi-Agent Intelligence

1. **Budget Agent (`v1`)**: Analyzes department total budget, remaining allocation, and projected utilization. Generates `BUDGET_PRESSURE` triggers and reasons (`WITHIN_BUDGET`, `EXCEEDS_REMAINING_BUDGET`, `HIGH_BUDGET_UTILISATION`, and `PAST_BUDGET_OVERRUNS`).
2. **Historical Analysis Agent (`v1`)**: Leverages RAG to retrieve similar historical requests. Analyzes category precedents and department approval patterns (`SIMILAR_MOSTLY_APPROVED`, `SIMILAR_MOSTLY_REJECTED`).
3. **Risk Agent (`v1`)**: Evaluates amount deviation from department averages (`AMOUNT_ABOVE_AVERAGE` / `AMOUNT_ANOMALY`), vendor transaction history (`VENDOR_UNFAMILIAR` / `UNFAMILIAR_VENDOR` vs `VENDOR_ESTABLISHED`), and submission frequency spikes (`UNUSUAL_FREQUENCY`).
4. **Decision Orchestrator**: Fuses ML probability, agent assessments, and RAG evidence into the unified API recommendation schema.

---

## 5. RAG & Evidence Grounding

- Retrieval is performed over historical requests using multi-attribute similarity (category match, department match, amount proximity ratio, and textual description similarity).
- **Database Grounding (Contract D7)**: Evidence items are strictly grounded in verified database IDs (`PR-1001`, `PR-1002`, `PR-1003` or synced records) so the Java backend validation (`purchaseRequestRepository.existsById`) succeeds.

---

## 6. Feedback & Continuous Learning

- The AI service pulls final outcomes from the backend (`GET /internal/ai/outcomes` or via `POST /v1/feedback/sync`).
- Synced outcomes track original AI recommendations, human decisions, and override flags.
- Candidate retraining (`POST /v1/feedback/retrain`) compares candidate models against the serving model on held-out test data, deploying candidates only when measurable improvements are verified.

---

## 7. Local Setup & Testing

### Prerequisites
- Python 3.11+
- Pip

### Installation
```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env
```

### Run Tests
```bash
pytest -v
```

### Run Service Locally
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Run with Docker Compose
From the repository root:
```bash
docker compose up -d
```
The AI service starts at `http://localhost:8000` with container name `procura-ai-service`.


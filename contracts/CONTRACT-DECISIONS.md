# Contract decisions (proposals)

**Status: PROPOSED, 2026-10-10.** Each item needs sign-off from the owners listed. Mark each one `ACCEPTED`, `CHANGED (to ...)` or `REJECTED` in the PR that adds this folder to `main`.

Sources compared:
- `01-backend-workflow-agent.md` (called "backend doc" below)
- `02-ml-ai-agent.md` ("ML doc")
- the design mockups, `mockups/src/data/mock-request.ts` ("mockups")

Owners: **BE** = backend/workflow, **ML** = AI/ML, **FE** = frontend.

---

## A. AI recommendation shape

### D1. Confidence is a decimal from 0 to 1 · sign-off: ML, BE, FE
Both docs use `0.87`; the mockups use `67`. **Proposal:** `0.0`–`1.0` everywhere on the wire. The UI shows `87%`.

### D2. Who owns the review threshold · sign-off: ML, BE
The ML doc says `confidence < 0.80` triggers review; the mockups say 75%; the backend doc's rule 5 has its own amount thresholds.
**Proposal:** there are two sets of triggers.
- The AI service owns model-based triggers (low confidence, anomalies, unfamiliar vendor). The confidence threshold is AI service config, default `0.80`, and is echoed in each response as `reviewThreshold` so the UI can say "67%, below the 80% threshold".
- The backend owns rule-based triggers (high-value amount, budget exceeded, policy exception).
- A request needs human review if **either** side triggers, **or** the AI result is missing. The backend makes that call.

### D3. Recommendation values: `APPROVE` or `REJECT` only · sign-off: ML, BE
The ML doc mentions a `REVIEW/REJECT` result; the backend doc shows only `APPROVE`.
**Proposal:** `recommendation` is `APPROVE | REJECT`. Escalation is carried only by `requiresHumanReview` plus `reviewTriggers`, so there is one way to say "a human should look", not two.

### D4. Risk field is `riskLevel` with `LOW | MEDIUM | HIGH` · sign-off: ML, FE
Both docs say `riskLevel`; the mockups say `risk`. **Proposal:** `riskLevel`. FE renames.

### D5. Reasons become objects · sign-off: ML, BE, FE
Both docs use a list of strings. The UI separates supporting reasons from concerns, and the ML doc requires explanations to "correspond to actual features/evidence".
**Proposal:**
```json
{ "code": "WITHIN_BUDGET", "text": "Within remaining department budget", "tone": "SUPPORTS", "evidenceIds": [] }
```
`code` is a stable machine value (list in [ai-service.yaml](ai-service.yaml)), `text` is display copy, `tone` is `SUPPORTS | CONCERN`, and `evidenceIds` ties a reason to the cases behind it. **This changes the schema both docs show.** Agree it now, before anything is built.

### D6. Review triggers are explicit · sign-off: ML, BE, FE
The ML doc says "the AI should explicitly state why escalation occurred" but has no field for it; the mockups invented `humanReviewReason`.
**Proposal:** `reviewTriggers: [{ code, text }]` with codes such as `LOW_CONFIDENCE`, `AMOUNT_ANOMALY`, `UNFAMILIAR_VENDOR`, `BUDGET_PRESSURE`. The backend appends its own rule triggers (`source: RULE`) when it creates the review task.

### D7. Evidence comes back as full cases, not bare IDs · sign-off: ML, BE, FE
Both docs return `evidenceIds` only, and no API resolves them. The UI shows each case's summary, amount, outcome and similarity.
**Proposal:** the AI service returns
```json
"evidence": [{ "requestId": "REQ-421", "summary": "Standing desks, 12 units", "amount": 120000, "outcome": "APPROVED", "similarity": 0.82 }]
```
and drops `evidenceIds`. Rules:
- Every `requestId` must be a real historical request from the backend's data export (D18). The AI service never invents cases.
- The backend checks each ID exists before storing. Unknown IDs are dropped and logged, and the analysis is flagged `evidenceRejected: true` in the audit record.
- The backend stores the evidence as a snapshot, so the audit record does not change if the historical row is later edited.

### D8. `agentVersions` and `analysedAt` are required · sign-off: ML, BE
In the ML doc, not in the backend doc. **Proposal:** required in every response; `modelVersion` stays required. `agentVersions` keys: `budget`, `historical`, `risk`.

### D9. The backend owns hard policy rules; no policy agent in the AI service for v1 · sign-off: ML, BE
The ML doc lists a Policy Agent ("prefer deterministic"); the backend doc says deterministic rules belong to the backend.
**Proposal:** hard rules live only in Java, so there is one source of truth. The AI service does not evaluate policy in v1. If an LLM-written explanation of a policy outcome is wanted later, the backend sends the rule results to the AI service as input.

## B. Workflow

Full detail in [workflow.md](workflow.md).

### D10. Add a `HUMAN_REVIEW` state; Finance performs the review · sign-off: BE, FE
The backend doc draws "HUMAN_REVIEW_REQUIRED" but doesn't list it as a state, so the UI can't show it.
**Proposal:** after department approval, the backend checks D2. If review is needed, the request moves to `HUMAN_REVIEW` instead of waiting in `DEPARTMENT_APPROVED`. A Finance Manager records the review decision, and an approval there moves straight to `FINANCE_APPROVED`. The review is a stricter finance approval: the person sees the triggers and must give a reason when they disagree with the AI.
*Alternative:* a separate reviewer role, plus a `REVIEW_CLEARED` state before finance. That costs one more role and one more state; choose it only if the course needs reviewer and finance to be different people.

### D11. Add an `INFO_REQUESTED` state · sign-off: BE, FE
`REQUEST_INFORMATION` is a listed action with no destination.
**Proposal:** a department head (from `SUBMITTED`) or a finance manager (from `HUMAN_REVIEW`) can request information, which moves the request to `INFO_REQUESTED`. The requester may then edit it like a draft and resubmit. Resubmission returns it to `SUBMITTED`, re-runs the AI analysis, and department approval starts again. The earlier AI analysis and history are kept.

### D12. If the AI is unavailable, the request continues, with human review · sign-off: BE, ML, FE
The design doc says "let the request continue through the standard workflow".
**Proposal:** if the AI call fails or times out, the backend records `aiStatus: UNAVAILABLE`, emits `AI_UNAVAILABLE`, and the request continues. When department approval happens, a missing AI result counts as a review trigger (`source: RULE, code: AI_UNAVAILABLE`), so no request reaches finance without either an AI result or a human review.

### D13. The AI runs once on submit, asynchronously · sign-off: BE, ML
**Proposal:** the backend calls the AI service right after `SUBMITTED` commits, on a background thread, with a 15-second timeout and one retry. Submitting never waits for the AI. The request detail shows `aiStatus: PENDING` until the result arrives.

### D14. The PO is generated automatically and only once · sign-off: BE, FE
**Proposal:** the backend generates the PO in its own transaction right after `FINANCE_APPROVED` commits. A unique constraint on the PO's `purchaseRequestId` makes it idempotent. If generation fails, the request stays `FINANCE_APPROVED` and a finance manager can retry with `POST /purchase-requests/{id}/purchase-order`.

## C. API style

### D15. The backend tells the UI what is allowed · sign-off: BE, FE
The design rules say "no frontend-only workflow states".
**Proposal:** `GET /purchase-requests/{id}` returns
- `allowedActions`: what *this* user may do now (`EDIT`, `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_INFORMATION`, `REVIEW`, `RETRY_PO`), and
- `workflowSteps`: the progress steps to draw.
The UI shows buttons from `allowedActions` and never computes the state machine itself. The server still re-checks every action.

### D16. Errors and concurrency · sign-off: BE, FE
**Proposal:** errors use `application/problem+json` with a stable `code`:
`VALIDATION_FAILED` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `INVALID_TRANSITION` 409, `WORKFLOW_CONFLICT` 409, `BUSINESS_RULE_VIOLATION` 422.
Every decision request carries the `version` the user saw. If the request changed in between, the backend returns `WORKFLOW_CONFLICT`, and the UI says someone else acted first and reloads. This is the "workflow conflict" error state from the design doc.

### D17. IDs, money, time · sign-off: BE, ML, FE
See the conventions in [README.md](README.md). Purchase requests use string IDs (`PR-1024`) because users read them and they appear as evidence IDs. Historical requests use the same ID format.

### D18. The AI service pulls its data from the backend · sign-off: BE, ML
Retrieval and training need historical requests and outcomes, and the backend owns the database.
**Proposal:** the backend exposes read-only internal endpoints (`/internal/ai/...` in [openapi.yaml](openapi.yaml)), authenticated with a shared service key:
- `GET /internal/ai/historical-requests?updatedSince=` for retrieval indexing and training features
- `GET /internal/ai/outcomes?since=` for the feedback dataset: final outcome, AI recommendation, override flag
The AI service never reads the Postgres database directly. Seed data for development lives in the backend repo as a Flyway migration or CSV that both sides use.

### D19. Authentication · sign-off: BE, FE
**Proposal:** `POST /auth/login` returns a short-lived JWT access token, sent as `Authorization: Bearer`. `GET /auth/me` returns the user, role and department. Roles: `REQUESTER`, `DEPARTMENT_HEAD`, `FINANCE_MANAGER`, `ADMIN`. `ADMIN` manages users, departments, vendors and budgets but cannot approve requests. Service-to-service calls (Java ↔ Python) use an `X-Service-Key` header.

---

## D. Not decided (needs a product call)

1. **Undo window** after a decision. It needs a backend "pending commit" period. Proposed: not in v1.
2. **Withdraw/cancel** by the requester after submitting. Proposed: allow from `SUBMITTED` and `INFO_REQUESTED` only, into a terminal `CANCELLED` state. Not yet in [workflow.md](workflow.md).
3. **A department head's own requests.** Proposed rule: they cannot approve their own request; it goes to finance, which acts as department approver for it.
4. **Attachments** (quotes, invoices). Not in either doc. Proposed: not in v1.
5. **Currencies other than INR.** Proposed: INR only in v1; keep the `currency` field so it can grow.

## E. Frontend changes these decisions cause

So the mockups match the contract:
- `confidence: 67` → `0.67`; threshold 75 → 80 (D1, D2)
- `risk` → `riskLevel` (D4)
- `reasons[].tone`: `"supports" | "concern"` → `"SUPPORTS" | "CONCERN"`, plus `code` (D5)
- `humanReviewReason` → `reviewTriggers[]` (D6)
- `evidence[].id` → `evidence[].requestId` (D7)
- Workflow steps and allowed buttons come from the API (D15)
- The workflow has review handled by Finance, with an approval going straight to finance-approved (D10). The mockups' separate "Human review" and "Finance approval" steps merge if D10 is accepted.

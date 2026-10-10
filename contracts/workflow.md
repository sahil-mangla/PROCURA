# Procurement request workflow

**Status: DRAFT, 2026-10-10.** Owner: Backend. Depends on decisions D10–D14 in [CONTRACT-DECISIONS.md](CONTRACT-DECISIONS.md).

The backend is the only component that changes a request's state. The AI service recommends, the frontend displays, and neither one moves a request.

## States

| State | Meaning | Terminal |
|---|---|---|
| `DRAFT` | Being written by the requester | no |
| `SUBMITTED` | Waiting for the department head | no |
| `INFO_REQUESTED` | Sent back to the requester for more information | no |
| `DEPARTMENT_APPROVED` | Department approved, no review needed, waiting for finance | no |
| `HUMAN_REVIEW` | Department approved, review needed, waiting for a finance manager's review decision | no |
| `FINANCE_APPROVED` | All approvals present, PO being generated | no |
| `PO_GENERATED` | Purchase order exists | yes |
| `REJECTED` | Rejected at any approval stage | yes |

AI analysis is not a state. It runs alongside the workflow and is tracked separately as `aiStatus`: `NOT_STARTED | PENDING | COMPLETED | UNAVAILABLE`.

## Diagram

```text
             submit                      approve (dept head)
  DRAFT ───────────────▶ SUBMITTED ──────────────────────────┐
    ▲                    │   ▲  │                             │
    │ (edit)   request   │   │  │ reject                      ▼
    │          info      │   │  └──────────▶ REJECTED   review needed?
    │                    ▼   │ resubmit          ▲        │          │
    └──────────── INFO_REQUESTED                 │       no         yes
                         ▲                       │        ▼          ▼
                         │ request info          │  DEPARTMENT_   HUMAN_
                         └───────────────────────┼─ APPROVED      REVIEW
                                                 │     │  │        │  │
                                          reject ├─────┘  │ approve│  │ reject
                                                 └────────┼────────┼──┘
                                                          ▼        ▼
                                                     FINANCE_APPROVED
                                                          │ (system, automatic)
                                                          ▼
                                                     PO_GENERATED
```

## Transitions

| # | From | To | Action / trigger | Who | Endpoint |
|---|---|---|---|---|---|
| T1 | `DRAFT` | `SUBMITTED` | submit | requester (owner) | `POST /purchase-requests/{id}/submit` |
| T2 | `SUBMITTED` | `DEPARTMENT_APPROVED` | approve, no review needed | department head of that department | `POST /purchase-requests/{id}/approve` |
| T3 | `SUBMITTED` | `HUMAN_REVIEW` | approve, review needed | department head of that department | `POST /purchase-requests/{id}/approve` |
| T4 | `SUBMITTED` | `REJECTED` | reject | department head of that department | `POST /purchase-requests/{id}/reject` |
| T5 | `SUBMITTED` | `INFO_REQUESTED` | request information | department head of that department | `POST /purchase-requests/{id}/request-information` |
| T6 | `INFO_REQUESTED` | `SUBMITTED` | resubmit (re-runs the AI) | requester (owner) | `POST /purchase-requests/{id}/submit` |
| T7 | `DEPARTMENT_APPROVED` | `FINANCE_APPROVED` | approve | finance manager | `POST /purchase-requests/{id}/approve` |
| T8 | `DEPARTMENT_APPROVED` | `REJECTED` | reject | finance manager | `POST /purchase-requests/{id}/reject` |
| T9 | `HUMAN_REVIEW` | `FINANCE_APPROVED` | review decision `APPROVE` | finance manager | `POST /reviews/{id}/decision` |
| T10 | `HUMAN_REVIEW` | `REJECTED` | review decision `REJECT` | finance manager | `POST /reviews/{id}/decision` |
| T11 | `HUMAN_REVIEW` | `INFO_REQUESTED` | review decision `REQUEST_INFORMATION` | finance manager | `POST /reviews/{id}/decision` |
| T12 | `FINANCE_APPROVED` | `PO_GENERATED` | PO generated | system (retry: finance manager) | automatic; retry `POST /purchase-requests/{id}/purchase-order` |

T2 vs T3 is decided by the backend, not chosen by the user. Either transition opens a review when **any** of these hold (D2, D12):
- the AI result has `requiresHumanReview = true` (its `reviewTriggers` are copied with `source: AI`)
- the amount exceeds the configured high-value threshold → `HIGH_VALUE`
- the amount exceeds the department's remaining budget → `BUDGET_EXCEEDED`
- a hard policy rule flags an exception → `POLICY_EXCEPTION`
- `aiStatus` is `PENDING` or `UNAVAILABLE` at the moment of approval → `AI_UNAVAILABLE`

Anything not in this table returns `409 INVALID_TRANSITION`.

## Rules enforced on every transition

Each transition runs in one transaction, in this order (backend doc §12):
1. Load the request, and compare the client's `version` with the stored one; if they differ, `409 WORKFLOW_CONFLICT`.
2. Check the actor's role and scope (own request, own department), else `403 FORBIDDEN`.
3. Check the transition is in the table above, else `409 INVALID_TRANSITION`.
4. Check business rules, else `422 BUSINESS_RULE_VIOLATION`.
5. Update the state and increment `version`.
6. Append an immutable `ApprovalHistory` row.
7. Write the audit/event record and notifications.

Other rules:
- Only `DRAFT` and `INFO_REQUESTED` requests can be edited, and only by their requester.
- A reject or request-information action requires a comment. An approval that disagrees with the AI recommendation requires a comment (`reason`), and the history row is marked `override: true`.
- The AI analysis stored for a request is never updated. A re-run (T6) adds a new analysis; the request points at the latest one, and earlier ones stay in the audit trail.
- A user cannot act on their own request at any approval step.

## Events

Each event becomes a history entry and drives notifications. Notification text uses the same wording on every screen (design doc, interaction rule 2).

| Event | Emitted on | Notify |
|---|---|---|
| `REQUEST_SUBMITTED` | T1, T6 | department heads of the department |
| `AI_ANALYSIS_COMPLETED` | AI result stored | requester |
| `AI_UNAVAILABLE` | AI call failed after retry | requester, department heads |
| `DEPARTMENT_APPROVED` | T2, T3 | requester; finance managers on T2 |
| `HUMAN_REVIEW_REQUIRED` | T3 | finance managers |
| `INFO_REQUESTED` | T5, T11 | requester |
| `REQUEST_REJECTED` | T4, T8, T10 | requester |
| `FINANCE_APPROVED` | T7, T9 | requester, department heads |
| `PO_GENERATED` | T12 | requester, finance managers |
| `PO_GENERATION_FAILED` | T12 failed | finance managers |

When a human decision differs from the AI recommendation, the event and its notifications carry `override: true` and both values, so the UI can show the disagreement in all three places (history row, audit panel, notification).

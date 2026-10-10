# Shared contracts

**Status: DRAFT, 2026-10-10.** Nothing here is binding until the backend owner and the AI/ML owner have signed off on [CONTRACT-DECISIONS.md](CONTRACT-DECISIONS.md).

These files are the interfaces between the three workstreams. Put them on `main` before anyone branches, and change them only through the process below.

| File | What it defines | Owner | Consumers |
|---|---|---|---|
| [CONTRACT-DECISIONS.md](CONTRACT-DECISIONS.md) | Every place the context docs and mockups disagreed, with a proposed answer | all three | all three |
| [workflow.md](workflow.md) | Request states, transitions, who may trigger them, events | Backend | Frontend, AI/ML |
| [openapi.yaml](openapi.yaml) | Backend REST API (browser → Java) and internal data export (AI service → Java) | Backend | Frontend, AI/ML |
| [ai-service.yaml](ai-service.yaml) | AI service REST API (Java → Python) | AI/ML | Backend |

## Conventions (apply to both APIs)

- JSON, `camelCase` field names, enums in `UPPER_SNAKE_CASE`.
- Timestamps: ISO 8601 with offset, e.g. `2026-10-06T10:12:00+05:30`.
- Money: decimal number in rupees with at most 2 decimal places (Java `BigDecimal`, Python `Decimal`), plus `currency: "INR"`.
- Probabilities and confidence: decimal `0.0`–`1.0`. The UI formats them as percentages.
- Purchase request IDs are strings (`PR-1024`), purchase order IDs are strings (`PO-2026-0007`). Users, departments, vendors and budgets use numeric IDs.
- Errors: `application/problem+json` (RFC 9457) with a stable `code`. See `Problem` in [openapi.yaml](openapi.yaml).

## Changing a contract

1. Open a PR against `main` that edits the contract file and adds a line to the changelog below.
2. Tag the other two owners. The owner of the file merges only after both consumers approve.
3. Prefer additive changes (new optional fields). Renaming or removing a field needs a version bump (`/v2/...` for the AI service) or a migration plan agreed in the PR.

## Mock server for the frontend

The frontend can run against a fake backend generated from `openapi.yaml` before the Java service exists, for example:

```bash
npx @stoplight/prism-cli mock contracts/openapi.yaml
```

## Changelog

- 2026-10-10: first draft.

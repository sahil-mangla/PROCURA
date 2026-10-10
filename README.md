# PROCURA

AI-powered procurement request and purchase order approval system. Semester project, three workstreams.

> **AI recommends. Deterministic business rules and authorised humans control approval.**

## Repository layout

| Folder | What | Owner | Branch |
|---|---|---|---|
| `contracts/` | Shared API contracts, workflow, contract decisions. **Read this first.** | all three | `main` only |
| `docs/` | Design decisions | Frontend | `main` |
| `mockups/` | Clickable UI mockups (Vite + React), reference for the frontend | Frontend | `main` |
| `frontend/` | Production Next.js app | Frontend | `frontend` |
| `backend/` | Java 21 + Spring Boot API, workflow, RBAC, PostgreSQL | Backend | `backend` |
| `ai-service/` | Python ML model, retrieval, agents | AI/ML | `ai-service` |

Each workstream works on its own branch and keeps its code inside its own top-level folder, so merging into `main` never conflicts.

## Where to start

1. Read [contracts/CONTRACT-DECISIONS.md](contracts/CONTRACT-DECISIONS.md) and mark each decision you own as accepted, changed or rejected.
2. Build against the contracts:
   - Backend implements [contracts/openapi.yaml](contracts/openapi.yaml) and [contracts/workflow.md](contracts/workflow.md), and calls [contracts/ai-service.yaml](contracts/ai-service.yaml).
   - AI service implements [contracts/ai-service.yaml](contracts/ai-service.yaml) and reads data from the `/internal/ai/*` endpoints in `openapi.yaml`.
   - Frontend consumes `openapi.yaml`. Until the backend runs: `npx @stoplight/prism-cli mock contracts/openapi.yaml`.
3. Contract changes go through a pull request to `main` reviewed by the other two owners (see [contracts/README.md](contracts/README.md)).

## Branches

```bash
git clone https://github.com/sahil-mangla/PROCURA.git
cd PROCURA
git switch backend        # or ai-service, frontend (create with: git switch -c <name>)
```

Keep your branch current with contract changes:

```bash
git fetch origin
git merge origin/main
```

## Local ports

| Service | Port |
|---|---|
| Backend | 8080 (`/api`) |
| AI service | 8000 |
| Frontend | 3000 |
| Mockups | 5173 |
| PostgreSQL | 5432 |

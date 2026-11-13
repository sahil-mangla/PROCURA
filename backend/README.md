# PROCURA Backend — Production-Grade Procurement Engine

PROCURA is an AI-assisted procurement management platform designed with human-in-the-loop governance.
Core architectural principle: **AI recommends. Deterministic business rules and authorised humans control approval.**

The backend is implemented as a high-performance **modular monolith** using Java 21, Spring Boot 3.4.x, PostgreSQL, Spring Security (stateless JWT), Flyway migrations, and Maven.

---

## 1. Architectural Highlights

- **Domain-Driven Modular Monolith**: Each domain (`auth`, `user`, `department`, `vendor`, `budget`, `procurement`, `workflow`, `review`, `purchaseorder`, `notification`, `audit`, `outbox`, `ai`) encapsulates its controllers, entities, repositories, services, DTOs, and mappers.
- **Contract-First Source of Truth**: Faithfully implements all 31 endpoints specified in `contracts/openapi.yaml` and the Python AI service contract in `contracts/ai-service.yaml`.
- **Deterministic 8-State Workflow Machine**: Implements transitions T1–T12 (`DRAFT`, `SUBMITTED`, `INFO_REQUESTED`, `DEPARTMENT_APPROVED`, `HUMAN_REVIEW`, `FINANCE_APPROVED`, `PO_GENERATED`, `REJECTED`) with strict server-side role validation, optimistic concurrency control, and immutable audit logging.
- **Pessimistic Financial Budget Guarantees**: Department fiscal year budgets are locked with pessimistic write locks (`SELECT ... FOR UPDATE`) during approvals to strictly prevent oversubscription under concurrent load.
- **Optimistic Concurrency Control**: All purchase requests use JPA `@Version` tokens. Stale decision submissions atomically fail with `409 WORKFLOW_CONFLICT`.
- **Idempotent Purchase Order Generation**: Duplicate PO generation attempts return the existing PO without duplicate issuance or double-charging.
- **Resilient AI Service Integration**: Outbox-pattern asynchronous dispatching with a dual HTTP client and deterministic fallback stub, ensuring procurement submissions succeed even when the external AI service is unreachable.
- **RFC 9457 Problem Details**: Centralized REST error handling delivering standard Problem JSON payloads across all 4xx/5xx scenarios.

---

## 2. Technology Stack

- **Java**: 21 (LTS)
- **Framework**: Spring Boot 3.4.3
- **Persistence**: Spring Data JPA / Hibernate 6.6
- **Database**: PostgreSQL 16 (H2 in-memory for zero-dependency test execution)
- **Migrations**: Flyway 10.x (`V1__init_schema.sql`, `V2__seed_data.sql`)
- **Security**: Spring Security 6.x + JJWT 0.12.6 (HMAC-SHA256)
- **API Documentation**: Springdoc OpenAPI / Swagger UI
- **Build Tool**: Apache Maven 3.9+
- **Containerization**: Docker Compose & Multi-stage Dockerfile

---

## 3. Directory Layout

```text
backend/
├── src/
│   ├── main/
│   │   ├── java/com/procura/
│   │   │   ├── ProcuraApplication.java
│   │   │   ├── config/              # OpenAPI, WebMvc configuration
│   │   │   ├── security/            # JWT filters, UserPrincipal, ServiceKeyFilter
│   │   │   ├── auth/                # Login, /auth/me authentication
│   │   │   ├── user/                # User management, AppUser entity
│   │   │   ├── department/          # Department catalog & head assignment
│   │   │   ├── vendor/              # Vendor registry & order metrics
│   │   │   ├── budget/              # Fiscal budgets, pessimistic reservations
│   │   │   ├── procurement/         # PR draft/submit/view, line items, totals
│   │   │   ├── workflow/            # State machine (T1–T12), allowed actions, step steps
│   │   │   ├── review/              # Human review queue & decisions (T9, T10, T11)
│   │   │   ├── purchaseorder/       # PO generation (T12), immutable snapshots
│   │   │   ├── notification/        # In-app notifications & read state
│   │   │   ├── audit/               # Immutable approval histories & AI audit logs
│   │   │   ├── outbox/              # Transactional outbox event publishing
│   │   │   ├── ai/                  # AI client (HTTP + stub), evidence & fallback
│   │   │   └── common/              # Enums, RFC 9457 error handlers, DTOs
│   │   └── resources/
│   │       ├── application.yml      # Base & production config
│   │       └── db/migration/
│   │           ├── V1__init_schema.sql # 13 normalized tables, FKs, sequences
│   │           └── V2__seed_data.sql   # Seed users, departments, budgets, PRs
│   └── test/
│       ├── java/com/procura/
│       │   ├── BaseIntegrationTest.java
│       │   ├── PasswordHashTest.java
│       │   ├── auth/AuthIntegrationTest.java
│       │   ├── procurement/ProcurementCrudIntegrationTest.java
│       │   ├── workflow/WorkflowTransitionsIntegrationTest.java
│       │   ├── workflow/ConcurrencyAndBudgetIntegrationTest.java
│       │   ├── workflow/ComprehensiveWorkflowAndEndpointsTest.java
│       │   └── audit/AiServiceAndAuditIntegrationTest.java
│       └── resources/
│           ├── application-test.yml
│           └── schema.sql
├── Dockerfile
├── .env.example
└── pom.xml
```

---

## 4. Getting Started

### Prerequisites

- Java 21 JDK installed (`java -version`)
- Docker & Docker Compose (optional, for running with local PostgreSQL)
- Maven 3.9+ or use the included Maven wrapper

### Configuration (`.env`)

Copy `backend/.env.example` to `backend/.env` or configure system environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Backend HTTP listening port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `procura` | Database name |
| `DB_USER` | `procura` | Database username |
| `DB_PASSWORD` | `procura123` | Database password |
| `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | 256-bit secret key for JWT signing |
| `JWT_EXPIRATION_SECONDS` | `86400` | JWT token validity (24 hours) |
| `SERVICE_KEY` | `procura-internal-service-key-2026` | Pre-shared key for AI service endpoints |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL of the Python AI recommendation service |
| `AI_MOCK_ENABLED` | `false` | Enable deterministic fallback stub when AI is offline |
| `WORKFLOW_HIGH_VALUE_THRESHOLD` | `50000.00` | Amount (₹) above which approvals route to Human Review |
| `WORKFLOW_CONFIDENCE_THRESHOLD` | `0.80` | AI confidence below which approvals route to Human Review |

---

## 5. Running the Application

### Option A: Running with Docker Compose (PostgreSQL + Backend)

Start PostgreSQL from the root directory:
```bash
docker compose up -d postgres
```

Run the backend via Maven:
```powershell
mvn clean spring-boot:run -f backend/pom.xml
```

Or build and run the full stack via Docker Compose:
```bash
docker compose up --build backend
```

### Option B: Building the Standalone Production Jar

```powershell
mvn clean package -DskipTests -f backend/pom.xml
java -jar backend/target/procura-backend-1.0.0-SNAPSHOT.jar
```

The server starts at `http://localhost:8080` (API context path: `/api` and `/`).
Swagger UI is accessible at `http://localhost:8080/swagger-ui.html`.

---

## 6. Seed Accounts & Credentials

The database migration `V2__seed_data.sql` pre-loads the following standard accounts (Password for all: `password123`):

| Email | Role | Department | Description |
|---|---|---|---|
| `alice.requester@procura.local` | `REQUESTER` | Engineering | Standard requester |
| `bob.depthead@procura.local` | `DEPARTMENT_HEAD` | Engineering | Head of Engineering |
| `carol.finance@procura.local` | `FINANCE_MANAGER` | Finance | Finance manager & review approver |
| `dave.admin@procura.local` | `ADMIN` | Corporate IT | System administrator |

---

## 7. Running the Test Suite

The test suite contains 26 comprehensive integration tests covering end-to-end authentication, draft editing, state transitions, concurrent races, budget oversubscription, AI service proxying, and audit logging.

Execute all tests:
```powershell
mvn clean test -f backend/pom.xml
```

### Verified Test Matrix:

1. **`PasswordHashTest`**:
   - BCrypt hashing compliance and verification.
2. **`AuthIntegrationTest`**:
   - `POST /api/auth/login` credentials verification and JWT token issuance.
   - 401 UNAUTHENTICATED handling for invalid credentials.
   - `GET /api/auth/me` profile recovery with role and department metadata.
3. **`ProcurementCrudIntegrationTest`**:
   - `POST /api/purchase-requests`: Draft creation, server-calculated totals, auto-generated sequence ID (`PR-1000+`).
   - Bean validation constraints returning RFC 9457 `400 VALIDATION_FAILED`.
   - `PUT /api/purchase-requests/{id}`: Updating draft contents and recalculating totals.
   - `DELETE /api/purchase-requests/{id}`: Deleting drafts, rejecting deletions on submitted requests.
   - `GET /api/purchase-requests`: Filtering by status, category, date range, and pagination.
4. **`WorkflowTransitionsIntegrationTest`**:
   - T1 -> T2 -> T7 -> T12: Complete low-value happy path with automatic PO issuance.
   - T1 -> T3 -> T9 -> T12: High-value purchase request routing through Human Review to PO.
   - Self-approval prohibition: Requesters cannot approve their own requests (`403 FORBIDDEN`).
   - Stale version conflicts: In-flight race conditions rejected with `409 WORKFLOW_CONFLICT`.
   - Comment enforcement on rejection: Empty comments rejected with `400 VALIDATION_FAILED`.
5. **`ConcurrencyAndBudgetIntegrationTest`**:
   - Concurrent conflicting approvals (Approve vs Reject) on the same version: exactly one succeeds, the other receives `409 WORKFLOW_CONFLICT`.
   - Concurrent budget oversubscription: Pessimistic reservation prevents concurrent approvals exceeding remaining department budget (`422 BUSINESS_RULE_VIOLATION`).
   - Idempotent PO generation: Multiple generations return the identical PO without duplicate records.
6. **`ComprehensiveWorkflowAndEndpointsTest`**:
   - T4: Department Head rejection with stage capture (`status: REJECTED`, `rejectedAtStage: DEPARTMENT`).
   - T5 & T6: Request information -> edit during `INFO_REQUESTED` -> resubmit -> re-run AI.
   - T8: Finance Manager rejection (`rejectedAtStage: FINANCE`).
   - T10: Human Review rejection decision.
   - Reference data access: `GET /api/departments`, `GET /api/vendors`, `GET /api/budgets`, `GET /api/users` (ADMIN-only RBAC).
   - In-app notifications: `GET /api/notifications` and `POST /api/notifications/{id}/read`.
7. **`AiServiceAndAuditIntegrationTest`**:
   - `GET /api/internal/ai/historical-requests` protected with `X-Service-Key`.
   - `GET /api/internal/ai/outcomes` protected with `X-Service-Key`.
   - `GET /api/audit/ai-decisions` restricted to `FINANCE_MANAGER` and `ADMIN`.
   - `GET /api/ai/models` model metadata proxy.

---

## 8. State Machine Transitions Reference

| Transition | From State | To State | Action / Trigger | Actor Allowed | Endpoint |
|---|---|---|---|---|---|
| **T1** | `DRAFT` | `SUBMITTED` | Submit draft | Requester (Owner) | `POST /purchase-requests/{id}/submit` |
| **T2** | `SUBMITTED` | `DEPARTMENT_APPROVED` | Approve (no review needed) | Department Head | `POST /purchase-requests/{id}/approve` |
| **T3** | `SUBMITTED` | `HUMAN_REVIEW` | Approve (triggers review) | Department Head | `POST /purchase-requests/{id}/approve` |
| **T4** | `SUBMITTED` | `REJECTED` | Reject request | Department Head | `POST /purchase-requests/{id}/reject` |
| **T5** | `SUBMITTED` | `INFO_REQUESTED` | Request additional info | Department Head | `POST /purchase-requests/{id}/request-information` |
| **T6** | `INFO_REQUESTED` | `SUBMITTED` | Resubmit request | Requester (Owner) | `POST /purchase-requests/{id}/submit` |
| **T7** | `DEPARTMENT_APPROVED` | `FINANCE_APPROVED` | Approve | Finance Manager | `POST /purchase-requests/{id}/approve` |
| **T8** | `DEPARTMENT_APPROVED` | `REJECTED` | Reject request | Finance Manager | `POST /purchase-requests/{id}/reject` |
| **T9** | `HUMAN_REVIEW` | `FINANCE_APPROVED` | Decision `APPROVE` | Finance Manager | `POST /reviews/{id}/decision` |
| **T10** | `HUMAN_REVIEW` | `REJECTED` | Decision `REJECT` | Finance Manager | `POST /reviews/{id}/decision` |
| **T11** | `HUMAN_REVIEW` | `INFO_REQUESTED` | Decision `REQUEST_INFORMATION` | Finance Manager | `POST /reviews/{id}/decision` |
| **T12** | `FINANCE_APPROVED` | `PO_GENERATED` | Automatic PO generation | System (Retry: Finance) | Automatic / `POST /purchase-requests/{id}/purchase-order` |


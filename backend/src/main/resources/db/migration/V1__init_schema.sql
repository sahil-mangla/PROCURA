-- Flyway Migration V1: Initial Normalized Schema for PROCURA
-- Complies with PostgreSQL constraints, NUMERIC(19,2) monetary fields, and contracts

-- 1. Department table
CREATE TABLE department (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    head_user_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. App User table
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('REQUESTER', 'DEPARTMENT_HEAD', 'FINANCE_MANAGER', 'ADMIN')),
    department_id BIGINT REFERENCES department(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key from department to head_user_id
ALTER TABLE department
    ADD CONSTRAINT fk_department_head_user
    FOREIGN KEY (head_user_id) REFERENCES app_user(id) ON DELETE SET NULL;

-- 3. Vendor table
CREATE TABLE vendor (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    completed_orders INT NOT NULL DEFAULT 0,
    first_order_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Budget table (department budget per fiscal year)
CREATE TABLE budget (
    id BIGSERIAL PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
    fiscal_year VARCHAR(20) NOT NULL,
    total NUMERIC(19,2) NOT NULL CHECK (total >= 0),
    spent NUMERIC(19,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
    committed NUMERIC(19,2) NOT NULL DEFAULT 0 CHECK (committed >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_dept_fiscal UNIQUE (department_id, fiscal_year)
);

-- Sequence for PR IDs: PR-1000, PR-1001, ...
CREATE SEQUENCE IF NOT EXISTS purchase_request_seq START WITH 1000 INCREMENT BY 1;

-- 5. Purchase Request table
CREATE TABLE purchase_request (
    id VARCHAR(30) PRIMARY KEY, -- e.g. PR-1042
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('IT_EQUIPMENT', 'SOFTWARE', 'OFFICE_FURNITURE', 'OFFICE_SUPPLIES', 'SERVICES', 'TRAVEL', 'MAINTENANCE', 'OTHER')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'INFO_REQUESTED', 'DEPARTMENT_APPROVED', 'HUMAN_REVIEW', 'FINANCE_APPROVED', 'PO_GENERATED', 'REJECTED')),
    requester_id BIGINT NOT NULL REFERENCES app_user(id),
    department_id BIGINT NOT NULL REFERENCES department(id),
    vendor_id BIGINT NOT NULL REFERENCES vendor(id),
    amount NUMERIC(19,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    needed_by DATE,
    submitted_at TIMESTAMPTZ,
    budget_total_at_submit NUMERIC(19,2),
    budget_remaining_at_submit NUMERIC(19,2),
    ai_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (ai_status IN ('NOT_STARTED', 'PENDING', 'COMPLETED', 'UNAVAILABLE')),
    latest_analysis_id BIGINT,
    open_review_id BIGINT,
    purchase_order_id VARCHAR(30),
    rejected_at_stage VARCHAR(30) CHECK (rejected_at_stage IN ('DEPARTMENT', 'FINANCE', 'REVIEW', NULL)),
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Purchase Request Line Items
CREATE TABLE purchase_request_item (
    id BIGSERIAL PRIMARY KEY,
    purchase_request_id VARCHAR(30) NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    description VARCHAR(300) NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
    unit_price NUMERIC(19,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(19,2) NOT NULL CHECK (line_total >= 0),
    sort_order INT NOT NULL DEFAULT 0
);

-- 7. AI Analysis table (immutable once stored)
CREATE TABLE ai_analysis (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(30) NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    recommendation VARCHAR(20) NOT NULL CHECK (recommendation IN ('APPROVE', 'REJECT')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    review_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    reasons_json TEXT NOT NULL,
    review_triggers_json TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    agent_versions_json TEXT NOT NULL,
    analysed_at TIMESTAMPTZ NOT NULL,
    evidence_rejected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Human Review Queue & Decisions
CREATE TABLE human_review (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(30) NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    request_title VARCHAR(200) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'DECIDED')),
    triggers_json TEXT NOT NULL,
    ai_recommendation VARCHAR(20) CHECK (ai_recommendation IN ('APPROVE', 'REJECT', NULL)),
    ai_confidence DOUBLE PRECISION,
    decision VARCHAR(30) CHECK (decision IN ('APPROVE', 'REJECT', 'REQUEST_INFORMATION', NULL)),
    decided_by_id BIGINT REFERENCES app_user(id),
    decided_at TIMESTAMPTZ,
    override BOOLEAN,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index: at most one open human review for a request
CREATE UNIQUE INDEX idx_unique_open_review_per_request ON human_review(request_id) WHERE status = 'OPEN';

-- Sequence for PO IDs: PO-YYYY-0001
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START WITH 1 INCREMENT BY 1;

-- 9. Purchase Order table (immutable snapshot)
CREATE TABLE purchase_order (
    id VARCHAR(30) PRIMARY KEY, -- e.g. PO-2026-0001
    purchase_request_id VARCHAR(30) NOT NULL UNIQUE REFERENCES purchase_request(id),
    vendor_id BIGINT NOT NULL REFERENCES vendor(id),
    department_name VARCHAR(100) NOT NULL,
    total NUMERIC(19,2) NOT NULL CHECK (total >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Purchase Order Items
CREATE TABLE purchase_order_item (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id VARCHAR(30) NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    description VARCHAR(300) NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
    unit_price NUMERIC(19,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(19,2) NOT NULL CHECK (line_total >= 0)
);

-- 11. Approval History (Immutable log)
CREATE TABLE approval_history (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(30) NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    event VARCHAR(50) NOT NULL CHECK (event IN (
        'REQUEST_CREATED', 'REQUEST_SUBMITTED', 'AI_ANALYSIS_COMPLETED', 'AI_UNAVAILABLE',
        'DEPARTMENT_APPROVED', 'HUMAN_REVIEW_REQUIRED', 'INFO_REQUESTED', 'REQUEST_REJECTED',
        'FINANCE_APPROVED', 'PO_GENERATED', 'PO_GENERATION_FAILED'
    )),
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('USER', 'AI', 'SYSTEM')),
    actor_id BIGINT REFERENCES app_user(id),
    model_version VARCHAR(100),
    analysis_id BIGINT REFERENCES ai_analysis(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    decision VARCHAR(30) CHECK (decision IN ('APPROVE', 'REJECT', 'REQUEST_INFORMATION', NULL)),
    ai_recommendation VARCHAR(20) CHECK (ai_recommendation IN ('APPROVE', 'REJECT', NULL)),
    override BOOLEAN NOT NULL DEFAULT FALSE,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Notification table
CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    event VARCHAR(50) NOT NULL,
    request_id VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    override BOOLEAN NOT NULL DEFAULT FALSE,
    ai_recommendation VARCHAR(20),
    human_decision VARCHAR(30),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Outbox Event table (Transactional Outbox for reliable AI dispatch & async tasks)
CREATE TABLE outbox_event (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

-- Indexes for performance & query patterns
CREATE INDEX idx_pr_requester ON purchase_request(requester_id);
CREATE INDEX idx_pr_department ON purchase_request(department_id);
CREATE INDEX idx_pr_status ON purchase_request(status);
CREATE INDEX idx_pr_submitted_at ON purchase_request(submitted_at);
CREATE INDEX idx_pr_amount ON purchase_request(amount);
CREATE INDEX idx_history_request ON approval_history(request_id, created_at ASC);
CREATE INDEX idx_analysis_request ON ai_analysis(request_id, analysed_at DESC);
CREATE INDEX idx_review_status ON human_review(status);
CREATE INDEX idx_notification_user_unread ON notification(user_id, read, created_at DESC);
CREATE INDEX idx_outbox_pending ON outbox_event(status, created_at ASC);


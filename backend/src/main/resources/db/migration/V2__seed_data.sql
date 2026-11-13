-- Flyway Migration V2: Development Seed Data for PROCURA

-- 1. Departments
INSERT INTO department (id, name, head_user_id, created_at) VALUES
(1, 'Engineering', NULL, CURRENT_TIMESTAMP),
(2, 'Marketing', NULL, CURRENT_TIMESTAMP),
(3, 'Operations', NULL, CURRENT_TIMESTAMP);

-- 2. Users (Password is 'password123' for all accounts)
-- Hash: $2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G
INSERT INTO app_user (id, name, email, password_hash, role, department_id, active, created_at) VALUES
(1, 'Alice Walker', 'requester@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'REQUESTER', 1, TRUE, CURRENT_TIMESTAMP),
(2, 'Bob Sterling', 'depthead@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'DEPARTMENT_HEAD', 1, TRUE, CURRENT_TIMESTAMP),
(3, 'Carol Danvers', 'finance@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'FINANCE_MANAGER', NULL, TRUE, CURRENT_TIMESTAMP),
(4, 'Dave Miller', 'admin@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'ADMIN', NULL, TRUE, CURRENT_TIMESTAMP),
(5, 'Elena Rostova', 'marketing.head@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'DEPARTMENT_HEAD', 2, TRUE, CURRENT_TIMESTAMP),
(6, 'Frank Castle', 'marketing.req@procura.local', '$2a$10$VxlEfXc7TXNcxIdtOi7cruRhlpXHUlquXx.LRj4XwksuE6JNJof2G', 'REQUESTER', 2, TRUE, CURRENT_TIMESTAMP);

-- Update department heads
UPDATE department SET head_user_id = 2 WHERE id = 1;
UPDATE department SET head_user_id = 5 WHERE id = 2;

-- Set sequence for app_user and department
SELECT setval('app_user_id_seq', 10, true);
SELECT setval('department_id_seq', 10, true);

-- 3. Vendors
INSERT INTO vendor (id, name, email, completed_orders, first_order_at, created_at) VALUES
(1, 'TechSupply Solutions', 'sales@techsupply.example.com', 14, '2025-01-15 09:00:00+00', CURRENT_TIMESTAMP),
(2, 'CloudScale Infrastructure', 'accounts@cloudscale.example.com', 8, '2025-03-10 11:00:00+00', CURRENT_TIMESTAMP),
(3, 'OfficePrime Essentials', 'contact@officeprime.example.com', 0, NULL, CURRENT_TIMESTAMP),
(4, 'DevTools Inc', 'billing@devtools.example.com', 3, '2025-06-01 14:30:00+00', CURRENT_TIMESTAMP);

SELECT setval('vendor_id_seq', 10, true);

-- 4. Budgets (Fiscal Year 2026-27)
INSERT INTO budget (id, department_id, fiscal_year, total, spent, committed, currency, created_at, updated_at) VALUES
(1, 1, '2026-27', 1000000.00, 250000.00, 85000.00, 'INR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, '2026-27', 500000.00, 120000.00, 0.00, 'INR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 3, '2026-27', 750000.00, 180000.00, 35000.00, 'INR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SELECT setval('budget_id_seq', 10, true);

-- 5. Seed Historical Requests (for AI evidence and UI demonstration)
-- PR-1001: Historical Approved PO
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, submitted_at, budget_total_at_submit, budget_remaining_at_submit,
    ai_status, purchase_order_id, version, created_at, updated_at
) VALUES (
    'PR-1001', 'Laptops for Engineering Team', 'High performance developer laptops',
    'IT_EQUIPMENT', 'NORMAL', 'PO_GENERATED', 1, 1, 1,
    120000.00, 'INR', '2026-04-15', '2026-03-01 10:00:00+00', 1000000.00, 880000.00,
    'COMPLETED', 'PO-2026-0001', 3, '2026-03-01 09:30:00+00', '2026-03-02 14:00:00+00'
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1001', 'Developer Laptop 32GB RAM', 2, 60000.00, 120000.00, 1);

INSERT INTO purchase_order (id, purchase_request_id, vendor_id, department_name, total, currency, issued_at, approved_by_json, created_at) VALUES
('PO-2026-0001', 'PR-1001', 1, 'Engineering', 120000.00, 'INR', '2026-03-02 14:00:00+00',
 '[{"id": 2, "name": "Bob Sterling", "role": "DEPARTMENT_HEAD"}, {"id": 3, "name": "Carol Danvers", "role": "FINANCE_MANAGER"}]', '2026-03-02 14:00:00+00');

INSERT INTO purchase_order_item (purchase_order_id, description, quantity, unit_price, line_total) VALUES
('PO-2026-0001', 'Developer Laptop 32GB RAM', 2, 60000.00, 120000.00);

-- PR-1002: Historical Approved PO
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, submitted_at, budget_total_at_submit, budget_remaining_at_submit,
    ai_status, purchase_order_id, version, created_at, updated_at
) VALUES (
    'PR-1002', 'Cloud Infrastructure Credits', 'Compute capacity scaling',
    'SERVICES', 'HIGH', 'PO_GENERATED', 1, 1, 2,
    80000.00, 'INR', '2026-04-20', '2026-03-05 11:00:00+00', 1000000.00, 760000.00,
    'COMPLETED', 'PO-2026-0002', 3, '2026-03-05 10:15:00+00', '2026-03-06 16:00:00+00'
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1002', 'Cloud Compute Instances Bundle', 1, 80000.00, 80000.00, 1);

INSERT INTO purchase_order (id, purchase_request_id, vendor_id, department_name, total, currency, issued_at, approved_by_json, created_at) VALUES
('PO-2026-0002', 'PR-1002', 2, 'Engineering', 80000.00, 'INR', '2026-03-06 16:00:00+00',
 '[{"id": 2, "name": "Bob Sterling", "role": "DEPARTMENT_HEAD"}, {"id": 3, "name": "Carol Danvers", "role": "FINANCE_MANAGER"}]', '2026-03-06 16:00:00+00');

INSERT INTO purchase_order_item (purchase_order_id, description, quantity, unit_price, line_total) VALUES
('PO-2026-0002', 'Cloud Compute Instances Bundle', 1, 80000.00, 80000.00);

-- PR-1003: Historical Rejected Request
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, submitted_at, budget_total_at_submit, budget_remaining_at_submit,
    ai_status, rejected_at_stage, version, created_at, updated_at
) VALUES (
    'PR-1003', 'Executive Leather Chairs', 'Luxury seating for lounge area',
    'OFFICE_FURNITURE', 'LOW', 'REJECTED', 1, 1, 3,
    250000.00, 'INR', '2026-05-01', '2026-03-10 14:00:00+00', 1000000.00, 680000.00,
    'COMPLETED', 'DEPARTMENT', 2, '2026-03-10 12:00:00+00', '2026-03-11 09:30:00+00'
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1003', 'Executive Leather Recliner', 5, 50000.00, 250000.00, 1);

-- PR-1024: Active Request in HUMAN_REVIEW
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, submitted_at, budget_total_at_submit, budget_remaining_at_submit,
    ai_status, latest_analysis_id, open_review_id, version, created_at, updated_at
) VALUES (
    'PR-1024', 'External Developer 4K Monitors', 'High resolution monitors for software development team',
    'IT_EQUIPMENT', 'HIGH', 'HUMAN_REVIEW', 1, 1, 1,
    85000.00, 'INR', '2026-11-30', '2026-10-06 10:12:00+00', 1000000.00, 715000.00,
    'COMPLETED', 1, 1, 2, '2026-10-06 09:30:00+00', '2026-10-06 10:15:00+00'
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1024', '27-inch 4K IPS Developer Monitor', 2, 42500.00, 85000.00, 1);

-- AI Analysis for PR-1024
INSERT INTO ai_analysis (
    id, request_id, recommendation, confidence, risk_level, requires_human_review, review_threshold,
    reasons_json, review_triggers_json, evidence_json, model_version, agent_versions_json, analysed_at, evidence_rejected, created_at
) VALUES (
    1, 'PR-1024', 'APPROVE', 0.67, 'MEDIUM', TRUE, 0.80,
    '[{"code": "WITHIN_BUDGET", "text": "Within remaining department budget", "tone": "SUPPORTS", "evidenceIds": []}, {"code": "SIMILAR_MOSTLY_APPROVED", "text": "Similar requests were mostly approved", "tone": "SUPPORTS", "evidenceIds": ["PR-1001", "PR-1002"]}, {"code": "AMOUNT_ABOVE_AVERAGE", "text": "Request is 2.3x the department''s historical average", "tone": "CONCERN", "evidenceIds": []}]',
    '[{"code": "LOW_CONFIDENCE", "text": "Confidence is 67%, below the 80% threshold"}, {"code": "HIGH_VALUE", "text": "Amount exceeds the high-value review threshold"}]',
    '[{"requestId": "PR-1001", "summary": "Laptops for Engineering Team", "amount": 120000.00, "outcome": "APPROVED", "similarity": 0.88}, {"requestId": "PR-1002", "summary": "Cloud Infrastructure Credits", "amount": 80000.00, "outcome": "APPROVED", "similarity": 0.82}]',
    'approval-model-v2', '{"budget": "v1", "historical": "v1", "risk": "v1"}',
    '2026-10-06 10:13:00+00', FALSE, '2026-10-06 10:13:00+00'
);

SELECT setval('ai_analysis_id_seq', 10, true);

-- Open Human Review for PR-1024
INSERT INTO human_review (
    id, request_id, request_title, amount, status, triggers_json, ai_recommendation, ai_confidence, created_at
) VALUES (
    1, 'PR-1024', 'External Developer 4K Monitors', 85000.00, 'OPEN',
    '[{"code": "LOW_CONFIDENCE", "text": "Confidence is 67%, below the 80% threshold", "source": "AI"}, {"code": "HIGH_VALUE", "text": "Amount exceeds the high-value review threshold", "source": "RULE"}]',
    'APPROVE', 0.67, '2026-10-06 10:15:00+00'
);

SELECT setval('human_review_id_seq', 10, true);

-- PR-1042: Active Request in SUBMITTED
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, submitted_at, budget_total_at_submit, budget_remaining_at_submit,
    ai_status, version, created_at, updated_at
) VALUES (
    'PR-1042', 'Standing Desks and Mats', 'Ergonomic sit-stand converter desks for engineering floor',
    'OFFICE_FURNITURE', 'NORMAL', 'SUBMITTED', 1, 1, 1,
    45000.00, 'INR', '2026-12-01', '2026-10-08 14:20:00+00', 1000000.00, 665000.00,
    'COMPLETED', 1, '2026-10-08 14:00:00+00', '2026-10-08 14:20:00+00'
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1042', 'Adjustable Standing Desk Converter', 3, 15000.00, 45000.00, 1);

-- PR-1043: Active Draft
INSERT INTO purchase_request (
    id, title, description, category, priority, status, requester_id, department_id, vendor_id,
    amount, currency, needed_by, ai_status, version, created_at, updated_at
) VALUES (
    'PR-1043', 'Wireless Noise-Canceling Headsets', 'Headsets for remote pair programming and video calls',
    'IT_EQUIPMENT', 'LOW', 'DRAFT', 1, 1, 1,
    18000.00, 'INR', '2026-12-15', 'NOT_STARTED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO purchase_request_item (purchase_request_id, description, quantity, unit_price, line_total, sort_order) VALUES
('PR-1043', 'Wireless ANC Headset', 2, 9000.00, 18000.00, 1);

-- Update Sequence for PRs
SELECT setval('purchase_request_seq', 1050, true);
SELECT setval('purchase_order_seq', 10, true);

-- 6. Approval History for Seed Requests
INSERT INTO approval_history (request_id, event, actor_type, actor_id, from_status, to_status, created_at) VALUES
('PR-1024', 'REQUEST_CREATED', 'USER', 1, NULL, 'DRAFT', '2026-10-06 09:30:00+00'),
('PR-1024', 'REQUEST_SUBMITTED', 'USER', 1, 'DRAFT', 'SUBMITTED', '2026-10-06 10:12:00+00'),
('PR-1024', 'AI_ANALYSIS_COMPLETED', 'AI', NULL, 'SUBMITTED', 'SUBMITTED', '2026-10-06 10:13:00+00'),
('PR-1024', 'DEPARTMENT_APPROVED', 'USER', 2, 'SUBMITTED', 'HUMAN_REVIEW', '2026-10-06 10:15:00+00'),
('PR-1024', 'HUMAN_REVIEW_REQUIRED', 'SYSTEM', NULL, 'HUMAN_REVIEW', 'HUMAN_REVIEW', '2026-10-06 10:15:00+00');

INSERT INTO approval_history (request_id, event, actor_type, actor_id, from_status, to_status, created_at) VALUES
('PR-1042', 'REQUEST_CREATED', 'USER', 1, NULL, 'DRAFT', '2026-10-08 14:00:00+00'),
('PR-1042', 'REQUEST_SUBMITTED', 'USER', 1, 'DRAFT', 'SUBMITTED', '2026-10-08 14:20:00+00');

-- 7. Notifications
INSERT INTO notification (user_id, event, request_id, message, override, read, created_at) VALUES
(1, 'DEPARTMENT_APPROVED', 'PR-1024', 'PR-1024 approved by Department Head. Escalated to human review.', FALSE, TRUE, '2026-10-06 10:15:00+00'),
(3, 'HUMAN_REVIEW_REQUIRED', 'PR-1024', 'PR-1024 requires Finance human review (low confidence: 67%, high value).', FALSE, FALSE, '2026-10-06 10:15:00+00');

SELECT setval('notification_id_seq', 10, true);


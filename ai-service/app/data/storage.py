import sqlite3
import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.config import settings

class LocalHistoricalStore:
    """
    Local embedded database for the AI service.
    Stores synced historical requests and outcomes pulled from the Java backend,
    as well as cached statistics for feature extraction and retrieval.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.cache_db_path
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Historical requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS historical_requests (
                    request_id TEXT PRIMARY KEY,
                    title TEXT,
                    description TEXT,
                    department_id INTEGER,
                    category TEXT,
                    priority TEXT,
                    amount REAL,
                    currency TEXT,
                    vendor_id INTEGER,
                    item_count INTEGER,
                    submitted_at TEXT,
                    budget_total_at_submit REAL,
                    budget_remaining_at_submit REAL,
                    outcome TEXT,
                    rejected_at_stage TEXT,
                    updated_at TEXT,
                    is_synthetic INTEGER DEFAULT 0
                )
            """)

            # Synced final outcomes table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS synced_outcomes (
                    request_id TEXT PRIMARY KEY,
                    analysis_id INTEGER,
                    model_version TEXT,
                    ai_recommendation TEXT,
                    ai_confidence REAL,
                    final_outcome TEXT,
                    override INTEGER,
                    override_reason TEXT,
                    decided_at TEXT
                )
            """)

            # Metadata table for sync cursors
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sync_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT
                )
            """)
            conn.commit()

    def upsert_historical_request(self, req: Dict[str, Any], is_synthetic: bool = False):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO historical_requests (
                    request_id, title, description, department_id, category, priority,
                    amount, currency, vendor_id, item_count, submitted_at,
                    budget_total_at_submit, budget_remaining_at_submit,
                    outcome, rejected_at_stage, updated_at, is_synthetic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    title=excluded.title,
                    description=excluded.description,
                    department_id=excluded.department_id,
                    category=excluded.category,
                    priority=excluded.priority,
                    amount=excluded.amount,
                    currency=excluded.currency,
                    vendor_id=excluded.vendor_id,
                    item_count=excluded.item_count,
                    submitted_at=excluded.submitted_at,
                    budget_total_at_submit=excluded.budget_total_at_submit,
                    budget_remaining_at_submit=excluded.budget_remaining_at_submit,
                    outcome=excluded.outcome,
                    rejected_at_stage=excluded.rejected_at_stage,
                    updated_at=excluded.updated_at,
                    is_synthetic=excluded.is_synthetic
            """, (
                req.get("requestId") or req.get("request_id"),
                req.get("title", ""),
                req.get("description", ""),
                req.get("departmentId") or req.get("department_id"),
                req.get("category", ""),
                req.get("priority", "NORMAL"),
                float(req.get("amount", 0.0)),
                req.get("currency", "INR"),
                req.get("vendorId") or req.get("vendor_id"),
                req.get("itemCount") or req.get("item_count", 1),
                str(req.get("submittedAt") or req.get("submitted_at", "")),
                float(req.get("budgetTotalAtSubmit") or req.get("budget_total_at_submit", 0.0)),
                float(req.get("budgetRemainingAtSubmit") or req.get("budget_remaining_at_submit", 0.0)),
                req.get("outcome", "APPROVED"),
                req.get("rejectedAtStage") or req.get("rejected_at_stage"),
                str(req.get("updatedAt") or req.get("updated_at") or datetime.utcnow().isoformat()),
                1 if is_synthetic else 0
            ))
            conn.commit()

    def upsert_outcome(self, outcome: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO synced_outcomes (
                    request_id, analysis_id, model_version, ai_recommendation,
                    ai_confidence, final_outcome, override, override_reason, decided_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    analysis_id=excluded.analysis_id,
                    model_version=excluded.model_version,
                    ai_recommendation=excluded.ai_recommendation,
                    ai_confidence=excluded.ai_confidence,
                    final_outcome=excluded.final_outcome,
                    override=excluded.override,
                    override_reason=excluded.override_reason,
                    decided_at=excluded.decided_at
            """, (
                outcome.get("requestId") or outcome.get("request_id"),
                outcome.get("analysisId") or outcome.get("analysis_id"),
                outcome.get("modelVersion") or outcome.get("model_version"),
                str(outcome.get("aiRecommendation") or outcome.get("ai_recommendation", "")),
                float(outcome.get("aiConfidence") or outcome.get("ai_confidence", 0.0)),
                outcome.get("finalOutcome") or outcome.get("final_outcome", "APPROVED"),
                1 if outcome.get("override") else 0,
                outcome.get("overrideReason") or outcome.get("override_reason"),
                str(outcome.get("decidedAt") or outcome.get("decided_at", ""))
            ))
            conn.commit()

    def get_sync_meta(self, key: str) -> Optional[str]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM sync_meta WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else None

    def set_sync_meta(self, key: str, value: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """, (key, value, now))
            conn.commit()

    def count_requests(self, only_real: bool = False) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if only_real:
                cursor.execute("SELECT COUNT(*) as cnt FROM historical_requests WHERE is_synthetic = 0")
            else:
                cursor.execute("SELECT COUNT(*) as cnt FROM historical_requests")
            row = cursor.fetchone()
            return row["cnt"] if row else 0

    def get_all_requests(self, limit: int = 5000) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM historical_requests ORDER BY submitted_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_verified_requests(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Returns non-synthetic requests that genuinely exist in the backend database."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM historical_requests WHERE is_synthetic = 0 ORDER BY submitted_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_department_stats(self, department_id: int) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    AVG(amount) as avg_amount,
                    MAX(amount) as max_amount,
                    SUM(CASE WHEN outcome = 'APPROVED' THEN 1 ELSE 0 END) * 1.0 / MAX(COUNT(*), 1) as approval_rate,
                    SUM(CASE WHEN amount > budget_remaining_at_submit THEN 1 ELSE 0 END) as past_overruns
                FROM historical_requests
                WHERE department_id = ?
            """, (department_id,))
            row = cursor.fetchone()
            if not row or row["total_requests"] == 0:
                return {
                    "total_requests": 0,
                    "avg_amount": 0.0,
                    "max_amount": 0.0,
                    "approval_rate": 0.5,
                    "past_overruns": 0
                }
            return {
                "total_requests": row["total_requests"],
                "avg_amount": float(row["avg_amount"] or 0.0),
                "max_amount": float(row["max_amount"] or 0.0),
                "approval_rate": float(row["approval_rate"] or 0.5),
                "past_overruns": int(row["past_overruns"] or 0)
            }

    def get_request_frequency(self, department_id: int, vendor_id: int) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as dept_recent_count
                FROM historical_requests
                WHERE department_id = ?
            """, (department_id,))
            dept_row = cursor.fetchone()
            dept_count = dept_row["dept_recent_count"] if dept_row else 0

            cursor.execute("""
                SELECT COUNT(*) as vendor_recent_count
                FROM historical_requests
                WHERE department_id = ? AND vendor_id = ?
            """, (department_id, vendor_id))
            v_row = cursor.fetchone()
            vendor_count = v_row["vendor_recent_count"] if v_row else 0

            return {
                "dept_request_count": dept_count,
                "vendor_request_count": vendor_count,
                "is_unusual_frequency": vendor_count >= 15
            }

    def get_vendor_stats(self, vendor_id: int) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN outcome = 'APPROVED' THEN 1 ELSE 0 END) as approved_orders,
                    AVG(amount) as avg_order_amount
                FROM historical_requests
                WHERE vendor_id = ?
            """, (vendor_id,))
            row = cursor.fetchone()
            if not row or row["total_orders"] == 0:
                return {
                    "total_orders": 0,
                    "approved_orders": 0,
                    "avg_order_amount": 0.0,
                    "is_unfamiliar": True
                }
            return {
                "total_orders": row["total_orders"],
                "approved_orders": row["approved_orders"],
                "avg_order_amount": float(row["avg_order_amount"] or 0.0),
                "is_unfamiliar": row["total_orders"] < 2
            }

local_store = LocalHistoricalStore()


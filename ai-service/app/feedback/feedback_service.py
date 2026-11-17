import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.data.storage import local_store
from app.data.backend_client import backend_sync_client
from app.ml.features import build_training_features
from app.ml.model_registry import model_registry
from app.ml.evaluate import evaluate_model
from app.api.schemas import ModelStatusEnum

logger = logging.getLogger(__name__)

class FeedbackService:
    """
    Controlled feedback pipeline managing final outcome ingestion,
    human-override feedback tracking, and candidate model evaluation.
    """

    def __init__(self, sync_client=None, store=None, registry=None):
        self.sync_client = sync_client or backend_sync_client
        self.store = store or local_store
        self.registry = registry or model_registry

    async def ingest_feedback_outcomes(self) -> Dict[str, Any]:
        """
        Pulls outcome records from backend and calculates human-override rate.
        """
        count = await self.sync_client.sync_outcomes()

        # Query override statistics
        with self.store._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_outcomes,
                    SUM(CASE WHEN override = 1 THEN 1 ELSE 0 END) as total_overrides,
                    SUM(CASE WHEN final_outcome = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN final_outcome = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
                FROM synced_outcomes
            """)
            row = cursor.fetchone()
            total = row["total_outcomes"] or 0
            overrides = row["total_overrides"] or 0
            override_rate = (overrides / total) if total > 0 else 0.0

        return {
            "synced_new_count": count,
            "total_outcomes": total,
            "total_overrides": overrides,
            "override_rate": round(override_rate, 4),
            "approved_count": row["approved_count"] or 0,
            "rejected_count": row["rejected_count"] or 0
        }

    def train_candidate_model(self, candidate_version: str = "approval-model-v3") -> Dict[str, Any]:
        """
        Trains a candidate model and compares its metrics against the current serving model.
        Promotes candidate to SERVING only if it demonstrably improves upon the current serving model.
        """
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.calibration import CalibratedClassifierCV

        records = self.store.get_all_requests(limit=5000)
        X, y = build_training_features(records)

        if len(X) < 100:
            return {"status": "SKIPPED", "reason": "Insufficient training records"}

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        # Train candidate Gradient Boosting model
        base_gb = GradientBoostingClassifier(n_estimators=120, max_depth=4, random_state=42)
        candidate_model = CalibratedClassifierCV(estimator=base_gb, method="sigmoid", cv=3)
        candidate_model.fit(X_train, y_train)

        y_pred = candidate_model.predict(X_test)
        y_prob = candidate_model.predict_proba(X_test)[:, 1]
        candidate_metrics = evaluate_model(y_test, y_pred, y_prob)

        # Retrieve current serving model metrics
        serving_version = self.registry.get_serving_model_version()
        serving_models = [m for m in self.registry.list_models() if m.version == serving_version]
        current_f1 = serving_models[0].metrics.f1 if serving_models else 0.0

        # Deployment criterion: Candidate F1 must equal or exceed current serving F1
        should_promote = candidate_metrics.f1 >= current_f1
        status = ModelStatusEnum.SERVING if should_promote else ModelStatusEnum.CANDIDATE

        registered_info = self.registry.register_model(
            version=candidate_version,
            algorithm="gradient_boosting_calibrated",
            model_artifact=candidate_model,
            metrics=candidate_metrics,
            training_rows=len(X_train),
            status=status
        )

        return {
            "candidateVersion": candidate_version,
            "candidateF1": candidate_metrics.f1,
            "currentServingF1": current_f1,
            "promotedToServing": should_promote,
            "status": status.value,
            "metrics": candidate_metrics.model_dump()
        }

feedback_service = FeedbackService()


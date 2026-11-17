import logging
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV

from app.data.storage import local_store
from app.data.synthetic_generator import generate_synthetic_dataset
from app.ml.features import build_training_features
from app.ml.evaluate import evaluate_model
from app.ml.model_registry import model_registry
from app.api.schemas import ModelStatusEnum

logger = logging.getLogger(__name__)


def train_and_register_all_models(force_dataset_generation: bool = False) -> Dict[str, Any]:
    """
    Trains Logistic Regression baseline and Random Forest / Gradient Boosting models,
    evaluates them on a held-out test split, and registers them in the model registry.
    """
    # Check if data exists in local store
    if local_store.count_requests() < 100 or force_dataset_generation:
        logger.info("Local historical store has insufficient records, generating synthetic development dataset...")
        generate_synthetic_dataset(n_samples=1200)

    records = local_store.get_all_requests(limit=5000)
    X, y = build_training_features(records)

    if len(X) < 50:
        raise ValueError(f"Not enough training samples: {len(X)}")

    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    training_rows = len(X_train)
    results = {}

    # 1. Model v1: Logistic Regression Baseline
    logger.info("Training Baseline Model: approval-model-v1 (Logistic Regression)...")
    pipe_lr = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
    ])
    pipe_lr.fit(X_train, y_train)

    y_pred_lr = pipe_lr.predict(X_test)
    y_prob_lr = pipe_lr.predict_proba(X_test)[:, 1]
    metrics_lr = evaluate_model(y_test, y_pred_lr, y_prob_lr)

    info_v1 = model_registry.register_model(
        version="approval-model-v1",
        algorithm="logistic_regression",
        model_artifact=pipe_lr,
        metrics=metrics_lr,
        training_rows=training_rows,
        status=ModelStatusEnum.RETIRED
    )
    results["v1"] = info_v1

    # 2. Model v2: Calibrated Random Forest Classifier
    logger.info("Training Model: approval-model-v2 (Calibrated Random Forest)...")
    base_rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42
    )
    # Wrap in probability calibration for trustworthy confidence scores
    calibrated_rf = CalibratedClassifierCV(estimator=base_rf, method="sigmoid", cv=3)
    calibrated_rf.fit(X_train, y_train)

    y_pred_rf = calibrated_rf.predict(X_test)
    y_prob_rf = calibrated_rf.predict_proba(X_test)[:, 1]
    metrics_rf = evaluate_model(y_test, y_pred_rf, y_prob_rf)

    # 3. Model v3: Calibrated XGBoost Classifier
    logger.info("Training Model: approval-model-v3 (Calibrated XGBoost)...")
    try:
        from xgboost import XGBClassifier
        base_xgb = XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.08,
            random_state=42,
            eval_metric="logloss"
        )
        calibrated_xgb = CalibratedClassifierCV(estimator=base_xgb, method="sigmoid", cv=3)
        calibrated_xgb.fit(X_train, y_train)

        y_pred_xgb = calibrated_xgb.predict(X_test)
        y_prob_xgb = calibrated_xgb.predict_proba(X_test)[:, 1]
        metrics_xgb = evaluate_model(y_test, y_pred_xgb, y_prob_xgb)
        has_xgb = True
    except Exception as e:
        logger.warning(f"XGBoost training skipped: {e}")
        has_xgb = False
        metrics_xgb = None

    # Determine best model based on F1 and calibration
    best_version = "approval-model-v2"
    if has_xgb and metrics_xgb.f1 >= metrics_rf.f1:
        best_version = "approval-model-v3"

    info_v2 = model_registry.register_model(
        version="approval-model-v2",
        algorithm="random_forest_calibrated",
        model_artifact=calibrated_rf,
        metrics=metrics_rf,
        training_rows=training_rows,
        status=ModelStatusEnum.SERVING if best_version == "approval-model-v2" else ModelStatusEnum.CANDIDATE
    )
    results["v2"] = info_v2

    if has_xgb and metrics_xgb:
        info_v3 = model_registry.register_model(
            version="approval-model-v3",
            algorithm="xgboost_calibrated",
            model_artifact=calibrated_xgb,
            metrics=metrics_xgb,
            training_rows=training_rows,
            status=ModelStatusEnum.SERVING if best_version == "approval-model-v3" else ModelStatusEnum.CANDIDATE
        )
        results["v3"] = info_v3

    logger.info(
        f"Training completed. Baseline v1 F1: {metrics_lr.f1:.4f}, "
        f"RF v2 F1: {metrics_rf.f1:.4f}" +
        (f", XGBoost v3 F1: {metrics_xgb.f1:.4f}" if has_xgb and metrics_xgb else "") +
        f" -> Active Serving: {best_version}"
    )
    return results


if __name__ == "__main__":
    train_and_register_all_models()


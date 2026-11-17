import logging
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from app.api.schemas import AnalysisInput, RecommendationEnum
from app.ml.features import extract_features_from_dict, FEATURE_COLUMNS
from app.ml.model_registry import model_registry

logger = logging.getLogger(__name__)

class PredictionService:
    """
    ML Prediction service that extracts features and generates calibrated
    approval probability and certainty estimates.
    """

    def __init__(self):
        self.registry = model_registry

    def predict(
        self,
        analysis_input: AnalysisInput,
        model_version: Optional[str] = None
    ) -> Dict[str, Any]:
        target_version = model_version or self.registry.get_serving_model_version()
        model = self.registry.load_model(target_version)

        if model is None:
            # Auto-train if not yet registered
            from app.ml.train import train_and_register_all_models
            logger.warning("No model found in registry, auto-training models...")
            train_and_register_all_models()
            target_version = self.registry.get_serving_model_version() or "approval-model-v2"
            model = self.registry.load_model(target_version)

        input_dict = analysis_input.model_dump()
        features = extract_features_from_dict(input_dict)
        X = pd.DataFrame([features])[FEATURE_COLUMNS]

        # Predict probability of APPROVE (class 1)
        prob_array = model.predict_proba(X)[0]
        prob_reject = float(prob_array[0])
        prob_approve = float(prob_array[1])

        if prob_approve >= 0.50:
            recommendation = RecommendationEnum.APPROVE
            confidence = prob_approve
        else:
            recommendation = RecommendationEnum.REJECT
            confidence = prob_reject

        # Clamp confidence to [0.0, 1.0]
        confidence = max(0.0, min(1.0, round(confidence, 4)))

        return {
            "recommendation": recommendation,
            "approval_probability": round(prob_approve, 4),
            "confidence": confidence,
            "modelVersion": target_version,
            "features": features
        }

prediction_service = PredictionService()


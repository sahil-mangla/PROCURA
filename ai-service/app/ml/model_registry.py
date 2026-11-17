import os
import json
import joblib
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.config import settings
from app.api.schemas import ModelInfo, ModelStatusEnum, Metrics, ConfusionMatrix

REGISTRY_FILE = "registry_metadata.json"

class ModelRegistry:
    """
    Manages versioned ML artifacts, serialization, and metadata for auditability.
    Supports SERVING, CANDIDATE, and RETIRED model lifecycle stages.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or settings.model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.registry_path = os.path.join(self.model_dir, REGISTRY_FILE)
        self._loaded_models: Dict[str, Any] = {}

    def _load_metadata(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.registry_path):
            return []
        try:
            with open(self.registry_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_metadata(self, metadata: List[Dict[str, Any]]):
        with open(self.registry_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    def register_model(
        self,
        version: str,
        algorithm: str,
        model_artifact: Any,
        metrics: Metrics,
        training_rows: int,
        status: ModelStatusEnum = ModelStatusEnum.CANDIDATE
    ) -> ModelInfo:
        # Save artifact
        artifact_filename = f"{version}.joblib"
        artifact_path = os.path.join(self.model_dir, artifact_filename)
        joblib.dump(model_artifact, artifact_path)

        metadata = self._load_metadata()
        now = datetime.utcnow().isoformat() + "Z"

        # If setting to SERVING, demote previous SERVING to RETIRED
        if status == ModelStatusEnum.SERVING:
            for item in metadata:
                if item.get("status") == ModelStatusEnum.SERVING.value:
                    item["status"] = ModelStatusEnum.RETIRED.value

        model_entry = {
            "version": version,
            "algorithm": algorithm,
            "status": status.value,
            "trainedAt": now,
            "trainingRows": training_rows,
            "metrics": metrics.model_dump(),
            "artifactPath": artifact_path
        }

        # Update or append
        existing_idx = next((i for i, m in enumerate(metadata) if m["version"] == version), None)
        if existing_idx is not None:
            metadata[existing_idx] = model_entry
        else:
            metadata.append(model_entry)

        self._save_metadata(metadata)
        self._loaded_models[version] = model_artifact

        return ModelInfo(
            version=version,
            algorithm=algorithm,
            status=status,
            trainedAt=datetime.fromisoformat(now.replace("Z", "+00:00")),
            trainingRows=training_rows,
            metrics=metrics
        )

    def get_serving_model_version(self) -> Optional[str]:
        metadata = self._load_metadata()
        for item in metadata:
            if item.get("status") == ModelStatusEnum.SERVING.value:
                return item["version"]
        if metadata:
            return metadata[-1]["version"]
        return None

    def load_model(self, version: Optional[str] = None) -> Optional[Any]:
        target_version = version or self.get_serving_model_version()
        if not target_version:
            return None

        if target_version in self._loaded_models:
            return self._loaded_models[target_version]

        artifact_path = os.path.join(self.model_dir, f"{target_version}.joblib")
        if os.path.exists(artifact_path):
            model = joblib.load(artifact_path)
            self._loaded_models[target_version] = model
            return model

        return None

    def list_models(self) -> List[ModelInfo]:
        metadata = self._load_metadata()
        result = []
        for item in metadata:
            metrics_dict = item.get("metrics", {})
            cm_dict = metrics_dict.get("confusionMatrix", {})
            cm = ConfusionMatrix(**cm_dict)
            metrics = Metrics(
                accuracy=metrics_dict.get("accuracy", 0.0),
                precision=metrics_dict.get("precision", 0.0),
                recall=metrics_dict.get("recall", 0.0),
                f1=metrics_dict.get("f1", 0.0),
                rocAuc=metrics_dict.get("rocAuc", 0.0),
                brierScore=metrics_dict.get("brierScore", 0.0),
                confusionMatrix=cm
            )

            trained_at_str = item.get("trainedAt", "")
            try:
                dt = datetime.fromisoformat(trained_at_str.replace("Z", "+00:00"))
            except Exception:
                dt = datetime.utcnow()

            result.append(ModelInfo(
                version=item["version"],
                algorithm=item.get("algorithm", "unknown"),
                status=ModelStatusEnum(item.get("status", "SERVING")),
                trainedAt=dt,
                trainingRows=item.get("trainingRows", 0),
                metrics=metrics
            ))
        return result

model_registry = ModelRegistry()


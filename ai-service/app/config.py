import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    debug: bool = Field(default=False, alias="DEBUG")
    service_key: str = Field(default="procura-internal-service-key-2026", alias="SERVICE_KEY")
    backend_base_url: str = Field(default="http://localhost:8080/api", alias="BACKEND_BASE_URL")
    default_review_threshold: float = Field(default=0.80, alias="DEFAULT_REVIEW_THRESHOLD")
    high_value_threshold: float = Field(default=50000.00, alias="HIGH_VALUE_THRESHOLD")
    model_dir: str = Field(default="models", alias="MODEL_DIR")
    dataset_dir: str = Field(default="datasets", alias="DATASET_DIR")
    cache_db_path: str = Field(default="datasets/historical_cache.db", alias="CACHE_DB_PATH")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

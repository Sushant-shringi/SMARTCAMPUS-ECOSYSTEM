import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator

class Settings(BaseSettings):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PROJECT_NAME: str = "SmartAttend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super-secret-smartattend-key-change-in-production-long-random-string"))
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "super-secret-refresh-key-change-in-production-long-random-string")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smartattend.db")

    # Attendance defaults
    DEFAULT_RSSI_THRESHOLD: int = -85
    DEFAULT_LATE_THRESHOLD_MINUTES: int = 5
    DEFAULT_SESSION_DURATION_MINUTES: int = 50
    MAX_FUTURE_TIME_SKEW_SECONDS: int = 180
    # Local/demo testing only: allows the browser BLE simulator to submit attendance.
    # Default is False for production safety.
    DEMO_ATTENDANCE_MODE: bool = os.getenv("DEMO_ATTENDANCE_MODE", "false").lower() in ("true", "1")

    # CORS Whitelist
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8005",
        "http://127.0.0.1:8005",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return []

    @model_validator(mode="after")
    def validate_production_security(self):
        env = (self.ENVIRONMENT or "").strip().lower()
        if env == "production":
            insecure_markers = [
                "super-secret",
                "change-in-production",
                "secret-key",
                "default",
                "replace_with",
            ]
            for key_name, key_val in [
                ("SECRET_KEY", self.SECRET_KEY),
                ("REFRESH_SECRET_KEY", self.REFRESH_SECRET_KEY),
            ]:
                if not key_val or len(key_val.strip()) < 32:
                    raise ValueError(
                        f"Insecure {key_name} in production: Key length must be at least 32 characters."
                    )
                if any(marker in key_val.lower() for marker in insecure_markers):
                    raise ValueError(
                        f"Insecure {key_name} in production: Key cannot use default/template phrases."
                    )
            if self.DEMO_ATTENDANCE_MODE:
                raise ValueError(
                    "DEMO_ATTENDANCE_MODE cannot be enabled in production environment!"
                )
            cors_list = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else [self.CORS_ORIGINS]
            if "*" in cors_list:
                raise ValueError(
                    "CORS_ORIGINS cannot contain wildcard '*' in production when credentials are enabled."
                )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

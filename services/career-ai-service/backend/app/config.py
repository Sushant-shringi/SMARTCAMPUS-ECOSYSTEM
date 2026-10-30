"""
Application Configuration
Defines environment variables, file paths, and default settings.
"""
import os
import json
from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator

curr_path = Path(__file__).resolve()
if curr_path.parent.parent.name == "backend":
    BASE_DIR = curr_path.parent.parent.parent
else:
    BASE_DIR = curr_path.parent.parent

PROMPTS_DIR = BASE_DIR / "prompts"
if not PROMPTS_DIR.exists():
    PROMPTS_DIR = BASE_DIR / "backend" / "prompts"

DEFAULT_ATTENDANCE_DB = BASE_DIR.parent / "attendance-service" / "smartattend.db"

class Settings(BaseSettings):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PROJECT_NAME: str = "AI Career & Resume Assistant"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # LLM Provider Configuration ('gemini' or 'ollama')
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    
    # Google Gemini API Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Ollama Local LLM Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    LLM_TIMEOUT: float = 60.0
    
    # Embeddings & Vector DB Settings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 450
    CHUNK_OVERLAP: int = 60
    TOP_K_RESULTS: int = 4
    
    # Storage Paths
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'career_assistant.db'}")
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    VECTOR_DB_DIR: Path = BASE_DIR / "data" / "vector_db"
    PROMPTS_DIR: Path = PROMPTS_DIR
    
    # Authentication & Shared JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super-secret-smartattend-key-change-in-production-long-random-string"))
    ALGORITHM: str = "HS256"
    
    # SmartAttend Service Integration
    ATTENDANCE_SERVICE_URL: str = os.getenv("ATTENDANCE_SERVICE_URL", "http://localhost:8000")
    ATTENDANCE_DATABASE_URL: str = os.getenv("ATTENDANCE_DATABASE_URL", str(DEFAULT_ATTENDANCE_DB))
    MINIMUM_ATTENDANCE_THRESHOLD: float = float(os.getenv("MINIMUM_ATTENDANCE_PLACEMENT_THRESHOLD", "75.0"))
    
    # Explicit CORS Whitelist
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
            if not self.JWT_SECRET or len(self.JWT_SECRET.strip()) < 32:
                raise ValueError(
                    "Insecure JWT_SECRET in production: Key length must be at least 32 characters."
                )
            if any(marker in self.JWT_SECRET.lower() for marker in insecure_markers):
                raise ValueError(
                    "Insecure JWT_SECRET in production: Key cannot use default/template phrases."
                )
            cors_list = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else [self.CORS_ORIGINS]
            if "*" in cors_list:
                raise ValueError(
                    "CORS_ORIGINS cannot contain wildcard '*' in production when credentials are enabled."
                )
        return self

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure required directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
settings.PROMPTS_DIR.mkdir(parents=True, exist_ok=True)

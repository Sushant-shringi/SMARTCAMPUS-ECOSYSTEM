"""
FastAPI Main Application Entry Point - Career AI Service
Initializes database, CORS middleware, routes, health check, and student data isolation.
"""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sys

_SERVICE_ROOT = str(Path(__file__).resolve().parent.parent)
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

try:
    from app.config import settings
    from app.database.session import init_db
    from app.services.llm import get_llm_provider
    from app.api.resume import router as resume_router
    from app.api.jobs import router as jobs_router
    from app.api.rag import router as rag_router
    from app.api.interview import router as interview_router
    from app.api.suggestions import router as suggestions_router
    from app.api.eligibility import router as eligibility_router
except ImportError:
    from backend.app.config import settings
    from backend.app.database.session import init_db
    from backend.app.services.llm import get_llm_provider
    from backend.app.api.resume import router as resume_router
    from backend.app.api.jobs import router as jobs_router
    from backend.app.api.rag import router as rag_router
    from backend.app.api.interview import router as interview_router
    from backend.app.api.suggestions import router as suggestions_router
    from backend.app.api.eligibility import router as eligibility_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Initializing SQLite database at: {settings.DATABASE_URL}")
    init_db()
    print("Database initialized successfully.")
    yield
    print("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Generative AI Career & Resume Assistant with student data isolation and institutional attendance gate.",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(resume_router, prefix=settings.API_PREFIX)
app.include_router(jobs_router, prefix=settings.API_PREFIX)
app.include_router(rag_router, prefix=settings.API_PREFIX)
app.include_router(interview_router, prefix=settings.API_PREFIX)
app.include_router(suggestions_router, prefix=settings.API_PREFIX)
app.include_router(eligibility_router, prefix=settings.API_PREFIX)

@app.get("/api/health", tags=["Health"])
def health_check():
    """
    Health check endpoint reporting API status, configured LLM provider status,
    and storage paths. Never exposes any API keys.
    """
    provider = get_llm_provider()
    is_healthy, status_msg = provider.is_available()
    
    return {
        "status": "online",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "configured_provider": settings.LLM_PROVIDER,
        "llm_provider": provider.provider_name,
        "llm_status": "connected" if is_healthy else "disconnected",
        "llm_message": status_msg,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "database": "SQLite (Active)",
        "vector_store": "ChromaDB (Local Persistent)"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

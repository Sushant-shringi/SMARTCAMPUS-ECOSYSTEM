"""
Database Session Management
Provides connection engine, session factory, and dependency injection.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

try:
    from app.config import settings
    from app.database.models import Base
except ImportError:
    from backend.app.config import settings
    from backend.app.database.models import Base

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """FastAPI Dependency for database session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import jwt
from typing import Optional, Dict, Any
import os
from pathlib import Path
import sys

# Ensure config can be imported reliably
try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and verifies a JWT token issued by SmartAttend."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    except Exception:
        return None

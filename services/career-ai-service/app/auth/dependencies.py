from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from pydantic import BaseModel

try:
    from app.auth.security import decode_jwt_token
except ImportError:
    from backend.app.auth.security import decode_jwt_token

class AuthenticatedUser(BaseModel):
    user_id: str
    username: str
    role: str

http_bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme)
) -> AuthenticatedUser:
    """
    Extracts and verifies JWT token from Authorization header.
    Rejects requests without valid signatures or expired tokens.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_jwt_token(auth.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return AuthenticatedUser(
        user_id=str(user_id),
        username=payload.get("username", "student"),
        role=payload.get("role", "STUDENT")
    )

def require_student(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """Enforces that the authenticated user has STUDENT or ADMIN role."""
    if current_user.role not in ["STUDENT", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires STUDENT role (current role: {current_user.role})",
        )
    return current_user

def require_student_only(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """Enforces that the authenticated user has strictly STUDENT role."""
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires STUDENT role (current role: {current_user.role})",
        )
    return current_user

def require_tpo(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """Enforces that the authenticated user has TPO or ADMIN role."""
    if current_user.role not in ["TPO", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires TPO role (current role: {current_user.role})",
        )
    return current_user

def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """Enforces that the authenticated user has ADMIN role."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires ADMIN role (current role: {current_user.role})",
        )
    return current_user

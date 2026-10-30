import pytest
from app.config import settings

def test_health_check_endpoint(client):
    """Health check endpoint returns status and active configuration without leaking secrets."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "app_name" in data
    assert "configured_provider" in data
    # Ensure sensitive credentials like GEMINI_API_KEY or JWT_SECRET are never returned
    assert "GEMINI_API_KEY" not in data
    assert "JWT_SECRET" not in data
    assert settings.JWT_SECRET not in str(data)

def test_root_endpoint(client):
    """Root endpoint responds with welcome message and docs link."""
    res = client.get("/")
    assert res.status_code == 200
    assert "Welcome" in res.json()["message"]

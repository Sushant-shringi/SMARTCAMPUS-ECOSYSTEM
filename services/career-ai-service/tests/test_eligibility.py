import pytest
from conftest import generate_test_token
from unittest.mock import patch

def test_eligibility_unauthenticated(client):
    """Requires authentication to access placement eligibility."""
    res = client.get("/api/placement/eligibility/me")
    assert res.status_code == 401

def test_eligibility_unavailable_safe_fallback(client):
    """
    When attendance service and local database are unreachable,
    the endpoint must NEVER grant eligibility (is_eligible must be False).
    """
    token = generate_test_token(user_id="unknown_student_999")
    with patch("app.api.eligibility._fetch_attendance_from_service", return_value=None), \
         patch("app.api.eligibility._check_attendance_via_database", return_value=None):
        res = client.get("/api/placement/eligibility/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_eligible"] is False
        assert data["status"] == "ATTENDANCE_UNAVAILABLE"
        assert len(data["unlocked_features"]) == 0

def test_eligibility_below_threshold_blocked(client):
    """When verified attendance is below 75%, placement features remain locked."""
    token = generate_test_token(user_id="student_deficit")
    # Mock return: 60.0% attendance (24 attended out of 40)
    with patch("app.api.eligibility._fetch_attendance_from_service", return_value=(60.0, 40, 24, "Deficit Student")):
        res = client.get("/api/placement/eligibility/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["attendance_percentage"] == 60.0
        assert data["is_eligible"] is False
        assert data["status"] == "DEFICIT_WARNING"
        assert len(data["unlocked_features"]) == 0

def test_eligibility_above_threshold_unlocked(client):
    """When verified attendance is >= 75%, placement drives and AI coaching tools unlock."""
    token = generate_test_token(user_id="student_good")
    # Mock return: 85.0% attendance (34 attended out of 40)
    with patch("app.api.eligibility._fetch_attendance_from_service", return_value=(85.0, 40, 34, "Aarav Mehta")):
        res = client.get("/api/placement/eligibility/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["attendance_percentage"] == 85.0
        assert data["is_eligible"] is True
        assert data["status"] == "ELIGIBLE"
        assert "ai_resume_tailoring" in data["unlocked_features"]
        assert "direct_company_applications" in data["unlocked_features"]

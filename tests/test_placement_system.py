"""
Phase 4: Placement Management System End-to-End Test Suite
Tests:
- TPO drive creation, modification, and closure
- Student drive listing with real-time academic eligibility annotations
- Eligible student application submission with active resume
- Ineligible student rejection based on authoritative attendance gate
- Duplicate application prevention (concurrency & idempotency)
- Resume ownership validation before application submission
- Application status transitions and immutable audit logs
- Role-based authorization: students cannot create drives or update statuses
- Cross-student application privacy enforcement
- Placement statistics & reporting
"""
import pytest
import requests
import uuid
import io
from datetime import datetime, timedelta, timezone

ATTENDANCE_URL = "http://127.0.0.1:8000"
CAREER_URL = "http://127.0.0.1:8001"

@pytest.fixture(scope="session")
def auth_tokens():
    # 1. Student 1 (Aarav Mehta - Verified attendance ~76.9% >= 75%)
    s1 = requests.post(f"{ATTENDANCE_URL}/api/v1/auth/login", json={"username": "student1", "password": "student123"}).json()
    # 2. Student 2 (Diya Sharma - Verified attendance ~38.5% < 75%)
    s2 = requests.post(f"{ATTENDANCE_URL}/api/v1/auth/login", json={"username": "student2", "password": "student123"}).json()
    # 3. TPO (Dr. Vikram Malhotra - Role: TPO)
    tpo = requests.post(f"{ATTENDANCE_URL}/api/v1/auth/login", json={"username": "tpo", "password": "tpo123"}).json()
    # 4. Admin
    adm = requests.post(f"{ATTENDANCE_URL}/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()

    return {
        "student1": {"token": s1["access_token"], "headers": {"Authorization": f"Bearer {s1['access_token']}"}},
        "student2": {"token": s2["access_token"], "headers": {"Authorization": f"Bearer {s2['access_token']}"}},
        "tpo": {"token": tpo["access_token"], "headers": {"Authorization": f"Bearer {tpo['access_token']}"}},
        "admin": {"token": adm["access_token"], "headers": {"Authorization": f"Bearer {adm['access_token']}"}}
    }

@pytest.fixture(scope="session")
def student_resumes(auth_tokens):
    """Ensures both student1 and student2 have active uploaded resumes."""
    res = {}
    for user_key in ["student1", "student2"]:
        headers = auth_tokens[user_key]["headers"]
        existing = requests.get(f"{CAREER_URL}/api/resume/list", headers=headers).json()
        if existing:
            res[user_key] = existing[0]["id"]
        else:
            # Upload sample resume
            import pymupdf
            doc = pymupdf.open()
            page = doc.new_page()
            page.insert_text((50, 72), f"{user_key.capitalize()} Resume MCA Python FastAPI SQL Docker")
            pdf_bytes = doc.tobytes()
            up_res = requests.post(
                f"{CAREER_URL}/api/resume/upload",
                files={"file": (f"{user_key}_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
                headers=headers
            ).json()
            res[user_key] = up_res["id"]
    return res

# ==============================================================================
# SECTION 1: PLACEMENT DRIVE MANAGEMENT (TPO & ADMIN)
# ==============================================================================

def test_tpo_create_placement_drive(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    now = datetime.now(timezone.utc)
    drive_payload = {
        "company_name": f"Atlassian R&D {uuid.uuid4().hex[:4]}",
        "job_title": "Site Reliability Engineer",
        "job_description": "Managing global cloud infrastructure, reliability metrics, and SLOs with Python & Go.",
        "location": "Bengaluru / Remote",
        "employment_type": "Full-time",
        "package_min": 16.0,
        "package_max": 22.5,
        "minimum_cgpa": 7.5,
        "minimum_attendance": 75.0,
        "eligible_departments": ["MCA", "CSE"],
        "eligible_batches": ["2026", "2027"],
        "application_deadline": (now + timedelta(days=20)).isoformat(),
        "status": "OPEN"
    }

    res = requests.post(f"{CAREER_URL}/api/placement/drives", json=drive_payload, headers=tpo_h)
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["status"] == "OPEN"

def test_drive_salary_validation_rejected(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    now = datetime.now(timezone.utc)
    # package_min (25.0) > package_max (15.0) -> must be rejected
    invalid_salary_payload = {
        "company_name": "Invalid Salary Corp",
        "job_title": "Backend Engineer",
        "job_description": "Testing invalid salary range rejection.",
        "package_min": 25.0,
        "package_max": 15.0,
        "application_deadline": (now + timedelta(days=10)).isoformat()
    }
    res = requests.post(f"{CAREER_URL}/api/placement/drives", json=invalid_salary_payload, headers=tpo_h)
    assert res.status_code in (400, 422)

def test_drive_past_deadline_rejected(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    past = datetime.now(timezone.utc) - timedelta(days=5)
    past_deadline_payload = {
        "company_name": "Past Deadline Corp",
        "job_title": "Engineer",
        "job_description": "Testing past deadline rejection.",
        "package_min": 10.0,
        "package_max": 12.0,
        "application_deadline": past.isoformat()
    }
    res = requests.post(f"{CAREER_URL}/api/placement/drives", json=past_deadline_payload, headers=tpo_h)
    assert res.status_code in (400, 422)

def test_student_cannot_create_drive(auth_tokens):
    s1_h = auth_tokens["student1"]["headers"]
    now = datetime.now(timezone.utc)
    res = requests.post(
        f"{CAREER_URL}/api/placement/drives",
        json={
            "company_name": "Unauthorized Drive",
            "job_title": "Hacker",
            "job_description": "Students should not be allowed to create drives.",
            "package_min": 10.0,
            "package_max": 12.0,
            "application_deadline": (now + timedelta(days=10)).isoformat()
        },
        headers=s1_h
    )
    assert res.status_code == 403
    assert "requires TPO role" in res.json().get("detail", "")

# ==============================================================================
# SECTION 2: STUDENT DRIVE LISTING & ACADEMIC GATE EVALUATION
# ==============================================================================

def test_student_drive_listing_with_eligibility(auth_tokens):
    s1_h = auth_tokens["student1"]["headers"]
    res = requests.get(f"{CAREER_URL}/api/placement/drives", headers=s1_h)
    assert res.status_code == 200
    drives = res.json()
    assert len(drives) >= 3

    # Check that each drive is annotated with eligibility
    for d in drives:
        assert "is_eligible" in d
        assert "has_applied" in d
        assert "package_min" in d
        assert "minimum_attendance" in d

def test_ineligible_student_apply_rejected(auth_tokens, student_resumes):
    # Ensure drive 1 is OPEN
    tpo_h = auth_tokens["tpo"]["headers"]
    requests.put(f"{CAREER_URL}/api/placement/drives/1", json={"status": "OPEN"}, headers=tpo_h)

    # Student 2 (Diya Sharma has ~38.5% attendance, drive requires 75.0%)
    s2_h = auth_tokens["student2"]["headers"]
    s2_res_id = student_resumes["student2"]

    # Target drive 1 (Google Cloud, requires 75.0%)
    payload = {"drive_id": 1, "resume_id": s2_res_id, "remarks": "Trying to apply."}
    res = requests.post(f"{CAREER_URL}/api/placement/applications", json=payload, headers=s2_h)
    assert res.status_code == 400
    detail = res.json().get("detail", "")
    assert "Ineligible" in detail
    assert "below the mandatory requirement" in detail

def test_eligible_student_apply_success(auth_tokens, student_resumes):
    # Student 1 has ~76.9% attendance, drive 3 requires 70.0%
    s1_h = auth_tokens["student1"]["headers"]
    s1_res_id = student_resumes["student1"]

    payload = {
        "drive_id": 3,  # TCS Digital (70.0% min attendance)
        "resume_id": s1_res_id,
        "remarks": "Strong distributed systems and Python background."
    }
    res = requests.post(f"{CAREER_URL}/api/placement/applications", json=payload, headers=s1_h)
    # Could be 201 if first time, or 409 if already applied in previous runs
    assert res.status_code in (201, 409)
    if res.status_code == 201:
        data = res.json()
        assert data["application_status"] == "Applied"
        assert len(data["audit_history"]) >= 1

def test_duplicate_application_prevented(auth_tokens, student_resumes):
    # Student 1 tries to apply again to Drive 3 -> 409 Conflict
    s1_h = auth_tokens["student1"]["headers"]
    s1_res_id = student_resumes["student1"]

    payload = {"drive_id": 3, "resume_id": s1_res_id}
    res = requests.post(f"{CAREER_URL}/api/placement/applications", json=payload, headers=s1_h)
    assert res.status_code == 409
    assert "Duplicate application" in res.json().get("detail", "")

def test_resume_ownership_enforcement(auth_tokens, student_resumes):
    # Student 1 tries to submit Student 2's resume -> 403 Forbidden
    s1_h = auth_tokens["student1"]["headers"]
    s2_res_id = student_resumes["student2"]

    payload = {"drive_id": 4, "resume_id": s2_res_id}
    res = requests.post(f"{CAREER_URL}/api/placement/applications", json=payload, headers=s1_h)
    assert res.status_code == 403
    assert "Resume validation failed" in res.json().get("detail", "")

# ==============================================================================
# SECTION 3: TPO APPLICATION WORKFLOW & STATUS AUDIT LOGS
# ==============================================================================

def test_tpo_list_applicants_and_filter(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    res = requests.get(f"{CAREER_URL}/api/placement/applications", headers=tpo_h)
    assert res.status_code == 200
    apps = res.json()
    assert isinstance(apps, list)
    assert len(apps) > 0

    # Filter by drive
    drive_id = apps[0]["drive_id"]
    res_filtered = requests.get(f"{CAREER_URL}/api/placement/applications?drive_id={drive_id}", headers=tpo_h)
    assert res_filtered.status_code == 200
    assert all(a["drive_id"] == drive_id for a in res_filtered.json())

def test_tpo_update_status_and_audit_history(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    apps = requests.get(f"{CAREER_URL}/api/placement/applications", headers=tpo_h).json()
    target_app = apps[0]
    app_id = target_app["id"]

    # Transition to "Shortlisted"
    patch_res = requests.patch(
        f"{CAREER_URL}/api/placement/applications/{app_id}/status",
        json={"status": "Shortlisted", "remarks": "Profile shortlisted for technical round."},
        headers=tpo_h
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["application_status"] == "Shortlisted"
    assert any(a["new_status"] == "Shortlisted" for a in updated["audit_history"])

    # Transition to "Interview Scheduled"
    patch_res2 = requests.patch(
        f"{CAREER_URL}/api/placement/applications/{app_id}/status",
        json={"status": "Interview Scheduled", "remarks": "Technical Round 1 scheduled."},
        headers=tpo_h
    )
    assert patch_res2.status_code == 200
    updated2 = patch_res2.json()
    assert updated2["application_status"] == "Interview Scheduled"
    assert any(a["new_status"] == "Interview Scheduled" for a in updated2["audit_history"])

def test_student_cannot_change_own_status(auth_tokens):
    s1_h = auth_tokens["student1"]["headers"]
    # Student attempts to patch status to "Selected"
    res = requests.patch(
        f"{CAREER_URL}/api/placement/applications/1/status",
        json={"status": "Selected", "remarks": "Self selected."},
        headers=s1_h
    )
    assert res.status_code == 403
    assert "requires TPO role" in res.json().get("detail", "")

def test_cross_student_application_privacy(auth_tokens):
    # Student 2 tries to GET Student 1's application detail (app 1) -> 403 Forbidden
    s2_h = auth_tokens["student2"]["headers"]
    res = requests.get(f"{CAREER_URL}/api/placement/applications/1", headers=s2_h)
    assert res.status_code in (403, 404)

# ==============================================================================
# SECTION 4: PLACEMENT OVERVIEW & STATISTICS (TPO & ADMIN)
# ==============================================================================

def test_placement_statistics_overview(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    res = requests.get(f"{CAREER_URL}/api/placement/stats", headers=tpo_h)
    assert res.status_code == 200
    stats = res.json()
    assert "total_drives" in stats
    assert stats["total_drives"] >= 4
    assert "total_applications" in stats
    assert "department_stats" in stats
    assert "status_breakdown" in stats

def test_tpo_close_drive(auth_tokens):
    tpo_h = auth_tokens["tpo"]["headers"]
    # Ensure drive 1 is OPEN first
    requests.put(f"{CAREER_URL}/api/placement/drives/1", json={"status": "OPEN"}, headers=tpo_h)

    close_res = requests.post(f"{CAREER_URL}/api/placement/drives/1/close", headers=tpo_h)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # Verify drive is now CLOSED
    d = requests.get(f"{CAREER_URL}/api/placement/drives/1", headers=tpo_h).json()
    assert d["status"] == "CLOSED"

    # Student cannot apply to closed drive
    s1_h = auth_tokens["student1"]["headers"]
    res = requests.post(
        f"{CAREER_URL}/api/placement/applications",
        json={"drive_id": 1, "resume_id": 1},
        headers=s1_h
    )
    assert res.status_code in (400, 409)  # 400 Closed or 409 already applied

    # Reopen drive 1 so test suite is idempotent across multiple runs
    requests.put(f"{CAREER_URL}/api/placement/drives/1", json={"status": "OPEN"}, headers=tpo_h)

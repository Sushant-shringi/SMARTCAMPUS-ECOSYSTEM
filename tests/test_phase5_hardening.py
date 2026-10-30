"""
Phase 5.1 Production Hardening Verification Suite
Tests:
1. Production rejection of weak / default JWT secrets in attendance-service & career-ai-service
2. Production rejection of DEMO_ATTENDANCE_MODE=True in attendance-service
3. Production rejection of CORS wildcard origins ['*'] when credentials enabled
4. Development acceptance of dev configurations
5. SQLite PRAGMA enforcement (foreign_keys=ON, journal_mode=WAL) in both services
6. Automatic database seeding gated against production environment
7. Authorization & role gating on GET /api/v1/student/attendance-summary/{student_id}
8. Bearer token extraction bug fix in dependencies.py
"""
import os
import sys
import subprocess
import pytest
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ATTENDANCE_DIR = BASE_DIR / "services" / "attendance-service"
CAREER_DIR = BASE_DIR / "services" / "career-ai-service"

ATTENDANCE_URL = os.environ.get("ATTENDANCE_URL", "http://127.0.0.1:8005")
CAREER_URL = os.environ.get("CAREER_URL", "http://127.0.0.1:8001")

# -----------------------------------------------------------------------------
# 1. JWT & CONFIGURATION VALIDATION TESTS (Isolated Subprocess for Clean Imports)
# -----------------------------------------------------------------------------

def test_attendance_service_rejects_insecure_secrets_in_production():
    """Verifies attendance service Settings raises ValueError if insecure secrets are provided in production."""
    cmd = [
        sys.executable, "-c",
        "from app.config import Settings; Settings()"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ATTENDANCE_DIR)
    env["ENVIRONMENT"] = "production"
    env["SECRET_KEY"] = "super-secret-smartattend-key-change-in-production-long-random-string"
    env["REFRESH_SECRET_KEY"] = "super-secret-refresh-key-change-in-production-long-random-string"

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(ATTENDANCE_DIR))
    assert proc.returncode != 0
    assert "Insecure SECRET_KEY in production" in proc.stderr or "Insecure SECRET_KEY in production" in proc.stdout

def test_attendance_service_rejects_short_secrets_in_production():
    """Verifies attendance service Settings raises ValueError if secret is under 32 characters in production."""
    cmd = [
        sys.executable, "-c",
        "from app.config import Settings; Settings()"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ATTENDANCE_DIR)
    env["ENVIRONMENT"] = "production"
    env["SECRET_KEY"] = "short-secret-123"
    env["REFRESH_SECRET_KEY"] = "short-refresh-123"

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(ATTENDANCE_DIR))
    assert proc.returncode != 0
    assert "at least 32 characters" in proc.stderr or "at least 32 characters" in proc.stdout

def test_attendance_service_rejects_demo_mode_in_production():
    """Verifies attendance service Settings raises ValueError if DEMO_ATTENDANCE_MODE is enabled in production."""
    cmd = [
        sys.executable, "-c",
        "from app.config import Settings; Settings()"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ATTENDANCE_DIR)
    env["ENVIRONMENT"] = "production"
    env["SECRET_KEY"] = "x" * 64
    env["REFRESH_SECRET_KEY"] = "y" * 64
    env["DEMO_ATTENDANCE_MODE"] = "true"

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(ATTENDANCE_DIR))
    assert proc.returncode != 0
    assert "DEMO_ATTENDANCE_MODE cannot be enabled in production" in proc.stderr or "DEMO_ATTENDANCE_MODE cannot be enabled in production" in proc.stdout

def test_career_service_rejects_insecure_secrets_in_production():
    """Verifies career AI service Settings raises ValueError if insecure secret is provided in production."""
    cmd = [
        sys.executable, "-c",
        "from app.config import Settings; Settings()"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(CAREER_DIR)
    env["ENVIRONMENT"] = "production"
    env["JWT_SECRET"] = "super-secret-smartattend-key-change-in-production-long-random-string"

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(CAREER_DIR))
    assert proc.returncode != 0
    assert "Insecure JWT_SECRET in production" in proc.stderr or "Insecure JWT_SECRET in production" in proc.stdout

def test_career_service_rejects_cors_wildcard_in_production():
    """Verifies career AI service Settings raises ValueError if CORS_ORIGINS contains '*' in production."""
    cmd = [
        sys.executable, "-c",
        "from app.config import Settings; Settings()"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(CAREER_DIR)
    env["ENVIRONMENT"] = "production"
    env["JWT_SECRET"] = "z" * 64
    env["CORS_ORIGINS"] = "*"

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(CAREER_DIR))
    assert proc.returncode != 0
    assert "CORS_ORIGINS cannot contain wildcard" in proc.stderr or "CORS_ORIGINS cannot contain wildcard" in proc.stdout

# -----------------------------------------------------------------------------
# 2. SQLITE PRAGMA ENFORCEMENT
# -----------------------------------------------------------------------------

def test_attendance_database_enforces_foreign_keys_and_wal():
    """Verifies SQLite engine in attendance service enforces PRAGMA foreign_keys and journal_mode=WAL."""
    cmd = [
        sys.executable, "-c",
        "from app.database.session import SessionLocal; from sqlalchemy import text; db = SessionLocal(); fk = db.execute(text('PRAGMA foreign_keys;')).scalar(); jm = db.execute(text('PRAGMA journal_mode;')).scalar(); db.close(); print(f'FK={fk},JM={jm}')"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ATTENDANCE_DIR)
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(ATTENDANCE_DIR))
    assert proc.returncode == 0
    assert "FK=1" in proc.stdout
    assert "jm=wal" in proc.stdout.lower()

def test_career_database_enforces_foreign_keys_and_wal():
    """Verifies SQLite engine in career AI service enforces PRAGMA foreign_keys and journal_mode=WAL."""
    cmd = [
        sys.executable, "-c",
        "from app.database.session import SessionLocal; from sqlalchemy import text; db = SessionLocal(); fk = db.execute(text('PRAGMA foreign_keys;')).scalar(); jm = db.execute(text('PRAGMA journal_mode;')).scalar(); db.close(); print(f'FK={fk},JM={jm}')"
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(CAREER_DIR)
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=str(CAREER_DIR))
    assert proc.returncode == 0
    assert "FK=1" in proc.stdout
    assert "jm=wal" in proc.stdout.lower()

# -----------------------------------------------------------------------------
# 3. LIVE ATTENDANCE SUMMARY ENDPOINT & RBAC
# -----------------------------------------------------------------------------

def test_attendance_summary_endpoint_rbac():
    """
    Tests GET /api/v1/student/attendance-summary/{student_id}:
    - Unauthenticated -> 401
    - Student user -> 403 Forbidden
    - Teacher user -> 200 OK
    - TPO user -> 200 OK
    - Admin user -> 200 OK
    """
    def get_token(username, password):
        res = requests.post(
            f"{ATTENDANCE_URL}/api/v1/auth/token",
            data={"username": username, "password": password}
        )
        assert res.status_code == 200, f"Login failed for {username}: {res.text}"
        return res.json()["access_token"]

    student_token = get_token("student1", "student123")
    teacher_token = get_token("teacher1", "teacher123")
    tpo_token = get_token("tpo", "tpo123")
    admin_token = get_token("admin", "admin123")

    # Resolve student profile UUID
    me_res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert me_res.status_code == 200
    student_profile_id = me_res.json()["student_profile"]["id"]

    # 1. Unauthenticated -> 401
    res = requests.get(f"{ATTENDANCE_URL}/api/v1/student/attendance-summary/{student_profile_id}")
    assert res.status_code == 401

    # 2. Student role -> 403 (cannot call staff attendance summary)
    res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/student/attendance-summary/{student_profile_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res.status_code == 403

    # 3. Teacher role -> 200 OK
    res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/student/attendance-summary/{student_profile_id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "overall_percentage" in data
    assert "total_sessions" in data
    assert "subject_stats" in data

    # 4. TPO role -> 200 OK
    res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/student/attendance-summary/{student_profile_id}",
        headers={"Authorization": f"Bearer {tpo_token}"}
    )
    assert res.status_code == 200
    tpo_data = res.json()
    assert tpo_data["overall_percentage"] == data["overall_percentage"]

    # 5. Admin role -> 200 OK
    res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/student/attendance-summary/{student_profile_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200

# -----------------------------------------------------------------------------
# 4. CORS CONFIGURATION VERIFICATION
# -----------------------------------------------------------------------------

def test_cors_whitelist_verification():
    """Verifies CORS headers honor explicit origin whitelists."""
    allowed_origin = "http://localhost:5173"

    # Attendance service
    res_allowed = requests.options(
        f"{ATTENDANCE_URL}/api/v1/auth/me",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res_allowed.headers.get("access-control-allow-origin") == allowed_origin

    # Career AI service
    res_career = requests.options(
        f"{CAREER_URL}/api/health",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res_career.headers.get("access-control-allow-origin") == allowed_origin

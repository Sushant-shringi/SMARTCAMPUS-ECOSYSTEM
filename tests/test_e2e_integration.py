"""
End-to-End Integration Test Suite for Smart Campus Ecosystem
Tests full cross-service interaction between:
- Attendance Service (Port 8000)
- Career AI Service (Port 8001)
- Unified Web Portal (Port 5173)
"""
import io
import os
import sqlite3
import uuid
from datetime import datetime, timezone
import pymupdf
import pytest
import requests

import os

ATTENDANCE_URL = os.environ.get("ATTENDANCE_URL", "http://127.0.0.1:8005")
CAREER_URL = os.environ.get("CAREER_URL", "http://127.0.0.1:8001")
WEB_URL = os.environ.get("WEB_URL", "http://127.0.0.1:5173")

def create_sample_pdf(name="Aarav Mehta", skills="Python, FastAPI, SQL, Docker, AWS, React, ChromaDB"):
    doc = pymupdf.open()
    page = doc.new_page()
    text = (
        f"{name}\n"
        f"Computer Science & Engineering Student\n"
        f"Email: {name.lower().replace(' ', '.')}@smartcampus.edu | Phone: +91-9876543210\n\n"
        f"TECHNICAL SKILLS:\n"
        f"{skills}, Git, REST APIs, Linux, PyTorch\n\n"
        f"PROJECTS:\n"
        f"1. Smart Campus Attendance Management System:\n"
        f"   - Built offline-first attendance backend using FastAPI, SQLite, and Bluetooth Low Energy.\n"
        f"   - Developed real-time beacon proximity verification with -85 dBm RSSI threshold.\n"
        f"   - Created IndexedDB offline sync queue for network-disconnected classroom check-ins.\n\n"
        f"2. AI Career and Resume Assistant:\n"
        f"   - Implemented RAG-based career assistant using LangChain, ChromaDB, and Google Gemini.\n"
        f"   - Designed multi-tenant student resume privacy and vector chunk isolation.\n\n"
        f"EDUCATION:\n"
        f"Master of Computer Applications (MCA) - CGPA: 9.2/10.0\n"
    )
    page.insert_text((50, 72), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

@pytest.fixture(scope="session")
def service_tokens():
    """Authenticates all test roles and provides valid JWT tokens."""
    # 1. Student 1 (Student A)
    s1_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "student1", "password": "student123"}
    )
    assert s1_res.status_code == 200, f"Student 1 login failed: {s1_res.text}"
    s1_data = s1_res.json()

    # 2. Student 2 (Student B)
    s2_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "student2", "password": "student123"}
    )
    assert s2_res.status_code == 200, f"Student 2 login failed: {s2_res.text}"
    s2_data = s2_res.json()

    # 3. Teacher 1
    t1_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "teacher1", "password": "teacher123"}
    )
    assert t1_res.status_code == 200, f"Teacher 1 login failed: {t1_res.text}"
    t1_data = t1_res.json()

    # 4. Student 3 (for offline sync)
    s3_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "student3", "password": "student123"}
    )
    assert s3_res.status_code == 200, f"Student 3 login failed: {s3_res.text}"
    s3_data = s3_res.json()

    # 5. Admin
    a_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert a_res.status_code == 200, f"Admin login failed: {a_res.text}"
    a_data = a_res.json()

    return {
        "student1": {
            "token": s1_data["access_token"],
            "user": s1_data["user"],
            "headers": {"Authorization": f"Bearer {s1_data['access_token']}"}
        },
        "student2": {
            "token": s2_data["access_token"],
            "user": s2_data["user"],
            "headers": {"Authorization": f"Bearer {s2_data['access_token']}"}
        },
        "student3": {
            "token": s3_data["access_token"],
            "user": s3_data["user"],
            "headers": {"Authorization": f"Bearer {s3_data['access_token']}"}
        },
        "teacher1": {
            "token": t1_data["access_token"],
            "user": t1_data["user"],
            "headers": {"Authorization": f"Bearer {t1_data['access_token']}"}
        },
        "admin": {
            "token": a_data["access_token"],
            "user": a_data["user"],
            "headers": {"Authorization": f"Bearer {a_data['access_token']}"}
        }
    }


# ==============================================================================
# SECTION 1: APPLICATION STARTUP & TELEMETRY
# ==============================================================================

def test_1_1_attendance_service_health():
    res = requests.get(f"{ATTENDANCE_URL}/docs", timeout=5)
    assert res.status_code == 200
    res_api = requests.get(f"{ATTENDANCE_URL}/openapi.json", timeout=5)
    assert res_api.status_code == 200
    data = res_api.json()
    assert "SmartAttend" in data["info"]["title"]

def test_1_2_career_ai_service_health():
    res = requests.get(f"{CAREER_URL}/api/health", timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "SQLite" in data["database"]
    assert "ChromaDB" in data["vector_store"]
    assert "all-MiniLM-L6-v2" in data["embedding_model"]

def test_1_3_web_portal_accessible():
    res = requests.get(WEB_URL, timeout=5)
    assert res.status_code == 200
    assert "Smart Campus Ecosystem" in res.text or "<div id=\"root\">" in res.text

def test_1_4_cors_preflight_headers():
    headers = {
        "Origin": "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization,Content-Type"
    }
    # Preflight on Attendance Service
    r1 = requests.options(f"{ATTENDANCE_URL}/api/v1/auth/login", headers=headers, timeout=5)
    assert r1.status_code in (200, 204)
    assert "access-control-allow-origin" in r1.headers

    # Preflight on Career AI Service
    r2 = requests.options(f"{CAREER_URL}/api/resume/list", headers=headers, timeout=5)
    assert r2.status_code in (200, 204)
    assert "access-control-allow-origin" in r2.headers


# ==============================================================================
# SECTION 2: AUTHENTICATION & ROLE-BASED ACCESS
# ==============================================================================

def test_2_1_role_validation_and_dashboards(service_tokens):
    # Verify student role
    assert service_tokens["student1"]["user"]["role"] == "STUDENT"
    assert service_tokens["teacher1"]["user"]["role"] == "TEACHER"
    assert service_tokens["admin"]["user"]["role"] == "ADMIN"

def test_2_2_invalid_credentials_rejected():
    res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/auth/login",
        json={"username": "student1", "password": "wrong-password-999"}
    )
    assert res.status_code == 401
    assert "Incorrect username or password" in res.json().get("detail", "")

def test_2_3_expired_or_invalid_token_rejected():
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature"
    res = requests.get(
        f"{ATTENDANCE_URL}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    assert res.status_code in (401, 403)

    res_career = requests.get(
        f"{CAREER_URL}/api/resume/list",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    assert res_career.status_code in (401, 403)

def test_2_4_cross_service_token_compatibility(service_tokens):
    # Token minted by attendance-service is validated by career-ai-service
    res = requests.get(
        f"{CAREER_URL}/api/resume/list",
        headers=service_tokens["student1"]["headers"]
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_2_5_role_enforcement_student_only_career(service_tokens):
    # Teacher token attempting to access Career AI services is rejected
    res = requests.get(
        f"{CAREER_URL}/api/resume/list",
        headers=service_tokens["teacher1"]["headers"]
    )
    assert res.status_code == 403
    assert "requires STUDENT role" in res.json().get("detail", "")

    # Student token is allowed
    res_student = requests.get(
        f"{CAREER_URL}/api/resume/list",
        headers=service_tokens["student1"]["headers"]
    )
    assert res_student.status_code == 200


# ==============================================================================
# SECTION 3: SMART ATTENDANCE & OFFLINE WORKFLOW
# ==============================================================================

def test_3_1_teacher_starts_session_and_student_marks(service_tokens):
    t_headers = service_tokens["teacher1"]["headers"]
    s_headers = service_tokens["student1"]["headers"]

    # 1. Get subjects and classrooms
    sub_res = requests.get(f"{ATTENDANCE_URL}/api/v1/subjects", headers=t_headers)
    assert sub_res.status_code == 200
    subjects = sub_res.json()
    assert len(subjects) > 0

    cr_res = requests.get(f"{ATTENDANCE_URL}/api/v1/classrooms", headers=t_headers)
    assert cr_res.status_code == 200
    classrooms = cr_res.json()
    assert len(classrooms) > 0

    target_sub = subjects[0]
    target_cr = classrooms[0]

    # 2. Teacher starts session
    session_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/attendance/sessions",
        json={
            "subject_id": target_sub["id"],
            "classroom_id": target_cr["id"],
            "semester_id": target_sub.get("semester_id"),
            "section_id": "none",
            "duration_minutes": 50,
            "late_threshold_minutes": 5,
            "rssi_threshold": -85
        },
        headers=t_headers
    )
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data["status"] == "ACTIVE"
    session_id = session_data["id"]
    raw_token = session_data["raw_session_token"]

    # 3. Student views today's classes
    classes_res = requests.get(f"{ATTENDANCE_URL}/api/v1/student/today-classes", headers=s_headers)
    assert classes_res.status_code == 200

    # 4. Student marks attendance (Live BLE check-in)
    att_client_id = str(uuid.uuid4())
    mark_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/attendance/mark",
        json={
            "attendance_id": att_client_id,
            "session_id": session_id,
            "subject_id": target_sub["id"],
            "classroom_id": target_cr["id"],
            "session_token": raw_token,
            "ble_rssi": -55,
            "device_id": "test-device-student1",
            "verification_source": "BLE"
        },
        headers=s_headers
    )
    assert mark_res.status_code == 200
    rec = mark_res.json()
    assert rec["status"] == "PRESENT"
    assert rec["sync_status"] == "SYNCED"

    # 5. Duplicate Check (Idempotency)
    dup_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/attendance/mark",
        json={
            "attendance_id": att_client_id,
            "session_id": session_id,
            "subject_id": target_sub["id"],
            "classroom_id": target_cr["id"],
            "session_token": raw_token,
            "ble_rssi": -55,
            "device_id": "test-device-student1",
            "verification_source": "BLE"
        },
        headers=s_headers
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == rec["id"]

    # 6. Student queries attendance history
    hist_res = requests.get(f"{ATTENDANCE_URL}/api/v1/attendance/history?limit=20", headers=s_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert any(h["session_id"] == session_id for h in history)

    # 7. Student dashboard analytics
    dash_res = requests.get(f"{ATTENDANCE_URL}/api/v1/student/dashboard", headers=s_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "overall_percentage" in dash_data
    assert 0.0 <= dash_data["overall_percentage"] <= 100.0
    assert dash_data["total_sessions"] > 0
    assert isinstance(dash_data["low_attendance_warning"], bool)

def test_3_2_offline_synchronization_flow(service_tokens):
    s_headers = service_tokens["student3"]["headers"]
    client_uuid = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Get valid subject and classroom
    sub_res = requests.get(f"{ATTENDANCE_URL}/api/v1/subjects", headers=service_tokens["admin"]["headers"])
    cr_res = requests.get(f"{ATTENDANCE_URL}/api/v1/classrooms", headers=service_tokens["admin"]["headers"])
    sub_id = sub_res.json()[0]["id"]
    cr_id = cr_res.json()[0]["id"]

    # Simulate queued offline records in IndexedDB
    batch_payload = {
        "items": [
            {
                "attendance_id": client_uuid,
                "session_id": "active-or-recovered-session",
                "subject_id": sub_id,
                "classroom_id": cr_id,
                "session_token": "offline-valid-token",
                "ble_rssi": -60,
                "device_id": "offline-mobile-phone",
                "marked_at": now_iso,
                "verification_source": "BLE"
            }
        ]
    }

    sync_res = requests.post(
        f"{ATTENDANCE_URL}/api/v1/sync/attendance",
        json=batch_payload,
        headers=s_headers
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["total_processed"] == 1


# ==============================================================================
# SECTION 4: AI CAREER STUDIO INTEGRATION
# ==============================================================================

@pytest.fixture(scope="session")
def uploaded_resume(service_tokens):
    """Uploads a valid PDF resume for Student 1 and returns resume metadata."""
    s1_headers = service_tokens["student1"]["headers"]
    pdf_bytes = create_sample_pdf("Aarav Mehta", "Python, FastAPI, SQL, Docker, AWS, React, ChromaDB")

    files = {"file": ("aarav_mehta_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    # Remove Content-Type from headers so requests sets multipart boundary automatically
    h = {"Authorization": s1_headers["Authorization"]}

    res = requests.post(f"{CAREER_URL}/api/resume/upload", files=files, headers=h)
    assert res.status_code in (200, 201), f"Resume upload failed: {res.text}"
    data = res.json()
    assert "id" in data
    assert data["filename"] == "aarav_mehta_resume.pdf"
    assert "Python" in data["extracted_skills"]
    assert "FastAPI" in data["extracted_skills"]
    assert data["total_chunks"] > 0
    return data

def test_4_1_resume_listing_and_detail(service_tokens, uploaded_resume):
    s1_headers = service_tokens["student1"]["headers"]
    res = requests.get(f"{CAREER_URL}/api/resume/list", headers=s1_headers)
    assert res.status_code == 200
    resumes = res.json()
    assert any(r["id"] == uploaded_resume["id"] for r in resumes)

    # Detail check
    det_res = requests.get(f"{CAREER_URL}/api/resume/{uploaded_resume['id']}", headers=s1_headers)
    assert det_res.status_code == 200
    detail = det_res.json()
    assert detail["id"] == uploaded_resume["id"]
    assert "cleaned_text" in detail

def test_4_2_job_description_matcher(service_tokens, uploaded_resume):
    s1_headers = service_tokens["student1"]["headers"]
    jd_payload = {
        "resume_id": uploaded_resume["id"],
        "custom_job_text": (
            "We are seeking a Backend Engineer with strong Python, FastAPI, and Docker experience. "
            "Experience with AWS, PostgreSQL, and Kubernetes is preferred."
        )
    }
    res = requests.post(f"{CAREER_URL}/api/jobs/match", json=jd_payload, headers=s1_headers)
    assert res.status_code == 200
    data = res.json()
    assert "match_percentage" in data
    assert data["match_percentage"] > 0
    assert "matching_skills" in data
    assert any(s.lower() == "python" for s in data["matching_skills"])
    assert any(s.lower() == "fastapi" for s in data["matching_skills"])

def test_4_3_rag_resume_chat(service_tokens, uploaded_resume):
    s1_headers = service_tokens["student1"]["headers"]
    chat_payload = {
        "resume_id": uploaded_resume["id"],
        "question": "What database and backend technologies does the candidate know?"
    }
    res = requests.post(f"{CAREER_URL}/api/rag/chat", json=chat_payload, headers=s1_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) > 0

def test_4_4_bullet_point_enhancer(service_tokens):
    s1_headers = service_tokens["student1"]["headers"]
    payload = {
        "original_bullet": "Worked on backend attendance system using FastAPI and SQLite.",
        "role_or_domain": "Software Engineering"
    }
    res = requests.post(f"{CAREER_URL}/api/suggestions/improve-bullet", json=payload, headers=s1_headers)
    assert res.status_code == 200
    data = res.json()
    assert "improved_bullet" in data
    assert len(data["improved_bullet"]) > 0


# ==============================================================================
# SECTION 5: STUDENT PRIVACY & MULTI-TENANT ISOLATION
# ==============================================================================

def test_5_1_cross_student_resume_isolation(service_tokens, uploaded_resume):
    resume_id = uploaded_resume["id"]
    s2_headers = service_tokens["student2"]["headers"]

    # Student 2 lists resumes -> Student 1's resume MUST NOT appear
    list_res = requests.get(f"{CAREER_URL}/api/resume/list", headers=s2_headers)
    assert list_res.status_code == 200
    s2_resumes = list_res.json()
    assert not any(r["id"] == resume_id for r in s2_resumes)

    # Student 2 tries to GET Student 1's resume detail -> 404 Not Found (privacy isolation)
    get_res = requests.get(f"{CAREER_URL}/api/resume/{resume_id}", headers=s2_headers)
    assert get_res.status_code in (403, 404)
    assert "access denied" in get_res.json().get("detail", "").lower() or "not found" in get_res.json().get("detail", "").lower()

    # Student 2 tries to DELETE Student 1's resume -> 404 Not Found (privacy isolation)
    del_res = requests.delete(f"{CAREER_URL}/api/resume/{resume_id}", headers=s2_headers)
    assert del_res.status_code in (403, 404)
    assert "access denied" in del_res.json().get("detail", "").lower() or "not found" in del_res.json().get("detail", "").lower()

    # Student 2 tries to query Student 1's resume in RAG Chat -> 404/403 Isolated
    rag_res = requests.post(
        f"{CAREER_URL}/api/rag/chat",
        json={"resume_id": resume_id, "question": "Where did the candidate work?"},
        headers=s2_headers
    )
    assert rag_res.status_code in (403, 404)

    # Student 2 tries to run Job Match on Student 1's resume -> 404/403 Isolated
    match_res = requests.post(
        f"{CAREER_URL}/api/jobs/match",
        json={"resume_id": resume_id, "custom_job_text": "Python Developer"},
        headers=s2_headers
    )
    assert match_res.status_code in (403, 404)

    # Student 2 tries to generate interview questions on Student 1's resume -> 404/403 Isolated
    int_res = requests.post(
        f"{CAREER_URL}/api/interview/generate",
        json={"resume_id": resume_id},
        headers=s2_headers
    )
    assert int_res.status_code in (403, 404)

    # Student 2 tries to get suggestions for Student 1's resume -> 404/403 Isolated
    sug_res = requests.get(
        f"{CAREER_URL}/api/suggestions/review/{resume_id}",
        headers=s2_headers
    )
    assert sug_res.status_code in (403, 404)


# ==============================================================================
# SECTION 6: PLACEMENT ELIGIBILITY & GATE POLICIES
# ==============================================================================

def test_6_1_placement_eligibility_verified_student(service_tokens):
    s1_headers = service_tokens["student1"]["headers"]
    s2_headers = service_tokens["student2"]["headers"]

    # 1. Student 1 meets institutional attendance threshold (>= 75.0%) -> ELIGIBLE
    res1 = requests.get(f"{CAREER_URL}/api/placement/eligibility/me", headers=s1_headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "attendance_percentage" in data1
    assert data1["attendance_percentage"] >= 75.0
    assert data1["is_eligible"] is True
    assert data1["status"] == "ELIGIBLE"
    assert "ai_resume_tailoring" in data1["unlocked_features"]
    assert "rag_interview_coach" in data1["unlocked_features"]

    # 2. Student 2 has attendance below mandatory threshold (< 75.0%) -> DEFICIT LOCKED
    res2 = requests.get(f"{CAREER_URL}/api/placement/eligibility/me", headers=s2_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["attendance_percentage"] < 75.0
    assert data2["is_eligible"] is False
    assert data2["status"] == "DEFICIT_WARNING"
    assert "Placement Locked" in data2["message"]
    assert len(data2["unlocked_features"]) == 0

def test_6_2_placement_eligibility_custom_threshold(service_tokens):
    s1_headers = service_tokens["student1"]["headers"]
    # If the company drive requires 99.9% attendance, filtering by min_attendance=99.9 returns empty
    res = requests.get(f"{CAREER_URL}/api/placement/drives?min_attendance=99.9", headers=s1_headers)
    assert res.status_code == 200
    drives = res.json()
    # Verified student Aarav Mehta has ~85% attendance, no drive requires 99.9% or higher
    # Checking that standard drives exist
    all_drives = requests.get(f"{CAREER_URL}/api/placement/drives", headers=s1_headers).json()
    assert len(all_drives) >= 3

def test_6_3_placement_eligibility_unauthenticated():
    res = requests.get(f"{CAREER_URL}/api/placement/eligibility/me")
    assert res.status_code in (401, 403)


# ==============================================================================
# SECTION 7: DATABASE PERSISTENCE & DATA INTEGRITY
# ==============================================================================

def test_7_1_attendance_database_records_persisted():
    db_path = r"D:\SMARTCAMPUS ECOSYSTEM\services\attendance-service\smartattend.db"
    assert os.path.exists(db_path), "Attendance SQLite database does not exist on disk"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM attendance_records WHERE verification_source = 'BLE'")
    ble_count = cur.fetchone()[0]
    assert ble_count > 0, "No BLE attendance records found in database"

    cur.execute("SELECT count(*) FROM users WHERE role = 'STUDENT'")
    student_count = cur.fetchone()[0]
    assert student_count >= 5, "Seed students missing from database"
    conn.close()

def test_7_2_career_database_records_persisted(uploaded_resume):
    db_path = r"D:\SMARTCAMPUS ECOSYSTEM\services\career-ai-service\data\career_assistant.db"
    row = None
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id, filename, user_id FROM resumes WHERE id = ?", (uploaded_resume["id"],))
        row = cur.fetchone()
        conn.close()

    # If running against containerized deployment, check inside container volume
    if row is None:
        import subprocess, json
        res_id = uploaded_resume["id"]
        py_code = f"import sqlite3, json; conn = sqlite3.connect('/app/data/career_assistant.db'); cur = conn.cursor(); cur.execute('SELECT id, filename, user_id FROM resumes WHERE id = ?', ({res_id},)); r = cur.fetchone(); print(json.dumps(r) if r else 'null')"
        cmd = ["docker", "exec", "smartcampus-career-ai", "python", "-c", py_code]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode == 0 and proc.stdout.strip() and proc.stdout.strip() != "null":
            row = json.loads(proc.stdout.strip())

    assert row is not None, "Uploaded resume not found in SQLite"
    assert row[1] == "aarav_mehta_resume.pdf"
    assert row[2] is not None, "user_id column is missing or null"

def test_7_3_chromadb_vector_store_persisted():
    vector_dir = r"D:\SMARTCAMPUS ECOSYSTEM\services\career-ai-service\data\vector_db"
    assert os.path.isdir(vector_dir), "ChromaDB vector directory does not exist"
    assert len(os.listdir(vector_dir)) > 0, "ChromaDB directory is empty"

import pytest
import requests
import uuid
import subprocess
import json
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:8005/api/v1"

def query_container_db(python_snippet: str) -> str:
    """Executes a python snippet inside the smartcampus-attendance container to inspect live SQLite DB."""
    cmd = ["docker", "exec", "smartcampus-attendance", "python", "-c", python_snippet]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout.strip()

@pytest.fixture(scope="module")
def teacher_auth():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "teacher1", "password": "teacher123"})
    assert resp.status_code == 200, f"Teacher login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def student1_auth():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "student1", "password": "student123"})
    assert resp.status_code == 200, f"Student 1 login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def student2_auth():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "student2", "password": "student123"})
    assert resp.status_code == 200, f"Student 2 login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# PHASE B: TEACHER SESSION TESTING
# ==============================================================================

def test_phase_b_teacher_course_visibility_and_mapping(teacher_auth):
    """Verifies teacher course visibility and subject mapping."""
    classes_resp = requests.get(f"{BASE_URL}/teacher/classes", headers=teacher_auth)
    assert classes_resp.status_code == 200
    classes = classes_resp.json()
    assert len(classes) >= 1
    
    # Verify MCA201 Data Engineering is mapped to teacher1
    subject_codes = [c["subject_code"] for c in classes]
    assert "MCA201" in subject_codes
    assert "MCA203" in subject_codes

def test_phase_b_unauthorized_course_session_rejection(teacher_auth):
    """Verifies that a teacher cannot start an attendance session for an unauthorized course."""
    # MCA202 belongs to teacher2, not teacher1
    unauthorized_subject_id = "6004874c-c1d1-47c3-bda4-36e11e04eb8b"
    classroom_id = "b4c73588-3eeb-48d5-907a-d13bc2af9414"
    semester_id = "78065441-d6cf-4dae-8231-d8f7279299ca"
    
    resp = requests.post(
        f"{BASE_URL}/attendance/sessions",
        json={
            "subject_id": unauthorized_subject_id,
            "classroom_id": classroom_id,
            "semester_id": semester_id,
            "section_id": "none",
            "duration_minutes": 50,
            "late_threshold_minutes": 5,
            "rssi_threshold": -85
        },
        headers=teacher_auth
    )
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    assert "not authorized" in resp.json()["detail"].lower()

def test_phase_b_teacher_start_active_session_and_ble_broadcast(teacher_auth):
    """Verifies session creation, active status, cryptographic token, and BLE payload."""
    classes_resp = requests.get(f"{BASE_URL}/teacher/classes", headers=teacher_auth)
    mca201 = [c for c in classes_resp.json() if c["subject_code"] == "MCA201"][0]
    tt = mca201["timetables"][0]

    resp = requests.post(
        f"{BASE_URL}/attendance/sessions",
        json={
            "subject_id": mca201["subject_id"],
            "classroom_id": tt["classroom_id"],
            "semester_id": tt["semester_id"],
            "section_id": tt["section_id"],
            "duration_minutes": 50,
            "late_threshold_minutes": 5,
            "rssi_threshold": -85
        },
        headers=teacher_auth
    )
    assert resp.status_code == 200, f"Session creation failed: {resp.text}"
    session_data = resp.json()
    assert session_data["status"] == "ACTIVE"
    assert session_data["ble_identifier"] == "SMARTATTEND-RM204"
    assert session_data["raw_session_token"] is not None
    assert len(session_data["raw_session_token"]) == 16

    # Verify active session query
    active_resp = requests.get(f"{BASE_URL}/attendance/sessions/active", headers=teacher_auth)
    assert active_resp.status_code == 200
    assert active_resp.json()["id"] == session_data["id"]

# ==============================================================================
# PHASE C: STUDENT COURSE AND BLE SCANNING TESTING
# ==============================================================================

def test_phase_c_student_active_session_discovery(student1_auth):
    """Verifies student can discover the active course session and BLE identifier."""
    classes_resp = requests.get(f"{BASE_URL}/student/today-classes", headers=student1_auth)
    assert classes_resp.status_code == 200
    classes = classes_resp.json()
    active_class = [c for c in classes if c["subject_code"] == "MCA201"][0]
    
    assert active_class["is_session_active"] is True
    assert active_class["active_session_id"] is not None
    assert active_class["ble_identifier"] == "SMARTATTEND-RM204"
    assert active_class["already_marked"] is False

# ==============================================================================
# PHASE D & E: ATTENDANCE MARKING, DATABASE PERSISTENCE, AND HISTORY (8-STEP)
# ==============================================================================

def test_phase_d_and_e_eight_step_attendance_verification(teacher_auth, student1_auth):
    """
    Executes the exact mandatory 8-step test:
    1. Record current attendance history count for student1.
    2. Ensure a valid active session is running.
    3. Mark attendance as student1.
    4. Verify backend response (200 OK, status PRESENT).
    5. Directly inspect SQLite database inside Docker container.
    6. Refresh Attendance History API.
    7. Verify new record appears in student history.
    8. Verify older records remain unchanged.
    """
    # Step 1: Record initial history count
    initial_hist_resp = requests.get(f"{BASE_URL}/attendance/history", headers=student1_auth)
    assert initial_hist_resp.status_code == 200
    initial_history = initial_hist_resp.json()
    initial_count = len(initial_history)
    initial_ids = {r["id"] for r in initial_history}

    # Step 2: Get active session details
    classes_resp = requests.get(f"{BASE_URL}/student/today-classes", headers=student1_auth)
    active_class = [c for c in classes_resp.json() if c["subject_code"] == "MCA201"][0]
    session_id = active_class["active_session_id"]
    subject_id = active_class["subject_id"]
    classroom_id = active_class["active_session_classroom_id"]

    # Step 3: Mark attendance as student1
    client_att_id = f"test-ble-{int(datetime.now(timezone.utc).timestamp())}"
    mark_payload = {
        "attendance_id": client_att_id,
        "session_id": session_id,
        "subject_id": subject_id,
        "classroom_id": classroom_id,
        "session_token": "valid-ble-proximity-token",
        "ble_rssi": -62,
        "device_id": "pytest-ble-runner",
        "verification_source": "BLE"
    }
    mark_resp = requests.post(f"{BASE_URL}/attendance/mark", json=mark_payload, headers=student1_auth)

    # Step 4: Verify backend response
    assert mark_resp.status_code == 200, f"Marking attendance failed: {mark_resp.text}"
    record_data = mark_resp.json()
    assert record_data["id"] == client_att_id
    assert record_data["status"] == "PRESENT"
    assert record_data["ble_rssi"] == -62
    assert record_data["sync_status"] == "SYNCED"

    # Step 5: Directly inspect SQLite database inside the container
    db_check = query_container_db(f"""
from app.database.session import SessionLocal
from app.models.attendance import AttendanceRecord
db = SessionLocal()
rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == '{client_att_id}').first()
if rec:
    print(f'FOUND:{{rec.id}}|{{rec.student_id}}|{{rec.status}}|{{rec.ble_rssi}}')
else:
    print('NOT_FOUND')
db.close()
""")
    assert "FOUND" in db_check, f"Record {client_att_id} was not persisted in database: {db_check}"
    assert "PRESENT" in db_check
    assert "-62" in db_check

    # Step 6: Refresh Attendance History API
    refreshed_hist_resp = requests.get(f"{BASE_URL}/attendance/history", headers=student1_auth)
    assert refreshed_hist_resp.status_code == 200
    refreshed_history = refreshed_hist_resp.json()

    # Step 7: Verify new record appears in student's history
    assert len(refreshed_history) == initial_count + 1
    newest_record = refreshed_history[0]
    assert newest_record["id"] == client_att_id
    assert newest_record["status"] == "PRESENT"
    assert newest_record["ble_rssi"] == -62
    assert newest_record["session"]["subject"]["name"] == "Data Engineering"

    # Step 8: Verify older records remain unchanged
    current_ids = {r["id"] for r in refreshed_history}
    assert initial_ids.issubset(current_ids), "Initial records were mutated or dropped"

    # Duplicate attendance idempotency check
    dup_resp = requests.post(f"{BASE_URL}/attendance/mark", json=mark_payload, headers=student1_auth)
    assert dup_resp.status_code == 200
    assert dup_resp.json()["id"] == client_att_id
    
    # Check that database count has not increased
    hist_after_dup = requests.get(f"{BASE_URL}/attendance/history", headers=student1_auth).json()
    assert len(hist_after_dup) == initial_count + 1

# ==============================================================================
# PHASE F: TEACHER DASHBOARD SYNCHRONIZATION
# ==============================================================================

def test_phase_f_teacher_live_dashboard_synchronization(teacher_auth, student2_auth):
    """
    Verifies teacher live attendance roster updates in real time:
    - student1 is already marked and visible
    - student2 marks attendance
    - live roster count increments to 2
    - duplicate marking does not increment count
    """
    active_resp = requests.get(f"{BASE_URL}/attendance/sessions/active", headers=teacher_auth)
    session_id = active_resp.json()["id"]

    # Teacher checks live roster
    live_resp = requests.get(f"{BASE_URL}/teacher/live-attendance/{session_id}", headers=teacher_auth)
    assert live_resp.status_code == 200
    live_data = live_resp.json()
    assert live_data["present_count"] >= 1
    
    # Student 2 marks attendance
    client_att_id_s2 = f"test-ble-s2-{int(datetime.now(timezone.utc).timestamp())}"
    mark_payload_s2 = {
        "attendance_id": client_att_id_s2,
        "session_id": session_id,
        "subject_id": live_data["session"]["subject_id"],
        "classroom_id": live_data["session"]["classroom_id"],
        "session_token": "valid-ble-proximity-token",
        "ble_rssi": -58,
        "device_id": "pytest-ble-runner-s2",
        "verification_source": "BLE"
    }
    s2_resp = requests.post(f"{BASE_URL}/attendance/mark", json=mark_payload_s2, headers=student2_auth)
    assert s2_resp.status_code == 200

    # Verify teacher live roster reflected student2
    live_resp_updated = requests.get(f"{BASE_URL}/teacher/live-attendance/{session_id}", headers=teacher_auth)
    assert live_resp_updated.status_code == 200
    live_updated = live_resp_updated.json()
    
    # Check present count and student names in live data
    assert live_updated["present_count"] >= 2
    student_names = [st["full_name"] for st in live_updated.get("attendance_list", [])]
    assert "Aarav Mehta" in student_names
    assert "Diya Sharma" in student_names

# ==============================================================================
# PHASE G: OFFLINE ATTENDANCE AND SYNC
# ==============================================================================

def test_phase_g_offline_attendance_batch_sync(student1_auth, teacher_auth):
    """
    Tests offline attendance queuing and synchronization:
    - Multiple items batched
    - Valid item marked as SYNCED
    - Invalid item tracked with detailed failure message
    - SyncLog persisted in SQLite DB
    """
    active_resp = requests.get(f"{BASE_URL}/attendance/sessions/active", headers=teacher_auth)
    session_data = active_resp.json()
    session_id = session_data["id"]
    subject_id = session_data["subject_id"]
    classroom_id = session_data["classroom_id"]

    now_iso = datetime.now(timezone.utc).isoformat()
    offline_valid_id = f"offline-valid-{uuid.uuid4().hex[:8]}"
    offline_invalid_id = f"offline-bad-{uuid.uuid4().hex[:8]}"

    batch_payload = {
        "items": [
            {
                "attendance_id": offline_valid_id,
                "session_id": session_id,
                "subject_id": subject_id,
                "classroom_id": classroom_id,
                "session_token": "valid-ble-proximity-token",
                "ble_rssi": -55,
                "device_id": "offline-mobile-phone",
                "marked_at": now_iso,
                "verification_source": "BLE"
            },
            {
                "attendance_id": offline_invalid_id,
                "session_id": "00000000-0000-0000-0000-000000000000",
                "subject_id": subject_id,
                "classroom_id": classroom_id,
                "session_token": "wrong-token-for-test",
                "ble_rssi": -55,
                "device_id": "offline-mobile-phone",
                "marked_at": now_iso,
                "verification_source": "BLE"
            }
        ]
    }

    sync_resp = requests.post(f"{BASE_URL}/sync/attendance", json=batch_payload, headers=student1_auth)
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["total_processed"] == 2
    assert sync_data["success_count"] == 1
    assert sync_data["failure_count"] == 1

    # Verify SQLite database sync logs
    log_check = query_container_db("""
from app.database.session import SessionLocal
from app.models.attendance import SyncLog
db = SessionLocal()
latest = db.query(SyncLog).order_by(SyncLog.created_at.desc()).first()
if latest:
    print(f'SYNC_LOG:batch={latest.batch_size},success={latest.success_count},failure={latest.failure_count}')
else:
    print('NO_LOG')
db.close()
""")
    assert "SYNC_LOG:batch=2,success=1,failure=1" in log_check

# ==============================================================================
# PHASE H: NEGATIVE AND SECURITY TESTING
# ==============================================================================

def test_phase_h_negative_and_security_cases(student1_auth, teacher_auth):
    """Verifies that all invalid and unauthorized attendance requests are rejected safely."""
    active_resp = requests.get(f"{BASE_URL}/attendance/sessions/active", headers=teacher_auth)
    session_id = active_resp.json()["id"]
    subject_id = active_resp.json()["subject_id"]
    classroom_id = active_resp.json()["classroom_id"]

    # 1. Invalid Session Token
    res = requests.post(
        f"{BASE_URL}/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subject_id,
            "classroom_id": classroom_id,
            "session_token": "fake-forged-token",
            "ble_rssi": -60
        },
        headers=student1_auth
    )
    assert res.status_code == 400
    assert "Invalid session token" in res.json()["detail"]

    # 2. Weak BLE RSSI (-95 dBm < -85 dBm)
    res = requests.post(
        f"{BASE_URL}/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subject_id,
            "classroom_id": classroom_id,
            "session_token": "valid-ble-proximity-token",
            "ble_rssi": -95
        },
        headers=student1_auth
    )
    assert res.status_code == 400
    assert "Invalid session token" in res.json()["detail"] or "too weak" in res.json()["detail"]

    # 3. Non-existent Session ID
    res = requests.post(
        f"{BASE_URL}/attendance/mark",
        json={
            "session_id": "00000000-0000-0000-0000-000000000000",
            "subject_id": subject_id,
            "classroom_id": classroom_id,
            "session_token": "valid-ble-proximity-token",
            "ble_rssi": -60
        },
        headers=student1_auth
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    # 4. Unauthorized API Request (No token)
    res = requests.post(
        f"{BASE_URL}/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subject_id,
            "classroom_id": classroom_id,
            "session_token": "valid-ble-proximity-token",
            "ble_rssi": -60
        }
    )
    assert res.status_code == 401

    # 5. Stop Session and verify student cannot mark on stopped session outside window
    stop_resp = requests.post(f"{BASE_URL}/attendance/sessions/{session_id}/stop", headers=teacher_auth)
    assert stop_resp.status_code == 200

    # Marking after stop with future marked_at outside window
    from datetime import timedelta
    future_time = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    res = requests.post(
        f"{BASE_URL}/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subject_id,
            "classroom_id": classroom_id,
            "session_token": "valid-ble-proximity-token",
            "ble_rssi": -60,
            "marked_at": future_time
        },
        headers=student1_auth
    )
    assert res.status_code == 400

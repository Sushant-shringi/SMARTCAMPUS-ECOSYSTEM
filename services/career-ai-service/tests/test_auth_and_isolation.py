import pytest
from conftest import generate_test_token
from app.database.models import ResumeModel, JobDescriptionModel
from app.config import settings
import json
import jwt

def test_unauthenticated_requests_are_rejected(client):
    """Endpoints must reject requests without Bearer tokens with 401."""
    res_list = client.get("/api/resume/list")
    assert res_list.status_code == 401
    assert "Authentication required" in res_list.json()["detail"]

    res_detail = client.get("/api/resume/1")
    assert res_detail.status_code == 401

    res_eligibility = client.get("/api/placement/eligibility/me")
    assert res_eligibility.status_code == 401

    res_review = client.get("/api/suggestions/review/1")
    assert res_review.status_code == 401

def test_invalid_or_expired_token_rejected(client):
    """Expired or invalid signature tokens must return 401."""
    expired_token = generate_test_token(user_id="student_expired", expired=True)
    res = client.get("/api/resume/list", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401

    bad_token = "invalid.token.signature"
    res_bad = client.get("/api/resume/list", headers={"Authorization": f"Bearer {bad_token}"})
    assert res_bad.status_code == 401

    tampered_token = jwt.encode({"sub": "student_x", "type": "access"}, "wrong-secret", algorithm="HS256")
    res_tampered = client.get("/api/resume/list", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res_tampered.status_code == 401

def test_non_student_role_forbidden(client):
    """Non-student (e.g. TEACHER) attempting student features receives 403."""
    teacher_token = generate_test_token(user_id="teacher_user_id", role="TEACHER")
    res = client.get("/api/resume/list", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 403
    assert "requires STUDENT role" in res.json()["detail"]

def test_student_data_isolation(client, db_session):
    """
    Verifies that Student A's resumes cannot be seen, accessed, queried with RAG,
    matched with jobs, interviewed, suggested, or deleted by Student B.
    """
    token_a = generate_test_token(user_id="student_A", username="Alice")
    token_b = generate_test_token(user_id="student_B", username="Bob")

    # 1. Create a resume directly in DB owned by Student A
    resume_a = ResumeModel(
        user_id="student_A",
        filename="alice_resume.pdf",
        file_path="/data/uploads/alice_resume.pdf",
        raw_text="Alice's MCA resume with Python and Cloud Engineering skills.",
        cleaned_text="Alice's MCA resume with Python and Cloud Engineering skills.",
        extracted_skills=json.dumps(["Python", "Cloud Engineering"]),
        total_chunks=2
    )
    db_session.add(resume_a)
    db_session.commit()
    db_session.refresh(resume_a)
    resume_a_id = resume_a.id

    # 2. Student A lists resumes -> Sees alice_resume.pdf
    res_a = client.get("/api/resume/list", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    resumes_a = res_a.json()
    assert len(resumes_a) == 1
    assert resumes_a[0]["filename"] == "alice_resume.pdf"

    # 3. Student B lists resumes -> Sees 0 resumes (isolated)
    res_b = client.get("/api/resume/list", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    resumes_b = res_b.json()
    assert len(resumes_b) == 0

    # 4. Student B attempts to get Student A's resume detail -> 404 Access Denied
    res_b_detail = client.get(f"/api/resume/{resume_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_detail.status_code == 404

    # 5. Student B attempts to ask RAG questions about Student A's resume -> 404 Access Denied
    res_b_rag = client.post(
        "/api/rag/chat",
        json={"resume_id": resume_a_id, "question": "What are Alice's skills?"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_rag.status_code == 404

    # 6. Student B attempts to run Job Match against Student A's resume -> 404 Access Denied
    res_b_match = client.post(
        "/api/jobs/match",
        json={"resume_id": resume_a_id, "custom_job_text": "Looking for Python developer"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_match.status_code == 404

    # 7. Student B attempts to generate Interview Questions on Student A's resume -> 404 Access Denied
    res_b_interview = client.post(
        "/api/interview/generate",
        json={"resume_id": resume_a_id, "custom_job_text": "Python engineer"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_interview.status_code == 404

    # 8. Student B attempts to review Student A's resume suggestions -> 404 Access Denied
    res_b_review = client.get(
        f"/api/suggestions/review/{resume_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_review.status_code == 404

    # 9. Student B attempts to delete Student A's resume -> 404 Access Denied
    res_b_del = client.delete(f"/api/resume/{resume_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_del.status_code == 404

    # 10. Verify Resume A still intact for Student A
    res_a_check = client.get(f"/api/resume/{resume_a_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a_check.status_code == 200
    assert res_a_check.json()["filename"] == "alice_resume.pdf"

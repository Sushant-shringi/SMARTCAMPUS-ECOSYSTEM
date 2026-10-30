"""
Placement Management System & Institutional Eligibility Bridge API
Supports:
1. Student: Browse drives, evaluate authoritative attendance gate, apply with active resume, track applications and audit timeline.
2. TPO: Create & manage placement drives, review applicants, filter by department/batch/eligibility, shortlist/reject/schedule interviews, view statistics.
3. Admin: Placement overview, audits, and compliance reporting.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request, status
from pydantic import BaseModel
import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from app.config import settings
    from app.database.session import get_db
    from app.auth.dependencies import (
        get_current_user,
        require_student,
        require_student_only,
        require_tpo,
        require_admin,
        AuthenticatedUser
    )
    from app.database.models import (
        ResumeModel,
        PlacementDriveModel,
        PlacementApplicationModel,
        ApplicationAuditModel
    )
    from app.schemas.placement import (
        DriveCreateRequest,
        DriveUpdateRequest,
        DriveResponse,
        ApplicationSubmitRequest,
        ApplicationStatusUpdateRequest,
        ApplicationResponse,
        ApplicationAuditResponse,
        PlacementStatsResponse,
        ALLOWED_STATUSES
    )
    from app.database.placement_seed import seed_placement_drives
except ImportError:
    from backend.app.config import settings
    from backend.app.database.session import get_db
    from backend.app.auth.dependencies import (
        get_current_user,
        require_student,
        require_student_only,
        require_tpo,
        require_admin,
        AuthenticatedUser
    )
    from backend.app.database.models import (
        ResumeModel,
        PlacementDriveModel,
        PlacementApplicationModel,
        ApplicationAuditModel
    )
    from backend.app.schemas.placement import (
        DriveCreateRequest,
        DriveUpdateRequest,
        DriveResponse,
        ApplicationSubmitRequest,
        ApplicationStatusUpdateRequest,
        ApplicationResponse,
        ApplicationAuditResponse,
        PlacementStatsResponse,
        ALLOWED_STATUSES
    )
    from backend.app.database.placement_seed import seed_placement_drives

router = APIRouter(prefix="/placement", tags=["Campus Placement & Eligibility"])

# ==============================================================================
# STUDENT PROFILE & ATTENDANCE EVALUATION HELPERS
# ==============================================================================

def _get_student_profile(user_id: str) -> dict:
    """Retrieves authoritative student profile (name, email, roll number, department) from smartattend.db."""
    db_url = settings.ATTENDANCE_DATABASE_URL
    default_info = {
        "student_name": "Student",
        "student_email": f"student_{user_id[:6]}@smartcampus.edu",
        "department": "MCA",
        "roll_number": "MCA-2026-00"
    }
    if not db_url:
        return default_info
    db_path = Path(db_url.replace("sqlite:///", ""))
    if not db_path.exists():
        return default_info
    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        row = cur.execute("""
            SELECT u.full_name, u.email, s.student_id, d.code
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN departments d ON d.id = s.department_id
            WHERE u.id = ? OR s.id = ? OR u.username = ?
        """, (user_id, user_id, user_id)).fetchone()
        conn.close()
        if row:
            return {
                "student_name": row[0] or "Student",
                "student_email": row[1] or f"student_{user_id[:6]}@smartcampus.edu",
                "roll_number": row[2] or "MCA-2026-00",
                "department": row[3] or "MCA"
            }
    except Exception:
        pass
    return default_info

def _check_attendance_via_database(user_id: str) -> Optional[tuple[float, int, int, str]]:
    """Attempts to verify attendance directly from configured database URL."""
    db_url = settings.ATTENDANCE_DATABASE_URL
    if not db_url:
        return None
        
    db_file_str = db_url.replace("sqlite:///", "")
    db_path = Path(db_file_str)
    if not db_path.exists():
        return None
        
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 1. Resolve student profile and semester
        student_row = cursor.execute("""
            SELECT s.id, s.semester_id, u.full_name
            FROM users u
            JOIN students s ON s.user_id = u.id
            WHERE u.id = ? OR s.id = ? OR u.username = ?
        """, (user_id, user_id, user_id)).fetchone()
        
        if not student_row:
            # Fallback for user row query
            user_row = cursor.execute("""
                SELECT u.id, u.full_name, s.id 
                FROM users u 
                LEFT JOIN students s ON s.user_id = u.id 
                WHERE u.id = ? OR s.id = ? OR u.username = ?
            """, (user_id, user_id, user_id)).fetchone()
            if not user_row:
                conn.close()
                return None
            student_name = user_row[1] or "Student"
            resolved_student_id = user_row[2] or user_row[0]
            total = cursor.execute("SELECT COUNT(*) FROM attendance_sessions").fetchone()[0]
            present = cursor.execute("""
                SELECT COUNT(*) FROM attendance_records 
                WHERE student_id = ? AND status IN ('PRESENT', 'LATE')
            """, (resolved_student_id,)).fetchone()[0]
            conn.close()
            pct = round((present / total) * 100.0, 1) if total > 0 else 0.0
            return pct, total, present, student_name
            
        s_id, sem_id, student_name = student_row
        total = cursor.execute("""
            SELECT COUNT(*) FROM attendance_sessions
            WHERE semester_id = ?
        """, (sem_id,)).fetchone()[0]
        
        if total == 0:
            total = cursor.execute("SELECT COUNT(*) FROM attendance_sessions").fetchone()[0]

        present = cursor.execute("""
            SELECT COUNT(*) FROM attendance_records 
            WHERE student_id = ? AND status IN ('PRESENT', 'LATE')
        """, (s_id,)).fetchone()[0]
        
        conn.close()
        
        if total > 0:
            pct = round((present / total) * 100.0, 1)
            return pct, total, present, student_name or "Student"
        return 0.0, 0, 0, student_name or "Student"
    except Exception:
        return None

async def _fetch_attendance_from_service(token: str) -> Optional[tuple[float, int, int, str]]:
    """Calls Attendance Service /api/v1/student/dashboard with student's JWT token."""
    if not settings.ATTENDANCE_SERVICE_URL:
        return None
        
    url = f"{settings.ATTENDANCE_SERVICE_URL.replace('localhost', '127.0.0.1').rstrip('/')}/api/v1/student/dashboard"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code == 200:
                data = resp.json()
                pct = float(data.get("overall_percentage", 0.0))
                total = int(data.get("total_sessions", 0))
                present = int(data.get("present_count", 0)) + int(data.get("late_count", 0))
                return pct, total, present, "Verified Student"
    except Exception:
        pass
    return None

class PlacementEligibilityResponse(BaseModel):
    student_id: str
    student_name: str
    department: str
    semester: str
    attendance_percentage: float
    total_lectures: int
    attended_lectures: int
    minimum_required: float = 75.0
    is_eligible: bool
    status: str  # "ELIGIBLE" | "DEFICIT_WARNING" | "ATTENDANCE_UNAVAILABLE"
    unlocked_features: List[str]
    message: str

async def evaluate_student_eligibility(
    target_user_id: str,
    raw_token: Optional[str]
) -> PlacementEligibilityResponse:
    """Evaluates placement eligibility with fail-safe enforcement."""
    attendance_data = None
    
    # 1. Try Attendance HTTP Microservice first if token is available
    if raw_token:
        attendance_data = await _fetch_attendance_from_service(raw_token)
        
    # 2. Try configured database as local fallback
    if attendance_data is None:
        attendance_data = _check_attendance_via_database(target_user_id)
        
    # 3. Fail-safe: If attendance check could not be verified, DO NOT GRANT ELIGIBILITY
    if attendance_data is None:
        return PlacementEligibilityResponse(
            student_id=target_user_id,
            student_name="Student",
            department="Academics",
            semester="Current Semester",
            attendance_percentage=0.0,
            total_lectures=0,
            attended_lectures=0,
            minimum_required=settings.MINIMUM_ATTENDANCE_THRESHOLD,
            is_eligible=False,
            status="ATTENDANCE_UNAVAILABLE",
            unlocked_features=[],
            message="Institutional attendance verification is currently unavailable. Attendance must be verified before placement privileges can be granted."
        )
        
    pct, total, present, name = attendance_data
    min_required = settings.MINIMUM_ATTENDANCE_THRESHOLD
    is_eligible = (pct >= min_required) and (total > 0)
    
    if is_eligible:
        status_code = "ELIGIBLE"
        unlocked = [
            "ai_resume_tailoring",
            "rag_interview_coach",
            "direct_company_applications",
            "tpo_verified_transcript",
            "star_method_generator"
        ]
        msg = f"Congratulations {name}! Your attendance is {pct}%, meeting the institutional {min_required}% threshold. Placement tools and drives are active."
    else:
        status_code = "DEFICIT_WARNING"
        unlocked = []
        msg = f"Placement Locked: Current verified attendance ({pct}%) is below the mandatory {min_required}% requirement ({present}/{total} lectures attended)."
        
    return PlacementEligibilityResponse(
        student_id=target_user_id,
        student_name=name,
        department="Computer Applications (MCA)",
        semester="Semester 3",
        attendance_percentage=pct,
        total_lectures=total,
        attended_lectures=present,
        minimum_required=min_required,
        is_eligible=is_eligible,
        status=status_code,
        unlocked_features=unlocked,
        message=msg
    )

def _build_application_response(app_record: PlacementApplicationModel) -> dict:
    """Formats an application model into the standard ApplicationResponse dict."""
    drive = app_record.drive
    resume = app_record.resume
    history = [
        {
            "id": a.id,
            "application_id": a.application_id,
            "previous_status": a.previous_status,
            "old_status": a.previous_status,
            "new_status": a.new_status,
            "changed_by": a.changed_by,
            "remarks": a.remarks,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "changed_at": a.timestamp.isoformat() if a.timestamp else None
        }
        for a in (app_record.audit_logs or [])
    ]
    return {
        "id": app_record.id,
        "drive_id": app_record.drive_id,
        "drive_company_name": drive.company_name if drive else "Unknown Company",
        "drive_job_title": drive.job_title if drive else "Unknown Role",
        "drive_package_lpa": f"{drive.package_min} - {drive.package_max} LPA" if drive else "N/A",
        "drive_status": drive.status if drive else "UNKNOWN",
        "student_id": app_record.student_id,
        "student_name": app_record.student_name,
        "student_email": app_record.student_email,
        "department": app_record.department or "MCA",
        "verified_attendance": app_record.verified_attendance,
        "attendance_percentage_at_application": app_record.verified_attendance,
        "resume_id": app_record.resume_id,
        "resume_filename": resume.filename if resume else None,
        "application_status": app_record.application_status,
        "status": app_record.application_status,
        "applied_at": app_record.applied_at.isoformat() if app_record.applied_at else None,
        "updated_at": app_record.updated_at.isoformat() if app_record.updated_at else None,
        "remarks": app_record.remarks,
        "audit_history": history,
        "audits": history,
        "drive": {
            "id": drive.id if drive else app_record.drive_id,
            "company_name": drive.company_name if drive else "Campus Recruiter",
            "job_title": drive.job_title if drive else "Job Role",
            "salary_lpa": drive.package_max if drive else 0.0,
            "package_lpa": drive.package_max if drive else 0.0,
            "min_attendance_percentage": drive.minimum_attendance if drive else 75.0
        } if drive else None
    }

# ==============================================================================
# ENDPOINT 1: PLACEMENT ELIGIBILITY BRIDGE
# ==============================================================================

@router.get("/eligibility/me", response_model=PlacementEligibilityResponse)
async def get_my_placement_eligibility(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_student)
):
    """Checks verified institutional attendance eligibility for the currently logged-in student."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
    return await evaluate_student_eligibility(current_user.user_id, token)

@router.get("/eligibility/{student_id}", response_model=PlacementEligibilityResponse)
async def get_placement_eligibility_by_id(
    student_id: str,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_student)
):
    """Checks placement eligibility by student identifier. Non-admin users can only query their own verified records."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
    target_id = current_user.user_id if current_user.role != "ADMIN" else student_id
    return await evaluate_student_eligibility(target_id, token)

# ==============================================================================
# ENDPOINT 2: PLACEMENT DRIVES (STUDENT & TPO)
# ==============================================================================

@router.get("/drives")
async def list_placement_drives(
    request: Request,
    min_attendance: Optional[float] = Query(None, description="Filter drives by student attendance percentage"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (OPEN, CLOSED, ARCHIVED)"),
    search: Optional[str] = Query(None, description="Search by company or job title"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Lists placement drives.
    - Students see eligibility calculation and their application status.
    - TPO/Admin see all drives with applicant metrics.
    """
    # Seed initial drives if empty
    seed_placement_drives(db)

    query = db.query(PlacementDriveModel)
    if status_filter:
        query = query.filter(PlacementDriveModel.status == status_filter)
    elif current_user.role == "STUDENT":
        # Students default to active/open drives
        query = query.filter(PlacementDriveModel.status.in_(["OPEN", "CLOSED"]))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (PlacementDriveModel.company_name.ilike(s)) |
            (PlacementDriveModel.job_title.ilike(s))
        )

    drives = query.order_by(PlacementDriveModel.created_at.desc()).all()

    # If min_attendance filter is provided (e.g. from existing test suites)
    if min_attendance is not None:
        drives = [d for d in drives if min_attendance >= d.minimum_attendance]

    # Pre-fetch student's applications & attendance if user is a student
    student_apps = {}
    verified_att = None
    if current_user.role == "STUDENT":
        apps = db.query(PlacementApplicationModel).filter(
            PlacementApplicationModel.student_id == current_user.user_id
        ).all()
        student_apps = {a.drive_id: a for a in apps}

        # Resolve authoritative attendance
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
        eligibility = await evaluate_student_eligibility(current_user.user_id, token)
        verified_att = eligibility.attendance_percentage

    results = []
    for d in drives:
        app_count = db.query(PlacementApplicationModel).filter(
            PlacementApplicationModel.drive_id == d.id
        ).count()

        has_applied = False
        app_id = None
        app_status = None
        is_eligible = None
        eligibility_reason = None

        if current_user.role == "STUDENT":
            if d.id in student_apps:
                has_applied = True
                app_id = student_apps[d.id].id
                app_status = student_apps[d.id].application_status

            if verified_att is not None:
                is_eligible = verified_att >= d.minimum_attendance
                if is_eligible:
                    eligibility_reason = f"Verified attendance ({verified_att}%) meets requirement ({d.minimum_attendance}%)"
                else:
                    eligibility_reason = f"Attendance ({verified_att}%) is below mandatory {d.minimum_attendance}% threshold"

        results.append({
            "id": d.id,
            "company_name": d.company_name,
            "job_title": d.job_title,
            "job_description": d.job_description,
            "location": d.location,
            "employment_type": d.employment_type,
            "package_min": d.package_min,
            "package_max": d.package_max,
            "minimum_cgpa": d.minimum_cgpa,
            "minimum_attendance": d.minimum_attendance,
            "eligible_departments": d.get_departments_list(),
            "eligible_batches": d.get_batches_list(),
            "application_deadline": d.application_deadline.isoformat(),
            "status": d.status,
            "created_by": d.created_by,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
            "applicant_count": app_count,
            "is_eligible": is_eligible,
            "eligibility_reason": eligibility_reason,
            "has_applied": has_applied,
            "application_id": app_id,
            "application_status": app_status,
            # Backward-compatibility aliases for existing Phase 1-3 test fixtures
            "job_role": d.job_title,
            "package_lpa": d.package_max,
            "required_min_attendance": d.minimum_attendance,
            "deadline": d.application_deadline.strftime("%Y-%m-%d"),
            "eligibility_criteria": f"Min {d.minimum_attendance}% Attendance, {d.minimum_cgpa} CGPA"
        })

    return results

@router.get("/drives/{drive_id}")
async def get_placement_drive_detail(
    drive_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves full details of a specific placement drive."""
    drive = db.query(PlacementDriveModel).filter(PlacementDriveModel.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found.")

    app_count = db.query(PlacementApplicationModel).filter(PlacementApplicationModel.drive_id == drive.id).count()

    has_applied = False
    app_id = None
    app_status = None
    is_eligible = None
    eligibility_reason = None

    if current_user.role == "STUDENT":
        app = db.query(PlacementApplicationModel).filter(
            PlacementApplicationModel.drive_id == drive.id,
            PlacementApplicationModel.student_id == current_user.user_id
        ).first()
        if app:
            has_applied = True
            app_id = app.id
            app_status = app.application_status

        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
        eligibility = await evaluate_student_eligibility(current_user.user_id, token)
        verified_att = eligibility.attendance_percentage
        is_eligible = verified_att >= drive.minimum_attendance
        eligibility_reason = (
            f"Verified attendance ({verified_att}%) meets requirement ({drive.minimum_attendance}%)"
            if is_eligible else
            f"Attendance ({verified_att}%) is below mandatory {drive.minimum_attendance}% threshold"
        )

    return {
        "id": drive.id,
        "company_name": drive.company_name,
        "job_title": drive.job_title,
        "job_description": drive.job_description,
        "location": drive.location,
        "employment_type": drive.employment_type,
        "package_min": drive.package_min,
        "package_max": drive.package_max,
        "minimum_cgpa": drive.minimum_cgpa,
        "minimum_attendance": drive.minimum_attendance,
        "eligible_departments": drive.get_departments_list(),
        "eligible_batches": drive.get_batches_list(),
        "application_deadline": drive.application_deadline.isoformat(),
        "status": drive.status,
        "created_by": drive.created_by,
        "created_at": drive.created_at.isoformat(),
        "updated_at": drive.updated_at.isoformat(),
        "applicant_count": app_count,
        "is_eligible": is_eligible,
        "eligibility_reason": eligibility_reason,
        "has_applied": has_applied,
        "application_id": app_id,
        "application_status": app_status,
        "job_role": drive.job_title,
        "package_lpa": drive.package_max,
        "required_min_attendance": drive.minimum_attendance,
        "deadline": drive.application_deadline.strftime("%Y-%m-%d")
    }

@router.post("/drives", status_code=status.HTTP_201_CREATED)
def create_placement_drive(
    drive_data: DriveCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Creates a new campus placement drive. Protected: Only TPO and ADMIN roles."""
    drive = PlacementDriveModel(
        company_name=drive_data.company_name.strip(),
        job_title=drive_data.job_title.strip(),
        job_description=drive_data.job_description.strip(),
        location=drive_data.location,
        employment_type=drive_data.employment_type,
        package_min=drive_data.package_min,
        package_max=drive_data.package_max,
        minimum_cgpa=drive_data.minimum_cgpa,
        minimum_attendance=drive_data.minimum_attendance,
        eligible_departments=json.dumps(drive_data.eligible_departments),
        eligible_batches=json.dumps(drive_data.eligible_batches),
        application_deadline=drive_data.application_deadline,
        status=drive_data.status,
        created_by=current_user.username
    )
    db.add(drive)
    db.commit()
    db.refresh(drive)
    return {
        "id": drive.id,
        "company_name": drive.company_name,
        "job_title": drive.job_title,
        "message": "Placement drive created successfully.",
        "status": drive.status
    }

@router.put("/drives/{drive_id}")
def update_placement_drive(
    drive_id: int,
    drive_data: DriveUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Updates an existing placement drive. Protected: Only TPO and ADMIN roles."""
    drive = db.query(PlacementDriveModel).filter(PlacementDriveModel.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found.")

    if drive_data.company_name is not None:
        drive.company_name = drive_data.company_name.strip()
    if drive_data.job_title is not None:
        drive.job_title = drive_data.job_title.strip()
    if drive_data.job_description is not None:
        drive.job_description = drive_data.job_description.strip()
    if drive_data.location is not None:
        drive.location = drive_data.location
    if drive_data.employment_type is not None:
        drive.employment_type = drive_data.employment_type
    if drive_data.package_min is not None:
        drive.package_min = drive_data.package_min
    if drive_data.package_max is not None:
        if drive.package_min is not None and drive_data.package_max < drive.package_min:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="package_max cannot be less than package_min.")
        drive.package_max = drive_data.package_max
    if drive_data.minimum_cgpa is not None:
        drive.minimum_cgpa = drive_data.minimum_cgpa
    if drive_data.minimum_attendance is not None:
        drive.minimum_attendance = drive_data.minimum_attendance
    if drive_data.eligible_departments is not None:
        drive.eligible_departments = json.dumps(drive_data.eligible_departments)
    if drive_data.eligible_batches is not None:
        drive.eligible_batches = json.dumps(drive_data.eligible_batches)
    if drive_data.application_deadline is not None:
        drive.application_deadline = drive_data.application_deadline
    if drive_data.status is not None:
        drive.status = drive_data.status

    drive.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(drive)
    return {
        "id": drive.id,
        "company_name": drive.company_name,
        "job_title": drive.job_title,
        "status": drive.status,
        "message": "Placement drive updated successfully."
    }

@router.post("/drives/{drive_id}/close")
def close_placement_drive(
    drive_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Closes an active placement drive to prevent further applications."""
    drive = db.query(PlacementDriveModel).filter(PlacementDriveModel.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found.")
    drive.status = "CLOSED"
    drive.updated_at = datetime.utcnow()
    db.commit()
    return {"id": drive.id, "status": "CLOSED", "message": f"Drive {drive.company_name} is now CLOSED."}

@router.delete("/drives/{drive_id}")
def delete_placement_drive(
    drive_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Deletes a placement drive and all associated applications."""
    drive = db.query(PlacementDriveModel).filter(PlacementDriveModel.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found.")
    db.delete(drive)
    db.commit()
    return {"message": f"Drive {drive_id} deleted successfully."}

# ==============================================================================
# ENDPOINT 3: STUDENT APPLICATION SUBMISSION & WITHDRAWAL
# ==============================================================================

@router.post("/applications", status_code=status.HTTP_201_CREATED)
async def submit_placement_application(
    app_data: ApplicationSubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student_only)
):
    """
    Submits an application for a placement drive.
    Enforces:
    1. Drive existence and OPEN status
    2. Valid application deadline
    3. Resume ownership by authenticated student
    4. Authoritative attendance threshold gate
    5. One application per student per drive
    """
    # 1. Verify Drive
    drive = db.query(PlacementDriveModel).filter(PlacementDriveModel.id == app_data.drive_id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement drive not found.")

    if drive.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot apply: This placement drive is currently {drive.status}."
        )

    # Check deadline
    now = datetime.now(timezone.utc)
    deadline = drive.application_deadline if drive.application_deadline.tzinfo else drive.application_deadline.replace(tzinfo=timezone.utc)
    if deadline < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply: The application deadline for this drive has expired."
        )

    # 2. Verify Resume Ownership
    resume = db.query(ResumeModel).filter(
        ResumeModel.id == app_data.resume_id,
        ResumeModel.user_id == current_user.user_id
    ).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resume validation failed: The selected resume does not exist or does not belong to you."
        )

    # 3. Verify Authoritative Attendance Eligibility
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
    eligibility = await evaluate_student_eligibility(current_user.user_id, token)

    if eligibility.attendance_percentage < drive.minimum_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Application Ineligible: Your verified institutional attendance is {eligibility.attendance_percentage}%, "
                f"which is below the mandatory requirement of {drive.minimum_attendance}% for {drive.company_name}."
            )
        )

    # 4. Check Duplicate Application
    existing_app = db.query(PlacementApplicationModel).filter(
        PlacementApplicationModel.drive_id == drive.id,
        PlacementApplicationModel.student_id == current_user.user_id
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate application: You have already submitted an application for this placement drive."
        )

    # 5. Persist Application and Audit History in Transaction
    profile = _get_student_profile(current_user.user_id)
    new_app = PlacementApplicationModel(
        drive_id=drive.id,
        student_id=current_user.user_id,
        student_name=profile["student_name"],
        student_email=profile["student_email"],
        department=profile["department"],
        verified_attendance=eligibility.attendance_percentage,
        resume_id=resume.id,
        application_status="Applied",
        remarks=app_data.remarks
    )
    db.add(new_app)
    db.flush()

    audit = ApplicationAuditModel(
        application_id=new_app.id,
        previous_status=None,
        new_status="Applied",
        changed_by=f"{current_user.username} (STUDENT)",
        remarks="Application submitted with verified academic attendance and active resume.",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(new_app)

    return _build_application_response(new_app)

@router.get("/applications/me")
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student_only)
):
    """Lists all placement applications submitted by the logged-in student."""
    apps = db.query(PlacementApplicationModel).filter(
        PlacementApplicationModel.student_id == current_user.user_id
    ).order_by(PlacementApplicationModel.applied_at.desc()).all()

    return [_build_application_response(a) for a in apps]

@router.post("/applications/{application_id}/withdraw")
def withdraw_placement_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student_only)
):
    """Allows a student to withdraw their active application."""
    app_record = db.query(PlacementApplicationModel).filter(
        PlacementApplicationModel.id == application_id,
        PlacementApplicationModel.student_id == current_user.user_id
    ).first()
    if not app_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found or access denied.")

    if app_record.application_status in ["Selected", "Rejected", "Withdrawn"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot withdraw application with status: {app_record.application_status}."
        )

    old_status = app_record.application_status
    app_record.application_status = "Withdrawn"
    app_record.updated_at = datetime.utcnow()

    audit = ApplicationAuditModel(
        application_id=app_record.id,
        previous_status=old_status,
        new_status="Withdrawn",
        changed_by=f"{current_user.username} (STUDENT)",
        remarks="Candidate voluntarily withdrew the application.",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(app_record)

    return _build_application_response(app_record)

# ==============================================================================
# ENDPOINT 4: TPO APPLICATION REVIEW & STATUS TRANSITIONS
# ==============================================================================

@router.get("/applications")
def list_all_applications(
    drive_id: Optional[int] = Query(None, description="Filter by placement drive"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by application status"),
    department: Optional[str] = Query(None, description="Filter by student department"),
    search: Optional[str] = Query(None, description="Search by student name or roll number"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Retrieves all student applications with filters. Protected: Only TPO and ADMIN roles."""
    query = db.query(PlacementApplicationModel)

    if drive_id:
        query = query.filter(PlacementApplicationModel.drive_id == drive_id)
    if status_filter:
        query = query.filter(PlacementApplicationModel.application_status == status_filter)
    if department:
        query = query.filter(PlacementApplicationModel.department == department)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (PlacementApplicationModel.student_name.ilike(s)) |
            (PlacementApplicationModel.student_email.ilike(s))
        )

    apps = query.order_by(PlacementApplicationModel.applied_at.desc()).all()
    return [_build_application_response(a) for a in apps]

@router.get("/applications/{application_id}")
def get_application_detail(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves full application details with audit history.
    Enforces privacy: Students can only view their own applications.
    """
    app_record = db.query(PlacementApplicationModel).filter(
        PlacementApplicationModel.id == application_id
    ).first()
    if not app_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    # Cross-student isolation enforcement
    if current_user.role == "STUDENT" and app_record.student_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view other students' placement applications."
        )

    return _build_application_response(app_record)

@router.patch("/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    status_data: ApplicationStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """
    Updates the status of an application and records an immutable audit entry.
    Allowed statuses: Applied, Under Review, Shortlisted, Interview Scheduled, Selected, Rejected, Withdrawn.
    Protected: Only TPO and ADMIN roles.
    """
    app_record = db.query(PlacementApplicationModel).filter(
        PlacementApplicationModel.id == application_id
    ).first()
    if not app_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if status_data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(ALLOWED_STATUSES)}"
        )

    old_status = app_record.application_status
    app_record.application_status = status_data.status
    app_record.updated_at = datetime.utcnow()
    if status_data.remarks:
        app_record.remarks = status_data.remarks

    audit = ApplicationAuditModel(
        application_id=app_record.id,
        previous_status=old_status,
        new_status=status_data.status,
        changed_by=f"{current_user.username} ({current_user.role})",
        remarks=status_data.remarks or f"Status changed from {old_status} to {status_data.status}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(app_record)

    return _build_application_response(app_record)

# ==============================================================================
# ENDPOINT 5: PLACEMENT OVERVIEW & ANALYTICS (TPO & ADMIN)
# ==============================================================================

@router.get("/stats", response_model=PlacementStatsResponse)
def get_placement_statistics(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_tpo)
):
    """Aggregates placement drive and application statistics for TPO and Admin dashboards."""
    total_drives = db.query(PlacementDriveModel).count()
    active_drives = db.query(PlacementDriveModel).filter(PlacementDriveModel.status == "OPEN").count()
    closed_drives = db.query(PlacementDriveModel).filter(PlacementDriveModel.status == "CLOSED").count()

    total_apps = db.query(PlacementApplicationModel).count()
    shortlisted = db.query(PlacementApplicationModel).filter(PlacementApplicationModel.application_status == "Shortlisted").count()
    selected = db.query(PlacementApplicationModel).filter(PlacementApplicationModel.application_status == "Selected").count()
    rejected = db.query(PlacementApplicationModel).filter(PlacementApplicationModel.application_status == "Rejected").count()
    in_review = db.query(PlacementApplicationModel).filter(PlacementApplicationModel.application_status.in_(["Applied", "Under Review", "Interview Scheduled"])).count()

    # Department breakdown
    dept_rows = db.query(
        PlacementApplicationModel.department,
        func.count(PlacementApplicationModel.id)
    ).group_by(PlacementApplicationModel.department).all()
    dept_stats = {d or "MCA": count for d, count in dept_rows}

    # Status breakdown
    status_rows = db.query(
        PlacementApplicationModel.application_status,
        func.count(PlacementApplicationModel.id)
    ).group_by(PlacementApplicationModel.application_status).all()
    status_breakdown = {s: count for s, count in status_rows}

    return PlacementStatsResponse(
        total_drives=total_drives,
        active_drives=active_drives,
        closed_drives=closed_drives,
        total_applications=total_apps,
        shortlisted_count=shortlisted,
        selected_count=selected,
        rejected_count=rejected,
        in_review_count=in_review,
        department_stats=dept_stats,
        status_breakdown=status_breakdown
    )

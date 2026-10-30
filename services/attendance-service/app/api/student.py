from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.auth.dependencies import require_student, require_staff
from app.models.user import User, Student
from app.models.academic import Subject, Classroom, StudentEnrollment, TeacherSubject
from app.models.timetable import Timetable
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus
from app.models.notification import Notification
from app.schemas.timetable import TimetableResponse
from app.schemas.attendance import AttendanceSessionResponse, AttendanceRecordResponse
from app.schemas.report import StudentAnalyticsResponse
from app.schemas.audit import NotificationResponse
from app.services.report_service import get_student_analytics
from app.utils.timezone import utc_now

router = APIRouter(prefix="/student", tags=["Student Dashboard"])

@router.get("/attendance-summary/{student_id}", response_model=StudentAnalyticsResponse)
def get_student_attendance_summary_for_staff(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Authoritative staff/institutional endpoint for querying a student's attendance summary.
    Accessible to TPO, Teachers, and Administrators (require_staff).
    Accepts student profile UUID, user_id, or student roll number.
    """
    student = db.query(Student).filter(
        or_(
            Student.id == student_id,
            Student.user_id == student_id,
            Student.student_id == student_id
        )
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return get_student_analytics(db, student.id)

@router.get("/dashboard", response_model=StudentAnalyticsResponse)
def get_student_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return get_student_analytics(db, student.id)

@router.get("/today-classes", response_model=List[Dict[str, Any]])
def get_student_today_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student or not student.semester_id:
        return []

    now = utc_now()
    today_weekday = now.weekday()

    # 1. Fetch all currently ACTIVE sessions relevant to this student
    active_sessions_query = db.query(AttendanceSession).filter(
        AttendanceSession.semester_id == student.semester_id,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > now
    )
    if student.section_id:
        active_sessions_query = active_sessions_query.filter(
            or_(
                AttendanceSession.section_id == None,
                AttendanceSession.section_id == "",
                AttendanceSession.section_id == student.section_id
            )
        )
    active_sessions = active_sessions_query.order_by(AttendanceSession.start_time.desc()).all()

    # Fallback: if no active session matched section, check any active session in the semester
    if not active_sessions:
        active_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.semester_id == student.semester_id,
            AttendanceSession.status == SessionStatus.ACTIVE,
            AttendanceSession.expiry_time > now
        ).order_by(AttendanceSession.start_time.desc()).all()

    active_by_subject = {}
    for s in active_sessions:
        if s.subject_id not in active_by_subject:
            active_by_subject[s.subject_id] = s

    # 2. Fetch scheduled classes for today
    query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.day_of_week == today_weekday,
        Timetable.is_active == 1
    )
    if student.section_id:
        query = query.filter(Timetable.section_id == student.section_id)
    
    timetables = query.order_by(Timetable.start_time.asc()).all()

    today_classes = []
    processed_subject_ids = set()

    for tt in timetables:
        sub = tt.subject
        active_session = active_by_subject.get(tt.subject_id)

        already_marked = None
        if active_session:
            already_marked = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == active_session.id,
                AttendanceRecord.student_id == student.id
            ).first()
        else:
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            already_marked = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.subject_id == tt.subject_id,
                AttendanceRecord.marked_at >= today_start
            ).order_by(AttendanceRecord.marked_at.desc()).first()

        teacher_user = db.query(User).filter(User.id == tt.teacher.user_id).first() if tt.teacher else None

        today_classes.append({
            "timetable_id": tt.id,
            "subject_id": sub.id if sub else tt.subject_id,
            "subject_code": sub.code if sub else "",
            "subject_name": sub.name if sub else "",
            "teacher_name": teacher_user.full_name if teacher_user else "Instructor",
            "classroom_name": (active_session.classroom.name if active_session and active_session.classroom else (tt.classroom.name if tt.classroom else "")),
            "classroom_id": (active_session.classroom_id if active_session else (tt.classroom.id if tt.classroom else "")),
            "ble_identifier": (active_session.ble_identifier if active_session else (tt.classroom.ble_identifier if tt.classroom else "")),
            "active_session_token": "valid-ble-proximity-token" if active_session else None,
            "active_session_classroom_id": active_session.classroom_id if active_session else None,
            "active_session_classroom_name": active_session.classroom.name if active_session and active_session.classroom else None,
            "start_time": tt.start_time,
            "end_time": tt.end_time,
            "is_session_active": bool(active_session),
            "active_session_id": active_session.id if active_session else None,
            "already_marked": bool(already_marked),
            "marked_status": already_marked.status if already_marked else None
        })
        processed_subject_ids.add(tt.subject_id)

    # 3. If an active session is running for a subject not in today's timetable, include it!
    for act_sub_id, act_s in active_by_subject.items():
        if act_sub_id not in processed_subject_ids:
            sub = db.query(Subject).filter(Subject.id == act_sub_id).first()
            act_teacher_user = None
            if act_s.teacher:
                act_teacher_user = db.query(User).filter(User.id == act_s.teacher.user_id).first()

            already_marked = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == act_s.id,
                AttendanceRecord.student_id == student.id
            ).first()

            today_classes.append({
                "timetable_id": act_s.id,
                "subject_id": sub.id if sub else act_sub_id,
                "subject_code": sub.code if sub else "",
                "subject_name": sub.name if sub else "",
                "teacher_name": act_teacher_user.full_name if act_teacher_user else "Instructor",
                "classroom_name": act_s.classroom.name if act_s.classroom else "",
                "classroom_id": act_s.classroom_id or "",
                "ble_identifier": act_s.ble_identifier or "",
                "active_session_token": "valid-ble-proximity-token",
                "active_session_classroom_id": act_s.classroom_id,
                "active_session_classroom_name": act_s.classroom.name if act_s.classroom else None,
                "start_time": act_s.start_time.strftime("%H:%M") if act_s.start_time else "10:00",
                "end_time": act_s.expiry_time.strftime("%H:%M") if act_s.expiry_time else "11:00",
                "is_session_active": True,
                "active_session_id": act_s.id,
                "already_marked": bool(already_marked),
                "marked_status": already_marked.status if already_marked else None
            })
            processed_subject_ids.add(act_sub_id)

    # 4. If today has NO timetable (e.g. Saturday or Sunday), populate semester subjects so student can see and mark classes
    if not timetables:
        all_sem_subs = db.query(Subject).filter(Subject.semester_id == student.semester_id).all()
        for sub in all_sem_subs:
            if sub.id not in processed_subject_ids:
                ts = db.query(TeacherSubject).filter(TeacherSubject.subject_id == sub.id).first()
                t_user = db.query(User).filter(User.id == ts.teacher.user_id).first() if ts and ts.teacher else None
                first_tt = db.query(Timetable).filter(Timetable.subject_id == sub.id).first()
                classroom = first_tt.classroom if first_tt else None
                cr_name = classroom.name if classroom else "Classroom Hall"
                cr_id = classroom.id if classroom else ""
                ble_id = classroom.ble_identifier if classroom else "SMARTATTEND-MAIN"

                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                already_marked = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.subject_id == sub.id,
                    AttendanceRecord.marked_at >= today_start
                ).order_by(AttendanceRecord.marked_at.desc()).first()

                today_classes.append({
                    "timetable_id": sub.id,
                    "subject_id": sub.id,
                    "subject_code": sub.code,
                    "subject_name": sub.name,
                    "teacher_name": t_user.full_name if t_user else (first_tt.teacher.user.full_name if first_tt and first_tt.teacher and first_tt.teacher.user else "Instructor"),
                    "classroom_name": cr_name,
                    "classroom_id": cr_id,
                    "ble_identifier": ble_id,
                    "active_session_token": None,
                    "active_session_classroom_id": None,
                    "active_session_classroom_name": None,
                    "start_time": first_tt.start_time if first_tt else "10:00",
                    "end_time": first_tt.end_time if first_tt else "11:00",
                    "is_session_active": False,
                    "active_session_id": None,
                    "already_marked": bool(already_marked),
                    "marked_status": already_marked.status if already_marked else None
                })
                processed_subject_ids.add(sub.id)

    # 5. Sort: Unmarked active classes first, then marked active classes, then by start_time
    def sort_key(c):
        if c["is_session_active"] and not c["already_marked"]:
            return (0, c["start_time"])
        if c["is_session_active"]:
            return (1, c["start_time"])
        return (2, c["start_time"])

    today_classes.sort(key=sort_key)
    return today_classes

@router.get("/schedule", response_model=List[TimetableResponse])
def get_student_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student or not student.semester_id:
        return []
    
    query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.is_active == 1
    )
    if student.section_id:
        query = query.filter(Timetable.section_id == student.section_id)
    return query.order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

@router.get("/notifications", response_model=List[NotificationResponse])
def get_student_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = 1
        db.commit()
    return {"message": "Notification marked as read"}

@router.get("/offline-bundle")
def get_student_offline_bundle(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """
    Supplies the student mobile app with a complete cacheable snapshot of their
    enrolled courses, weekly timetable, and classroom beacon configurations for offline operations.
    """
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Enrolled subjects
    enrollments = db.query(StudentEnrollment).filter(StudentEnrollment.student_id == student.id).all()
    subject_ids = [e.subject_id for e in enrollments]
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all() if subject_ids else []

    # Weekly Timetable
    timetable_query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.is_active == 1
    )
    if student.section_id:
        timetable_query = timetable_query.filter(Timetable.section_id == student.section_id)
    timetables = timetable_query.order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

    # Classrooms
    classrooms = db.query(Classroom).all()

    # Active Sessions for this student's subjects
    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.subject_id.in_(subject_ids) if subject_ids else False,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > utc_now()
    ).all()

    return {
        "sync_time": utc_now().isoformat(),
        "student": {
            "id": student.id,
            "user_id": current_user.id,
            "roll_number": student.student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else None,
            "semester_id": student.semester_id,
            "semester_number": student.semester.number if student.semester else None,
            "section_id": student.section_id,
            "section_name": student.section.name if student.section else None
        },
        "subjects": [
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "credits": s.credits
            } for s in subjects
        ],
        "timetable": [
            {
                "id": tt.id,
                "subject_id": tt.subject_id,
                "subject_code": tt.subject.code if tt.subject else "",
                "subject_name": tt.subject.name if tt.subject else "",
                "classroom_id": tt.classroom_id,
                "classroom_name": tt.classroom.name if tt.classroom else "",
                "ble_identifier": tt.classroom.ble_identifier if tt.classroom else "",
                "day_of_week": tt.day_of_week,
                "start_time": tt.start_time,
                "end_time": tt.end_time
            } for tt in timetables
        ],
        "classrooms": [
            {
                "id": c.id,
                "name": c.name,
                "building": c.building,
                "room_number": c.room_number,
                "ble_identifier": c.ble_identifier
            } for c in classrooms
        ],
        "active_sessions": [
            {
                "id": s.id,
                "subject_id": s.subject_id,
                "classroom_id": s.classroom_id,
                "ble_identifier": s.ble_identifier,
                "expiry_time": s.expiry_time.isoformat(),
                "duration_minutes": s.duration_minutes,
                "rssi_threshold": s.rssi_threshold
            } for s in active_sessions
        ]
    }

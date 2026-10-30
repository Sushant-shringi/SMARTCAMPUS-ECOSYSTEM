"""
Database Models (SQLAlchemy ORM)
Stores metadata for uploaded resumes, analyzed job descriptions,
matching reports, and generated interview questions with student user isolation.
"""
from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class ResumeModel(Base):
    """
    Stores uploaded resume text, metadata, and extracted skill list,
    isolated per authenticated student user.
    """
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True, default="default_student")
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    raw_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=False)
    extracted_skills = Column(Text, default="[]")  # JSON encoded list of strings
    total_chunks = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    analyses = relationship("AnalysisModel", back_populates="resume", cascade="all, delete-orphan")
    interview_questions = relationship("InterviewQuestionModel", back_populates="resume", cascade="all, delete-orphan")

    def get_skills_list(self) -> list[str]:
        try:
            return json.loads(self.extracted_skills)
        except Exception:
            return []

class JobDescriptionModel(Base):
    """
    Stores job description postings entered by the user.
    """
    __tablename__ = "job_descriptions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Position")
    company = Column(String(255), nullable=False, default="Not Specified")
    description = Column(Text, nullable=False)
    extracted_skills = Column(Text, default="[]")  # JSON encoded list
    created_at = Column(DateTime, default=datetime.utcnow)
    
    analyses = relationship("AnalysisModel", back_populates="job_description", cascade="all, delete-orphan")

    def get_skills_list(self) -> list[str]:
        try:
            return json.loads(self.extracted_skills)
        except Exception:
            return []

class AnalysisModel(Base):
    """
    Stores deterministic and LLM-assisted resume vs JD match results.
    """
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=True)
    
    matching_skills = Column(Text, default="[]")  # JSON list
    missing_skills = Column(Text, default="[]")   # JSON list
    match_percentage = Column(Float, default=0.0)
    relevant_projects = Column(Text, default="[]")  # JSON list
    suggestions = Column(Text, default="")         # Detailed LLM suggestions
    created_at = Column(DateTime, default=datetime.utcnow)
    
    resume = relationship("ResumeModel", back_populates="analyses")
    job_description = relationship("JobDescriptionModel", back_populates="analyses")

class InterviewQuestionModel(Base):
    """
    Stores interview questions generated for a resume and job description.
    """
    __tablename__ = "interview_questions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True)
    
    question = Column(Text, nullable=False)
    category = Column(String(100), default="Technical")
    difficulty = Column(String(50), default="Medium")
    sample_answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    resume = relationship("ResumeModel", back_populates="interview_questions")

class PlacementDriveModel(Base):
    """
    Stores campus placement drives registered by TPO / Training and Placement Cell.
    """
    __tablename__ = "placement_drives"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    job_title = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=False)
    location = Column(String(255), default="Bangalore / Hybrid")
    employment_type = Column(String(100), default="Full-time")
    package_min = Column(Float, nullable=False)  # LPA
    package_max = Column(Float, nullable=False)  # LPA
    minimum_cgpa = Column(Float, default=0.0)
    minimum_attendance = Column(Float, default=75.0)  # Mandatory academic gate
    eligible_departments = Column(Text, default="[]")  # JSON list, e.g. ["MCA", "CSE"]
    eligible_batches = Column(Text, default="[]")  # JSON list, e.g. ["2026", "2027"]
    application_deadline = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default="OPEN", index=True)  # OPEN, CLOSED, ARCHIVED
    created_by = Column(String(64), nullable=False)  # User ID of TPO / Admin
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    applications = relationship("PlacementApplicationModel", back_populates="drive", cascade="all, delete-orphan")

    def get_departments_list(self) -> list[str]:
        try:
            return json.loads(self.eligible_departments)
        except Exception:
            return []

    def get_batches_list(self) -> list[str]:
        try:
            return json.loads(self.eligible_batches)
        except Exception:
            return []

class PlacementApplicationModel(Base):
    """
    Stores student applications for campus placement drives with verified academic gate snapshots.
    """
    __tablename__ = "placement_applications"
    __table_args__ = (
        UniqueConstraint("drive_id", "student_id", name="uq_drive_student_application"),
    )
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drive_id = Column(Integer, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(64), nullable=False, index=True)  # User ID of student
    student_name = Column(String(255), nullable=False)
    student_email = Column(String(255), nullable=False)
    department = Column(String(100), default="MCA")
    verified_attendance = Column(Float, nullable=False)  # Attendance percentage at application time
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True)
    application_status = Column(String(50), default="Applied", index=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    remarks = Column(Text, nullable=True)
    
    # Relationships
    drive = relationship("PlacementDriveModel", back_populates="applications")
    resume = relationship("ResumeModel")
    audit_logs = relationship("ApplicationAuditModel", back_populates="application", cascade="all, delete-orphan", order_by="ApplicationAuditModel.timestamp.desc()")

class ApplicationAuditModel(Base):
    """
    Immutable audit trail recording all placement application status transitions.
    """
    __tablename__ = "application_audits"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("placement_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(String(100), nullable=False)  # User ID or Name (Role)
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    application = relationship("PlacementApplicationModel", back_populates="audit_logs")

"""
Pydantic Schemas for Placement Management System (Drives, Applications, Audits, Statistics)
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator

ALLOWED_STATUSES = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview Scheduled",
    "Selected",
    "Rejected",
    "Withdrawn"
]

class DriveCreateRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255, description="Hiring company name")
    job_title: str = Field(..., min_length=2, max_length=255, description="Role title")
    job_description: str = Field(..., min_length=10, description="Full job description and criteria")
    location: str = Field(default="Bangalore / Hybrid", max_length=255)
    employment_type: str = Field(default="Full-time", description="Full-time, Internship, FTE")
    package_min: float = Field(..., ge=0.0, description="Minimum salary package in LPA")
    package_max: float = Field(..., ge=0.0, description="Maximum salary package in LPA")
    minimum_cgpa: float = Field(default=0.0, ge=0.0, le=10.0, description="Minimum CGPA required")
    minimum_attendance: float = Field(default=75.0, ge=0.0, le=100.0, description="Minimum attendance required (%)")
    eligible_departments: List[str] = Field(default=["MCA", "CSE"], description="Eligible academic departments")
    eligible_batches: List[str] = Field(default=["2026", "2027"], description="Eligible graduating batches")
    application_deadline: datetime = Field(..., description="Application submission deadline")
    status: str = Field(default="OPEN", description="OPEN, CLOSED, ARCHIVED")

    @model_validator(mode="before")
    @classmethod
    def populate_alias_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "salary_lpa" in data:
                val = float(data["salary_lpa"])
                data.setdefault("package_min", val)
                data.setdefault("package_max", val)
            if "min_attendance_percentage" in data:
                data.setdefault("minimum_attendance", float(data["min_attendance_percentage"]))
            if "deadline" in data:
                d_str = str(data["deadline"])
                data.setdefault("application_deadline", f"{d_str}T23:59:59Z" if "T" not in d_str else d_str)
        return data

    @field_validator("package_max")
    @classmethod
    def validate_salary_range(cls, v: float, info) -> float:
        min_pkg = info.data.get("package_min")
        if min_pkg is not None and v < min_pkg:
            raise ValueError(f"package_max ({v}) cannot be less than package_min ({min_pkg})")
        return v

    @field_validator("application_deadline")
    @classmethod
    def validate_future_deadline(cls, v: datetime) -> datetime:
        # Normalize timezone for comparison
        now = datetime.now(timezone.utc)
        target = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if target <= now:
            raise ValueError("Application deadline must be set in the future.")
        return v

class DriveUpdateRequest(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def populate_alias_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "salary_lpa" in data:
                val = float(data["salary_lpa"])
                data.setdefault("package_min", val)
                data.setdefault("package_max", val)
            if "min_attendance_percentage" in data:
                data.setdefault("minimum_attendance", float(data["min_attendance_percentage"]))
            if "deadline" in data:
                d_str = str(data["deadline"])
                data.setdefault("application_deadline", f"{d_str}T23:59:59Z" if "T" not in d_str else d_str)
        return data

    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    job_title: Optional[str] = Field(None, min_length=2, max_length=255)
    job_description: Optional[str] = Field(None, min_length=10)
    location: Optional[str] = None
    employment_type: Optional[str] = None
    package_min: Optional[float] = Field(None, ge=0.0)
    package_max: Optional[float] = Field(None, ge=0.0)
    minimum_cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    minimum_attendance: Optional[float] = Field(None, ge=0.0, le=100.0)
    eligible_departments: Optional[List[str]] = None
    eligible_batches: Optional[List[str]] = None
    application_deadline: Optional[datetime] = None
    status: Optional[str] = Field(None, description="OPEN, CLOSED, ARCHIVED")

class DriveResponse(BaseModel):
    id: int
    company_name: str
    job_title: str
    job_description: str
    location: str
    employment_type: str
    package_min: float
    package_max: float
    minimum_cgpa: float
    minimum_attendance: float
    eligible_departments: List[str]
    eligible_batches: List[str]
    application_deadline: datetime
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    applicant_count: int = 0
    is_eligible: Optional[bool] = None
    eligibility_reason: Optional[str] = None
    has_applied: bool = False
    application_id: Optional[int] = None
    application_status: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationSubmitRequest(BaseModel):
    drive_id: int
    resume_id: int
    remarks: Optional[str] = Field(None, max_length=500)

class ApplicationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Applied, Under Review, Shortlisted, Interview Scheduled, Selected, Rejected, Withdrawn")
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed values are: {', '.join(ALLOWED_STATUSES)}")
        return v

class ApplicationAuditResponse(BaseModel):
    id: int
    application_id: int
    previous_status: Optional[str]
    new_status: str
    changed_by: str
    remarks: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    drive_id: int
    drive_company_name: str
    drive_job_title: str
    drive_package_lpa: str
    drive_status: str
    student_id: str
    student_name: str
    student_email: str
    department: str
    verified_attendance: float
    resume_id: Optional[int]
    resume_filename: Optional[str]
    application_status: str
    applied_at: datetime
    updated_at: datetime
    remarks: Optional[str]
    audit_history: List[ApplicationAuditResponse] = []

    class Config:
        from_attributes = True

class PlacementStatsResponse(BaseModel):
    total_drives: int
    active_drives: int
    closed_drives: int
    total_applications: int
    shortlisted_count: int
    selected_count: int
    rejected_count: int
    in_review_count: int
    department_stats: Dict[str, int]
    status_breakdown: Dict[str, int]

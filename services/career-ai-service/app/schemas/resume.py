"""
Pydantic Schemas for Resume APIs
"""
from datetime import datetime
from pydantic import BaseModel, Field

class ResumeSummary(BaseModel):
    id: int
    filename: str
    extracted_skills: list[str]
    total_chunks: int
    created_at: datetime

    class Config:
        from_attributes = True

class ResumeDetail(ResumeSummary):
    raw_text: str
    cleaned_text: str

class ResumeUploadResponse(BaseModel):
    id: int
    filename: str
    message: str
    extracted_skills: list[str]
    total_chunks: int

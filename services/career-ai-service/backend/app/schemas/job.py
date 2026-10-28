"""
Pydantic Schemas for Job Description and Matching APIs
"""
from datetime import datetime
from pydantic import BaseModel, Field

class JobDescriptionCreate(BaseModel):
    title: str = Field(default="Data Engineer / AI Engineer", description="Job Title")
    company: str = Field(default="Tech Corp", description="Company Name")
    description: str = Field(..., min_length=10, description="Full Job Description text")

class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    company: str
    description: str
    extracted_skills: list[str]
    created_at: datetime

    class Config:
        from_attributes = True

class MatchRequest(BaseModel):
    resume_id: int
    job_description_id: int | None = None
    custom_job_text: str | None = None

class MatchResponse(BaseModel):
    resume_id: int
    job_title: str
    match_percentage: float
    matching_skills: list[str]
    missing_skills: list[str]
    relevant_projects: list[str]
    suggestions: list[str]
    llm_analysis: str

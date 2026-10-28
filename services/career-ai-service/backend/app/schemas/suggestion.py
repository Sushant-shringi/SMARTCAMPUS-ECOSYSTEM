"""
Pydantic Schemas for Resume Improvement Suggestions
"""
from pydantic import BaseModel, Field

class SuggestionItem(BaseModel):
    category: str
    issue: str
    recommendation: str
    example: str | None = None

class ResumeReviewResponse(BaseModel):
    resume_id: int
    score_estimate: int
    strengths: list[str]
    suggestions: list[SuggestionItem]

class ImproveBulletRequest(BaseModel):
    original_bullet: str = Field(..., min_length=5, description="Original resume bullet point")
    role_or_domain: str = Field(default="Data / AI", description="Target domain or job role")

class ImproveBulletResponse(BaseModel):
    original_bullet: str
    improved_bullet: str
    key_changes: list[str]

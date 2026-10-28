"""
Pydantic Schemas for Interview Question Generation
"""
from pydantic import BaseModel, Field

class InterviewGenerateRequest(BaseModel):
    resume_id: int
    job_description_id: int | None = None
    custom_job_text: str | None = None
    categories: list[str] = Field(
        default=["Technical", "Project-based", "Python", "SQL", "Data Engineering", "Behavioral"],
        description="Interview question categories to generate"
    )

class InterviewQuestionItem(BaseModel):
    id: int | None = None
    category: str
    difficulty: str
    question: str
    context_hint: str | None = None
    sample_answer: str | None = None

class InterviewGenerateResponse(BaseModel):
    resume_id: int
    questions: list[InterviewQuestionItem]

class InterviewAnswerRequest(BaseModel):
    resume_id: int
    question: str
    category: str | None = "Technical"

class InterviewAnswerResponse(BaseModel):
    question: str
    sample_answer: str
    source_chunks: list[str]

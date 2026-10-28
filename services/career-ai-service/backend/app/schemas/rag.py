"""
Pydantic Schemas for RAG Resume Chat
"""
from pydantic import BaseModel, Field

class SourceChunk(BaseModel):
    chunk_id: int
    text: str
    similarity_score: float

class RagChatRequest(BaseModel):
    resume_id: int
    question: str = Field(..., min_length=2, description="Question about the candidate's resume")

class RagChatResponse(BaseModel):
    resume_id: int
    question: str
    answer: str
    sources: list[SourceChunk]
    llm_provider: str

"""
RAG Resume Chat API Endpoint
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ResumeModel
from backend.app.schemas.rag import RagChatRequest, RagChatResponse, SourceChunk
from backend.app.services.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["RAG Chat"])

@router.post("/chat", response_model=RagChatResponse)
def chat_with_resume(
    request: RagChatRequest,
    db: Session = Depends(get_db)
):
    """
    Answers questions about a candidate's resume using local RAG:
    Embeds query -> Retrieves nearest resume chunks -> Grounds LLM answer.
    """
    resume = db.query(ResumeModel).filter(ResumeModel.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    if not request.question.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    answer, source_chunks, provider_name = rag_service.answer_question(
        resume_id=resume.id,
        question=request.question
    )

    formatted_sources = [
        SourceChunk(
            chunk_id=c.get("chunk_id", 0),
            text=c.get("text", ""),
            similarity_score=c.get("similarity_score", 0.0)
        )
        for c in source_chunks
    ]

    return RagChatResponse(
        resume_id=resume.id,
        question=request.question,
        answer=answer,
        sources=formatted_sources,
        llm_provider=provider_name
    )

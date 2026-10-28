"""
Interview Prep API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ResumeModel, JobDescriptionModel, InterviewQuestionModel
from backend.app.schemas.interview import (
    InterviewGenerateRequest, InterviewGenerateResponse, InterviewQuestionItem,
    InterviewAnswerRequest, InterviewAnswerResponse
)
from backend.app.services.interview_service import interview_service

router = APIRouter(prefix="/interview", tags=["Interview Prep"])

@router.post("/generate", response_model=InterviewGenerateResponse)
def generate_interview_questions(
    request: InterviewGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generates realistic technical, project-based, and behavioral interview questions
    tailored to the candidate's resume projects and target role.
    """
    resume = db.query(ResumeModel).filter(ResumeModel.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    job_context = ""
    if request.job_description_id:
        jd = db.query(JobDescriptionModel).filter(JobDescriptionModel.id == request.job_description_id).first()
        if jd:
            job_context = f"Role: {jd.title} at {jd.company}\nDescription: {jd.description[:500]}"
    elif request.custom_job_text:
        job_context = request.custom_job_text[:500]

    raw_questions = interview_service.generate_questions(
        resume_id=resume.id,
        resume_text=resume.cleaned_text,
        job_context=job_context
    )

    result_items = []
    for q in raw_questions:
        q_obj = InterviewQuestionModel(
            resume_id=resume.id,
            job_description_id=request.job_description_id,
            question=q.get("question", ""),
            category=q.get("category", "Technical"),
            difficulty=q.get("difficulty", "Medium")
        )
        db.add(q_obj)
        db.commit()
        db.refresh(q_obj)

        result_items.append(InterviewQuestionItem(
            id=q_obj.id,
            category=q_obj.category,
            difficulty=q_obj.difficulty,
            question=q_obj.question,
            context_hint=q.get("context_hint", "")
        ))

    return InterviewGenerateResponse(
        resume_id=resume.id,
        questions=result_items
    )

@router.post("/answer", response_model=InterviewAnswerResponse)
def generate_sample_answer(
    request: InterviewAnswerRequest,
    db: Session = Depends(get_db)
):
    """
    Generates a high-quality STAR method answer for a specific interview question,
    grounded in the candidate's actual resume projects.
    """
    resume = db.query(ResumeModel).filter(ResumeModel.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    answer, source_chunks = interview_service.generate_answer(
        resume_id=resume.id,
        question=request.question,
        category=request.category or "Technical"
    )

    return InterviewAnswerResponse(
        question=request.question,
        sample_answer=answer,
        source_chunks=source_chunks
    )

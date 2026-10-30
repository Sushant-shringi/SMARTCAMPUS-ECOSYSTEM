"""
Interview Prep API Endpoints with Student Data Isolation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from app.database.session import get_db
    from app.database.models import ResumeModel, JobDescriptionModel, InterviewQuestionModel
    from app.schemas.interview import (
        InterviewGenerateRequest, InterviewGenerateResponse, InterviewQuestionItem,
        InterviewAnswerRequest, InterviewAnswerResponse
    )
    from app.services.interview_service import interview_service
    from app.auth.dependencies import require_student, AuthenticatedUser
except ImportError:
    from backend.app.database.session import get_db
    from backend.app.database.models import ResumeModel, JobDescriptionModel, InterviewQuestionModel
    from backend.app.schemas.interview import (
        InterviewGenerateRequest, InterviewGenerateResponse, InterviewQuestionItem,
        InterviewAnswerRequest, InterviewAnswerResponse
    )
    from backend.app.services.interview_service import interview_service
    from backend.app.auth.dependencies import require_student, AuthenticatedUser

router = APIRouter(prefix="/interview", tags=["Interview Prep"])

@router.post("/generate", response_model=InterviewGenerateResponse)
def generate_interview_questions(
    request: InterviewGenerateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Generates realistic interview questions tailored to the candidate's resume,
    enforcing that the student owns the requested resume.
    """
    resume = db.query(ResumeModel).filter(
        ResumeModel.id == request.resume_id,
        ResumeModel.user_id == current_user.user_id
    ).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")

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
            question=q_obj.question,
            category=q_obj.category,
            difficulty=q_obj.difficulty
        ))

    return InterviewGenerateResponse(
        resume_id=resume.id,
        questions=result_items
    )

@router.post("/answer", response_model=InterviewAnswerResponse)
def generate_sample_answer(
    request: InterviewAnswerRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Generates STAR-method structured interview answers using the student's resume context.
    """
    resume = db.query(ResumeModel).filter(
        ResumeModel.id == request.resume_id,
        ResumeModel.user_id == current_user.user_id
    ).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")

    answer_data = interview_service.generate_star_answer(
        resume_id=resume.id,
        question=request.question,
        category=request.category
    )

    return InterviewAnswerResponse(
        question=request.question,
        sample_answer=answer_data.get("sample_answer", answer_data.get("star_answer", "")),
        star_answer=answer_data.get("star_answer", ""),
        source_chunks=answer_data.get("source_chunks", []),
        talking_points=answer_data.get("talking_points", []),
        suggested_metric=answer_data.get("suggested_metric")
    )

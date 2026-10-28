"""
Resume Improvement Suggestions API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ResumeModel
from backend.app.schemas.suggestion import (
    ResumeReviewResponse, ImproveBulletRequest, ImproveBulletResponse
)
from backend.app.services.suggestion_service import suggestion_service

router = APIRouter(prefix="/suggestions", tags=["Resume Suggestions"])

@router.get("/review/{resume_id}", response_model=ResumeReviewResponse)
def review_resume(resume_id: int, db: Session = Depends(get_db)):
    """
    Evaluates resume text for missing metrics, weak verbs, and unevidenced skills.
    """
    resume = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    review_data = suggestion_service.review_resume(
        resume_id=resume.id,
        resume_text=resume.cleaned_text
    )

    return ResumeReviewResponse(**review_data)

@router.post("/improve-bullet", response_model=ImproveBulletResponse)
def improve_bullet_point(request: ImproveBulletRequest):
    """
    Rewrites a resume bullet point using Google's XYZ formula.
    """
    result = suggestion_service.improve_bullet_point(
        original_bullet=request.original_bullet,
        domain=request.role_or_domain
    )
    return ImproveBulletResponse(**result)

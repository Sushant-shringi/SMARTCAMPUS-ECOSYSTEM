"""
Resume Improvement Suggestions API Endpoints with Student Data Isolation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from app.database.session import get_db
    from app.database.models import ResumeModel
    from app.schemas.suggestion import (
        ResumeReviewResponse, ImproveBulletRequest, ImproveBulletResponse
    )
    from app.services.suggestion_service import suggestion_service
    from app.auth.dependencies import require_student, AuthenticatedUser
except ImportError:
    from backend.app.database.session import get_db
    from backend.app.database.models import ResumeModel
    from backend.app.schemas.suggestion import (
        ResumeReviewResponse, ImproveBulletRequest, ImproveBulletResponse
    )
    from backend.app.services.suggestion_service import suggestion_service
    from backend.app.auth.dependencies import require_student, AuthenticatedUser

router = APIRouter(prefix="/suggestions", tags=["Resume Suggestions"])

@router.get("/review/{resume_id}", response_model=ResumeReviewResponse)
def review_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Evaluates resume text for missing metrics, weak verbs, and unevidenced skills,
    strictly restricted to the authenticated student who owns this resume.
    """
    resume = db.query(ResumeModel).filter(
        ResumeModel.id == resume_id,
        ResumeModel.user_id == current_user.user_id
    ).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")

    review_data = suggestion_service.review_resume(
        resume_id=resume.id,
        resume_text=resume.cleaned_text
    )

    return ResumeReviewResponse(**review_data)

@router.post("/improve-bullet", response_model=ImproveBulletResponse)
def improve_bullet_point(
    request: ImproveBulletRequest,
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Rewrites a resume bullet point using Google's XYZ formula.
    """
    result = suggestion_service.improve_bullet_point(
        original_bullet=request.original_bullet,
        domain=request.role_or_domain
    )
    return ImproveBulletResponse(**result)

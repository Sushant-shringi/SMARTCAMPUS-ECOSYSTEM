"""
Job Description & Match Analysis API Endpoints with Student Data Isolation
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from app.database.session import get_db
    from app.database.models import ResumeModel, JobDescriptionModel, AnalysisModel
    from app.schemas.job import (
        JobDescriptionCreate, JobDescriptionResponse,
        MatchRequest, MatchResponse
    )
    from app.services.skill_extractor import extract_skills_from_text
    from app.services.job_matcher import job_matcher
    from app.auth.dependencies import require_student, AuthenticatedUser
except ImportError:
    from backend.app.database.session import get_db
    from backend.app.database.models import ResumeModel, JobDescriptionModel, AnalysisModel
    from backend.app.schemas.job import (
        JobDescriptionCreate, JobDescriptionResponse,
        MatchRequest, MatchResponse
    )
    from backend.app.services.skill_extractor import extract_skills_from_text
    from backend.app.services.job_matcher import job_matcher
    from backend.app.auth.dependencies import require_student, AuthenticatedUser

router = APIRouter(prefix="/jobs", tags=["Job Description & Matching"])

@router.post("/analyze", response_model=JobDescriptionResponse)
def analyze_job_description(
    job_in: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Extracts skills and requirements from a Job Description.
    """
    if not job_in.description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description text cannot be empty.")

    extracted_skills = extract_skills_from_text(job_in.description)
    
    job = JobDescriptionModel(
        user_id=current_user.user_id,
        title=job_in.title,
        company=job_in.company,
        description=job_in.description,
        extracted_skills=json.dumps(extracted_skills)
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return JobDescriptionResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        description=job.description,
        extracted_skills=extracted_skills,
        created_at=job.created_at
    )

@router.post("/match", response_model=MatchResponse)
def match_resume_with_job(
    request: MatchRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_student)
):
    """
    Runs deterministic skill comparison + vector project matching + LLM analysis
    between an authenticated student's resume and a job description.
    """
    resume = db.query(ResumeModel).filter(
        ResumeModel.id == request.resume_id,
        ResumeModel.user_id == current_user.user_id
    ).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found or access denied.")

    job_text = ""
    job_desc_id = None
    if request.job_description_id:
        jd = db.query(JobDescriptionModel).filter(JobDescriptionModel.id == request.job_description_id).first()
        if not jd:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found.")
        job_text = jd.description
        job_desc_id = jd.id
    elif request.custom_job_text:
        job_text = request.custom_job_text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either job_description_id or custom_job_text must be provided."
        )

    # Execute match analysis
    match_result = job_matcher.match(
        resume_id=resume.id,
        resume_text=resume.cleaned_text,
        resume_skills=resume.get_skills_list(),
        job_text=job_text
    )

    # Persist analysis result
    analysis = AnalysisModel(
        resume_id=resume.id,
        job_description_id=job_desc_id,
        matching_skills=json.dumps(match_result["matching_skills"]),
        missing_skills=json.dumps(match_result["missing_skills"]),
        match_percentage=match_result["match_percentage"],
        relevant_projects=json.dumps(match_result["relevant_projects"]),
        suggestions=match_result["suggestions"]
    )
    db.add(analysis)
    db.commit()

    return MatchResponse(
        resume_id=resume.id,
        job_description_id=job_desc_id,
        matching_skills=match_result["matching_skills"],
        missing_skills=match_result["missing_skills"],
        match_percentage=match_result["match_percentage"],
        relevant_projects=match_result["relevant_projects"],
        suggestions=match_result["suggestions"],
        deterministic_score=match_result.get("deterministic_score", 0.0),
        semantic_score=match_result.get("semantic_score", 0.0)
    )

"""
Job Description & Match Analysis API Endpoints
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ResumeModel, JobDescriptionModel, AnalysisModel
from backend.app.schemas.job import (
    JobDescriptionCreate, JobDescriptionResponse,
    MatchRequest, MatchResponse
)
from backend.app.services.skill_extractor import extract_skills_from_text
from backend.app.services.job_matcher import job_matcher

router = APIRouter(prefix="/jobs", tags=["Job Description & Matching"])

@router.post("/analyze", response_model=JobDescriptionResponse)
def analyze_job_description(
    job_in: JobDescriptionCreate,
    db: Session = Depends(get_db)
):
    """
    Extracts skills and requirements from a Job Description.
    """
    if not job_in.description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description text cannot be empty.")

    extracted_skills = extract_skills_from_text(job_in.description)
    
    job = JobDescriptionModel(
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
    db: Session = Depends(get_db)
):
    """
    Runs deterministic skill comparison + vector project matching + LLM analysis
    between an uploaded resume and a job description.
    """
    resume = db.query(ResumeModel).filter(ResumeModel.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    # Determine job description text and title
    if request.job_description_id:
        jd_obj = db.query(JobDescriptionModel).filter(JobDescriptionModel.id == request.job_description_id).first()
        if not jd_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found.")
        job_text = jd_obj.description
        job_title = f"{jd_obj.title} ({jd_obj.company})"
    elif request.custom_job_text:
        job_text = request.custom_job_text
        job_title = "Custom Job Description"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either job_description_id or custom_job_text must be provided."
        )

    analysis_res = job_matcher.match_resume_to_jd(
        resume_id=resume.id,
        resume_text=resume.cleaned_text,
        resume_skills=resume.get_skills_list(),
        job_description=job_text
    )

    # Persist analysis
    analysis_entry = AnalysisModel(
        resume_id=resume.id,
        job_description_id=request.job_description_id,
        matching_skills=json.dumps(analysis_res["matching_skills"]),
        missing_skills=json.dumps(analysis_res["missing_skills"]),
        match_percentage=analysis_res["match_percentage"],
        relevant_projects=json.dumps(analysis_res["relevant_projects"]),
        suggestions=analysis_res["llm_analysis"]
    )
    db.add(analysis_entry)
    db.commit()

    return MatchResponse(
        resume_id=resume.id,
        job_title=job_title,
        match_percentage=analysis_res["match_percentage"],
        matching_skills=analysis_res["matching_skills"],
        missing_skills=analysis_res["missing_skills"],
        relevant_projects=analysis_res["relevant_projects"],
        suggestions=analysis_res["suggestions"],
        llm_analysis=analysis_res["llm_analysis"]
    )

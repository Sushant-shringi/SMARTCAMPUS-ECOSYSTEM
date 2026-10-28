"""
Database Models (SQLAlchemy ORM)
Stores metadata for uploaded resumes, analyzed job descriptions,
matching reports, and generated interview questions.
"""
from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class ResumeModel(Base):
    """
    Stores uploaded resume text, metadata, and extracted skill list.
    """
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    raw_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=False)
    extracted_skills = Column(Text, default="[]")  # JSON encoded list of strings
    total_chunks = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    analyses = relationship("AnalysisModel", back_populates="resume", cascade="all, delete-orphan")
    interview_questions = relationship("InterviewQuestionModel", back_populates="resume", cascade="all, delete-orphan")

    def get_skills_list(self) -> list[str]:
        try:
            return json.loads(self.extracted_skills)
        except Exception:
            return []

class JobDescriptionModel(Base):
    """
    Stores job description postings entered by the user.
    """
    __tablename__ = "job_descriptions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, default="Untitled Position")
    company = Column(String(255), nullable=False, default="Not Specified")
    description = Column(Text, nullable=False)
    extracted_skills = Column(Text, default="[]")  # JSON encoded list
    created_at = Column(DateTime, default=datetime.utcnow)
    
    analyses = relationship("AnalysisModel", back_populates="job_description", cascade="all, delete-orphan")

    def get_skills_list(self) -> list[str]:
        try:
            return json.loads(self.extracted_skills)
        except Exception:
            return []

class AnalysisModel(Base):
    """
    Stores deterministic and LLM-assisted resume vs JD match results.
    """
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=True)
    
    matching_skills = Column(Text, default="[]")  # JSON list
    missing_skills = Column(Text, default="[]")   # JSON list
    match_percentage = Column(Float, default=0.0)
    relevant_projects = Column(Text, default="[]")  # JSON list
    suggestions = Column(Text, default="")         # Detailed LLM suggestions
    created_at = Column(DateTime, default=datetime.utcnow)
    
    resume = relationship("ResumeModel", back_populates="analyses")
    job_description = relationship("JobDescriptionModel", back_populates="analyses")

class InterviewQuestionModel(Base):
    """
    Stores interview questions generated for a resume and job description.
    """
    __tablename__ = "interview_questions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True)
    
    question = Column(Text, nullable=False)
    category = Column(String(100), default="Technical")
    difficulty = Column(String(50), default="Medium")
    sample_answer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    resume = relationship("ResumeModel", back_populates="interview_questions")

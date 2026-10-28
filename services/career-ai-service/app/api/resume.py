"""
Resume Management API Endpoints
Handles PDF resume upload, parsing, embedding extraction, and listing.
"""
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database.session import get_db
from backend.app.database.models import ResumeModel
from backend.app.schemas.resume import ResumeUploadResponse, ResumeSummary, ResumeDetail
from backend.app.services.pdf_parser import PDFParser, PDFParsingError
from backend.app.services.text_cleaner import chunk_text
from backend.app.services.skill_extractor import extract_skills_from_text
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store

router = APIRouter(prefix="/resume", tags=["Resume"])

@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a PDF resume, extracts text, identifies skills, generates embeddings,
    and indexes chunks in the vector database.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF (.pdf) files are supported."
        )

    # 1. Read file bytes
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )

    # 2. Parse PDF with PyMuPDF
    try:
        raw_text, cleaned_text, page_count = PDFParser.extract_text_from_bytes(content)
    except PDFParsingError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during PDF extraction: {str(e)}"
        )

    # 3. Save physical PDF file to upload directory
    file_path = settings.UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 4. Extract skills deterministically
    extracted_skills = extract_skills_from_text(cleaned_text)

    # 5. Chunk text for vector store
    chunks = chunk_text(cleaned_text, chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)

    # 6. Save Resume metadata into SQLite
    resume = ResumeModel(
        filename=file.filename,
        file_path=str(file_path),
        raw_text=raw_text,
        cleaned_text=cleaned_text,
        extracted_skills=json.dumps(extracted_skills),
        total_chunks=len(chunks)
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # 7. Generate vector embeddings & store in ChromaDB
    if chunks:
        embeddings = embedding_service.embed_documents(chunks)
        vector_store.add_resume_chunks(
            resume_id=resume.id,
            chunks=chunks,
            embeddings=embeddings
        )

    return ResumeUploadResponse(
        id=resume.id,
        filename=resume.filename,
        message=f"Resume uploaded and indexed successfully across {len(chunks)} chunks.",
        extracted_skills=extracted_skills,
        total_chunks=len(chunks)
    )

@router.get("/list", response_model=list[ResumeSummary])
def list_resumes(db: Session = Depends(get_db)):
    """Lists all previously uploaded resumes."""
    resumes = db.query(ResumeModel).order_by(ResumeModel.created_at.desc()).all()
    results = []
    for r in resumes:
        results.append(ResumeSummary(
            id=r.id,
            filename=r.filename,
            extracted_skills=r.get_skills_list(),
            total_chunks=r.total_chunks,
            created_at=r.created_at
        ))
    return results

@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Retrieves full details of a specific resume."""
    resume = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    return ResumeDetail(
        id=resume.id,
        filename=resume.filename,
        raw_text=resume.raw_text,
        cleaned_text=resume.cleaned_text,
        extracted_skills=resume.get_skills_list(),
        total_chunks=resume.total_chunks,
        created_at=resume.created_at
    )

@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """Deletes a resume, its vector database embeddings, and its physical file."""
    resume = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    
    # Delete from vector DB
    vector_store.delete_resume_chunks(resume_id)
    
    # Delete physical file if present
    try:
        Path(resume.file_path).unlink(missing_ok=True)
    except Exception:
        pass
        
    db.delete(resume)
    db.commit()
    return {"message": f"Resume {resume_id} deleted successfully."}

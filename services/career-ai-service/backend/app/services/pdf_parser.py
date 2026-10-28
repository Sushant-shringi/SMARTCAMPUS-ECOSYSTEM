"""
PDF Extraction Service
Uses PyMuPDF (fitz) to reliably extract text and metadata from uploaded resume PDFs.
Includes validation for empty or corrupt files.
"""
from pathlib import Path
import fitz  # PyMuPDF
from backend.app.services.text_cleaner import clean_text

class PDFParsingError(Exception):
    """Raised when PDF extraction fails or document is corrupt/empty."""
    pass

class PDFParser:
    """
    Extracts text from PDF documents with page tracking and error handling.
    """
    
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> tuple[str, str, int]:
        """
        Parses PDF file from in-memory byte stream.
        
        Inputs:
            file_bytes (bytes): Raw uploaded binary data
        Outputs:
            tuple[raw_text, cleaned_text, page_count]
        """
        if not file_bytes or len(file_bytes) < 10:
            raise PDFParsingError("Uploaded file is empty or too small to be a valid PDF.")
            
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise PDFParsingError(f"Failed to open PDF document: {str(e)}")
            
        return PDFParser._process_fitz_doc(doc)

    @staticmethod
    def extract_text_from_file(file_path: Path | str) -> tuple[str, str, int]:
        """
        Parses PDF file from filesystem path.
        """
        path = Path(file_path)
        if not path.exists():
            raise PDFParsingError(f"PDF file does not exist at {path}")
            
        try:
            doc = fitz.open(str(path))
        except Exception as e:
            raise PDFParsingError(f"Could not open PDF file: {str(e)}")
            
        return PDFParser._process_fitz_doc(doc)

    @staticmethod
    def _process_fitz_doc(doc: fitz.Document) -> tuple[str, str, int]:
        page_count = len(doc)
        if page_count == 0:
            doc.close()
            raise PDFParsingError("PDF document contains 0 pages.")
            
        extracted_pages = []
        for i, page in enumerate(doc):
            text = page.get_text("text")
            if text:
                extracted_pages.append(text)
                
        doc.close()
        
        raw_text = "\n\n".join(extracted_pages).strip()
        if not raw_text:
            raise PDFParsingError(
                "No readable text found in PDF. The document might be scanned/image-only or password protected."
            )
            
        cleaned_text = clean_text(raw_text)
        return raw_text, cleaned_text, page_count

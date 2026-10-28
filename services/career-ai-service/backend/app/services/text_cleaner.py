"""
Text Cleaner & Chunking Utilities
Normalizes extracted PDF text and splits documents into overlapping semantic chunks.
"""
import re

def clean_text(text: str) -> str:
    """
    Cleans raw extracted text from PDFs:
    - Normalizes unicode characters and ligatures (e.g. fi -> fi)
    - Removes non-printable control characters
    - Normalizes multiple spaces and tabs into single space
    - Normalizes excessive blank lines
    
    Inputs:
        text (str): Raw string from document parser
    Outputs:
        str: Cleaned and normalized text
    """
    if not text:
        return ""
    
    # Replace common unicode ligatures
    ligatures = {
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u00a0": " ",
    }
    for k, v in ligatures.items():
        text = text.replace(k, v)
    
    # Remove control characters except standard whitespace
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', ' ', text)
    
    # Normalize consecutive horizontal spaces
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Normalize multiple newlines (max 2 consecutive)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    
    return text.strip()


def chunk_text(text: str, chunk_size: int = 450, chunk_overlap: int = 60) -> list[str]:
    """
    Splits long resume text into smaller semantic chunks with overlapping boundaries.
    Overlapping ensures that context is not severed across arbitrary character cuts.
    
    Inputs:
        text (str): Full document text
        chunk_size (int): Target length of each chunk in characters
        chunk_overlap (int): Number of overlapping characters between chunks
    Outputs:
        list[str]: Array of text chunks ready for vector embedding
    """
    if not text:
        return []
        
    cleaned = clean_text(text)
    if len(cleaned) <= chunk_size:
        return [cleaned]
        
    paragraphs = re.split(r'(\n\n+|\n(?=[•\-\*\d+\.]\s))', cleaned)
    
    chunks = []
    current_chunk = ""
    
    for segment in paragraphs:
        if not segment.strip():
            continue
            
        if len(current_chunk) + len(segment) <= chunk_size:
            current_chunk += (" " if current_chunk else "") + segment.strip()
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                current_chunk = overlap_text + " " + segment.strip()
            else:
                words = segment.split()
                temp = ""
                for w in words:
                    if len(temp) + len(w) + 1 <= chunk_size:
                        temp += (" " if temp else "") + w
                    else:
                        if temp:
                            chunks.append(temp.strip())
                        temp = w
                if temp:
                    current_chunk = temp
                    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
        
    return chunks

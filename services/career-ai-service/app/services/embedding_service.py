"""
Local Embeddings Service
Uses sentence-transformers ('all-MiniLM-L6-v2') on local CPU.
Produces 384-dimensional dense vector embeddings with zero external API calls or costs.
"""
from typing import List
from sentence_transformers import SentenceTransformer
from backend.app.config import settings

class EmbeddingService:
    """
    Singleton service managing the SentenceTransformer embedding model.
    """
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            print(f"Loading embedding model '{settings.EMBEDDING_MODEL_NAME}' into memory...")
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            print("Embedding model loaded successfully.")
        return cls._instance

    def embed_text(self, text: str) -> List[float]:
        """
        Embeds a single string into a 384-dim vector.
        """
        if not text.strip():
            return [0.0] * 384
        embedding = self._model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embeds a batch of text chunks.
        """
        if not texts:
            return []
        embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return [emb.tolist() for emb in embeddings]

# Global singleton instance
embedding_service = EmbeddingService()

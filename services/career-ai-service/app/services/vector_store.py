"""
Vector Store Service (ChromaDB)
Provides persistent local storage for resume chunks and vector similarity search.
"""
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.app.config import settings

class VectorStoreService:
    """
    Manages local ChromaDB vector collection for resume embeddings.
    """
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=str(settings.VECTOR_DB_DIR),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="resume_chunks",
            metadata={"hnsw:space": "cosine"}
        )

    def add_resume_chunks(
        self,
        resume_id: int,
        chunks: List[str],
        embeddings: List[List[float]]
    ) -> int:
        """
        Stores chunk vectors and metadata tagged with resume_id.
        """
        if not chunks:
            return 0
            
        ids = [f"res_{resume_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"resume_id": resume_id, "chunk_index": i} for i in range(len(chunks))]
        
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )
        return len(chunks)

    def query_resume_chunks(
        self,
        resume_id: int,
        query_embedding: List[float],
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Performs cosine similarity search against a specific resume's chunks.
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"resume_id": resume_id}
        )
        
        formatted_chunks = []
        if results and results["documents"] and results["documents"][0]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            
            for doc, meta, dist in zip(docs, metas, distances):
                sim_score = max(0.0, min(1.0, 1.0 - dist))
                formatted_chunks.append({
                    "chunk_id": meta.get("chunk_index", 0),
                    "text": doc,
                    "similarity_score": round(sim_score, 4)
                })
                
        return formatted_chunks

    def delete_resume_chunks(self, resume_id: int):
        """Removes all stored vectors for a deleted resume."""
        try:
            self.collection.delete(where={"resume_id": resume_id})
        except Exception:
            pass

vector_store = VectorStoreService()

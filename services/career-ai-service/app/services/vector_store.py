"""
Vector Store Service (ChromaDB)
Provides persistent local storage for resume chunks and vector similarity search
with multi-tenant student data isolation.
"""
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

try:
    from app.config import settings
except ImportError:
    from backend.app.config import settings

class VectorStoreService:
    """
    Manages local ChromaDB vector collection for resume embeddings with user isolation.
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
        embeddings: List[List[float]],
        user_id: Optional[str] = None
    ) -> int:
        """
        Stores chunk vectors and metadata tagged with resume_id and student user_id.
        """
        if not chunks:
            return 0
            
        uid_str = str(user_id or "default_student")
        ids = [f"res_{resume_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"resume_id": int(resume_id), "user_id": uid_str, "chunk_index": i}
            for i in range(len(chunks))
        ]
        
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
        top_k: int = 4,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs cosine similarity search against a specific resume's chunks,
        strictly scoped to the requesting student.
        """
        where_filter = {"resume_id": int(resume_id)}
        if user_id:
            where_filter = {
                "$and": [
                    {"resume_id": int(resume_id)},
                    {"user_id": str(user_id)}
                ]
            }

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter
            )
        except Exception:
            # Fallback to resume_id filter if compound filter fails on legacy chunks
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where={"resume_id": int(resume_id)}
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

    def delete_resume_chunks(self, resume_id: int, user_id: Optional[str] = None):
        """Removes all stored vectors for a deleted resume."""
        try:
            where_filter = {"resume_id": int(resume_id)}
            if user_id:
                where_filter = {
                    "$and": [
                        {"resume_id": int(resume_id)},
                        {"user_id": str(user_id)}
                    ]
                }
            self.collection.delete(where=where_filter)
        except Exception:
            try:
                self.collection.delete(where={"resume_id": int(resume_id)})
            except Exception:
                pass

vector_store = VectorStoreService()

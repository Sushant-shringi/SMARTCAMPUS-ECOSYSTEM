"""
RAG (Retrieval-Augmented Generation) Service
Retrieves relevant resume chunks and synthesizes grounded answers using the configured LLM provider.
"""
from pathlib import Path
from backend.app.config import settings
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store
from backend.app.services.llm import get_llm_provider

def load_prompt_template(name: str) -> str:
    path = settings.PROMPTS_DIR / name
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Resume Context:\n{context}\n\nQuestion: {question}\nAnswer:"

class RagService:
    def __init__(self):
        self.prompt_template = load_prompt_template("rag_prompt.txt")

    def answer_question(self, resume_id: int, question: str) -> tuple[str, list[dict], str]:
        """
        Executes the RAG pipeline:
        1. Embed user question
        2. Retrieve top-k relevant chunks from ChromaDB
        3. Inject context into strict anti-hallucination prompt
        4. Send prompt to active LLM provider (Gemini or Ollama)
        5. Return grounded response + retrieved source chunks + provider name
        """
        provider = get_llm_provider()
        query_vector = embedding_service.embed_text(question)
        
        chunks = vector_store.query_resume_chunks(
            resume_id=resume_id,
            query_embedding=query_vector,
            top_k=settings.TOP_K_RESULTS
        )
        
        if not chunks:
            return "No text context found for this resume. Please re-upload your resume PDF.", [], provider.provider_name

        context_blocks = []
        for i, chunk in enumerate(chunks, 1):
            context_blocks.append(f"[Excerpt {i}]:\n{chunk['text']}")
        context_str = "\n\n".join(context_blocks)

        prompt = (
            self.prompt_template
            .replace("{context}", context_str)
            .replace("{question}", question)
        )
        
        answer = provider.generate(
            prompt=prompt,
            system_prompt="You are a strict, factual Resume RAG Assistant. Never invent information."
        )
        
        return answer, chunks, provider.provider_name

rag_service = RagService()

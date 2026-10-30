"""
Interview Question & Answer Service
Generates targeted technical and behavioral interview questions grounded in candidate projects.
"""
import json
import re
from backend.app.config import settings
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store
from backend.app.services.llm import get_llm_provider
from backend.app.services.rag_service import load_prompt_template

class InterviewService:
    def __init__(self):
        self.question_prompt_template = load_prompt_template("interview_prompt.txt")
        self.answer_prompt_template = load_prompt_template("answer_generation_prompt.txt")

    def generate_questions(
        self,
        resume_id: int,
        resume_text: str,
        job_context: str = ""
    ) -> list[dict]:
        provider = get_llm_provider()
        resume_context = resume_text[:2000]
        prompt = (
            self.question_prompt_template
            .replace("{resume_context}", resume_context)
            .replace("{job_context}", job_context or "General Data & Software Engineering Role")
        )
        
        raw_response = provider.generate(
            prompt=prompt,
            system_prompt="You are an expert interviewer. Output strictly valid JSON."
        )
        
        questions = []
        try:
            clean_json = re.sub(r'```json|```', '', raw_response).strip()
            data = json.loads(clean_json)
            if isinstance(data, list):
                questions = data
            elif isinstance(data, dict) and "questions" in data:
                questions = data["questions"]
        except Exception:
            questions = [
                {
                    "category": "Project-based",
                    "difficulty": "Medium",
                    "question": "Can you walk me through the architecture and data flow of your primary resume project?",
                    "context_hint": "Core Project Architecture"
                },
                {
                    "category": "Technical (Python/SQL)",
                    "difficulty": "Medium",
                    "question": "How do you optimize SQL queries or handle large data transformations in Python/Pandas?",
                    "context_hint": "Data Processing Efficiency"
                },
                {
                    "category": "Data Engineering",
                    "difficulty": "Hard",
                    "question": "How do you handle schema changes, bad input records, or pipeline failures in your ETL pipelines?",
                    "context_hint": "Data Quality & Resilience"
                },
                {
                    "category": "Behavioral",
                    "difficulty": "Easy",
                    "question": "Tell me about a challenging technical bug you encountered and how you systematically debugged it.",
                    "context_hint": "Problem Solving"
                }
            ]
            
        return questions

    def generate_answer(
        self,
        resume_id: int,
        question: str,
        category: str = "Technical"
    ) -> tuple[str, list[str]]:
        provider = get_llm_provider()
        q_vector = embedding_service.embed_text(question)
        chunks = vector_store.query_resume_chunks(resume_id, q_vector, top_k=2)
        
        resume_context = "\n\n".join([c["text"] for c in chunks]) if chunks else "No specific excerpt found."
        
        prompt = (
            self.answer_prompt_template
            .replace("{resume_context}", resume_context)
            .replace("{question}", question)
            .replace("{category}", category)
        )
        
        answer = provider.generate(
            prompt=prompt,
            system_prompt="You are an interview coach helping a candidate structure a truthful, STAR-format answer."
        )
        
        return answer, [c["text"] for c in chunks]

    def generate_star_answer(
        self,
        resume_id: int,
        question: str,
        category: str = 'Technical'
    ) -> dict:
        answer, chunks = self.generate_answer(resume_id, question, category)
        return {
            'star_answer': answer,
            'sample_answer': answer,
            'source_chunks': chunks,
            'talking_points': [],
            'suggested_metric': None
        }

interview_service = InterviewService()

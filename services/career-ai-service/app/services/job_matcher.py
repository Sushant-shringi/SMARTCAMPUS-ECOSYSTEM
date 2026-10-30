"""
Job Description Matcher Service
Combines deterministic skill extraction with semantic vector analysis and LLM advice.
"""
try:
    from app.config import settings
    from app.services.skill_extractor import extract_skills_from_text
    from app.services.embedding_service import embedding_service
    from app.services.vector_store import vector_store
    from app.services.llm import get_llm_provider
    from app.services.rag_service import load_prompt_template
except ImportError:
    from backend.app.config import settings
    from backend.app.services.skill_extractor import extract_skills_from_text
    from backend.app.services.embedding_service import embedding_service
    from backend.app.services.vector_store import vector_store
    from backend.app.services.llm import get_llm_provider
    from backend.app.services.rag_service import load_prompt_template

class JobMatcherService:
    def __init__(self):
        self.prompt_template = load_prompt_template("job_analysis_prompt.txt")

    def match(
        self,
        resume_id: int,
        resume_text: str,
        resume_skills: list[str],
        job_text: str
    ) -> dict:
        return self.match_resume_to_jd(
            resume_id=resume_id,
            resume_text=resume_text,
            resume_skills=resume_skills,
            job_description=job_text
        )

    def match_resume_to_jd(
        self,
        resume_id: int,
        resume_text: str,
        resume_skills: list[str],
        job_description: str
    ) -> dict:
        provider = get_llm_provider()
        jd_skills = extract_skills_from_text(job_description)
        
        resume_skill_set = set(s.lower() for s in resume_skills)
        matching_skills = []
        missing_skills = []
        
        for s in jd_skills:
            if s.lower() in resume_skill_set:
                matching_skills.append(s)
            else:
                missing_skills.append(s)
                
        if jd_skills:
            match_percentage = round((len(matching_skills) / len(jd_skills)) * 100, 1)
        else:
            match_percentage = 70.0
            
        jd_summary = job_description[:500]
        jd_vector = embedding_service.embed_text(jd_summary)
        relevant_chunks = vector_store.query_resume_chunks(resume_id, jd_vector, top_k=3)
        relevant_snippets = [c["text"] for c in relevant_chunks]

        resume_context = resume_text[:1500]
        prompt = (
            self.prompt_template
            .replace("{matching_skills}", ", ".join(matching_skills) if matching_skills else "None explicitly listed")
            .replace("{missing_skills}", ", ".join(missing_skills) if missing_skills else "None identified")
            .replace("{job_description}", job_description[:1000])
            .replace("{resume_context}", resume_context)
        )
        
        llm_analysis = provider.generate(
            prompt=prompt,
            system_prompt="You are a Technical Hiring Manager and Career Coach."
        )

        suggestions = [
            f"Highlight practical project experience using {', '.join(missing_skills[:3])}." if missing_skills else "Align your project metrics with the responsibilities in the job posting.",
            "Quantify achievements in your key projects with metrics (e.g. data size, latency, efficiency).",
            "Tailor your summary section to reflect keywords matching this target position."
        ]
        
        return {
            "match_percentage": match_percentage,
            "matching_skills": matching_skills,
            "missing_skills": missing_skills,
            "relevant_projects": relevant_snippets,
            "suggestions": suggestions,
            "llm_analysis": llm_analysis
        }

job_matcher = JobMatcherService()

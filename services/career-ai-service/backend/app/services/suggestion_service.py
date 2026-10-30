"""
Resume Improvement Suggestions Service
Evaluates resume bullets and provides rewrite suggestions using Google's X-Y-Z formula.
Employs an objective, deterministic ATS scoring engine to guarantee 100% score stability.
"""
import hashlib
import json
import re

try:
    from app.config import settings
    from app.services.llm import get_llm_provider
    from app.services.rag_service import load_prompt_template
except ImportError:
    from backend.app.config import settings
    from backend.app.services.llm import get_llm_provider
    from backend.app.services.rag_service import load_prompt_template

class SuggestionService:
    def __init__(self):
        self.review_prompt_template = load_prompt_template("resume_improvement_prompt.txt")
        self.bullet_prompt_template = load_prompt_template("bullet_improvement_prompt.txt")
        self._cache: dict[str, dict] = {}

    @staticmethod
    def calculate_deterministic_score(resume_text: str) -> int:
        """
        Calculates an objective, deterministic resume quality score (0-100)
        based on four industry-standard ATS evaluation pillars:
        1. Quantifiable Impact & Metrics (0-25)
        2. Strong Action Verbs (0-25)
        3. Technical Skills Density (0-25)
        4. Structural Completeness & Length (0-25)
        
        Guarantees 100% score stability for identical resume content.
        """
        if not resume_text or not resume_text.strip():
            return 50

        text = resume_text

        # 1. Quantifiable Impact & Metrics (0-25)
        metric_pattern = r'\b(\d+[\d,.]*\s*(?:%|percent|x|X|k|K|M|million|billion|GB|TB|MB|ms|sec|seconds|hrs|hours|records|queries|pipelines|datasets|users))\b'
        metrics_found = re.findall(metric_pattern, text, re.IGNORECASE)
        metric_cnt = len(metrics_found)
        if metric_cnt >= 6:
            m_score = 25
        elif metric_cnt >= 4:
            m_score = 20
        elif metric_cnt >= 2:
            m_score = 15
        elif metric_cnt >= 1:
            m_score = 10
        else:
            m_score = 5

        # 2. Strong Action Verbs (0-25)
        ACTION_VERBS = {
            'engineered', 'developed', 'architected', 'optimized', 'designed', 'implemented',
            'automated', 'orchestrated', 'streamlined', 'built', 'spearheaded', 'deployed',
            'configured', 'scaled', 'migrated', 'integrated', 'modeled', 'analyzed',
            'created', 'executed', 'established', 'formulated', 'monitored', 'resolved',
            'collaborated', 'maintained', 'transformed', 'delivered', 'accelerated', 'authored'
        }
        words = set(re.findall(r'\b[a-z]+\b', text.lower()))
        verbs_found = ACTION_VERBS.intersection(words)
        verb_cnt = len(verbs_found)
        if verb_cnt >= 8:
            v_score = 25
        elif verb_cnt >= 5:
            v_score = 20
        elif verb_cnt >= 3:
            v_score = 15
        elif verb_cnt >= 1:
            v_score = 10
        else:
            v_score = 5

        # 3. Technical Skills Breadth & Depth (0-25)
        try:
            try:
                from app.services.skill_extractor import extract_skills_from_text
            except ImportError:
                from backend.app.services.skill_extractor import extract_skills_from_text
            skills = extract_skills_from_text(text)
            skill_cnt = len(skills)
        except Exception:
            tech_set = {'python', 'sql', 'java', 'aws', 'docker', 'git', 'react', 'api', 'c++', 'linux', 'pyspark', 'spark', 'mysql', 'postgresql'}
            skill_cnt = len(words.intersection(tech_set))

        if skill_cnt >= 12:
            s_score = 25
        elif skill_cnt >= 8:
            s_score = 20
        elif skill_cnt >= 5:
            s_score = 15
        elif skill_cnt >= 2:
            s_score = 10
        else:
            s_score = 5

        # 4. Structure, Completeness & Density (0-25)
        text_lower = text.lower()
        sections = ['education', 'project', 'skill', 'summary', 'experience']
        sections_found = sum(1 for sec in sections if sec in text_lower)
        has_contact = bool(re.search(r'[\w\.-]+@[\w\.-]+', text)) or bool(re.search(r'\+?\d[\d -]{8,}\d', text))
        words_count = len(text.split())

        struct_score = sections_found * 3  # up to 15
        if has_contact:
            struct_score += 5
        if 250 <= words_count <= 950:
            struct_score += 5
        elif words_count > 100:
            struct_score += 3
        struct_score = min(25, struct_score)

        total_score = m_score + v_score + s_score + struct_score
        return int(max(40, min(95, total_score)))

    def review_resume(self, resume_id: int, resume_text: str, force_refresh: bool = False) -> dict:
        cache_key = f"{resume_id}_{hashlib.sha256(resume_text.encode('utf-8')).hexdigest()}"
        if not force_refresh and cache_key in self._cache:
            return self._cache[cache_key]

        # Calculate authoritative, deterministic score based on objective ATS criteria
        deterministic_score = self.calculate_deterministic_score(resume_text)

        provider = get_llm_provider()
        prompt = self.review_prompt_template.replace("{resume_text}", resume_text[:2500])
        raw_response = provider.generate(
            prompt=prompt,
            system_prompt="You are a professional resume reviewer. Output strictly valid JSON."
        )
        
        try:
            clean_json = re.sub(r'```json|```', '', raw_response).strip()
            data = json.loads(clean_json)
            result = {
                "resume_id": resume_id,
                "score_estimate": deterministic_score,
                "strengths": data.get("strengths", ["Clear technical skills section", "Relevant academic/project background"]),
                "suggestions": data.get("suggestions", [])
            }
        except Exception:
            result = {
                "resume_id": resume_id,
                "score_estimate": deterministic_score,
                "strengths": ["Relevant technical toolset listed", "Structured sections"],
                "suggestions": [
                    {
                        "category": "Impact / Metrics",
                        "issue": "Bullet points describe responsibilities rather than measurable outcomes.",
                        "recommendation": "Add numbers: e.g. % performance increase, records processed, or time saved.",
                        "example": "Improved data pipeline throughput by 35% by implementing parallel batching in Python."
                    },
                    {
                        "category": "Technical Depth",
                        "issue": "Some skills are listed in the header but never cited in any project description.",
                        "recommendation": "Mention specifically where you applied tools like Docker, SQL, or Spark in your projects.",
                        "example": "Containerized the FastAPI backend using Docker and automated deployments."
                    }
                ]
            }

        self._cache[cache_key] = result
        return result

    def improve_bullet_point(self, original_bullet: str, domain: str = "Data / AI") -> dict:
        provider = get_llm_provider()
        prompt = (
            self.bullet_prompt_template
            .replace("{original_bullet}", original_bullet)
            .replace("{domain}", domain)
        )
        
        raw_response = provider.generate(
            prompt=prompt,
            system_prompt="You are an expert resume editor. Output strictly valid JSON."
        )
        
        try:
            clean_json = re.sub(r'```json|```', '', raw_response).strip()
            data = json.loads(clean_json)
            if "improved_bullet" in data:
                return {
                    "original_bullet": original_bullet,
                    "improved_bullet": data.get("improved_bullet", original_bullet),
                    "key_changes": data.get("key_changes", ["Enhanced action verb and added measurable impact metric."])
                }
        except Exception:
            pass

        # Deterministic fallback enhancement if LLM output wasn't JSON
        improved = f"Engineered scalable solution for {original_bullet.lower().rstrip('.')}, optimizing processing efficiency by 30% utilizing standard industry best practices."
        return {
            "original_bullet": original_bullet,
            "improved_bullet": improved,
            "key_changes": [
                "Replaced passive wording with strong action verb ('Engineered')",
                "Added placeholder quantifiable metric ('optimizing processing efficiency by 30%')"
            ]
        }

suggestion_service = SuggestionService()

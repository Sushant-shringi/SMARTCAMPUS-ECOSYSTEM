"""
Deterministic Skill Extraction Service
Extracts technical skills, frameworks, cloud tools, and data engineering competencies
using high-precision regex matching against a comprehensive taxonomy.
"""
import re

# Comprehensive catalog of Technical & GenAI Skills for freshers and engineers
SKILL_TAXONOMY = {
    "Programming Languages": [
        "Python", "SQL", "Java", "C++", "C", "C#", "JavaScript", "TypeScript",
        "R", "Scala", "Go", "Bash", "Shell", "Rust", "HTML", "CSS"
    ],
    "Data Science & Machine Learning": [
        "Pandas", "NumPy", "Scikit-Learn", "PyTorch", "TensorFlow", "Keras",
        "OpenCV", "Matplotlib", "Seaborn", "SciPy", "NLTK", "Spacy", "XGBoost",
        "LightGBM", "Hugging Face", "Transformers", "LLMs", "RAG", "Embeddings",
        "Vector Search", "ChromaDB", "FAISS", "LangChain", "LlamaIndex", "Ollama"
    ],
    "Data Engineering & Big Data": [
        "Apache Spark", "PySpark", "Apache Kafka", "Apache Airflow", "Hadoop",
        "Hive", "dbt", "Snowflake", "Databricks", "BigQuery", "Redshift",
        "ETL", "Data Pipelines", "Data Warehousing", "Data Lake", "Data Modeling"
    ],
    "Databases & Storage": [
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB",
        "Cassandra", "Elasticsearch", "SQL Server", "Oracle"
    ],
    "Cloud & DevOps": [
        "AWS", "AWS Lambda", "Amazon S3", "Amazon EC2", "Amazon DynamoDB",
        "AWS Glue", "Amazon Athena", "Amazon EMR", "Azure", "GCP", "Google Cloud",
        "Docker", "Kubernetes", "CI/CD", "Git", "GitHub", "Linux", "Terraform"
    ],
    "Web & API Frameworks": [
        "FastAPI", "Flask", "Django", "React", "Node.js", "Express", "REST API",
        "GraphQL", "Streamlit", "Tailwind CSS", "Next.js"
    ]
}

# Precompile regex for fast case-insensitive boundary matching
COMPILED_PATTERNS = {}
for category, skills in SKILL_TAXONOMY.items():
    for skill in skills:
        escaped = re.escape(skill)
        if skill in ["C", "R", "Go"]:
            pattern = re.compile(rf'(?:\b|(?<=\s)){escaped}(?:\b|(?=\s|,|\.))', re.IGNORECASE)
        elif skill in ["C++", "C#"]:
            pattern = re.compile(rf'(?:\b|(?<=\s)){escaped}(?:\b|(?=\s|,|\.))', re.IGNORECASE)
        elif "." in skill:
            pattern = re.compile(rf'{escaped}', re.IGNORECASE)
        else:
            pattern = re.compile(rf'\b{escaped}\b', re.IGNORECASE)
        COMPILED_PATTERNS[skill] = (pattern, category)


def extract_skills_from_text(text: str) -> list[str]:
    """
    Extracts all recognized technical skills found inside the given text.
    
    Inputs:
        text (str): Resume or Job Description text
    Outputs:
        list[str]: Sorted, deduplicated list of recognized skills
    """
    if not text:
        return []
        
    found_skills = set()
    for skill_name, (pattern, _) in COMPILED_PATTERNS.items():
        if pattern.search(text):
            found_skills.add(skill_name)
            
    return sorted(list(found_skills), key=lambda x: x.lower())


def categorize_skills(skills: list[str]) -> dict[str, list[str]]:
    """
    Groups a list of skills by their technical category.
    """
    categorized = {}
    skill_set = set(skills)
    
    for category, cat_skills in SKILL_TAXONOMY.items():
        matched = [s for s in cat_skills if s in skill_set]
        if matched:
            categorized[category] = matched
            
    return categorized

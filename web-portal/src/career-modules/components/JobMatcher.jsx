import React, { useState } from 'react';
import { Target, CheckCircle2, XCircle, Sparkles, FolderGit2, AlertCircle, ArrowRight } from 'lucide-react';
import { matchResumeJob } from '../api/client';

const SAMPLE_JDS = [
  {
    title: 'Junior Data Engineer',
    company: 'FinTech Labs',
    text: `We are looking for a Junior Data Engineer to build scalable ETL pipelines and manage our cloud data infrastructure.
Requirements:
- Strong proficiency in Python, SQL, and Pandas
- Hands-on experience with AWS (S3, Lambda, Glue) or GCP
- Familiarity with Apache Airflow, Docker, and PostgreSQL
- Understanding of data warehousing principles, data modeling, and REST APIs
- Knowledge of Git and CI/CD pipelines`
  },
  {
    title: 'Generative AI / LLM Engineer',
    company: 'AI Startup',
    text: `Seeking an enthusiastic AI/GenAI Engineer to work on LLM applications, RAG pipelines, and agentic workflows.
Requirements:
- Strong Python programming and experience with FastAPI
- Understanding of Embeddings, Vector Databases (ChromaDB / FAISS), and RAG architectures
- Hands-on experience with LangChain, LlamaIndex, Transformers, and Ollama
- Experience with Docker, SQL, and PyTorch/TensorFlow
- Ability to evaluate hallucinations and fine-tune system prompts`
  }
];

export default function JobMatcher({ activeResume }) {
  const [jobText, setJobText] = useState(SAMPLE_JDS[0].text);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [error, setError] = useState(null);

  const handleMatch = async () => {
    if (!activeResume) {
      setError('Please select or upload a resume first.');
      return;
    }
    if (!jobText.trim()) {
      setError('Please paste a job description.');
      return;
    }

    setMatching(true);
    setError(null);
    try {
      const res = await matchResumeJob({
        resume_id: activeResume.id,
        custom_job_text: jobText
      });
      setMatchResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Resume vs Job Description Matcher
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic skill comparison + Vector similarity project matching + LLM coaching advice.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Preset JDs:</span>
            {SAMPLE_JDS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setJobText(sample.text)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={6}
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste Job Description here..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Matching against: <strong className="text-white">{activeResume ? activeResume.filename : 'No resume selected'}</strong>
          </span>
          <button
            onClick={handleMatch}
            disabled={matching || !activeResume}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{matching ? 'Analyzing Match & Projects...' : 'Analyze Match'}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Match Results Display */}
      {matchResult && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Score & Summary Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Analysis Result</span>
              <h4 className="text-xl font-bold text-white mt-1">
                Resume-JD Match Breakdown
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Note: This is a semantic and skills gap analysis to guide resume tailoring, not an official ATS score.
              </p>
            </div>

            {/* Score Gauge */}
            <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-2xl">
              <div className="text-center">
                <span className="text-3xl font-extrabold text-emerald-400">{matchResult.match_percentage}%</span>
                <span className="block text-[10px] text-slate-400 uppercase font-medium">Skill Alignment</span>
              </div>
            </div>
          </div>

          {/* 2-Column Skills Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matching Skills */}
            <div className="bg-slate-950/50 border border-emerald-900/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
                <CheckCircle2 className="w-4 h-4" />
                <span>Matching Skills ({matchResult.matching_skills?.length || 0})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchResult.matching_skills && matchResult.matching_skills.length > 0 ? (
                  matchResult.matching_skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No direct keyword overlap found.</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-slate-950/50 border border-amber-900/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
                <XCircle className="w-4 h-4" />
                <span>Missing / Less Evident Skills ({matchResult.missing_skills?.length || 0})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchResult.missing_skills && matchResult.missing_skills.length > 0 ? (
                  matchResult.missing_skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-950/50 border border-amber-800/60 text-amber-300 text-xs rounded-lg font-medium">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-400 font-medium">All explicit JD catalog skills matched!</span>
                )}
              </div>
            </div>
          </div>

          {/* Relevant Projects Detected by Vector Search */}
          {matchResult.relevant_projects && matchResult.relevant_projects.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-teal-400" />
                <span>Relevant Resume Projects & Experience (Retrieved via Embeddings)</span>
              </h5>
              <div className="space-y-2">
                {matchResult.relevant_projects.map((proj, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono">
                    {proj}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tailored LLM Advice */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Career Coach Suggestions & Optimization Plan</span>
            </h5>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {matchResult.llm_analysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

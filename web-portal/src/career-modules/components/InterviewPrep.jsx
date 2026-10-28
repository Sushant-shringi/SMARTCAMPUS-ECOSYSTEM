import React, { useState } from 'react';
import { HelpCircle, Sparkles, BookOpen, CheckCircle2, ChevronRight, MessageSquareCode, Loader2 } from 'lucide-react';
import { generateInterviewQuestions, generateInterviewAnswer } from '../api/client';

export default function InterviewPrep({ activeResume }) {
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState({});
  const [answeringId, setAnsweringId] = useState(null);
  const [jobText, setJobText] = useState('');

  const handleGenerate = async () => {
    if (!activeResume) return;
    setGenerating(true);
    try {
      const res = await generateInterviewQuestions(activeResume.id, jobText);
      setQuestions(res.questions || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAnswer = async (qItem, idx) => {
    setAnsweringId(idx);
    try {
      const res = await generateInterviewAnswer(activeResume.id, qItem.question, qItem.category);
      setAnswers((prev) => ({
        ...prev,
        [idx]: res.sample_answer
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setAnsweringId(null);
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'hard':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              Interview Question Generator
            </h3>
            <p className="text-xs text-slate-400">
              Generates realistic Technical, Architecture, SQL/Python, and Behavioral questions grounded in your resume projects.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !activeResume}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Questions...' : 'Generate Questions'}</span>
          </button>
        </div>

        {/* Optional Target Role Filter */}
        <div className="pt-2">
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Optional Target Role Context (e.g. "Data Engineer with PySpark & AWS"):
          </label>
          <input
            type="text"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="e.g. Junior Data Engineer / GenAI Specialist"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Questions List */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Generated Questions ({questions.length})
            </h4>
            <span className="text-xs text-slate-500">Click 'Generate STAR Answer' for structured response templates</span>
          </div>

          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded-lg font-medium">
                      {q.category || 'Technical'}
                    </span>
                    <span className={`px-2 py-0.5 border text-[10px] rounded-md font-semibold uppercase ${getDifficultyBadge(q.difficulty)}`}>
                      {q.difficulty || 'Medium'}
                    </span>
                  </div>

                  {q.context_hint && (
                    <span className="text-[11px] text-slate-500 italic">
                      Context: {q.context_hint}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed">
                  {idx + 1}. {q.question}
                </p>

                {/* Answer Generator */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => handleGenerateAnswer(q, idx)}
                    disabled={answeringId === idx}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    {answeringId === idx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquareCode className="w-3.5 h-3.5" />
                    )}
                    <span>{answers[idx] ? 'Regenerate Sample Answer' : '✨ Generate STAR Answer'}</span>
                  </button>
                </div>

                {/* Render Answer */}
                {answers[idx] && (
                  <div className="mt-3 p-4 bg-slate-950 border border-emerald-900/30 rounded-xl space-y-2 text-xs text-slate-200">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[10px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>STAR Method Response Template (Grounded in Resume)</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{answers[idx]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/60 rounded-2xl space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm text-slate-400">
            No interview questions generated yet. Click "Generate Questions" above to begin.
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Wand2, Copy, Check } from 'lucide-react';
import { fetchResumeReview, improveBulletPoint } from '../api/client';

export default function ResumeSuggestions({ activeResume }) {
  const [review, setReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Bullet point enhancer state
  const [bulletInput, setBulletInput] = useState('Worked on data pipeline using Python and SQL to process database records.');
  const [domainInput, setDomainInput] = useState('Data Engineering');
  const [bulletResult, setBulletResult] = useState(null);
  const [improvingBullet, setImprovingBullet] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReview = async () => {
    if (!activeResume) return;
    setLoadingReview(true);
    try {
      const res = await fetchResumeReview(activeResume.id);
      setReview(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingReview(false);
    }
  };

  const handleImproveBullet = async () => {
    if (!bulletInput.trim()) return;
    setImprovingBullet(true);
    try {
      const res = await improveBulletPoint(bulletInput, domainInput);
      setBulletResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setImprovingBullet(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Overall Resume Review */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Resume Polish & Actionable Suggestions
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates measurable impact, technical grounding, and action verbs across the entire resume.
            </p>
          </div>

          <button
            onClick={handleReview}
            disabled={loadingReview || !activeResume}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingReview ? 'Analyzing Resume...' : 'Analyze Resume Quality'}</span>
          </button>
        </div>

        {review && (
          <div className="space-y-6">
            {/* Score & Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 text-center flex flex-col justify-center">
                <span className="text-4xl font-black text-emerald-400">{review.score_estimate}/100</span>
                <span className="text-xs text-slate-400 uppercase font-medium mt-1">Quality Estimate</span>
              </div>

              <div className="md:col-span-2 bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Resume Strengths</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {review.strengths?.map((str, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Recommended Improvements ({review.suggestions?.length || 0})
              </h4>
              <div className="grid gap-3">
                {review.suggestions?.map((sug, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] rounded-md font-semibold">
                        {sug.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      <strong>Issue:</strong> {sug.issue}
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>Fix:</strong> {sug.recommendation}
                    </p>
                    {sug.example && (
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300">
                        {sug.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Interactive Bullet Enhancer */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-teal-400" />
            Google X-Y-Z Bullet Point Enhancer
          </h3>
          <p className="text-xs text-slate-400">
            Transforms weak responsibility statements into high-impact outcome metrics: <em>"Accomplished [X] as measured by [Y] by doing [Z]"</em>
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-400 mb-1 font-medium">Original Bullet Point:</label>
              <textarea
                rows={2}
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                placeholder="Paste any bullet point from your resume..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Target Role / Domain:</label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImproveBullet}
              disabled={improvingBullet || !bulletInput.trim()}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{improvingBullet ? 'Rewriting with X-Y-Z Formula...' : '✨ Rewrite Bullet Point'}</span>
            </button>
          </div>
        </div>

        {/* Enhanced Output */}
        {bulletResult && (
          <div className="mt-4 p-5 bg-slate-950 border border-teal-900/40 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Impact-Driven Rewritten Bullet</span>
              </span>
              <button
                onClick={() => copyToClipboard(bulletResult.improved_bullet)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-sm font-semibold text-white leading-relaxed">
              {bulletResult.improved_bullet}
            </div>

            {bulletResult.key_changes && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Key Enhancements Applied:</span>
                <ul className="space-y-1 text-xs text-slate-400">
                  {bulletResult.key_changes.map((change, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Wand2, Copy, Check } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Section 1: Overall Resume Review */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Resume Polish & Actionable Suggestions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluates measurable impact, technical grounding, and action verbs across the entire resume.
            </p>
          </div>

          <button
            onClick={handleReview}
            disabled={loadingReview || !activeResume}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingReview ? 'Analyzing Resume...' : 'Analyze Resume Quality'}</span>
          </button>
        </div>

        {review && (
          <div className="space-y-6">
            {/* Score & Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center flex flex-col justify-center shadow-2xs">
                <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{review.score_estimate}/100</span>
                <span className="text-xs text-slate-400 uppercase font-bold mt-1">Quality Estimate</span>
              </div>

              <div className="md:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 shadow-2xs">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Resume Strengths</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {review.strengths?.map((str, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Recommended Improvements ({review.suggestions?.length || 0})
              </h4>
              <div className="grid gap-3">
                {review.suggestions?.map((sug, i) => (
                  <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] rounded-md font-bold">
                        {sug.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <strong>Issue:</strong> {sug.issue}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <strong>Fix:</strong> {sug.recommendation}
                    </p>
                    {sug.example && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-blue-600 dark:text-blue-400">
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
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Google X-Y-Z Bullet Point Enhancer
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transforms weak responsibility statements into high-impact outcome metrics: <em>"Accomplished [X] as measured by [Y] by doing [Z]"</em>
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Original Bullet Point:</label>
              <textarea
                rows={2}
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                placeholder="Paste any bullet point from your resume..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Target Role / Domain:</label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImproveBullet}
              disabled={improvingBullet || !bulletInput.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{improvingBullet ? 'Rewriting with X-Y-Z Formula...' : '✨ Rewrite Bullet Point'}</span>
            </button>
          </div>
        </div>

        {/* Enhanced Output */}
        {bulletResult && (
          <div className="mt-4 p-5 bg-white dark:bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Impact-Driven Rewritten Bullet</span>
              </span>
              <button
                onClick={() => copyToClipboard(bulletResult.improved_bullet)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {bulletResult.improved_bullet}
            </div>

            {bulletResult.key_changes && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 uppercase font-bold">Key Enhancements Applied:</span>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {bulletResult.key_changes.map((change, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
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

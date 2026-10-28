import React from 'react';
import { Sparkles, FileText, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Navbar({
  resumes,
  selectedResumeId,
  onSelectResume,
  health,
  onRefreshHealth
}) {
  const isConnected = health?.llm_status === 'connected';

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">AI Career & Resume Assistant</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
                Local RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              100% Local AI • Ollama + Vector Search • Zero API Keys
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Resume Selector */}
          {resumes && resumes.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={selectedResumeId || ''}
                onChange={(e) => onSelectResume(Number(e.target.value))}
                className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer pr-2"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    {r.filename} ({r.extracted_skills?.length || 0} skills)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* LLM Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
            title={health?.llm_message || 'LLM status'}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="hidden md:inline">LLM Provider:</span>
            <span className="font-semibold text-white">
              {health?.llm_provider || 'Local Ollama'}
            </span>
            <button
              onClick={onRefreshHealth}
              className="hover:text-white transition-colors p-0.5 ml-1"
              title="Refresh health status"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

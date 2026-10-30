import React from 'react';
import { AlertCircle, Terminal } from 'lucide-react';

export default function StatusBanner({ health }) {
  if (!health || health.llm_status === 'connected') return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-sm text-amber-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-amber-200">Local Ollama is not connected: </span>
            <span className="text-amber-300/90">{health.llm_message}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 select-all">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>ollama run llama3.2</span>
        </div>
      </div>
    </div>
  );
}

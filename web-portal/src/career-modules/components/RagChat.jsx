import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp, Bot, User, ShieldCheck } from 'lucide-react';
import { askRagChat } from '../api/client';

const SUGGESTED_QUESTIONS = [
  "What projects have I done using AWS?",
  "Which skills in my resume are related to data engineering?",
  "Explain my primary project and its architecture.",
  "What databases and storage technologies have I used?"
];

export default function RagChat({ activeResume, health }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your RAG Resume Assistant. Ask me anything about your uploaded resume, projects, or technical experience. I answer strictly based on the extracted resume context.",
      sources: []
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [openSourcesIdx, setOpenSourcesIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (qText) => {
    const query = qText || inputQuestion;
    if (!query.trim()) return;
    if (!activeResume) {
      alert('Please upload or select a resume first.');
      return;
    }

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await askRagChat(activeResume.id, query);
      const botMsg = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources || [],
        provider: res.llm_provider
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `Error: ${err.message}`,
        sources: []
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col h-[650px] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              RAG Resume Chatbot
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Grounded
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Context: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeResume ? activeResume.filename : 'No resume selected'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline font-medium">Anti-Hallucination Active</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className="space-y-2 max-w-[85%]">
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {m.content}
              </div>

              {/* Source Chunks Drawer */}
              {m.sources && m.sources.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs">
                  <button
                    onClick={() => setOpenSourcesIdx(openSourcesIdx === idx ? null : idx)}
                    className="flex items-center justify-between w-full text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium text-[11px]"
                  >
                    <span>Retrieved Context ({m.sources.length} chunks from ChromaDB)</span>
                    {openSourcesIdx === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {openSourcesIdx === idx && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                      {m.sources.map((src, sIdx) => (
                        <div key={sIdx} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Chunk #{src.chunk_id}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              Similarity: {Math.round(src.similarity_score * 100)}%
                            </span>
                          </div>
                          <p className="leading-normal">{src.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Retrieving resume vectors & generating grounded answer...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-6 py-2 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-slate-400 shrink-0">Try asking:</span>
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={loading || !activeResume}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] rounded-lg shrink-0 transition-colors shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-slate-50/60 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={activeResume ? "Ask a question about the resume..." : "Please upload a resume first"}
          disabled={!activeResume || loading}
          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
        />
        <button
          onClick={() => handleSend()}
          disabled={!activeResume || loading || !inputQuestion.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FileText, Target, MessageSquare, HelpCircle, Sparkles, BookOpen } from 'lucide-react';
import Navbar from './components/Navbar';
import StatusBanner from './components/StatusBanner';
import ResumeUpload from './components/ResumeUpload';
import JobMatcher from './components/JobMatcher';
import RagChat from './components/RagChat';
import InterviewPrep from './components/InterviewPrep';
import ResumeSuggestions from './components/ResumeSuggestions';
import { fetchHealth, fetchResumes, fetchResumeDetail } from './api/client';

const TABS = [
  { id: 'resume', label: '1. Resume Manager', icon: FileText },
  { id: 'matcher', label: '2. Job Match Analysis', icon: Target },
  { id: 'rag', label: '3. RAG Resume Chat', icon: MessageSquare },
  { id: 'interview', label: '4. Interview Prep', icon: HelpCircle },
  { id: 'suggestions', label: '5. Resume Polish', icon: Sparkles },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('resume');
  const [health, setHealth] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [activeResume, setActiveResume] = useState(null);

  const loadHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      setHealth({ llm_status: 'disconnected', llm_message: 'Cannot reach FastAPI backend' });
    }
  };

  const loadResumes = async (selectId = null) => {
    try {
      const list = await fetchResumes();
      setResumes(list);
      if (list.length > 0) {
        const idToSelect = selectId || selectedResumeId || list[0].id;
        setSelectedResumeId(idToSelect);
        const detail = await fetchResumeDetail(idToSelect);
        setActiveResume(detail);
      } else {
        setSelectedResumeId(null);
        setActiveResume(null);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  useEffect(() => {
    loadHealth();
    loadResumes();
  }, []);

  const handleSelectResume = async (id) => {
    setSelectedResumeId(id);
    try {
      const detail = await fetchResumeDetail(id);
      setActiveResume(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSuccess = async (newId) => {
    await loadResumes(newId);
    setActiveTab('resume');
  };

  const handleDeleteSuccess = async () => {
    await loadResumes();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        resumes={resumes}
        selectedResumeId={selectedResumeId}
        onSelectResume={handleSelectResume}
        health={health}
        onRefreshHealth={loadHealth}
      />

      {/* Ollama Status Notice Banner */}
      <StatusBanner health={health} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'resume' && (
            <ResumeUpload
              resumes={resumes}
              activeResume={activeResume}
              onUploadSuccess={handleUploadSuccess}
              onDeleteSuccess={handleDeleteSuccess}
            />
          )}

          {activeTab === 'matcher' && (
            <JobMatcher activeResume={activeResume} />
          )}

          {activeTab === 'rag' && (
            <RagChat activeResume={activeResume} health={health} />
          )}

          {activeTab === 'interview' && (
            <InterviewPrep activeResume={activeResume} />
          )}

          {activeTab === 'suggestions' && (
            <ResumeSuggestions activeResume={activeResume} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            AI Career & Resume Assistant • Built for Fresher Portfolio & Interview Demonstration • 100% Local & Free
          </p>
        </div>
      </footer>
    </div>
  );
}

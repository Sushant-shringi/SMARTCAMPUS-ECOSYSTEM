import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Layers, Tag, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { uploadResumeFile, deleteResume } from '../api/client';

export default function ResumeUpload({
  resumes,
  activeResume,
  onUploadSuccess,
  onDeleteSuccess
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showFullText, setShowFullText] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a valid PDF file.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadResumeFile(file);
      onUploadSuccess(res.id);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse resume');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this resume and its vector embeddings?')) return;
    try {
      await deleteResume(id);
      onDeleteSuccess(id);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files[0])}
        />

        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-1">
          {uploading ? 'Processing Resume with PyMuPDF & ChromaDB...' : 'Upload your Resume PDF'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
          Drag & drop your PDF resume here, or click to browse. We will extract skills, chunk the text, and generate local vector embeddings.
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-medium">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Supported: Standard PDF documents (Freshers, Data, GenAI, SWE)</span>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Active Resume Dashboard Card */}
      {activeResume ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {activeResume.filename}
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
                    Indexed Active
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded {new Date(activeResume.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showFullText ? 'Hide Raw Text' : 'View Extracted Text'}</span>
              </button>
              <button
                onClick={(e) => handleDelete(activeResume.id, e)}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs rounded-lg border border-red-800/60 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Extracted Skills</span>
              </div>
              <p className="text-xl font-bold text-white">
                {activeResume.extracted_skills?.length || 0}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Vector Chunks</span>
              </div>
              <p className="text-xl font-bold text-white">
                {activeResume.total_chunks || 0}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                <span>Text Length</span>
              </div>
              <p className="text-xl font-bold text-white">
                {activeResume.cleaned_text?.length ? `${Math.round(activeResume.cleaned_text.length / 100) / 10}k chars` : '0'}
              </p>
            </div>
          </div>

          {/* Extracted Skills Badges */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Identified Technical Skills & Frameworks
            </h5>
            {activeResume.extracted_skills && activeResume.extracted_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeResume.extracted_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No standard technical keywords recognized.</p>
            )}
          </div>

          {/* Full Extracted Text View */}
          {showFullText && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Sanitized Text Output (PyMuPDF)
              </h5>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 whitespace-pre-wrap">
                {activeResume.cleaned_text}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-900/30 border border-slate-800/60 rounded-2xl text-slate-400 text-sm">
          No resume selected. Please upload a PDF resume above to get started.
        </div>
      )}
    </div>
  );
}

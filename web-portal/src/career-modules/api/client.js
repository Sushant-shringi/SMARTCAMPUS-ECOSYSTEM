/**
 * Frontend API Client
 * Wraps all backend REST API endpoints with robust error handling and logging.
 */
const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Resume upload failed');
  }
  return res.json();
}

export async function fetchResumes() {
  const res = await fetch(`${BASE_URL}/resume/list`);
  if (!res.ok) throw new Error('Failed to fetch resumes');
  return res.json();
}

export async function fetchResumeDetail(resumeId) {
  const res = await fetch(`${BASE_URL}/resume/${resumeId}`);
  if (!res.ok) throw new Error('Failed to fetch resume details');
  return res.json();
}

export async function deleteResume(resumeId) {
  const res = await fetch(`${BASE_URL}/resume/${resumeId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete resume');
  return res.json();
}

export async function matchResumeJob(payload) {
  const res = await fetch(`${BASE_URL}/jobs/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Match analysis failed' }));
    throw new Error(err.detail || 'Match analysis failed');
  }
  return res.json();
}

export async function askRagChat(resumeId, question) {
  const res = await fetch(`${BASE_URL}/rag/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: resumeId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'RAG query failed' }));
    throw new Error(err.detail || 'RAG query failed');
  }
  return res.json();
}

export async function generateInterviewQuestions(resumeId, jobText = '', categories = []) {
  const res = await fetch(`${BASE_URL}/interview/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_id: resumeId,
      custom_job_text: jobText,
      categories: categories.length ? categories : undefined
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
    throw new Error(err.detail || 'Generation failed');
  }
  return res.json();
}

export async function generateInterviewAnswer(resumeId, question, category = 'Technical') {
  const res = await fetch(`${BASE_URL}/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_id: resumeId,
      question,
      category
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Answer generation failed' }));
    throw new Error(err.detail || 'Answer generation failed');
  }
  return res.json();
}

export async function fetchResumeReview(resumeId) {
  const res = await fetch(`${BASE_URL}/suggestions/review/${resumeId}`);
  if (!res.ok) throw new Error('Failed to fetch resume review');
  return res.json();
}

export async function improveBulletPoint(originalBullet, roleOrDomain = 'Data / AI') {
  const res = await fetch(`${BASE_URL}/suggestions/improve-bullet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_bullet: originalBullet,
      role_or_domain: roleOrDomain
    }),
  });
  if (!res.ok) throw new Error('Failed to improve bullet');
  return res.json();
}

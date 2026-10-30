/**
 * Frontend API Client for Career AI Service
 * Wraps all backend REST API endpoints with JWT bearer authentication,
 * environment-driven base URL, and robust error handling.
 */
const BASE_URL = import.meta.env.VITE_CAREER_API_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:8001/api` : 'http://127.0.0.1:8001/api');

function getAuthHeaders(customHeaders = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('smartattend_token') : null;
  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Resume upload failed');
  }
  return res.json();
}

export async function fetchResumes() {
  const res = await fetch(`${BASE_URL}/resume/list`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch resumes');
  return res.json();
}

export async function fetchResumeDetail(resumeId) {
  const res = await fetch(`${BASE_URL}/resume/${resumeId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch resume details');
  return res.json();
}

export async function deleteResume(resumeId) {
  const res = await fetch(`${BASE_URL}/resume/${resumeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete resume');
  return res.json();
}

export async function matchResumeJob(payload) {
  const res = await fetch(`${BASE_URL}/jobs/match`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
  const res = await fetch(`${BASE_URL}/suggestions/review/${resumeId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch resume review');
  return res.json();
}

export async function improveBulletPoint(originalBullet, roleOrDomain = 'Data / AI') {
  const res = await fetch(`${BASE_URL}/suggestions/improve-bullet`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      original_bullet: originalBullet,
      role_or_domain: roleOrDomain
    }),
  });
  if (!res.ok) throw new Error('Failed to improve bullet');
  return res.json();
}

export async function fetchPlacementEligibility(studentId = null) {
  const endpoint = studentId ? `${BASE_URL}/placement/eligibility/${studentId}` : `${BASE_URL}/placement/eligibility/me`;
  const res = await fetch(endpoint, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Eligibility check failed' }));
    throw new Error(err.detail || 'Eligibility check failed');
  }
  return res.json();
}

export async function fetchCampusDrives(minAttendance = null) {
  const url = minAttendance !== null
    ? `${BASE_URL}/placement/drives?min_attendance=${minAttendance}`
    : `${BASE_URL}/placement/drives`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch campus drives');
  return res.json();
}

export async function fetchPlacementDriveDetail(driveId) {
  const res = await fetch(`${BASE_URL}/placement/drives/${driveId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch drive details');
  return res.json();
}

export async function createPlacementDrive(payload) {
  const res = await fetch(`${BASE_URL}/placement/drives`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create drive' }));
    throw new Error(err.detail || 'Failed to create drive');
  }
  return res.json();
}

export async function updatePlacementDrive(driveId, payload) {
  const res = await fetch(`${BASE_URL}/placement/drives/${driveId}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update drive' }));
    throw new Error(err.detail || 'Failed to update drive');
  }
  return res.json();
}

export async function closePlacementDrive(driveId) {
  const res = await fetch(`${BASE_URL}/placement/drives/${driveId}/close`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to close drive' }));
    throw new Error(err.detail || 'Failed to close drive');
  }
  return res.json();
}

export async function deletePlacementDrive(driveId) {
  const res = await fetch(`${BASE_URL}/placement/drives/${driveId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete drive' }));
    throw new Error(err.detail || 'Failed to delete drive');
  }
  return res.json();
}

export async function submitPlacementApplication(payload) {
  const res = await fetch(`${BASE_URL}/placement/applications`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Application failed' }));
    throw new Error(err.detail || 'Application failed');
  }
  return res.json();
}

export async function fetchMyApplications() {
  const res = await fetch(`${BASE_URL}/placement/applications/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function withdrawPlacementApplication(applicationId) {
  const res = await fetch(`${BASE_URL}/placement/applications/${applicationId}/withdraw`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Withdraw failed' }));
    throw new Error(err.detail || 'Withdraw failed');
  }
  return res.json();
}

export async function fetchAllApplications(params = {}) {
  const query = new URLSearchParams();
  if (params.drive_id) query.append('drive_id', params.drive_id);
  if (params.status) query.append('status', params.status);
  if (params.student_id) query.append('student_id', params.student_id);
  const qStr = query.toString();
  const url = qStr ? `${BASE_URL}/placement/applications?${qStr}` : `${BASE_URL}/placement/applications`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function fetchApplicationDetail(applicationId) {
  const res = await fetch(`${BASE_URL}/placement/applications/${applicationId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch application detail');
  return res.json();
}

export async function updateApplicationStatus(applicationId, payload) {
  const res = await fetch(`${BASE_URL}/placement/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Status update failed' }));
    throw new Error(err.detail || 'Status update failed');
  }
  return res.json();
}

export async function fetchPlacementStats() {
  const res = await fetch(`${BASE_URL}/placement/stats`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch placement statistics');
  return res.json();
}

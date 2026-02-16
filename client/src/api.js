const API_BASE = 'http://localhost:3001/api';

function getToken() {
    return localStorage.getItem('token');
}

async function request(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        throw new Error('Session expired');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || err.error || 'Request failed');
    }

    return res;
}

export async function uploadDocuments(files) {
    const formData = new FormData();
    for (const file of files) formData.append('documents', file);
    const res = await request('/upload', { method: 'POST', body: formData });
    return res.json();
}

export async function getJobs() {
    const res = await request('/jobs');
    return res.json();
}

export async function getJob(jobId) {
    const res = await request(`/jobs/${jobId}`);
    return res.json();
}

export async function runOCR(jobId) {
    const res = await request(`/jobs/${jobId}/ocr`, { method: 'POST' });
    return res.json();
}

export async function extractFields(jobId, selectedFields) {
    const res = await request(`/jobs/${jobId}/extract`, {
        method: 'POST',
        body: JSON.stringify({ selectedFields }),
    });
    return res.json();
}

export async function exportExcel(jobId) {
    const res = await request(`/jobs/${jobId}/export`, { method: 'POST' });
    return res.json();
}

export async function downloadExcel(jobId) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/jobs/${jobId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Download failed' }));
        throw new Error(err.detail || 'Download failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billscan_export_${jobId.slice(0, 8)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function retryJob(jobId) {
    const res = await request(`/jobs/${jobId}/retry`, { method: 'POST' });
    return res.json();
}

export async function deleteJob(jobId) {
    const res = await request(`/jobs/${jobId}`, { method: 'DELETE' });
    return res.json();
}

// Analytics
export const getAnalyticsStats = async () => {
    const res = await request('/analytics/stats');
    return res.json();
};

export function getPreviewUrl(jobId, docId) {
    const token = getToken();
    return `${API_BASE}/documents/${jobId}/${docId}/preview?token=${encodeURIComponent(token || '')}`;
}

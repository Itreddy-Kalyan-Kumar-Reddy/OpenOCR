import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, retryJob, deleteJob, downloadExcel } from '../api';

export default function JobsDashboard({ addToast }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try { setJobs(await getJobs()); }
        catch (err) { addToast(`Failed to load jobs: ${err.message}`, 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchJobs();
        const iv = setInterval(fetchJobs, 6000);
        return () => clearInterval(iv);
    }, []);

    const handleRetry = async (id) => { try { await retryJob(id); addToast('Job reset', 'info'); fetchJobs(); } catch (e) { addToast(e.message, 'error'); } };
    const handleDelete = async (id) => { try { await deleteJob(id); addToast('Job deleted', 'success'); fetchJobs(); } catch (e) { addToast(e.message, 'error'); } };
    const handleDownload = async (id) => { try { await downloadExcel(id); addToast('Excel downloaded', 'success'); } catch (e) { addToast(`Download failed: ${e.message}`, 'error'); } };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const docs = jobs.reduce((s, j) => s + (j.document_count || 0), 0);

    return (
        <div>
            <div className="page-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    Processing Jobs
                </h2>
                <p>Monitor OCR processing and download results</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{total}</div>
                        <div className="stat-label">Total Jobs</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{completed}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{docs}</div>
                        <div className="stat-label">Documents</div>
                    </div>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="spinner" /><p>Loading...</p></div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <h3>No jobs yet</h3>
                        <p>Upload your first billing document to get started</p>
                        <Link to="/upload" className="btn btn-primary" style={{ marginTop: 16 }}>Upload Documents</Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Documents</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr key={job.id}>
                                    <td>
                                        <Link to={`/jobs/${job.id}`} style={{ fontWeight: 600, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
                                            {job.id.slice(0, 8)}
                                        </Link>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{job.document_count}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: 3, fontSize: 11 }}>
                                            {job.document_count !== 1 ? 'files' : 'file'}
                                        </span>
                                    </td>
                                    <td><span className={`badge badge-${job.status}`}>{job.status}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{formatDate(job.created_at)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                            <Link to={`/jobs/${job.id}`} className="btn btn-secondary btn-sm">View</Link>
                                            {job.status === 'failed' && <button className="btn btn-secondary btn-sm" onClick={() => handleRetry(job.id)}>Retry</button>}
                                            {job.has_excel && <button className="btn btn-success btn-sm" onClick={() => handleDownload(job.id)}>Download</button>}
                                            <button className="btn-icon btn-sm" onClick={() => handleDelete(job.id)} title="Delete job">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

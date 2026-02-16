import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJob, runOCR, extractFields, exportExcel, downloadExcel, getPreviewUrl } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function JobDetail({ addToast }) {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [processingMsg, setProcessingMsg] = useState('');
    const [activeDocIdx, setActiveDocIdx] = useState(0);
    const [selectedFields, setSelectedFields] = useState([]);
    const [editingFields, setEditingFields] = useState(false);

    const fetchJob = async () => {
        try {
            const data = await getJob(id);
            setJob(data);
            const doc = data?.documents?.[activeDocIdx];
            if (doc?.detected_fields && selectedFields.length === 0) {
                const detected = doc.detected_fields.filter((f) => f.detected).map((f) => f.key);
                setSelectedFields(detected.length > 0 ? detected : doc.detected_fields.map((f) => f.key));
            }
        } catch (err) {
            addToast(`Failed to load job: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchJob(); }, [id]);

    // WebSocket Integration
    const { lastMessage } = useWebSocket(id);

    useEffect(() => {
        if (!lastMessage || lastMessage.job_id !== id) return;

        if (lastMessage.type === 'job_progress') {
            setProcessing(true);
            setProcessingMsg(`Processing document ${lastMessage.current_doc} of ${lastMessage.total_docs} (${lastMessage.progress}%)`);
            // Optimistically update status
            setJob(prev => ({ ...prev, status: 'processing' }));
        }

        if (lastMessage.type === 'job_completed' || lastMessage.type === 'job_failed') {
            setProcessing(false);
            fetchJob(); // Refresh to get the results
            if (lastMessage.type === 'job_completed') addToast('Job completed successfully', 'success');
            if (lastMessage.type === 'job_failed') addToast(`Job failed: ${lastMessage.error || 'Unknown error'}`, 'error');
        }
    }, [lastMessage, id]);

    const activeDoc = job?.documents?.[activeDocIdx];
    const hasOCR = !!activeDoc?.ocr_text;
    const hasExtracted = activeDoc?.extracted_fields?.length > 0;

    const handleRunOCR = async () => {
        setProcessing(true);
        setProcessingMsg('Running OCR text recognition...');
        try {
            const updated = await runOCR(id);
            setJob(updated);
            const doc = updated.documents?.[activeDocIdx];
            if (doc?.detected_fields) {
                const detected = doc.detected_fields.filter((f) => f.detected).map((f) => f.key);
                setSelectedFields(detected.length > 0 ? detected : doc.detected_fields.map((f) => f.key));
            }
            addToast('OCR complete', 'success');
        } catch (err) {
            addToast(`OCR failed: ${err.message}`, 'error');
            fetchJob();
        } finally {
            setProcessing(false);
        }
    };

    const handleExtract = async () => {
        if (!selectedFields.length) { addToast('Select at least one field', 'error'); return; }
        setProcessing(true);
        setProcessingMsg('Extracting structured data...');
        try {
            const updated = await extractFields(id, selectedFields);
            setJob(updated);
            setEditingFields(false);
            addToast('Extraction complete', 'success');
        } catch (err) {
            addToast(`Extraction failed: ${err.message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = async () => {
        setProcessing(true);
        setProcessingMsg('Generating Excel report...');
        try {
            await exportExcel(id);
            // Wait for backend to commit, then refresh
            const updated = await getJob(id);
            setJob(updated);
            // Now download
            await downloadExcel(id);
            addToast('Excel exported and downloaded', 'success');
        } catch (err) {
            addToast(`Export failed: ${err.message}`, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const toggleField = (key) => setSelectedFields((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
    const confClass = (c) => c >= 80 ? 'high' : c >= 50 ? 'medium' : 'low';
    const currentStep = !hasOCR ? 1 : (!hasExtracted || editingFields) ? 2 : 3;
    const showFieldSelection = hasOCR && (editingFields || !hasExtracted);

    if (loading) return <div className="empty-state"><div className="spinner" /><p>Loading job...</p></div>;
    if (!job) return (
        <div className="empty-state">
            <h3>Job not found</h3>
            <Link to="/jobs" className="btn btn-primary" style={{ marginTop: 12 }}>Back to Jobs</Link>
        </div>
    );

    return (
        <div>
            <Link to="/jobs" className="back-link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Jobs
            </Link>

            <div className="page-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Job Detail
                </h2>
                <p>
                    <code style={{ color: 'var(--brand)', background: 'var(--brand-muted)', padding: '1px 8px', borderRadius: 5, fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{id.slice(0, 8)}</code>
                    {' · '}
                    <span className={`badge badge-${job.status}`}>{job.status}</span>
                    {' · '}
                    {job.documents?.length} document{job.documents?.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Step Progress */}
            <div className="steps-bar">
                <div className={`step-item ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
                    <div className="step-dot">{currentStep > 1 ? '✓' : '1'}</div>
                    <div className="step-label">OCR Scan</div>
                </div>
                <div className={`step-connector ${currentStep > 1 ? 'done' : ''}`} />
                <div className={`step-item ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
                    <div className="step-dot">{currentStep > 2 ? '✓' : '2'}</div>
                    <div className="step-label">Extract Fields</div>
                </div>
                <div className={`step-connector ${currentStep > 2 ? 'done' : ''}`} />
                <div className={`step-item ${job.has_excel ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
                    <div className="step-dot">{job.has_excel ? '✓' : '3'}</div>
                    <div className="step-label">Export</div>
                </div>
            </div>

            {/* Document Tabs */}
            {job.documents?.length > 1 && (
                <div className="doc-tabs">
                    {job.documents.map((doc, idx) => (
                        <button key={doc.id} className={`doc-tab ${idx === activeDocIdx ? 'active' : ''}`} onClick={() => setActiveDocIdx(idx)}>
                            {doc.original_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="actions-bar" style={{ marginBottom: 16 }}>
                {!hasOCR && (
                    <button className="btn btn-primary" onClick={handleRunOCR} disabled={processing}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Run OCR
                    </button>
                )}
                {showFieldSelection && (
                    <button className="btn btn-primary" onClick={handleExtract} disabled={processing || !selectedFields.length}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Extract ({selectedFields.length})
                    </button>
                )}
                {hasExtracted && !editingFields && (
                    <>
                        <button className="btn btn-success" onClick={handleExport} disabled={processing}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export Excel
                        </button>
                        <div className="actions-divider" />
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingFields(true)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Fields
                        </button>
                    </>
                )}
                {hasOCR && (
                    <>
                        <div className="actions-divider" />
                        <button className="btn btn-ghost btn-sm" onClick={handleRunOCR} disabled={processing}>Re-run OCR</button>
                    </>
                )}
            </div>

            {/* Preview + Data */}
            <div className="preview-grid">
                {/* Left: Preview */}
                <div className="panel">
                    <div className="panel-header">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                        Document Preview
                    </div>
                    <div className="panel-body">
                        {activeDoc && (/\.(png|jpg|jpeg|bmp|tiff?|webp)$/i.test(activeDoc.original_name) ? (
                            <img
                                src={getPreviewUrl(job.id, activeDoc.id)}
                                alt={activeDoc.original_name}
                                className="preview-image"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)"><p>Preview unavailable</p></div>`;
                                }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <p style={{ fontWeight: 600, fontSize: 12.5 }}>{activeDoc.original_name}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-dimmed)', marginTop: 3 }}>PDF preview not available — OCR will process this file</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: OCR / Fields / Results */}
                <div className="panel">
                    <div className="panel-header">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        {hasExtracted && !editingFields ? 'Extracted Data' : hasOCR ? 'Field Selection' : 'OCR Output'}
                    </div>
                    <div className="panel-body">
                        {!hasOCR && (
                            <div className="empty-state" style={{ padding: 28 }}>
                                <div className="empty-icon">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <h3>Waiting for OCR</h3>
                                <p>Click "Run OCR" to extract text from this document</p>
                            </div>
                        )}

                        {/* Field Selection */}
                        {showFieldSelection && activeDoc?.detected_fields && (
                            <div className="field-section">
                                <div className="field-section-header">
                                    <span className="field-section-title">Select fields to extract</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFields(activeDoc.detected_fields.map((f) => f.key))}>All</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFields([])}>Clear</button>
                                    </div>
                                </div>
                                <div className="field-grid">
                                    {activeDoc.detected_fields.map((field) => (
                                        <label key={field.key} className={`field-chip ${selectedFields.includes(field.key) ? 'checked' : ''}`}>
                                            <input type="checkbox" checked={selectedFields.includes(field.key)} onChange={() => toggleField(field.key)} />
                                            {field.detected && <span className="detected-dot" title="Detected in OCR text" />}
                                            {field.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extracted Results */}
                        {hasExtracted && !editingFields && (
                            <table className="data-table" style={{ margin: '-14px', width: 'calc(100% + 28px)' }}>
                                <thead>
                                    <tr><th>Field</th><th>Value</th><th>Confidence</th></tr>
                                </thead>
                                <tbody>
                                    {activeDoc.extracted_fields.map((f) => (
                                        <tr key={f.key}>
                                            <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{f.label}</td>
                                            <td>
                                                {f.value
                                                    ? <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.value}</span>
                                                    : <span style={{ color: 'var(--text-dimmed)', fontStyle: 'italic' }}>Not found</span>
                                                }
                                            </td>
                                            <td>
                                                {f.value ? (
                                                    <div className="confidence-container">
                                                        <div className="confidence-track">
                                                            <div className={`confidence-fill ${confClass(f.confidence)}`} style={{ width: `${f.confidence}%` }} />
                                                        </div>
                                                        <span className="confidence-text">{f.confidence}%</span>
                                                    </div>
                                                ) : <span style={{ color: 'var(--text-dimmed)' }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* OCR Text */}
                        {hasOCR && showFieldSelection && (
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 14 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dimmed)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    Raw OCR Text · {Math.round(activeDoc.ocr_confidence || 0)}% confidence
                                </div>
                                <pre className="ocr-text">{activeDoc.ocr_text}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {processing && (
                <div className="progress-overlay">
                    <div className="progress-card">
                        <div className="spinner" />
                        <h3>{processingMsg}</h3>
                        <p>This may take a moment depending on document complexity</p>
                    </div>
                </div>
            )}
        </div>
    );
}

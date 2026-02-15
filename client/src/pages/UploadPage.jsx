import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocuments } from '../api';

export default function UploadPage({ addToast }) {
    const [files, setFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const handleFiles = useCallback((newFiles) => {
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp'];
        const valid = Array.from(newFiles).filter((f) => {
            const ext = '.' + f.name.split('.').pop().toLowerCase();
            return allowed.includes(ext);
        });
        if (valid.length < newFiles.length) addToast('Some files skipped (unsupported format)', 'error');
        setFiles((prev) => [...prev, ...valid]);
    }, [addToast]);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const formatSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    const handleUpload = async () => {
        if (!files.length) return;
        setUploading(true);
        try {
            const job = await uploadDocuments(files);
            addToast(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`, 'success');
            setFiles([]);
            navigate(`/jobs/${job.id}`);
        } catch (err) {
            addToast(`Upload failed: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Documents
                </h2>
                <p>Upload billing documents for OCR processing and data extraction</p>
            </div>

            <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('file-input').click()}
            >
                <div className="upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <h3>Drop files here or click to browse</h3>
                <p>Supports PDF, PNG, JPG, TIFF — up to 20 MB per file</p>
                <p className="file-types">
                    <span>PDF</span><span>·</span><span>PNG</span><span>·</span>
                    <span>JPG</span><span>·</span><span>TIFF</span><span>·</span><span>BMP</span>
                </p>
                <input
                    id="file-input" type="file" multiple
                    accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
            </div>

            {files.length > 0 && (
                <>
                    <div className="file-list">
                        {files.map((file, idx) => (
                            <div className="file-item" key={idx}>
                                <div className="file-item-info">
                                    <div className="file-item-icon">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="file-item-name">{file.name}</div>
                                        <div className="file-item-size">{formatSize(file.size)}</div>
                                    </div>
                                </div>
                                <button className="file-item-remove" onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((_, i) => i !== idx)); }}>✕</button>
                            </div>
                        ))}
                    </div>
                    <div className="actions-bar">
                        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setFiles([])}>Clear all</button>
                    </div>
                </>
            )}

            {uploading && (
                <div className="progress-overlay">
                    <div className="progress-card">
                        <div className="spinner" />
                        <h3>Uploading documents</h3>
                        <p>Storing {files.length} file{files.length > 1 ? 's' : ''} securely...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

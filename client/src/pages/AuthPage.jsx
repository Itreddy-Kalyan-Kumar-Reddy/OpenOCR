import { useState } from 'react';

export default function AuthPage({ onAuth }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
            const body = mode === 'signup' ? { email, name, password } : { email, password };
            const res = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Authentication failed');
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onAuth(data.user, data.access_token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="app-bg" />
            <div className="auth-page">
                {/* Left Panel — Branding */}
                <div className="auth-left">
                    <div className="auth-left-content">
                        <h1>Intelligent document processing, powered by AI.</h1>
                        <p>
                            Extract billing data from invoices, receipts, and purchase orders with enterprise-grade OCR accuracy.
                        </p>
                        <div className="auth-features">
                            <div className="auth-feature">
                                <div className="auth-feature-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                EasyOCR-powered text extraction with 95%+ accuracy
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                    </svg>
                                </div>
                                AI key-value extraction for 12+ billing fields
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                One-click Excel export with structured data
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                Secure JWT authentication & user isolation
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel — Auth Form */}
                <div className="auth-right">
                    <div className="auth-container">
                        <div className="auth-card">
                            <div className="auth-logo">
                                <div className="auth-logo-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <h1>BillScan AI</h1>
                                <p>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</p>
                            </div>

                            {error && <div className="auth-error">{error}</div>}

                            <form className="auth-form" onSubmit={handleSubmit}>
                                {mode === 'signup' && (
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input type="text" className="form-input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" className="form-input" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" className="form-input" placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'signup' ? 6 : undefined} />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
                                    {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                </button>
                            </form>

                            <div className="auth-toggle">
                                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
                                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

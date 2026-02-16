import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import UploadPage from './pages/UploadPage';
import JobsDashboard from './pages/JobsDashboard';
import JobDetail from './pages/JobDetail';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleAuth = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  if (loading) return null;
  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <BrowserRouter>
      <div className="app-bg" />
      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-inner">
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <h1>BillScan AI</h1>
                <small>Document OCR</small>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-label">Workspace</div>
              <div className="sidebar-nav">
                <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span>Upload</span>
                </NavLink>
                <NavLink to="/jobs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                  </span>
                  <span>Jobs</span>
                </NavLink>
              </div>
            </div>

            <div className="sidebar-footer">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

              <div className="sidebar-user-info">
                <div className="sidebar-avatar">{user.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div>
                  <div className="sidebar-user-name">{user.name}</div>
                  <div className="sidebar-user-email">{user.email}</div>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage addToast={addToast} />} />
            <Route path="/jobs" element={<JobsDashboard addToast={addToast} />} />
            <Route path="/jobs/:id" element={<JobDetail addToast={addToast} />} />
          </Routes>
        </main>

        {toasts.length > 0 && (
          <div className="toast-container">
            {toasts.map((t) => (
              <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
            ))}
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;

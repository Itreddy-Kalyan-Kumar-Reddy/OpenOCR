import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalyticsStats } from '../api';

export default function DashboardCharts() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await getAnalyticsStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) return <div className="stats-grid-skeleton" />;
    if (!stats) return null;

    return (
        <div>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{stats.total_jobs}</div>
                        <div className="stat-label">Total Jobs</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{stats.total_documents}</div>
                        <div className="stat-label">Documents Processed</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{stats.avg_processing_time}s</div>
                        <div className="stat-label">Avg Process Time</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-text">
                        <div className="stat-value">{stats.avg_confidence}%</div>
                        <div className="stat-label">Avg Confidence</div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            {stats.chart_data && stats.chart_data.length > 0 && (
                <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: '24px 24px 12px 0' }}>
                    <div style={{ paddingLeft: 24, marginBottom: 16, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                        DOCUMENTS PROCESSED (LAST 7 DAYS)
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <AreaChart data={stats.chart_data}>
                                <defs>
                                    <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-dimmed)' }} axisLine={false} tickLine={false} tickFormatter={(str) => str.slice(5)} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-dimmed)' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="docs" stroke="var(--brand)" strokeWidth={2} fillOpacity={1} fill="url(#colorDocs)" activeDot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { getUsers, getPromptTemplates } from '../../utils/storage';
import { firebaseProjectId, isFirebaseEnabled } from '../../utils/firebase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, admins: 0, templates: 0, regularUsers: 0 });

  useEffect(() => {
    let mounted = true;
    Promise.all([getUsers(), getPromptTemplates()]).then(([users, templates]) => {
      if (!mounted) return;
      setStats({
      users: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length,
      templates: templates.length,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>📊 Admin Dashboard</h1>
        <p className="page-subtitle">System overview and analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(0,240,255,0.15)', color: 'var(--neon-cyan)' }}>👥</div>
          <div className="stat-content">
            <span className="stat-number">{stats.users}</span>
            <span className="stat-desc">Total Users</span>
          </div>
          <div className="stat-glow cyan"></div>
        </div>

        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(112,0,255,0.15)', color: 'var(--neon-purple)' }}>👑</div>
          <div className="stat-content">
            <span className="stat-number">{stats.admins}</span>
            <span className="stat-desc">Administrators</span>
          </div>
          <div className="stat-glow purple"></div>
        </div>

        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(0,255,102,0.15)', color: '#00FF66' }}>👤</div>
          <div className="stat-content">
            <span className="stat-number">{stats.regularUsers}</span>
            <span className="stat-desc">Regular Users</span>
          </div>
          <div className="stat-glow green"></div>
        </div>

        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(255,0,85,0.15)', color: 'var(--neon-pink)' }}>📝</div>
          <div className="stat-content">
            <span className="stat-number">{stats.templates}</span>
            <span className="stat-desc">Prompt Templates</span>
          </div>
          <div className="stat-glow pink"></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-section glass-panel">
        <div className="card-header">
          <h3>⚡ Quick Actions</h3>
          <div className="glow-line"></div>
        </div>
        <div className="quick-actions-grid">
          <a href="/admin/users" className="quick-action-card">
            <span className="qa-icon">➕</span>
            <span className="qa-title">Add New User</span>
            <span className="qa-desc">Create a new user account</span>
          </a>
          <a href="/admin/prompts" className="quick-action-card">
            <span className="qa-icon">📝</span>
            <span className="qa-title">Manage Prompts</span>
            <span className="qa-desc">Edit or create prompt templates</span>
          </a>
          <a href="/settings" className="quick-action-card">
            <span className="qa-icon">⚙️</span>
            <span className="qa-title">System Settings</span>
            <span className="qa-desc">Configure API and preferences</span>
          </a>
        </div>
      </div>

      {/* System Info */}
      <div className="admin-section glass-panel">
        <div className="card-header">
          <h3>🖥️ System Info</h3>
          <div className="glow-line"></div>
        </div>
        <div className="system-info-grid">
          <div className="info-row">
            <span className="info-label">Application</span>
            <span className="info-value">AI Prompt Generator Pro</span>
          </div>
          <div className="info-row">
            <span className="info-label">Version</span>
            <span className="info-value neon-text">2.0.0 — React Edition</span>
          </div>
          <div className="info-row">
            <span className="info-label">Framework</span>
            <span className="info-value">Vite + React</span>
          </div>
          <div className="info-row">
            <span className="info-label">Storage</span>
            <span className="info-value">{isFirebaseEnabled ? 'Cloud Firestore' : 'localStorage fallback'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Firebase Project</span>
            <span className="info-value">{firebaseProjectId || 'Not configured'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Firestore Collections</span>
            <span className="info-value">users, promptTemplates, userSettings, usageLogs, generationHistory</span>
          </div>
        </div>
      </div>
    </div>
  );
}

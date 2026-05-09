import { useEffect, useMemo, useState } from 'react';
import { AI_MODELS } from '../../utils/api';
import { getUsageSummary } from '../../utils/storage';

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
};

export default function UsageMonitor() {
  const [summary, setSummary] = useState({ logs: [], users: [], totals: { runs: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 } });
  const [selectedUser, setSelectedUser] = useState('all');

  useEffect(() => {
    let mounted = true;
    getUsageSummary().then(data => {
      if (mounted) setSummary(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const logs = useMemo(() => {
    if (selectedUser === 'all') return summary.logs;
    return summary.logs.filter(log => log.username === selectedUser);
  }, [selectedUser, summary.logs]);

  const modelLabel = (model) => AI_MODELS.find(item => item.value === model)?.label || model;

  return (
    <div className="usage-monitor">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Token Usage</h1>
          <p className="page-subtitle">Monitor token usage by user, model, and run.</p>
        </div>
        <div className="select-wrapper usage-user-filter">
          <select className="cyber-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">All Users</option>
            {summary.users.map(user => (
              <option key={user.username} value={user.username}>{user.username}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(0,240,255,0.15)', color: 'var(--neon-cyan)' }}>#</div>
          <div className="stat-content">
            <span className="stat-number">{formatNumber(summary.totals.runs)}</span>
            <span className="stat-desc">Total Runs</span>
          </div>
          <div className="stat-glow cyan"></div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(112,0,255,0.15)', color: 'var(--neon-purple)' }}>IN</div>
          <div className="stat-content">
            <span className="stat-number">{formatNumber(summary.totals.promptTokens)}</span>
            <span className="stat-desc">Prompt Tokens</span>
          </div>
          <div className="stat-glow purple"></div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(0,255,102,0.15)', color: '#00FF66' }}>OUT</div>
          <div className="stat-content">
            <span className="stat-number">{formatNumber(summary.totals.completionTokens)}</span>
            <span className="stat-desc">Completion Tokens</span>
          </div>
          <div className="stat-glow green"></div>
        </div>
        <div className="admin-stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(255,0,85,0.15)', color: 'var(--neon-pink)' }}>SUM</div>
          <div className="stat-content">
            <span className="stat-number">{formatNumber(summary.totals.totalTokens)}</span>
            <span className="stat-desc">Total Tokens</span>
          </div>
          <div className="stat-glow pink"></div>
        </div>
      </div>

      <div className="usage-grid">
        <div className="glass-panel usage-panel">
          <div className="card-header">
            <h3>User Totals</h3>
            <div className="glow-line"></div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Runs</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {summary.users.map(user => (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{formatNumber(user.runs)}</td>
                    <td>{formatNumber(user.promptTokens)}</td>
                    <td>{formatNumber(user.completionTokens)}</td>
                    <td><strong>{formatNumber(user.totalTokens)}</strong></td>
                    <td className="date-cell">{formatDate(user.lastUsedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.users.length === 0 && <div className="empty-state-mini">No usage recorded yet.</div>}
          </div>
        </div>

        <div className="glass-panel usage-panel">
          <div className="card-header">
            <h3>Run History</h3>
            <div className="glow-line"></div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table usage-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Model</th>
                  <th>Key</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="date-cell">{formatDate(log.createdAt)}</td>
                    <td>{log.username}</td>
                    <td>{log.action}</td>
                    <td className="usage-model">{modelLabel(log.usedModel)}</td>
                    <td>{log.apiKeySource}</td>
                    <td>{formatNumber(log.promptTokens)}</td>
                    <td>{formatNumber(log.completionTokens)}</td>
                    <td><strong>{formatNumber(log.totalTokens)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="empty-state-mini">No runs for this filter.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

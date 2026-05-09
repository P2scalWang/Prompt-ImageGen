import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="glass-sidebar">
      <div className="sidebar-header">
        <div className="brand-mini">
          <span className="brand-icon">✨</span>
          <div style={{ flex: 1 }}>
            <h2>PROMPT PRO</h2>
            <p>Cinematic Edition</p>
          </div>
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <nav className="sidebar-nav custom-scrollbar">
        {/* User section */}
        <div className="nav-section">
          <span className="nav-section-title">WORKSPACE</span>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🚀</span>
            <span>Generator</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">H</span>
            <span>History</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </NavLink>
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="nav-section">
            <span className="nav-section-title">ADMIN CONTROL</span>
            <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/prompts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📝</span>
              <span>Prompt Manager</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👥</span>
              <span>User Manager</span>
            </NavLink>
            <NavLink to="/admin/usage" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">#</span>
              <span>Token Usage</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer-area">
        <div className="user-info-card">
          <div className="user-avatar">
            {isAdmin ? '👑' : '👤'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.username}</span>
            <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
              {isAdmin ? 'ADMIN' : 'USER'}
            </span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Logout">
          <span>🚪</span>
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}

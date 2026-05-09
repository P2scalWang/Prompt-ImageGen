import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Shared/AlertToast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(async () => {
      const result = await login(username, password);
      if (result.success) {
        showToast('SESSION INITIALIZED', 'success');
        navigate(result.user.role === 'admin' ? '/admin' : '/');
      } else {
        showToast(`❌ ${result.error}`, 'error');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="login-wrapper">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-grid"></div>

      <div className="glass-panel login-box">
        <div className="brand-header">
          <div className="logo-glow">🎬</div>
          <h1>AI Prompt Generator Pro</h1>
          <p>The Ultimate Storyboard Creation Suite</p>
        </div>

        <form className="cyber-form" onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <label>Username</label>
            <div className="input-line"></div>
          </div>

          <div className="input-field">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <label>Password</label>
            <div className="input-line"></div>
          </div>

          <button
            type="submit"
            className={`btn-glow primary-glow ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            <span>{isLoading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}</span>
          </button>
        </form>

        <div className="auth-hint">
          <p>System Credentials:</p>
          <div className="hint-tags">
            <span className="tag">admin / admin123</span>
            <span className="tag">user1 / pass123</span>
          </div>
        </div>
      </div>
    </div>
  );
}

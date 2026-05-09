import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Shared/AlertToast';
import { getEffectiveApiConfig, getUserSettings, saveUserSettings } from '../../utils/storage';
import { AI_MODELS, FREE_AI_MODELS } from '../../utils/api';

export default function UserSettings() {
  const { user } = useAuth();
  const showToast = useToast();

  const [settings, setSettings] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [effectiveApi, setEffectiveApi] = useState({ apiKey: '', source: 'missing', canChangeModel: false });

  useEffect(() => {
    let mounted = true;
    getUserSettings(user.username).then(data => {
      if (!mounted) return;
      setSettings(data);
    });
    return () => {
      mounted = false;
    };
  }, [user.username]);

  useEffect(() => {
    if (!settings) return;
    let mounted = true;
    getEffectiveApiConfig(user.username, settings.selectedModel).then(data => {
      if (!mounted) return;
      setEffectiveApi(data);
    });
    return () => {
      mounted = false;
    };
  }, [settings, user.username]);

  if (!settings) return null;

  const apiStatus = settings.apiKey
    ? 'ACTIVE'
    : effectiveApi.source === 'admin-shared'
      ? 'SHARED'
      : 'MISSING';

  const handleSave = async () => {
    await saveUserSettings(user.username, settings);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme: settings.theme } }));
    showToast('CONFIGURATION SAVED', 'success');
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTheme = async (theme) => {
    const nextSettings = { ...settings, theme };
    setSettings(nextSettings);
    await saveUserSettings(user.username, nextSettings);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ User Settings</h1>
        <p className="page-subtitle">Configure your workspace environment</p>
      </div>

      <div className="settings-grid">
        {/* API Configuration */}
        <div className="settings-card glass-panel">
          <div className="card-header">
            <h3>🔑 API Configuration</h3>
            <div className="glow-line"></div>
          </div>
          <div className="card-body">
            <div className="cyber-input-group">
              <label>OpenRouter API Key *</label>
              <div className="api-key-input">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="cyber-text-input"
                  value={settings.apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  placeholder="sk-or-v1-..."
                />
                <button
                  className="toggle-visibility"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="helper-text">
                Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai</a>
              </div>
              {!settings.apiKey && effectiveApi.source === 'admin-shared' && (
                <div className="helper-text">
                  Admin shared API configuration is active. Model selection is managed by admin.
                </div>
              )}
            </div>

            {settings.apiKey ? (
              <>
                <div className="cyber-input-group">
                  <label>{user.role === 'admin' ? 'Admin Personal Model' : 'AI Model Engine'}</label>
                  <div className="select-wrapper">
                    <select
                      className="cyber-select"
                      value={settings.selectedModel}
                      onChange={(e) => updateSetting('selectedModel', e.target.value)}
                    >
                      {AI_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div className="cyber-input-group">
                    <label>Model for Users Without API Key</label>
                    <div className="select-wrapper">
                      <select
                        className="cyber-select"
                        value={settings.sharedUserModel || FREE_AI_MODELS[0].value}
                        onChange={(e) => updateSetting('sharedUserModel', e.target.value)}
                      >
                        {FREE_AI_MODELS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="helper-text">
                      This model is only for users who do not add their own API key.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="cyber-input-group">
                <label>AI Model Engine</label>
                <div className="helper-text">
                  Locked by admin until you add your own API key.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Stats */}
        <div className="settings-card glass-panel">
          <div className="card-header">
            <h3>📊 Workspace Stats</h3>
            <div className="glow-line"></div>
          </div>
          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value neon-text">{settings.generationCount || 0}</span>
                <span className="stat-label">Total Generations</span>
              </div>
              <div className="stat-item">
                <span className="stat-value" style={{ color: 'var(--neon-purple)' }}>{user.role.toUpperCase()}</span>
                <span className="stat-label">Account Type</span>
              </div>
              <div className="stat-item">
                <span className="stat-value" style={{ color: apiStatus === 'MISSING' ? 'var(--neon-pink)' : '#00FF66' }}>{apiStatus}</span>
                <span className="stat-label">API Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="settings-card glass-panel">
          <div className="card-header">
            <h3>👤 Account Info</h3>
            <div className="glow-line"></div>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Theme</span>
              <div className="select-wrapper theme-dropdown">
                <select
                  className="cyber-select"
                  value={settings.theme || 'light'}
                  onChange={(e) => updateTheme(e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
            {settings.apiKey && (
              <div className="info-row">
                <span className="info-label">Current Model</span>
                <span className="info-value">{AI_MODELS.find(m => m.value === settings.selectedModel)?.label || settings.selectedModel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-glow primary-glow" onClick={handleSave}>
          <span>💾 SAVE CONFIGURATION</span>
        </button>
      </div>
    </div>
  );
}

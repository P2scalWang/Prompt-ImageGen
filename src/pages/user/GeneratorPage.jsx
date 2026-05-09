import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Shared/AlertToast';
import { callOpenRouter, buildPrompt, buildModificationPrompt, AI_MODELS, CONTENT_MODES, MOODS, PLATFORMS } from '../../utils/api';
import {
  getEffectiveApiConfig,
  getPromptTemplates,
  getUserSettings,
  recordUsageLog,
  saveGeneratedHistory,
  saveUserSettings,
} from '../../utils/storage';

export default function GeneratorPage() {
  const { user } = useAuth();
  const showToast = useToast();
  const [templates, setTemplates] = useState([]);

  // Form state
  const [productDetails, setProductDetails] = useState('');
  const [selectedMode, setSelectedMode] = useState('hardsell');
  const [sceneCount, setSceneCount] = useState(5);
  const [mood, setMood] = useState('cinematic-standard');
  const [platform, setPlatform] = useState('tiktok');
  const [selectedTemplateId, setSelectedTemplateId] = useState(1);

  // Result state
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState({});

  // Chat console state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [targetScene, setTargetScene] = useState('all');

  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, sceneIndex: -1, field: '', value: '' });

  const getModelLabel = (modelValue) => AI_MODELS.find(m => m.value === modelValue)?.label || modelValue;

  useEffect(() => {
    let mounted = true;
    Promise.all([getUserSettings(user.username), getPromptTemplates()]).then(([userSettings, promptTemplates]) => {
      if (!mounted) return;
      setSelectedTemplateId(userSettings.selectedTemplateId || 1);
      setTemplates(promptTemplates);
    });
    return () => {
      mounted = false;
    };
  }, [user.username]);

  const handleGenerate = async () => {
    const currentSettings = await getUserSettings(user.username);
    const effectiveApi = await getEffectiveApiConfig(user.username, currentSettings.selectedModel);
    if (!effectiveApi.apiKey) {
      showToast('ERROR: No API key available. Add your key or ask admin to configure shared free key.', 'error');
      return;
    }
    if (!productDetails.trim()) {
      showToast('ERROR: Product Details Required', 'error');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
      showToast('ERROR: No prompt template selected', 'error');
      return;
    }

    const modeName = CONTENT_MODES.find(m => m.value === selectedMode)?.name || selectedMode;
    const input = {
      product: productDetails,
      style: modeName,
      mood,
      platform,
      sceneCount,
      model: effectiveApi.canChangeModel ? effectiveApi.selectedModel : '',
    };
    setCurrentInput(input);
    setIsLoading(true);
    setChatOpen(true);

    try {
      const prompt = buildPrompt(template.template, {
        style: modeName,
        product: productDetails,
        sceneCount,
        mood,
        platform,
      });

      const data = await callOpenRouter({
        apiKey: effectiveApi.apiKey,
        model: effectiveApi.selectedModel,
        prompt,
      });

      setResult(data);
      const usedModel = data.__usedModel || effectiveApi.selectedModel;
      setCurrentInput(prev => ({ ...prev, model: effectiveApi.canChangeModel ? usedModel : '' }));

      // Increment generation count
      const updated = {
        ...currentSettings,
        selectedModel: effectiveApi.canChangeModel ? usedModel : currentSettings.selectedModel,
        generationCount: (currentSettings.generationCount || 0) + 1,
      };
      await saveUserSettings(user.username, updated);

      if (effectiveApi.canChangeModel && usedModel !== currentSettings.selectedModel) {
        showToast(`AUTO SWITCHED TO ${getModelLabel(usedModel)}`, 'success');
      } else {
        showToast('STORYBOARD SYNTHESIZED SUCCESSFULLY', 'success');
      }

      await recordUsageLog({
        username: user.username,
        action: 'generate',
        requestedModel: effectiveApi.selectedModel,
        usedModel,
        apiKeySource: effectiveApi.source,
        usage: data.__usage,
        sceneCount,
        product: productDetails,
        fallbackModels: data.__fallbackModels || [],
      });

      await saveGeneratedHistory({
        username: user.username,
        title: data.product_name || productDetails,
        action: 'generate',
        input: { ...input, model: effectiveApi.canChangeModel ? usedModel : '' },
        result: data,
        usage: data.__usage,
      });
    } catch (error) {
      showToast(`SYSTEM ERROR: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModification = async (modification) => {
    if (!result) return;
    const currentSettings = await getUserSettings(user.username);
    const effectiveApi = await getEffectiveApiConfig(user.username, currentSettings.selectedModel);
    if (!effectiveApi.apiKey) {
      showToast('ERROR: No API key available. Add your key or ask admin to configure shared free key.', 'error');
      return;
    }
    setIsLoading(true);

    try {
      const prompt = buildModificationPrompt(modification, result);
      const data = await callOpenRouter({
        apiKey: effectiveApi.apiKey,
        model: effectiveApi.selectedModel,
        prompt,
      });
      setResult(data);
      const usedModel = data.__usedModel || effectiveApi.selectedModel;
      if (effectiveApi.canChangeModel && usedModel !== currentSettings.selectedModel) {
        const updatedSettings = { ...currentSettings, selectedModel: usedModel };
        await saveUserSettings(user.username, updatedSettings);
        setCurrentInput(prev => ({ ...prev, model: usedModel }));
        showToast(`AUTO SWITCHED TO ${getModelLabel(usedModel)}`, 'success');
      } else {
        showToast('OVERRIDE APPLIED', 'success');
      }

      await recordUsageLog({
        username: user.username,
        action: 'modify',
        requestedModel: effectiveApi.selectedModel,
        usedModel,
        apiKeySource: effectiveApi.source,
        usage: data.__usage,
        sceneCount: result.scenes?.length || 0,
        product: currentInput.product || result.product_name || '',
        fallbackModels: data.__fallbackModels || [],
      });

      await saveGeneratedHistory({
        username: user.username,
        title: data.product_name || currentInput.product || result.product_name,
        action: 'modify',
        input: { ...currentInput, model: effectiveApi.canChangeModel ? usedModel : '' },
        result: data,
        usage: data.__usage,
      });
    } catch (error) {
      showToast(`SYSTEM ERROR: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !result) return;
    const fullMsg = targetScene !== 'all'
      ? `แก้ไขเฉพาะฉากที่ ${result.scenes[parseInt(targetScene)].scene_number}: ${chatInput}`
      : `แก้ไขทุกฉาก: ${chatInput}`;
    setChatInput('');
    handleModification(fullMsg);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const copyAll = () => {
    if (!result) return;
    const allText = result.scenes.map(s =>
      `[SCENE ${s.scene_number} - ${s.scene_title || ''}]\nSpeaker: ${s.speaker || ''}\nDialogue: ${s.dialogue || ''}\nAction: ${s.action || ''}\n\n[IMAGE PROMPT]\n${s.image_prompt || ''}\n\n[VIDEO/AUDIO PROMPT]\n${s.video_audio_prompt || s.video_prompt || ''}`
    ).join('\n\n=========================================\n\n');
    copyToClipboard(allText, 'Full storyboard');
  };

  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  };

  const handleSaveEdit = () => {
    if (editModal.sceneIndex >= 0) {
      const updated = { ...result };
      updated.scenes = [...updated.scenes];
      updated.scenes[editModal.sceneIndex] = {
        ...updated.scenes[editModal.sceneIndex],
        [editModal.field]: editModal.value,
      };
      setResult(updated);
      setEditModal({ open: false, sceneIndex: -1, field: '', value: '' });
      showToast('Override applied', 'success');
    }
  };

  return (
    <div className="generator-page">
      {/* Controls Sidebar Panel */}
      <div className="generator-controls glass-panel">
        <h3 className="section-title">CORE PARAMETERS</h3>

        {/* Prompt Template Selector */}
        <div className="cyber-input-group">
          <label>Prompt Template</label>
          <div className="select-wrapper">
            <select
              className="cyber-select"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="helper-text">Template managed by Admin</div>
        </div>

        <div className="cyber-input-group">
          <label>Product / Subject Matter *</label>
          <textarea
            id="productDetails"
            placeholder="Ex: เครื่องตัดหญ้าไร้สาย / Hard Sell Focus"
            value={productDetails}
            onChange={(e) => setProductDetails(e.target.value)}
          />
        </div>

        <div className="cyber-input-group">
          <label>Content Strategy *</label>
          <div className="pill-selector">
            {CONTENT_MODES.map(m => (
              <div
                key={m.value}
                className={`pill ${selectedMode === m.value ? 'active' : ''}`}
                onClick={() => setSelectedMode(m.value)}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        <div className="cyber-input-group">
          <div className="slider-header">
            <label>Scene Count</label>
            <span className="neon-value">{sceneCount}</span>
          </div>
          <input
            type="range"
            className="cyber-slider"
            min="3"
            max="15"
            value={sceneCount}
            onChange={(e) => setSceneCount(Number(e.target.value))}
          />
        </div>

        <div className="cyber-input-group">
          <label>Cinematic Mood & Tone</label>
          <div className="select-wrapper">
            <select className="cyber-select" value={mood} onChange={(e) => setMood(e.target.value)}>
              {MOODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="cyber-input-group">
          <label>Target Platform</label>
          <div className="select-wrapper">
            <select className="cyber-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="btn-glow generate-glow"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          <span className="btn-icon">🚀</span>
          <span>{isLoading ? 'SYNTHESIZING...' : 'GENERATE STORYBOARD'}</span>
        </button>
      </div>

      {/* Main Result Area */}
      <div className="generator-result">
        {/* Header */}
        {result && (
          <header className="canvas-header glass-panel">
            <div className="project-info">
              <h2>{result.product_name || currentInput.product}</h2>
              <div className="status-badges">
                <span className="status-badge pulse-blue">{currentInput.style}</span>
                <span className="status-badge pulse-purple">{currentInput.mood}</span>
                {currentInput.model && <span className="status-badge pulse-green">{getModelLabel(currentInput.model)}</span>}
              </div>
            </div>
            <div className="header-tools">
              <button className="tool-btn" onClick={copyAll}>
                <span>📋</span> Copy Full Board
              </button>
              <button className="tool-btn accent" onClick={exportJSON}>
                <span>💾</span> Export Data
              </button>
            </div>
          </header>
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="state-panel empty">
            <div className="hologram-icon">🌌</div>
            <h3>WORKSPACE READY</h3>
            <p>Configure parameters on the left and initialize generation.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="state-panel loading">
            <div className="cyber-loader">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
              <div className="core"></div>
            </div>
            <h3>SYNTHESIZING DATA...</h3>
            <p className="loading-text">AI is crafting your production storyboard</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="result-workspace">
            {/* Overview Dashboard */}
            <div className="dashboard-panel glass-panel">
              <div className="dashboard-header">
                <div className="title-with-line">
                  <h3>📊 PROJECT OVERVIEW</h3>
                  <div className="glow-line"></div>
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="dash-card input-summary">
                  <h4>INPUT LOG:</h4>
                  <p>Target: <strong>{currentInput.product}</strong></p>
                  <p>Style: <strong>{currentInput.style}</strong></p>
                  <p>Mood: <strong>{currentInput.mood}</strong></p>
                  {currentInput.model && <p>Model: <strong>{getModelLabel(currentInput.model)}</strong></p>}
                </div>
                <div className="dash-card scene-summary custom-scrollbar">
                  <h4>TIMELINE OVERVIEW:</h4>
                  {result.scenes.map(s => (
                    <div className="scene-row" key={s.scene_number}>
                      <div className="sc-num">S{String(s.scene_number).padStart(2, '0')}</div>
                      <div className="sc-info">
                        <p><strong>[{s.speaker || 'N/A'}]</strong> "{s.dialogue || ''}"</p>
                        <p style={{ color: 'var(--text-tertiary)' }}>{s.action || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dash-card social-assets">
                  <h4>SOCIAL ASSETS</h4>
                  <div className="asset-item">
                    <div className="asset-head">
                      <span>Caption</span>
                      <button className="micro-btn" onClick={() => copyToClipboard(result.caption || '', 'Caption')}>Copy</button>
                    </div>
                    <p className="text-truncate">{result.caption || '...'}</p>
                  </div>
                  <div className="asset-item">
                    <div className="asset-head">
                      <span>Hashtags</span>
                      <button className="micro-btn" onClick={() => copyToClipboard(result.hashtags || '', 'Hashtags')}>Copy</button>
                    </div>
                    <p className="text-truncate neon-text">{result.hashtags || '...'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scene Cards */}
            <div className="scenes-timeline">
              {result.scenes.map((scene, i) => (
                <div className="scene-board" key={i}>
                  <div className="board-header">
                    <span className="s-index">{String(scene.scene_number).padStart(2, '0')}</span>
                    <span className="s-title">{scene.scene_title || `Scene ${scene.scene_number}`}</span>
                    {scene.hook_type && <span className="s-badge hook">{scene.hook_type}</span>}
                  </div>
                  <div className="board-meta">
                    <div className="meta-item">
                      <span className="meta-k">Reference</span>
                      <span className={`meta-v ${scene.picture_ref ? 'highlight' : ''}`}>
                        {scene.picture_ref ? 'REQUIRED' : 'NONE'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-k">Subject/Talent</span>
                      <span className="meta-v">{scene.speaker || 'N/A'}</span>
                    </div>
                    <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="meta-k">Dialogue</span>
                      <span className="meta-v">"{scene.dialogue || ''}"</span>
                    </div>
                    <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="meta-k">Action Block</span>
                      <span className="meta-v">{scene.action || ''}</span>
                    </div>
                  </div>
                  <div className="board-prompts">
                    <div className="prompt-box img">
                      <div className="prompt-head">
                        <div className="p-type img"><div className="p-dot"></div> IMAGE PROMPT</div>
                        <div className="p-actions">
                          <button className="micro-btn" onClick={() => copyToClipboard(scene.image_prompt || '', 'Image Prompt')}>COPY</button>
                          <button
                            className="micro-btn"
                            style={{ color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)' }}
                            onClick={() => setEditModal({ open: true, sceneIndex: i, field: 'image_prompt', value: scene.image_prompt || '' })}
                          >EDIT</button>
                        </div>
                      </div>
                      <div className="code-block">{scene.image_prompt || ''}</div>
                    </div>
                    <div className="prompt-box vid">
                      <div className="prompt-head">
                        <div className="p-type vid"><div className="p-dot"></div> VDO/AUDIO PROMPT</div>
                        <div className="p-actions">
                          <button className="micro-btn" onClick={() => copyToClipboard(scene.video_audio_prompt || scene.video_prompt || '', 'Video Prompt')}>COPY</button>
                          <button
                            className="micro-btn"
                            style={{ color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)' }}
                            onClick={() => setEditModal({ open: true, sceneIndex: i, field: 'video_audio_prompt', value: scene.video_audio_prompt || scene.video_prompt || '' })}
                          >EDIT</button>
                        </div>
                      </div>
                      <div className="code-block">{scene.video_audio_prompt || scene.video_prompt || ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Console */}
        {result && (
          <div className={`chat-console glass-panel ${chatOpen ? '' : 'collapsed'}`}>
            <div className="console-header" onClick={() => setChatOpen(!chatOpen)}>
              <div className="console-title">
                <span className="blinking-dot"></span>
                AI COMMAND CONSOLE
                <span className="scene-tracker">{result.scenes.length}/{sceneCount} SCENES</span>
              </div>
              <button className="toggle-btn">▲</button>
            </div>
            <div className="console-body">
              <div className="quick-commands">
                <div className="cmd-group">
                  <span className="cmd-label">Global Overrides:</span>
                  <div className="cmd-row">
                    <button className="cyber-chip variant-1" onClick={() => handleModification('แก้ไขทุกฉากให้: ตลกขึ้น')}>😂 Make Comedic</button>
                    <button className="cyber-chip variant-2" onClick={() => handleModification('แก้ไขทุกฉากให้: ดราม่า')}>🎭 Make Dramatic</button>
                    <button className="cyber-chip variant-3" onClick={() => handleModification('แก้ไขทุกฉากให้: กระชับขึ้น')}>⚡ Make Concise</button>
                  </div>
                </div>
                <div className="cmd-group">
                  <span className="cmd-label">Targeted Adjustments:</span>
                  <div className="target-row">
                    <select
                      className="cyber-select-mini"
                      value={targetScene}
                      onChange={(e) => setTargetScene(e.target.value)}
                    >
                      <option value="all">Global (All Scenes)</option>
                      {result.scenes.map((s, i) => (
                        <option key={i} value={i}>Scene {s.scene_number}</option>
                      ))}
                    </select>
                    <div className="cmd-row inline">
                      <button className="cyber-chip outline" onClick={() => {
                        const msg = targetScene === 'all'
                          ? 'แก้ไขทุกฉากให้: เพิ่ม CTA'
                          : `แก้ไขเฉพาะฉากที่ ${result.scenes[parseInt(targetScene)].scene_number}: เพิ่ม CTA`;
                        handleModification(msg);
                      }}>🎯 Add CTA</button>
                      <button className="cyber-chip outline" onClick={() => {
                        const msg = targetScene === 'all'
                          ? 'แก้ไขทุกฉากให้: เปลี่ยน Dialogue ให้ดูแพงขึ้น'
                          : `แก้ไขเฉพาะฉากที่ ${result.scenes[parseInt(targetScene)].scene_number}: เปลี่ยน Dialogue ให้ดูแพงขึ้น`;
                        handleModification(msg);
                      }}>💎 Premium Dialogue</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="terminal-input-area">
                <div className="terminal-prefix">&gt;_</div>
                <input
                  type="text"
                  className="terminal-input"
                  placeholder="Enter custom command (e.g., 'Change scene 2 to a drone shot')..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                />
                <button className="terminal-send" onClick={sendChat}>EXECUTE</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal.open && (
        <div className="cyber-modal-overlay active" onClick={() => setEditModal({ ...editModal, open: false })}>
          <div className="cyber-modal glass-panel modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              MANUAL OVERRIDE: SCENE {result?.scenes[editModal.sceneIndex]?.scene_number}
            </h3>
            <div className="cyber-input-group">
              <textarea
                className="code-editor"
                rows={12}
                value={editModal.value}
                onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-glow primary-glow" onClick={handleSaveEdit}>
                <span>APPLY OVERRIDE</span>
              </button>
              <button className="btn-text" onClick={() => setEditModal({ ...editModal, open: false })}>
                DISCARD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

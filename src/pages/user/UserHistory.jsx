import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Shared/AlertToast';
import { deleteGeneratedHistory, getUserGeneratedHistory } from '../../utils/storage';

export default function UserHistory() {
  const { user } = useAuth();
  const showToast = useToast();
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const selectedItem = useMemo(
    () => historyItems.find(item => item.id === selectedId) || historyItems[0] || null,
    [historyItems, selectedId],
  );

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const items = await getUserGeneratedHistory(user.username);
      setHistoryItems(items);
      setSelectedId(prev => (items.some(item => item.id === prev) ? prev : items[0]?.id || ''));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getUserGeneratedHistory(user.username).then(items => {
      if (!mounted) return;
      setHistoryItems(items);
      setSelectedId(items[0]?.id || '');
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [user.username]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text || '');
    showToast(`${label} copied to clipboard`, 'success');
  };

  const copyAll = () => {
    if (!selectedItem?.result?.scenes) return;
    const allText = selectedItem.result.scenes.map(scene =>
      `[SCENE ${scene.scene_number} - ${scene.scene_title || ''}]\nSpeaker: ${scene.speaker || ''}\nDialogue: ${scene.dialogue || ''}\nAction: ${scene.action || ''}\n\n[IMAGE PROMPT]\n${scene.image_prompt || ''}\n\n[VIDEO/AUDIO PROMPT]\n${scene.video_audio_prompt || scene.video_prompt || ''}`
    ).join('\n\n=========================================\n\n');
    copyToClipboard(allText, 'Full storyboard');
  };

  const exportJSON = () => {
    if (!selectedItem?.result) return;
    const blob = new Blob([JSON.stringify(selectedItem.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('History exported', 'success');
  };

  const removeItem = async (item) => {
    await deleteGeneratedHistory(item.id);
    showToast('History deleted', 'success');
    await loadHistory();
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>History</h1>
          <p className="page-subtitle">Saved storyboards from your previous runs</p>
        </div>
        <button className="header-action-btn btn-glow" onClick={loadHistory} disabled={isLoading}>
          REFRESH
        </button>
      </div>

      <div className="history-layout">
        <aside className="history-list glass-panel">
          {isLoading && <p className="history-empty">Loading history...</p>}
          {!isLoading && historyItems.length === 0 && (
            <p className="history-empty">No saved storyboard yet.</p>
          )}
          {!isLoading && historyItems.map(item => (
            <button
              type="button"
              className={`history-list-item ${selectedItem?.id === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
            >
              <span className="history-title">{item.title}</span>
              <span className="history-date">{new Date(item.createdAt).toLocaleString()}</span>
              <span className="history-meta">
                <span>{item.action}</span>
                <span>{item.result?.scenes?.length || item.input?.sceneCount || 0} scenes</span>
              </span>
            </button>
          ))}
        </aside>

        <section className="history-detail">
          {!selectedItem && !isLoading && (
            <div className="state-panel empty">
              <h3>NO HISTORY SELECTED</h3>
              <p>Generate a storyboard first, then it will appear here.</p>
            </div>
          )}

          {selectedItem && (
            <>
              <header className="canvas-header glass-panel">
                <div className="project-info">
                  <h2>{selectedItem.result?.product_name || selectedItem.title}</h2>
                  <div className="status-badges">
                    {selectedItem.input?.style && <span className="status-badge pulse-blue">{selectedItem.input.style}</span>}
                    {selectedItem.input?.mood && <span className="status-badge pulse-purple">{selectedItem.input.mood}</span>}
                    <span className="status-badge pulse-green">{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="header-tools">
                  <button className="tool-btn" onClick={copyAll}>Copy Full Board</button>
                  <button className="tool-btn accent" onClick={exportJSON}>Export Data</button>
                  <button className="tool-btn danger" onClick={() => removeItem(selectedItem)}>Delete</button>
                </div>
              </header>

              <div className="dashboard-panel glass-panel">
                <div className="dashboard-grid">
                  <div className="dash-card input-summary">
                    <h4>INPUT LOG</h4>
                    <p>Target: <strong>{selectedItem.input?.product || selectedItem.title}</strong></p>
                    <p>Platform: <strong>{selectedItem.input?.platform || 'N/A'}</strong></p>
                    <p>Scenes: <strong>{selectedItem.result?.scenes?.length || selectedItem.input?.sceneCount || 0}</strong></p>
                  </div>
                  <div className="dash-card scene-summary custom-scrollbar">
                    <h4>TIMELINE OVERVIEW</h4>
                    {(selectedItem.result?.scenes || []).map(scene => (
                      <div className="scene-row" key={scene.scene_number}>
                        <div className="sc-num">S{String(scene.scene_number).padStart(2, '0')}</div>
                        <div className="sc-info">
                          <p><strong>[{scene.speaker || 'N/A'}]</strong> "{scene.dialogue || ''}"</p>
                          <p style={{ color: 'var(--text-tertiary)' }}>{scene.action || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dash-card social-assets">
                    <h4>SOCIAL ASSETS</h4>
                    <div className="asset-item">
                      <div className="asset-head">
                        <span>Caption</span>
                        <button className="micro-btn" onClick={() => copyToClipboard(selectedItem.result?.caption || '', 'Caption')}>Copy</button>
                      </div>
                      <p className="text-truncate">{selectedItem.result?.caption || '...'}</p>
                    </div>
                    <div className="asset-item">
                      <div className="asset-head">
                        <span>Hashtags</span>
                        <button className="micro-btn" onClick={() => copyToClipboard(selectedItem.result?.hashtags || '', 'Hashtags')}>Copy</button>
                      </div>
                      <p className="text-truncate neon-text">{selectedItem.result?.hashtags || '...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="scenes-timeline">
                {(selectedItem.result?.scenes || []).map((scene, index) => (
                  <div className="scene-board" key={`${scene.scene_number}_${index}`}>
                    <div className="board-header">
                      <span className="s-index">{String(scene.scene_number).padStart(2, '0')}</span>
                      <span className="s-title">{scene.scene_title || `Scene ${scene.scene_number}`}</span>
                    </div>
                    <div className="board-meta">
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
                          <button className="micro-btn" onClick={() => copyToClipboard(scene.image_prompt || '', 'Image Prompt')}>COPY</button>
                        </div>
                        <div className="code-block">{scene.image_prompt || ''}</div>
                      </div>
                      <div className="prompt-box vid">
                        <div className="prompt-head">
                          <div className="p-type vid"><div className="p-dot"></div> VDO/AUDIO PROMPT</div>
                          <button className="micro-btn" onClick={() => copyToClipboard(scene.video_audio_prompt || scene.video_prompt || '', 'Video Prompt')}>COPY</button>
                        </div>
                        <div className="code-block">{scene.video_audio_prompt || scene.video_prompt || ''}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

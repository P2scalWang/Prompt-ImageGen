import { useEffect, useState } from 'react';
import { useToast } from '../../components/Shared/AlertToast';
import { getPromptTemplates, addPromptTemplate, updatePromptTemplate, deletePromptTemplate, seedDefaultPromptTemplate } from '../../utils/storage';
import { LOCKED_STORYBOARD_JSON_SCHEMA } from '../../utils/api';

export default function PromptManager() {
  const showToast = useToast();
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', template: '' });
  const [expandedId, setExpandedId] = useState(null);

  const refresh = async () => setTemplates(await getPromptTemplates());

  useEffect(() => {
    let mounted = true;
    getPromptTemplates().then(data => {
      if (mounted) setTemplates(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.template.trim()) {
      showToast('Name and Template are required', 'error');
      return;
    }

    if (editingId) {
      await updatePromptTemplate(editingId, formData);
      showToast('TEMPLATE UPDATED', 'success');
    } else {
      await addPromptTemplate(formData);
      showToast('TEMPLATE CREATED', 'success');
    }

    setFormData({ name: '', description: '', template: '' });
    setEditingId(null);
    setShowForm(false);
    await refresh();
  };

  const handleEdit = (template) => {
    setFormData({ name: template.name, description: template.description || '', template: template.template });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deletePromptTemplate(id).then(refresh);
      showToast('TEMPLATE DELETED', 'success');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', template: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSeedPromptStorage = async () => {
    await seedDefaultPromptTemplate();
    await refresh();
    showToast('PROMPT STORAGE ADDED', 'success');
  };

  return (
    <div className="prompt-manager">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📝 Prompt Manager</h1>
          <p className="page-subtitle">Edit Gem-style instructions. JSON output is locked by the app.</p>
        </div>
        <div className="header-tools">
          <button className="tool-btn" onClick={handleSeedPromptStorage}>
            <span>ADD PROMPT STORAGE</span>
          </button>
        <button
          className="btn-glow primary-glow header-action-btn"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ name: '', description: '', template: '' });
          }}
        >
          <span>➕ NEW TEMPLATE</span>
        </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-panel glass-panel">
          <div className="card-header">
            <h3>{editingId ? '✏️ Edit Template' : '➕ New Template'}</h3>
            <div className="glow-line"></div>
          </div>
          <form onSubmit={handleSubmit} className="template-form">
            <div className="cyber-input-group">
              <label>Template Name *</label>
              <input
                type="text"
                className="cyber-text-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Short Form Style, Cinematic Premium"
              />
            </div>
            <div className="cyber-input-group">
              <label>Description</label>
              <input
                type="text"
                className="cyber-text-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
              />
            </div>
            <div className="cyber-input-group">
              <label>Gem Instructions *</label>
              <textarea
                className="code-editor template-editor"
                rows={15}
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                placeholder="Write reusable Gem instructions. Use {{STYLE}}, {{PRODUCT}}, {{SCENE_COUNT}}, {{MOOD}}, {{PLATFORM}} as variables..."
              />
              <div className="helper-text">
                Available variables: <code>{'{{STYLE}}'}</code> <code>{'{{PRODUCT}}'}</code> <code>{'{{SCENE_COUNT}}'}</code> <code>{'{{MOOD}}'}</code> <code>{'{{PLATFORM}}'}</code>
              </div>
              <div className="helper-text">
                Locked JSON schema is appended automatically. Do not paste JSON schema into the Gem instructions.
              </div>
            </div>
            <div className="cyber-input-group">
              <label>Locked JSON Schema</label>
              <pre className="code-block">{LOCKED_STORYBOARD_JSON_SCHEMA}</pre>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-glow primary-glow">
                <span>{editingId ? '💾 UPDATE' : '✅ CREATE'}</span>
              </button>
              <button type="button" className="btn-text" onClick={handleCancel}>CANCEL</button>
            </div>
          </form>
        </div>
      )}

      {/* Template List */}
      <div className="template-list">
        {templates.map(t => (
          <div className="template-card glass-panel" key={t.id}>
            <div className="template-card-header">
              <div className="template-info">
                <h4>
                  {t.name}
                  {t.isDefault && <span className="default-badge">DEFAULT</span>}
                  {t.lockedJson && <span className="default-badge">LOCKED JSON</span>}
                </h4>
                <p className="template-desc">{t.description || 'No description'}</p>
                <span className="template-date">Updated: {new Date(t.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="template-actions">
                <button
                  className="micro-btn"
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                >
                  {expandedId === t.id ? 'COLLAPSE' : 'VIEW'}
                </button>
                <button
                  className="micro-btn"
                  style={{ color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)' }}
                  onClick={() => handleEdit(t)}
                >
                  EDIT
                </button>
                {!t.isDefault && (
                  <button
                    className="micro-btn"
                    style={{ color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)' }}
                    onClick={() => handleDelete(t.id)}
                  >
                    DELETE
                  </button>
                )}
              </div>
            </div>
            {expandedId === t.id && (
              <div className="template-preview">
                <pre className="code-block">{t.template}</pre>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="empty-state-mini">
            <p>No templates yet. Create your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

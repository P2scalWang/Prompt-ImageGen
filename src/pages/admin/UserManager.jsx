import { useEffect, useState } from 'react';
import { useToast } from '../../components/Shared/AlertToast';
import { getUsers, addUser, updateUser, deleteUser } from '../../utils/storage';

export default function UserManager() {
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user' });

  const refresh = async () => setUsers(await getUsers());

  useEffect(() => {
    let mounted = true;
    getUsers().then(data => {
      if (mounted) setUsers(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      showToast('Username is required', 'error');
      return;
    }

    if (editingId) {
      const updates = { username: formData.username, role: formData.role };
      if (formData.password.trim()) updates.password = formData.password;
      await updateUser(editingId, updates);
      showToast('USER UPDATED', 'success');
    } else {
      if (!formData.password.trim()) {
        showToast('Password is required for new users', 'error');
        return;
      }
      // Check duplicate username
      if (users.some(u => u.username === formData.username)) {
        showToast('Username already exists', 'error');
        return;
      }
      await addUser(formData);
      showToast('USER CREATED', 'success');
    }

    setFormData({ username: '', password: '', role: 'user' });
    setEditingId(null);
    setShowForm(false);
    await refresh();
  };

  const handleEdit = (user) => {
    setFormData({ username: user.username, password: '', role: user.role });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = (user) => {
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      showToast('Cannot delete the last admin account', 'error');
      return;
    }
    if (confirm(`Delete user "${user.username}"?`)) {
      deleteUser(user.id).then(refresh);
      showToast('USER DELETED', 'success');
    }
  };

  const handleCancel = () => {
    setFormData({ username: '', password: '', role: 'user' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="user-manager">
      <div className="page-header">
        <div className="page-header-left">
          <h1>👥 User Manager</h1>
          <p className="page-subtitle">Manage user accounts and roles</p>
        </div>
        <button
          className="btn-glow primary-glow header-action-btn"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ username: '', password: '', role: 'user' });
          }}
        >
          <span>➕ NEW USER</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-panel glass-panel">
          <div className="card-header">
            <h3>{editingId ? '✏️ Edit User' : '➕ New User'}</h3>
            <div className="glow-line"></div>
          </div>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-row">
              <div className="cyber-input-group">
                <label>Username *</label>
                <input
                  type="text"
                  className="cyber-text-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  disabled={editingId !== null}
                />
              </div>
              <div className="cyber-input-group">
                <label>{editingId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input
                  type="password"
                  className="cyber-text-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? '••••••••' : 'Enter password'}
                />
              </div>
              <div className="cyber-input-group">
                <label>Role</label>
                <div className="select-wrapper">
                  <select
                    className="cyber-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
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

      {/* Users Table */}
      <div className="data-table-wrapper glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="id-cell">#{u.id}</td>
                <td>
                  <div className="user-cell">
                    <span className="user-cell-avatar">{u.role === 'admin' ? '👑' : '👤'}</span>
                    <span>{u.username}</span>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role.toUpperCase()}</span>
                </td>
                <td className="date-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="micro-btn"
                      style={{ color: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)' }}
                      onClick={() => handleEdit(u)}
                    >
                      EDIT
                    </button>
                    <button
                      className="micro-btn"
                      style={{ color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)' }}
                      onClick={() => handleDelete(u)}
                    >
                      DELETE
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

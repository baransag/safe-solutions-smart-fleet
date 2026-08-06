import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { User, Mail, Phone, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    setPasswordMsg(null);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.error || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800 }}>
          <User size={28} className="text-primary" />
          My Profile & Settings
        </h1>
        <p className="text-secondary" style={{ marginTop: 4 }}>
          View user credentials, assigned role, and change account security settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Account Details Card */}
        <div className="card-elevated" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: '1.5rem', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{user?.name}</h3>
              <p className="text-tertiary" style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>{user?.designation || 'Staff Member'}</p>
              <span className={`badge badge-${user?.role === 'admin' ? 'purple' : user?.role === 'boss' ? 'red' : 'green'}`} style={{ marginTop: 6, display: 'inline-block', textTransform: 'capitalize' }}>
                {user?.role}
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="text-tertiary" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>EMPLOYEE ID</label>
              <div style={{ fontWeight: 600 }}>{user?.employee_id}</div>
            </div>
            <div>
              <label className="text-tertiary" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>EMAIL ADDRESS</label>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={16} className="text-tertiary" /> {user?.email}
              </div>
            </div>
            <div>
              <label className="text-tertiary" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>DEPARTMENT</label>
              <div style={{ fontWeight: 600 }}>{user?.department || 'Operations'}</div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card-elevated" style={{ padding: 24 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, marginBottom: 16 }}>
            <Lock size={20} className="text-primary" />
            Security & Password
          </h3>

          {passwordMsg && (
            <div className={`alert alert-${passwordMsg.type}`} style={{ marginBottom: 16 }}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

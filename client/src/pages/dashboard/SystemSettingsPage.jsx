import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Settings, Shield, ToggleLeft, ToggleRight, CheckCircle2, Car, Users, Building2, HardHat, Save, RefreshCw } from 'lucide-react';

export default function SystemSettingsPage() {
  const { user, isAdmin, isController, isBoss } = useAuth();
  const toast = useToast();

  const [settings, setSettings] = useState({
    vehicle_attendance_enabled: true,
    employee_attendance_enabled: true,
    office_attendance_enabled: true,
    site_attendance_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      toast.error('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  }

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      toast.success(res.message || 'System Settings updated and applied!');
      if (res.settings) setSettings(res.settings);
    } catch (err) {
      toast.error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader"><div className="loader loader-lg" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 10, background: '#021C4F', borderRadius: 12, color: '#fff' }}>
              <Settings size={24} />
            </div>
            <div>
              <h1 className="page-title">System Settings & Module Control</h1>
              <p className="page-description">Manage Operational Status & Module Activation for SAFE SOLUTIONS OPS</p>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ background: '#10B981', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings Changes'}
        </button>
      </div>

      {/* Production Live Status Banner */}
      <div className="card-elevated animate-fade-in-up" style={{ padding: 20, borderRadius: 16, borderLeft: '6px solid #10B981', background: '#f0fdf4', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              PRODUCTION GO-LIVE MODE ACTIVE
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: '#021C4F' }}>
              SAFE SOLUTIONS OPS System Operational Status: ALL MODULES ENABLED
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#334155' }}>
              Admin, Boss, and Controllers can toggle operational modules below. Changes take effect instantly system-wide.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Module 1: Vehicle Attendance */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(2, 28, 79, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }}>
                <Car size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Vehicle Attendance</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Morning Check-In, Evening Check-Out & Meter Reading</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('vehicle_attendance_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.vehicle_attendance_enabled ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.vehicle_attendance_enabled ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.vehicle_attendance_enabled ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Module 2: Employee Attendance */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(2, 28, 79, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(2, 28, 79, 0.1)', color: '#021C4F' }}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Employee Attendance</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Unified Attendance Center & Approval Workflow</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('employee_attendance_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.employee_attendance_enabled ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.employee_attendance_enabled ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.employee_attendance_enabled ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Module 3: Office Attendance */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(2, 28, 79, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                <Building2 size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Office Attendance</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Head Office & Branch Office QR Verification</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('office_attendance_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.office_attendance_enabled ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.office_attendance_enabled ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.office_attendance_enabled ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Module 4: Site Attendance */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(197, 3, 55, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(197, 3, 55, 0.1)', color: '#C50337' }}>
                <HardHat size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Site Attendance</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Client Construction Site & Temporary QR Verification</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('site_attendance_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.site_attendance_enabled ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.site_attendance_enabled ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.site_attendance_enabled ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Module 5: Hero Banner */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(168, 85, 247, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' }}>
                <Settings size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Hero Banner Carousel</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Announcements, Holiday & Friday Posts</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('hero_banner_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.hero_banner_enabled !== false ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.hero_banner_enabled !== false ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.hero_banner_enabled !== false ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Module 6: QR Management */}
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 22, border: '1px solid rgba(234, 88, 12, 0.1)', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                <Shield size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>QR Code Security</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>Office & Temporary Site QR Validation</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('qr_management_enabled')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              {settings.qr_management_enabled !== false ? (
                <ToggleRight size={42} color="#10B981" />
              ) : (
                <ToggleLeft size={42} color="#94a3b8" />
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Module Status</span>
            <span className={`badge badge-${settings.qr_management_enabled !== false ? 'green' : 'red'}`} style={{ fontWeight: 800 }}>
              {settings.qr_management_enabled !== false ? 'ENABLED (LIVE)' : 'DISABLED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

export default function AlertsPage() {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');

  useEffect(() => { fetchAlerts(); }, [filter]);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const params = filter === 'unresolved' ? '?resolved=false' : filter === 'resolved' ? '?resolved=true' : '';
      const data = await api.get(`/alerts${params}`);
      setAlerts(data.alerts || []);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  async function resolveAlert(id) {
    try {
      await api.put(`/alerts/${id}/resolve`, { resolution_notes: 'Resolved by admin' });
      toast.success('Alert resolved');
      fetchAlerts();
    } catch (err) { toast.error(err.message); }
  }

  const severityColor = (s) => s === 'critical' ? 'red' : s === 'high' ? 'yellow' : s === 'medium' ? 'orange' : 'gray';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Alerts</h1>
          <p className="page-description">Smart validation alerts and suspicious activity</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${filter === 'unresolved' ? 'active' : ''}`} onClick={() => setFilter('unresolved')}>Unresolved</button>
        <button className={`tab ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>Resolved</button>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
      </div>

      {loading ? <div className="page-loader"><div className="loader loader-lg" /></div> : alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Shield size={28} /></div>
          <p className="empty-title">No alerts</p>
          <p className="empty-text">All clear — no suspicious activity detected</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {alerts.map(a => (
            <div key={a.id} className="card-elevated" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `rgba(${a.severity === 'critical' ? '239,68,68' : a.severity === 'high' ? '245,158,11' : '15,110,119'}, 0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: a.severity === 'critical' ? 'var(--color-error)' : a.severity === 'high' ? 'var(--color-warning)' : 'var(--color-info)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{a.title}</span>
                  <span className={`badge badge-${severityColor(a.severity)}`}>{a.severity}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>{a.message}</p>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {a.vehicle_name && <span>Vehicle: {a.vehicle_name}</span>}
                  {a.employee_name && <span>Employee: {a.employee_name}</span>}
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
              {!a.is_resolved && (
                <button className="btn btn-teal btn-sm" onClick={() => resolveAlert(a.id)}>
                  <CheckCircle2 size={14} /> Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

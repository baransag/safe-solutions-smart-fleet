import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShieldAlert, Filter, RefreshCw, Clock, Terminal, User, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [levelFilter, moduleFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      let url = '/system-logs?limit=100';
      if (levelFilter) url += `&level=${levelFilter}`;
      if (moduleFilter) url += `&module=${moduleFilter}`;
      const res = await api.get(url);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800 }}>
            <Terminal size={28} className="text-primary" />
            System Audit & Operations Logs
          </h1>
          <p className="text-secondary" style={{ marginTop: 4 }}>
            Real-time security audit trails, user operations, system state changes, and event history
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogs} title="Refresh Logs">
          <RefreshCw size={18} /> Refresh Logs
        </button>
      </div>

      {/* Filter bar */}
      <div className="card-elevated" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} className="text-tertiary" />
          <select className="input-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Log Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="security">Security</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select className="input-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            <option value="AUTH">Authentication</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="VEHICLE">Vehicle Registry</option>
            <option value="FUEL">Fuel Management</option>
            <option value="SETTINGS">System Settings</option>
            <option value="QR">QR Management</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="page-loader"><div className="loader loader-lg" /></div>
      ) : logs.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          <Info size={40} style={{ marginBottom: 12 }} />
          <h3>No System Logs Found</h3>
          <p>No activity records match your current filter parameters.</p>
        </div>
      ) : (
        <div className="card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px' }}>Level</th>
                  <th style={{ padding: '12px 16px' }}>Module</th>
                  <th style={{ padding: '12px 16px' }}>User</th>
                  <th style={{ padding: '12px 16px' }}>Action & Details</th>
                  <th style={{ padding: '12px 16px' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${
                        log.level === 'error' || log.level === 'security' ? 'red' :
                        log.level === 'warning' ? 'orange' : 'green'
                      }`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{log.module || 'SYSTEM'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.employee_name ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{log.employee_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{log.employee_id} ({log.role})</div>
                        </div>
                      ) : (
                        <span className="text-tertiary">System / Guest</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</div>
                      {log.details && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{log.details}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart3, TrendingUp, Fuel, Car, Download } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => { fetchAnalytics(); }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const daysMap = { week: 7, month: 30, quarter: 90 };
      const days = daysMap[period] || 7;
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

      const [checkouts, fuel, vehicles] = await Promise.all([
        api.get(`/fuel?start_date=${startDate}`),
        api.get('/vehicles'),
        api.get('/checkins/all-today')
      ]);

      setData({ fuelLogs: checkouts.fuelLogs || [], vehicles: vehicles.vehicles || [], todayRecords: fuel.records || [] });
    } catch {} finally { setLoading(false); }
  }

  function exportCSV() {
    if (!data?.fuelLogs?.length) return;
    const headers = ['Date', 'Vehicle', 'Employee', 'Amount', 'Liters', 'Status'];
    const rows = data.fuelLogs.map(f => [
      new Date(f.submitted_at).toLocaleDateString(),
      f.vehicle_name, f.employee_name,
      f.fuel_amount, f.liters, f.approval_status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-analytics-${period}.csv`;
    a.click();
  }

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  const totalFuelCost = data?.fuelLogs?.reduce((sum, f) => sum + parseFloat(f.fuel_amount || 0), 0) || 0;
  const totalLiters = data?.fuelLogs?.reduce((sum, f) => sum + parseFloat(f.liters || 0), 0) || 0;
  const activeVehicles = data?.vehicles?.filter(v => v.status === 'active').length || 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Analytics</h1>
          <p className="page-description">Insights and performance metrics</p>
        </div>
        <div className="page-actions">
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            {['week', 'month', 'quarter'].map(p => (
              <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)} style={{ textTransform: 'capitalize' }}>
                {p}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card-stat">
          <div className="stat-icon orange"><Car size={22} /></div>
          <div className="stat-content">
            <div className="stat-value">{activeVehicles}</div>
            <div className="stat-label">Active Vehicles</div>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon teal"><Fuel size={22} /></div>
          <div className="stat-content">
            <div className="stat-value">{totalLiters.toFixed(1)}L</div>
            <div className="stat-label">Total Fuel ({period})</div>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon green"><TrendingUp size={22} /></div>
          <div className="stat-content">
            <div className="stat-value">Rs {totalFuelCost.toLocaleString()}</div>
            <div className="stat-label">Fuel Cost ({period})</div>
          </div>
        </div>
        <div className="card-stat">
          <div className="stat-icon red"><BarChart3 size={22} /></div>
          <div className="stat-content">
            <div className="stat-value">{data?.fuelLogs?.length || 0}</div>
            <div className="stat-label">Fuel Entries</div>
          </div>
        </div>
      </div>

      {/* Vehicle-wise Summary */}
      <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Vehicle Summary</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Vehicle</th><th>Plate</th><th>Type</th><th>Status</th><th>Current KM</th><th>Assigned To</th></tr>
          </thead>
          <tbody>
            {(data?.vehicles || []).map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 600 }}>{v.name}</td>
                <td><span className="badge badge-teal">{v.number_plate}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{v.type}</td>
                <td><span className={`badge badge-${v.status === 'active' ? 'green' : 'yellow'}`}>{v.status}</span></td>
                <td>{parseFloat(v.current_meter || 0).toLocaleString()} km</td>
                <td>{v.assigned_employee_name || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

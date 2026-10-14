import { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, Printer, Filter, Calendar, Users,
  Car, Clock, Route, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

export default function ActivityReportsPage() {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Handle Preset Ranges
  function handlePeriodChange(p) {
    setPeriod(p);
    const now = new Date();
    if (p === 'today') {
      const d = now.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (p === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (p === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (p === 'month') {
      const m = new Date(now);
      m.setDate(1); // 1st of month
      setStartDate(m.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  }

  // Fetch employees for filter dropdown
  useEffect(() => {
    api.get('/employees')
      .then(res => setEmployees(res.employees || []))
      .catch(err => console.warn('Failed to load employees for filter:', err.message));
  }, []);

  // Fetch Reports
  async function fetchReports() {
    setLoading(true);
    try {
      let url = `/field-tracking/reports?startDate=${startDate}&endDate=${endDate}`;
      if (selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`;
      }
      const res = await api.get(url);
      if (res.success) {
        setReports(res.reports || []);
      }
    } catch (err) {
      console.warn('Failed to fetch activity reports:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedEmployeeId]);

  // Export CSV (Excel Compatible with UTF-8 BOM)
  function exportCSV() {
    if (reports.length === 0) return;

    const headers = [
      'Date', 'Employee Name', 'Employee Code', 'Department',
      'Vehicle Name', 'Number Plate', 'Check-In Time', 'Check-Out Time',
      'Distance (KM)', 'Duty Hours', 'Total GPS Points', 'Status'
    ];

    const rows = reports.map(r => [
      r.session_date,
      `"${(r.employee_name || '').replace(/"/g, '""')}"`,
      r.employee_code || '',
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${(r.vehicle_name || '').replace(/"/g, '""')}"`,
      `"${(r.number_plate || '').replace(/"/g, '""')}"`,
      r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString() : '',
      r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString() : 'In Progress',
      r.total_distance_km || 0,
      r.duty_hours || 0,
      r.total_points || 0,
      r.status || 'completed'
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAFE_SOLUTIONS_GPS_Activity_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export PDF / Print
  function printPDF() {
    window.print();
  }

  // Summary Metrics
  const totalKm = reports.reduce((acc, r) => acc + parseFloat(r.total_distance_km || 0), 0).toFixed(1);
  const totalHours = reports.reduce((acc, r) => acc + parseFloat(r.duty_hours || 0), 0).toFixed(1);
  const totalPoints = reports.reduce((acc, r) => acc + parseInt(r.total_points || 0, 10), 0);

  return (
    <div className="page animate-fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 24, fontWeight: 800 }}>
            <FileText size={26} style={{ color: 'var(--color-primary)' }} />
            GPS Daily Activity Reports
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            Field duty mileage, route durations, active hours, and exportable activity audits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={exportCSV}
            disabled={reports.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            Export CSV (Excel)
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={printPDF}
            disabled={reports.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ padding: 16, marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['today', 'yesterday', 'week', 'month', 'custom'].map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handlePeriodChange(p)}
                style={{ textTransform: 'capitalize' }}
              >
                {p === 'week' ? 'This Week' : (p === 'month' ? 'This Month' : p)}
              </button>
            ))}
          </div>

          {/* Date Picker Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color, #E5E7EB)', fontSize: 12 }}
              />
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color, #E5E7EB)', fontSize: 12 }}
            />

            {/* Employee Dropdown Filter */}
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color, #E5E7EB)', fontSize: 12, minWidth: 160 }}
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Sessions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>{reports.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Field Distance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981', marginTop: 2 }}>{totalKm} <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>KM</span></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Cumulative Field Hours</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366F1', marginTop: 2 }}>{totalHours} <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hrs</span></div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>GPS Data Points</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>{totalPoints.toLocaleString()}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Vehicle</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th style={{ textAlign: 'right' }}>Distance (KM)</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
                <th style={{ textAlign: 'right' }}>Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 30 }}>
                    <div className="loader loader-md" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                    No activity reports found for the selected date range and filter criteria.
                  </td>
                </tr>
              ) : (
                reports.map((row) => (
                  <tr key={row.id || `${row.employee_id}-${row.session_date}`}>
                    <td style={{ fontWeight: 600 }}>{row.session_date}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.employee_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.employee_code} • {row.department || 'Field'}</div>
                    </td>
                    <td>
                      <div>{row.vehicle_name || 'Vehicle'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.number_plate || 'Assigned'}</div>
                    </td>
                    <td>{row.checkin_time ? new Date(row.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{row.checkout_time ? new Date(row.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#10B981', fontWeight: 600 }}>Active</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F2B5B' }}>
                      {row.total_distance_km ? `${row.total_distance_km} KM` : '0.0 KM'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.duty_hours ? `${row.duty_hours}h` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.total_points || 0}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: row.checkout_time ? '#F3F4F6' : '#DEF7EC',
                        color: row.checkout_time ? '#4B5563' : '#03543F'
                      }}>
                        {row.checkout_time ? 'Completed' : 'On Duty'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { FileText, Download, Printer, Filter, Calendar, Users, Building2, HardHat, Clock, AlertTriangle, Search, RefreshCw } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'office' | 'site' | 'late' | 'absent'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate, activeTab]);

  async function fetchReportData() {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/reports?date=${selectedDate}&type=${activeTab}`);
      setSummary(res.summary || {});
      setRecords(res.records || []);
    } catch (err) {
      toast.error('Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = records.filter(r => {
    if (activeTab === 'office' && r.attendance_type !== 'office') return false;
    if (activeTab === 'site' && r.attendance_type !== 'site') return false;
    if (activeTab === 'late' && !r.is_late) return false;
    if (activeTab === 'absent' && r.approval_status !== 'rejected') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
        (r.location_name && r.location_name.toLowerCase().includes(q)) ||
        (r.project_name && r.project_name.toLowerCase().includes(q)) ||
        (r.emp_id && r.emp_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.warning('No records available to export.');
      return;
    }

    const headers = ['Date', 'Time', 'Employee Name', 'Employee ID', 'Designation', 'Attendance Type', 'Location', 'Project', 'Status', 'Approved By'];
    const csvRows = [headers.join(',')];

    filteredRecords.forEach(r => {
      const row = [
        new Date(r.check_in_time).toLocaleDateString(),
        new Date(r.check_in_time).toLocaleTimeString(),
        `"${r.employee_name || ''}"`,
        `"${r.emp_id || ''}"`,
        `"${r.designation || ''}"`,
        r.attendance_type,
        `"${r.location_name || 'Head Office'}"`,
        `"${r.project_name || '-'}"`,
        r.approval_status,
        `"${r.approved_by_name || 'System'}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${activeTab.toUpperCase()}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV Export downloaded!');
  };

  const exportPDF = () => {
    // Load logo as base64 for the print window
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(logoImg, 0, 0);
      const logoBase64 = canvas.toDataURL('image/jpeg', 0.9);
      openPrintWindow(logoBase64);
    };
    logoImg.onerror = () => {
      // Fallback: open without logo if image fails to load
      openPrintWindow(null);
    };
    logoImg.src = '/assets/images/logo.jpeg';
  };

  const openPrintWindow = (logoBase64) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${activeTab.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .report-header { text-align: center; padding: 20px 0 16px; border-bottom: 3px solid #0F2B5B; margin-bottom: 20px; }
            .report-header img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
            .report-header h1 { color: #0F2B5B; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.04em; }
            .report-header .tagline { color: #64748b; font-size: 13px; margin: 4px 0 12px; font-weight: 600; }
            .report-header .report-title { color: #D42D56; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
            .header-info { margin-bottom: 15px; font-size: 13px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0F2B5B; color: white; }
            .report-footer { text-align: center; margin-top: 30px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="report-header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="SAFE SOLUTIONS Logo" />` : ''}
            <h1>SAFE SOLUTIONS</h1>
            <div class="tagline">House of Construction Solutions</div>
            <p class="report-title">${activeTab.toUpperCase()} ATTENDANCE REPORT</p>
          </div>
          <div class="header-info">
            Report Type: <strong>${activeTab.toUpperCase()} ATTENDANCE</strong> | Date: <strong>${selectedDate}</strong> | Generated: <strong>${new Date().toLocaleString()}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee Name</th>
                <th>Type</th>
                <th>Location / Site</th>
                <th>GPS Status</th>
                <th>Status</th>
                <th>Approved By</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(r => `
                <tr>
                  <td>${new Date(r.check_in_time).toLocaleDateString()} ${new Date(r.check_in_time).toLocaleTimeString()}</td>
                  <td><strong>${r.employee_name}</strong> (${r.emp_id})</td>
                  <td>${r.attendance_type}</td>
                  <td>${r.location_name || 'Head Office'}</td>
                  <td>${r.gps_status} (${r.distance_meters}m)</td>
                  <td>${r.approval_status}</td>
                  <td>${r.approved_by_name || 'Controller'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="report-footer">
            SAFE SOLUTIONS FLEETOPS — Enterprise Fleet, Attendance & Site Operations Platform • Faisalabad HQ<br/>
            Report generated on ${new Date().toLocaleString()}
          </div>
          <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
      </html>
    `);
    printWin.document.close();
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
            <div style={{ padding: 10, background: '#0F2B5B', borderRadius: 12, color: '#fff' }}>
              <FileText size={24} />
            </div>
            <div>
              <h1 className="page-title">Attendance Reports & Analytics</h1>
              <p className="page-description">Generate, filter, and export Office & Site Attendance Reports</p>
            </div>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F2B5B', fontWeight: 700 }}>
            <Printer size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card-elevated" style={{ padding: 16, borderRadius: 12, borderLeft: '4px solid #0F2B5B' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Present</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0F2B5B' }}>{summary?.total_present || records.length}</h3>
        </div>
        <div className="card-elevated" style={{ padding: 16, borderRadius: 12, borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Office Present</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0284c7' }}>{summary?.office_present || records.filter(r => r.attendance_type === 'office').length}</h3>
        </div>
        <div className="card-elevated" style={{ padding: 16, borderRadius: 12, borderLeft: '4px solid #D42D56' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Site Present</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#D42D56' }}>{summary?.site_present || records.filter(r => r.attendance_type === 'site').length}</h3>
        </div>
        <div className="card-elevated" style={{ padding: 16, borderRadius: 12, borderLeft: '4px solid #D97706' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Pending Approval</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#D97706' }}>{summary?.pending_approval || records.filter(r => r.approval_status === 'pending').length}</h3>
        </div>
        <div className="card-elevated" style={{ padding: 16, borderRadius: 12, borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Late Employees</span>
          <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{summary?.late_employees || records.filter(r => r.is_late).length}</h3>
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { key: 'daily', label: '📅 Daily Attendance' },
          { key: 'weekly', label: '📊 Weekly Attendance' },
          { key: 'monthly', label: '🗓️ Monthly Attendance' },
          { key: 'office', label: '🏢 Office Report' },
          { key: 'site', label: '🏗️ Site Report' },
          { key: 'late', label: '⏰ Late Employees' },
          { key: 'absent', label: '❌ Absent / Rejected' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              background: activeTab === t.key ? '#0F2B5B' : '#f0f4f8', color: activeTab === t.key ? '#fff' : '#666',
              whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search employee, site, or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Report Records Table */}
      <div className="table-container animate-fade-in-up">
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Employee</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Location / Site</th>
              <th>GPS Status</th>
              <th>Status</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{new Date(r.check_in_time).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(r.check_in_time).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <strong>{r.employee_name}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.emp_id}</div>
                  </td>
                  <td>{r.designation || 'Staff'}</td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: r.attendance_type === 'site' ? '#fff1f2' : '#eff6ff',
                      color: r.attendance_type === 'site' ? '#d42d56' : '#0f2b5b'
                    }}>
                      {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F2B5B' }}>{r.location_name || 'Head Office'}</div>
                    {r.project_name && <div style={{ fontSize: 11, color: '#64748b' }}>{r.project_name}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                      📍 {r.gps_status || 'Inside Office'} ({r.distance_meters || 0}m)
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`} style={{ fontWeight: 700 }}>
                      {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: r.approved_by_name ? '#047857' : '#94a3b8', fontWeight: 600 }}>
                      {r.approved_by_name || 'Awaiting Review'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No attendance records matching filter criteria for {selectedDate}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

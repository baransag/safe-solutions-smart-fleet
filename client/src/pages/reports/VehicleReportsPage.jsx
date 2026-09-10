import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  Route, Calendar, Download, Printer, Filter, Users, Car,
  Clock, MapPin, Search, RefreshCw, Eye, X, CheckCircle2,
  TrendingUp, Compass, AlertCircle
} from 'lucide-react';
import { getEmployeeAvatar } from '../../utils/avatarHelper';

export default function VehicleReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [photoModal, setPhotoModal] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, selectedDate, selectedMonth, selectedVehicle, selectedEmployee]);

  async function fetchReportData() {
    try {
      setLoading(true);
      let url = `/checkins/reports?type=${activeTab}`;

      if (activeTab === 'daily') {
        url += `&date=${selectedDate}`;
      } else if (activeTab === 'weekly') {
        url += `&date=${selectedDate}`;
        if (startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }
      } else if (activeTab === 'monthly') {
        url += `&month=${selectedMonth}`;
      } else if (activeTab === 'custom') {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }

      if (selectedVehicle !== 'all') url += `&vehicle_id=${selectedVehicle}`;
      if (selectedEmployee !== 'all') url += `&employee_id=${selectedEmployee}`;

      const res = await api.get(url);
      setSummary(res.summary || {});
      setRecords(res.records || []);
      if (res.availableMonths?.length) setAvailableMonths(res.availableMonths);
      if (res.vehiclesList?.length) setVehiclesList(res.vehiclesList);
      if (res.employeesList?.length) setEmployeesList(res.employeesList);
    } catch (err) {
      console.error('Failed to load vehicle report:', err);
      toast.error('Failed to load vehicle report from database.');
    } finally {
      setLoading(false);
    }
  }

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      (r.emp_code && r.emp_code.toLowerCase().includes(q)) ||
      (r.vehicle_name && r.vehicle_name.toLowerCase().includes(q)) ||
      (r.number_plate && r.number_plate.toLowerCase().includes(q)) ||
      (r.vehicle_code && r.vehicle_code.toLowerCase().includes(q)) ||
      (r.checkin_location && r.checkin_location.toLowerCase().includes(q)) ||
      (r.checkout_location && r.checkout_location.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.warning('No records available to export.');
      return;
    }

    const headers = [
      'Check-In Date',
      'Check-In Time',
      'Check-Out Time',
      'Driver Name',
      'Employee ID',
      'Vehicle Name',
      'Number Plate',
      'Vehicle Code',
      'Subah Start (Opening KM)',
      'Sham Close (Closing KM)',
      'Total Travelled (KM)',
      'Duration (Mins)',
      'Check-In Location',
      'Check-Out Location',
      'Trip Status'
    ];

    const csvRows = [headers.join(',')];

    filteredRecords.forEach(r => {
      const inDate = r.checkin_time ? new Date(r.checkin_time).toLocaleDateString('en-GB') : '';
      const inTime = r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
      const outTime = r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (r.trip_status === 'in_transit' ? 'In Transit' : '-');
      const dist = r.distance_km || (r.closing_km && r.opening_km ? +(r.closing_km - r.opening_km).toFixed(2) : '-');

      const row = [
        `"${inDate}"`,
        `"${inTime}"`,
        `"${outTime}"`,
        `"${r.employee_name || ''}"`,
        `"${r.emp_code || ''}"`,
        `"${r.vehicle_name || ''}"`,
        `"${r.number_plate || ''}"`,
        `"${r.vehicle_code || ''}"`,
        `"${r.opening_km || 0}"`,
        `"${r.closing_km || '-'}"`,
        `"${dist}"`,
        `"${r.duration_minutes || '-'}"`,
        `"${(r.checkin_location || '').replace(/"/g, '""')}"`,
        `"${(r.checkout_location || '').replace(/"/g, '""')}"`,
        `"${r.trip_status === 'completed' ? 'Completed' : 'In Transit'}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateTag = activeTab === 'monthly' ? selectedMonth : selectedDate;
    a.download = `Vehicle_Trip_Report_${activeTab.toUpperCase()}_${dateTag}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Vehicle Report CSV downloaded successfully!');
  };

  const exportPDF = () => {
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
      openPrintWindow(null);
    };
    logoImg.src = '/assets/images/logo.jpeg';
  };

  const openPrintWindow = (logoBase64) => {
    const printWin = window.open('', '_blank');
    const periodLabel = activeTab === 'monthly'
      ? `Month: ${selectedMonth}`
      : (activeTab === 'weekly' ? `Week Period ending: ${selectedDate}` : `Date: ${selectedDate}`);

    printWin.document.write(`
      <html>
        <head>
          <title>Vehicle Check-In & Check-Out Report - ${activeTab.toUpperCase()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; margin: 0; color: #1e293b; }
            .report-header { text-align: center; padding-bottom: 16px; border-bottom: 3px solid #0F2B5B; margin-bottom: 20px; }
            .report-header img { width: 70px; height: 70px; object-fit: contain; margin-bottom: 6px; }
            .report-header h1 { color: #0F2B5B; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.03em; }
            .report-header .tagline { color: #64748b; font-size: 12px; margin: 3px 0 10px; font-weight: 600; text-transform: uppercase; }
            .report-header .report-title { color: #D42D56; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
            
            .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
            .s-card { flex: 1; min-width: 140px; padding: 10px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; }
            .s-card-title { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .s-card-val { font-size: 18px; font-weight: 800; color: #0F2B5B; margin-top: 4px; }

            .header-info { margin-bottom: 15px; font-size: 12px; color: #475569; display: flex; justify-content: space-between; flex-wrap: wrap; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
            th { background-color: #0F2B5B; color: white; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-amber { background: #fef3c7; color: #92400e; }
            .report-footer { text-align: center; margin-top: 25px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="report-header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="SAFE SOLUTIONS Logo" />` : ''}
            <h1>SAFE SOLUTIONS FLEETOPS</h1>
            <div class="tagline">House of Construction Solutions • Enterprise Operations</div>
            <p class="report-title">VEHICLE CHECK-IN & CHECK-OUT ${activeTab.toUpperCase()} REPORT</p>
          </div>

          <div class="header-info">
            <div>Scope: <strong>${activeTab.toUpperCase()}</strong> | ${periodLabel}</div>
            <div>Generated: <strong>${new Date().toLocaleString()}</strong> by ${user?.name || 'Authorized Controller'}</div>
          </div>

          <div class="summary-cards">
            <div class="s-card">
              <div class="s-card-title">Total Travelled</div>
              <div class="s-card-val">${summary?.total_distance_km || 0} KM</div>
            </div>
            <div class="s-card">
              <div class="s-card-title">Total Trips Logged</div>
              <div class="s-card-val">${summary?.total_sessions || filteredRecords.length}</div>
            </div>
            <div class="s-card">
              <div class="s-card-title">Completed Returns</div>
              <div class="s-card-val">${summary?.completed_sessions || 0}</div>
            </div>
            <div class="s-card">
              <div class="s-card-title">In Transit</div>
              <div class="s-card-val">${summary?.in_transit_sessions || 0}</div>
            </div>
            <div class="s-card">
              <div class="s-card-title">Avg KM / Trip</div>
              <div class="s-card-val">${summary?.avg_distance_km || 0} KM</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Check-In</th>
                <th>Check-Out</th>
                <th>Vehicle</th>
                <th>Driver / Employee</th>
                <th>Opening KM</th>
                <th>Closing KM</th>
                <th>Distance</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(r => {
                const inTime = r.checkin_time ? new Date(r.checkin_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
                const outTime = r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (r.trip_status === 'in_transit' ? 'In Transit' : '-');
                const dist = r.distance_km ? `${r.distance_km} KM` : (r.closing_km && r.opening_km ? `${(r.closing_km - r.opening_km).toFixed(1)} KM` : '-');
                return `
                  <tr>
                    <td>${inTime}</td>
                    <td>${outTime}</td>
                    <td><strong>${r.vehicle_name || ''}</strong> (${r.number_plate || ''})</td>
                    <td><strong>${r.employee_name || ''}</strong> (${r.emp_code || ''})</td>
                    <td>${r.opening_km ? parseFloat(r.opening_km).toLocaleString() : '-'}</td>
                    <td>${r.closing_km ? parseFloat(r.closing_km).toLocaleString() : 'Pending Return'}</td>
                    <td><strong>${dist}</strong></td>
                    <td>${r.checkout_location || r.checkin_location || 'Field Duty Location'}</td>
                    <td>
                      <span class="badge ${r.trip_status === 'completed' ? 'badge-green' : 'badge-amber'}">
                        ${r.trip_status === 'completed' ? 'COMPLETED' : 'IN TRANSIT'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="report-footer">
            SAFE SOLUTIONS FLEETOPS — Official Photographic & GPS Verified Audit Report • Faisalabad HQ<br/>
            Page generated automatically on ${new Date().toLocaleString()}
          </div>
          <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="page animate-fade-in">
      {/* ─── PAGE HEADER ─── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #0F2B5B 0%, #1a4282 100%)', borderRadius: 14, color: '#fff', boxShadow: '0 4px 14px rgba(15, 43, 91, 0.25)' }}>
            <Route size={26} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em' }}>
              Vehicle Check-In & Check-Out Reports
            </h1>
            <p className="page-description" style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Historical odometer logs, distance analytics, opening/closing KM, and driver photographic audit trail
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => fetchReportData()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }} title="Refresh Report">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F2B5B', fontWeight: 700 }}>
            <Printer size={15} /> Export PDF / Print
          </button>
        </div>
      </div>

      {/* ─── REPORT MODE TABS & FILTERS BAR ─── */}
      <div className="card-glass" style={{ padding: 18, borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            <button
              className={`btn btn-sm ${activeTab === 'daily' ? 'btn-primary' : ''}`}
              style={{ borderRadius: 8, fontWeight: 700, background: activeTab === 'daily' ? '#0F2B5B' : 'transparent', color: activeTab === 'daily' ? '#fff' : '#64748b', border: 'none' }}
              onClick={() => setActiveTab('daily')}
            >
              📅 Daily Report
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'weekly' ? 'btn-primary' : ''}`}
              style={{ borderRadius: 8, fontWeight: 700, background: activeTab === 'weekly' ? '#0F2B5B' : 'transparent', color: activeTab === 'weekly' ? '#fff' : '#64748b', border: 'none' }}
              onClick={() => setActiveTab('weekly')}
            >
              📆 Weekly Report
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'monthly' ? 'btn-primary' : ''}`}
              style={{ borderRadius: 8, fontWeight: 700, background: activeTab === 'monthly' ? '#0F2B5B' : 'transparent', color: activeTab === 'monthly' ? '#fff' : '#64748b', border: 'none' }}
              onClick={() => setActiveTab('monthly')}
            >
              🗓️ Monthly Report
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'custom' ? 'btn-primary' : ''}`}
              style={{ borderRadius: 8, fontWeight: 700, background: activeTab === 'custom' ? '#0F2B5B' : 'transparent', color: activeTab === 'custom' ? '#fff' : '#64748b', border: 'none' }}
              onClick={() => setActiveTab('custom')}
            >
              ⚙️ Custom Date Range
            </button>
          </div>

          {/* Quick Date / Month Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {activeTab === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0F2B5B' }}
                />
              </div>
            )}

            {activeTab === 'weekly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Week Ending Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0F2B5B' }}
                />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Select Month:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0F2B5B' }}
                >
                  {availableMonths.map(m => (
                    <option key={m.month_key} value={m.month_key}>{m.month_label || m.month_key}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'custom' && (
              <form onSubmit={handleCustomFilterSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                  required
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                  required
                />
                <button type="submit" className="btn btn-sm btn-primary" style={{ background: '#0F2B5B' }}>Filter</button>
              </form>
            )}
          </div>
        </div>

        {/* Second Row: Specific Vehicle / Driver Dropdown & Text Search */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Vehicle Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200, flex: 1 }}>
            <Car size={16} color="#64748b" />
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0F2B5B' }}
            >
              <option value="all">All Fleet Vehicles</option>
              {vehiclesList.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.number_plate})</option>
              ))}
            </select>
          </div>

          {/* Driver Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200, flex: 1 }}>
            <Users size={16} color="#64748b" />
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0F2B5B' }}
            >
              <option value="all">All Drivers / Employees</option>
              {employeesList.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.emp_code || 'EMP'})</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 240, flex: 1.5 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search driver, vehicle or plate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            />
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS ROW ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card-elevated" style={{ padding: 18, borderRadius: 14, borderLeft: '4px solid #0F2B5B', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Distance</span>
            <TrendingUp size={18} color="#0F2B5B" />
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: '#0F2B5B' }}>
            {summary?.total_distance_km ? `${summary.total_distance_km.toLocaleString()} KM` : '0 KM'}
          </h3>
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Total logged distance in period</span>
        </div>

        <div className="card-elevated" style={{ padding: 18, borderRadius: 14, borderLeft: '4px solid #0284c7', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Trips</span>
            <Route size={18} color="#0284c7" />
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: '#0284c7' }}>
            {summary?.total_sessions || filteredRecords.length}
          </h3>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Check-in sessions recorded</span>
        </div>

        <div className="card-elevated" style={{ padding: 18, borderRadius: 14, borderLeft: '4px solid #10b981', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Completed Returns</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: '#10b981' }}>
            {summary?.completed_sessions || 0}
          </h3>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Safely checked out</span>
        </div>

        <div className="card-elevated" style={{ padding: 18, borderRadius: 14, borderLeft: '4px solid #f59e0b', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>In Transit</span>
            <Compass size={18} color="#f59e0b" />
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>
            {summary?.in_transit_sessions || 0}
          </h3>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Currently active on duty</span>
        </div>

        <div className="card-elevated" style={{ padding: 18, borderRadius: 14, borderLeft: '4px solid #8b5cf6', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Avg KM / Trip</span>
            <Car size={18} color="#8b5cf6" />
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: '#8b5cf6' }}>
            {summary?.avg_distance_km ? `${summary.avg_distance_km} KM` : '0 KM'}
          </h3>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Average per completed trip</span>
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 className="section-title" style={{ margin: 0, fontSize: 16 }}>Vehicle Check-In & Check-Out Audit Logs</h3>
            <span className="status-badge badge-blue" style={{ fontSize: 11 }}>
              {filteredRecords.length} Record{filteredRecords.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="loader loader-lg" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Loading vehicle trip records...</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Date & Check-In</th>
                  <th>Check-Out</th>
                  <th>Vehicle</th>
                  <th>Driver / Employee</th>
                  <th>Subah Start (Opening KM)</th>
                  <th>Sham Close (Closing KM)</th>
                  <th>Total Travelled</th>
                  <th>Checkout Location</th>
                  <th>Status</th>
                  <th>Photos</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No vehicle check-in / check-out history records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(row => (
                    <tr key={row.checkin_id}>
                      {/* 1. Date & Check-In */}
                      <td>
                        {row.checkin_time ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#0F2B5B' }}>
                              <Calendar size={13} color="#64748b" />
                              {new Date(row.checkin_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                              <Clock size={12} color="#059669" />
                              {new Date(row.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </>
                        ) : '-'}
                      </td>

                      {/* 2. Check-Out */}
                      <td>
                        {row.checkout_time ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#0F2B5B' }}>
                              <Clock size={13} color="#0F2B5B" />
                              {new Date(row.checkout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                            {row.duration_minutes ? (
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                                {Math.floor(row.duration_minutes / 60)}h {row.duration_minutes % 60}m duty
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="status-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: 10, fontWeight: 700 }}>
                            In Transit
                          </span>
                        )}
                      </td>

                      {/* 3. Vehicle */}
                      <td>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0F2B5B' }}>
                          {row.vehicle_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontWeight: 800,
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 4,
                            border: '1px solid #fca5a5'
                          }}>
                            {row.number_plate}
                          </span>
                          {row.vehicle_code && (
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>
                              {row.vehicle_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Driver / Employee */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <img
                              src={getEmployeeAvatar(row.emp_code)}
                              alt={row.employee_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0F2B5B' }}>{row.employee_name}</div>
                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>ID: {row.emp_code || 'EMP'}</div>
                          </div>
                        </div>
                      </td>

                      {/* 5. Subah Start (Opening KM) */}
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#0F2B5B' }}>
                          {row.opening_km !== null && row.opening_km !== undefined
                            ? `${parseFloat(row.opening_km).toLocaleString()} km`
                            : '-'}
                        </span>
                      </td>

                      {/* 6. Sham Close (Closing KM) */}
                      <td>
                        {row.closing_km ? (
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#0F2B5B' }}>
                            {parseFloat(row.closing_km).toLocaleString()} km
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>
                            Pending Return
                          </span>
                        )}
                      </td>

                      {/* 7. Total Travelled */}
                      <td>
                        {row.distance_km ? (
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>
                            {row.distance_km} km
                          </span>
                        ) : (row.closing_km && row.opening_km ? (
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>
                            {(row.closing_km - row.opening_km).toFixed(1)} km
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        ))}
                      </td>

                      {/* 8. Checkout Location */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569', fontWeight: 500, maxWidth: 180 }}>
                          <MapPin size={12} color="#0F2B5B" style={{ flexShrink: 0 }} />
                          <span className="truncate" title={row.checkout_location || row.checkin_location}>
                            {row.checkout_location || row.checkin_location || 'Field Duty Location'}
                          </span>
                        </div>
                      </td>

                      {/* 9. Status */}
                      <td>
                        {row.trip_status === 'completed' ? (
                          <span className="status-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                            COMPLETED
                          </span>
                        ) : (
                          <span className="status-badge" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
                            IN TRANSIT
                          </span>
                        )}
                      </td>

                      {/* 10. Photos */}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {row.checkin_meter_photo && (
                            <button
                              onClick={() => setPhotoModal({ url: row.checkin_meter_photo, title: `Start Meter Photo — ${row.vehicle_name} (${row.opening_km} KM)` })}
                              className="btn btn-xs"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                padding: '3px 7px',
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#0F2B5B',
                                cursor: 'pointer'
                              }}
                              title="View Opening Meter Photo"
                            >
                              📷 Start Photo
                            </button>
                          )}
                          {row.checkout_meter_photo && (
                            <button
                              onClick={() => setPhotoModal({ url: row.checkout_meter_photo, title: `Close Meter Photo — ${row.vehicle_name} (${row.closing_km} KM)` })}
                              className="btn btn-xs"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: 6,
                                padding: '3px 7px',
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#059669',
                                cursor: 'pointer'
                              }}
                              title="View Closing Meter Photo"
                            >
                              📷 Close Photo
                            </button>
                          )}
                          {!row.checkin_meter_photo && !row.checkout_meter_photo && (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── PHOTO PREVIEW MODAL ─── */}
      {photoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setPhotoModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 520,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F2B5B' }}>{photoModal.title}</h4>
              <button
                onClick={() => setPhotoModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 16, textAlign: 'center', background: '#f8fafc' }}>
              <img
                src={photoModal.url}
                alt="Meter Reading Proof"
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 10, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

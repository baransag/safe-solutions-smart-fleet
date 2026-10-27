import { useState, useEffect, useRef } from 'react';
import {
  X, User, MapPin, Calendar, Clock, Car, Navigation,
  Download, Printer, AlertTriangle, CheckCircle2, Battery,
  FileText, Shield, ArrowRight, RefreshCw, ChevronRight, Filter
} from 'lucide-react';
import api from '../../services/api';
import {
  formatPKTDate,
  formatPKTTime,
  formatPKTDateTime,
  calculateWorkingDuration,
  getPKTTodayString
} from '../../utils/pakistanTime';
import { getReadableAddress, getCachedAddress, getCoordKey } from '../../services/geocodingService';

export default function EmployeeTrackingDetailModal({ employee, isOpen, onClose }) {
  if (!isOpen || !employee) return null;

  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'route' | 'today'
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const todayStr = getPKTTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeAddressMap, setRouteAddressMap] = useState({});

  // Fetch report data for this specific employee
  async function fetchEmployeeReport() {
    const targetEmpId = employee?.id || employee?.employee_id;
    if (!targetEmpId) return;

    setLoadingReport(true);
    try {
      let queryParams = `period=${period}`;
      if (period === 'daily') {
        queryParams += `&date=${selectedDate}`;
      } else if (period === 'weekly') {
        queryParams += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (period === 'monthly') {
        queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
      } else if (period === 'custom') {
        queryParams += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(`/field-tracking/employee-report/${targetEmpId}?${queryParams}`);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.warn('Failed to load employee report:', err.message);
    } finally {
      setLoadingReport(false);
    }
  }

  // Fetch today's route
  async function fetchRoute() {
    const targetEmpId = employee?.id || employee?.employee_id;
    if (!targetEmpId) return;

    setLoadingRoute(true);
    try {
      const res = await api.get(`/field-tracking/route/${targetEmpId}?date=${selectedDate}`);
      if (res.success) {
        setRoutePoints(res.points || []);
      }
    } catch (err) {
      console.warn('Failed to fetch route:', err.message);
    } finally {
      setLoadingRoute(false);
    }
  }

  useEffect(() => {
    fetchEmployeeReport();
    if (activeTab === 'route') {
      fetchRoute();
    }
  }, [employee?.id, employee?.employee_id, period, selectedDate, startDate, endDate, selectedMonth, selectedYear, activeTab]);

  // Batch resolve readable addresses for route points and employee
  useEffect(() => {
    let isMounted = true;
    if (employee?.latitude && employee?.longitude) {
      const key = getCoordKey(employee.latitude, employee.longitude);
      if (employee.location_address && !routeAddressMap[key]) {
        setRouteAddressMap(prev => ({ ...prev, [key]: employee.location_address }));
      } else if (!routeAddressMap[key]) {
        const cached = getCachedAddress(employee.latitude, employee.longitude);
        if (cached) {
          setRouteAddressMap(prev => ({ ...prev, [key]: cached.formatted }));
        } else {
          getReadableAddress(employee.latitude, employee.longitude).then(res => {
            if (isMounted && res && res.formatted) {
              setRouteAddressMap(prev => ({ ...prev, [key]: res.formatted }));
            }
          });
        }
      }
    }

    if (activeTab === 'route' && routePoints.length > 0) {
      routePoints.forEach(p => {
        if (p.latitude && p.longitude) {
          const key = getCoordKey(p.latitude, p.longitude);
          if (p.location_address && !routeAddressMap[key]) {
            setRouteAddressMap(prev => ({ ...prev, [key]: p.location_address }));
          } else if (!routeAddressMap[key]) {
            const cached = getCachedAddress(p.latitude, p.longitude);
            if (cached) {
              setRouteAddressMap(prev => ({ ...prev, [key]: cached.formatted }));
            } else {
              getReadableAddress(p.latitude, p.longitude).then(res => {
                if (isMounted && res && res.formatted) {
                  setRouteAddressMap(prev => ({ ...prev, [key]: res.formatted }));
                }
              });
            }
          }
        }
      });
    }
    return () => { isMounted = false; };
  }, [routePoints, employee?.latitude, employee?.longitude, activeTab]);

  // Handle Preset Ranges
  function handlePresetChange(preset) {
    setPeriod(preset);
    const now = new Date();
    if (preset === 'daily') {
      setSelectedDate(todayStr);
    } else if (preset === 'weekly') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'monthly') {
      setSelectedMonth(now.getMonth() + 1);
      setSelectedYear(now.getFullYear());
    } else if (preset === 'custom') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  }

  // Export CSV (Excel compatible with UTF-8 BOM)
  function exportCSV() {
    if (!reportData || !reportData.records || reportData.records.length === 0) return;

    const headers = [
      'Date (PKT)',
      'Employee Code',
      'Employee Name',
      'Department',
      'Attendance Check-In',
      'Attendance Check-Out',
      'Working Duration',
      'Attendance Status',
      'Vehicle Name',
      'Number Plate',
      'Vehicle Check-In',
      'Vehicle Check-Out',
      'Vehicle KM',
      'GPS Tracking Start',
      'GPS Tracking End',
      'GPS Points',
      'GPS Distance (KM)',
      'Tracking Status'
    ];

    const rows = reportData.records.map(r => [
      r.date,
      `"${r.employee_code || ''}"`,
      `"${(r.employee_name || '').replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      r.check_in_time ? `"${formatPKTTime(r.check_in_time)}"` : 'Not Marked',
      r.check_out_time ? `"${formatPKTTime(r.check_out_time)}"` : (r.check_in_time ? 'Missing Check-Out' : 'N/A'),
      `"${r.work_duration_formatted || 'N/A'}"`,
      r.attendance_status || 'N/A',
      `"${(r.vehicle_name || '').replace(/"/g, '""')}"`,
      `"${(r.number_plate || '').replace(/"/g, '""')}"`,
      r.vehicle_checkin_time ? `"${formatPKTTime(r.vehicle_checkin_time)}"` : '',
      r.vehicle_checkout_time ? `"${formatPKTTime(r.vehicle_checkout_time)}"` : '',
      r.vehicle_distance_km || 0,
      r.tracking_started_at ? `"${formatPKTTime(r.tracking_started_at)}"` : '',
      r.tracking_ended_at ? `"${formatPKTTime(r.tracking_ended_at)}"` : '',
      r.total_gps_points || 0,
      r.gps_distance_km || 0,
      r.tracking_status || 'no_data'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employee_Report_${employee.employee_code || employee.employee_id}_${reportData.fromDate}_to_${reportData.toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Print / PDF View
  function handlePrintPDF() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to generate the PDF report.');

    const records = reportData?.records || [];
    const summary = reportData?.summary || {};

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SAFE SOLUTIONS FleetOps - Activity Report (${employee.name})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F2B5B; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #0F2B5B; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .emp-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 12px; }
          .emp-box strong { color: #0F2B5B; }
          .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; }
          .summary-card .val { font-size: 18px; font-weight: 800; color: #0F2B5B; }
          .summary-card .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #0F2B5B; color: #ffffff; text-align: left; padding: 8px; font-weight: 700; border: 1px solid #0F2B5B; }
          td { padding: 7px 8px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; display: inline-block; }
          .badge-green { background: #DEF7EC; color: #03543F; }
          .badge-amber { background: #FEF3C7; color: #92400E; }
          .badge-red { background: #FDE8E8; color: #9B1C1C; }
          .badge-slate { background: #F1F5F9; color: #475569; }
          .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { margin: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">SAFE SOLUTIONS — FleetOps Enterprise</h1>
            <div class="subtitle">Official Employee Activity & GPS Tracking Report | Timezone: Pakistan Standard Time (PKT, UTC+5)</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>Report Period: <strong>${reportData?.fromDate}</strong> to <strong>${reportData?.toDate}</strong></div>
            <div style="color: #64748b;">Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} PKT</div>
          </div>
        </div>

        <div class="emp-box">
          <div>Employee: <strong>${employee.name}</strong></div>
          <div>Code: <strong>${employee.employee_code || 'N/A'}</strong></div>
          <div>Department: <strong>${employee.department || 'Operations'}</strong></div>
          <div>Designation: <strong>${employee.designation || 'Staff'}</strong></div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="val">${summary.totalDays || 0}</div>
            <div class="lbl">Days Recorded</div>
          </div>
          <div class="summary-card">
            <div class="val">${summary.totalWorkHours || 0} hrs</div>
            <div class="lbl">Total Duty Hours</div>
          </div>
          <div class="summary-card">
            <div class="val">${summary.totalVehicleKm || 0} km</div>
            <div class="lbl">Vehicle Distance</div>
          </div>
          <div class="summary-card">
            <div class="val">${summary.totalGpsKm || 0} km</div>
            <div class="lbl">GPS Tracked</div>
          </div>
          <div class="summary-card">
            <div class="val" style="color: ${summary.missingCheckoutsCount > 0 ? '#DC2626' : '#10B981'};">
              ${summary.missingCheckoutsCount || 0}
            </div>
            <div class="lbl">Missing Checkouts</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date (PKT)</th>
              <th>Attendance Check-In</th>
              <th>Attendance Check-Out</th>
              <th>Working Duration</th>
              <th>Status</th>
              <th>Vehicle Assigned</th>
              <th>Vehicle In / Out</th>
              <th>GPS Distance</th>
              <th>Tracking Status</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td><strong>${r.date}</strong></td>
                <td>${r.check_in_time ? formatPKTTime(r.check_in_time) : '<span style="color:#94a3b8">Not Marked</span>'}</td>
                <td>${r.check_out_time ? formatPKTTime(r.check_out_time) : (r.check_in_time ? '<span style="color:#d97706;font-weight:700">Missing Checkout</span>' : '<span style="color:#94a3b8">-</span>')}</td>
                <td><strong>${r.work_duration_formatted}</strong></td>
                <td><span class="badge ${r.attendance_status === 'present' ? 'badge-green' : r.attendance_status === 'late' ? 'badge-amber' : 'badge-slate'}">${r.attendance_status}</span></td>
                <td>${r.vehicle_name ? `${r.vehicle_name} (${r.number_plate})` : '<span style="color:#94a3b8">None</span>'}</td>
                <td>${r.vehicle_checkin_time ? `${formatPKTTime(r.vehicle_checkin_time)} - ${r.vehicle_checkout_time ? formatPKTTime(r.vehicle_checkout_time) : 'Open'}` : '<span style="color:#94a3b8">-</span>'}</td>
                <td>${r.gps_distance_km ? `${r.gps_distance_km} KM (${r.total_gps_points} pts)` : '0 KM'}</td>
                <td><span class="badge ${r.tracking_status === 'active' ? 'badge-green' : r.tracking_status === 'completed' ? 'badge-slate' : 'badge-amber'}">${r.tracking_status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          SAFE SOLUTIONS FleetOps &bull; Confidential &bull; Generated for internal audit and verification.
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const trackingStatusColor = {
    Active: { bg: '#DEF7EC', text: '#03543F', border: '#31C48D' },
    Stopped: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
    Offline: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    'Not Started': { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
  }[employee.tracking_status] || { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 43, 91, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card-elevated animate-scale-in"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0F2B5B 0%, #1e3a8a 100%)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 16
              }}
            >
              {employee.employee_name ? employee.employee_name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {employee.employee_name}
                </h3>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {employee.employee_code || `EMP#${employee.employee_id}`}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {employee.department || 'Operations'} &bull; {employee.designation || 'Staff'} &bull; {employee.phone || 'No Phone'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: trackingStatusColor.bg,
                color: trackingStatusColor.text,
                border: `1px solid ${trackingStatusColor.border}`,
                padding: '4px 10px',
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: trackingStatusColor.border
                }}
              />
              {employee.tracking_status || 'Offline'}
            </span>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'reports' ? '3px solid #0F2B5B' : 'none',
              fontWeight: 700,
              fontSize: 13,
              color: activeTab === 'reports' ? '#0F2B5B' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <FileText size={16} /> Activity Reports (Daily, Weekly, Monthly)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('route')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'route' ? '3px solid #0F2B5B' : 'none',
              fontWeight: 700,
              fontSize: 13,
              color: activeTab === 'route' ? '#0F2B5B' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Navigation size={16} /> Route & GPS Path Log
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('today')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'today' ? '3px solid #0F2B5B' : 'none',
              fontWeight: 700,
              fontSize: 13,
              color: activeTab === 'today' ? '#0F2B5B' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Clock size={16} /> Today's Live Status Overview
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: REPORTS */}
          {activeTab === 'reports' && (
            <div>
              {/* Filter Controls Bar */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                {/* Period Buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { id: 'daily', label: '📅 Daily' },
                    { id: 'weekly', label: '📊 Weekly' },
                    { id: 'monthly', label: '🗓️ Monthly' },
                    { id: 'custom', label: '⚙️ Custom Range' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handlePresetChange(p.id)}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date Inputs based on Period */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {period === 'daily' && (
                    <input
                      type="date"
                      className="form-input"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 12 }}
                    />
                  )}

                  {(period === 'weekly' || period === 'custom') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: 12 }}
                      />
                      <span>to</span>
                      <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  )}

                  {period === 'monthly' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select
                        className="form-input"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="form-input"
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      >
                        {[2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={exportCSV}
                      disabled={!reportData?.records?.length}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      title="Download CSV for Excel"
                    >
                      <Download size={14} /> CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handlePrintPDF}
                      disabled={!reportData?.records?.length}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#0F2B5B' }}
                      title="Print or Save as PDF"
                    >
                      <Printer size={14} /> Print / PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Metrics */}
              {reportData?.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Days Recorded</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginTop: 2 }}>
                      {reportData.summary.totalDays}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Working Hours</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginTop: 2 }}>
                      {reportData.summary.totalWorkHours} hrs
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Vehicle Distance</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0F2B5B', marginTop: 2 }}>
                      {reportData.summary.totalVehicleKm} KM
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>GPS Tracked Distance</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
                      {reportData.summary.totalGpsKm} KM
                    </div>
                  </div>

                  <div style={{ background: reportData.summary.missingCheckoutsCount > 0 ? '#FEF2F2' : '#f8fafc', padding: 12, borderRadius: 10, border: `1px solid ${reportData.summary.missingCheckoutsCount > 0 ? '#FECACA' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: 11, color: reportData.summary.missingCheckoutsCount > 0 ? '#DC2626' : '#64748b', fontWeight: 600 }}>Missing Checkouts</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: reportData.summary.missingCheckoutsCount > 0 ? '#DC2626' : '#0F2B5B', marginTop: 2 }}>
                      {reportData.summary.missingCheckoutsCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Records Table */}
              {loadingReport ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading report records for {employee.employee_name}...</div>
                </div>
              ) : reportData?.records?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 12 }}>
                  <Calendar size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No attendance, vehicle, or tracking records found for the selected period.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <table className="table" style={{ margin: 0, fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ width: 100 }}>Date (PKT)</th>
                        <th>Attendance In</th>
                        <th>Attendance Out</th>
                        <th>Working Duration</th>
                        <th>Status</th>
                        <th>Vehicle Assigned</th>
                        <th>Vehicle Check-In/Out</th>
                        <th>GPS Distance</th>
                        <th>Tracking Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.records?.map(r => (
                        <tr key={r.date}>
                          <td>
                            <strong style={{ color: '#0F2B5B' }}>{r.date}</strong>
                          </td>
                          <td>
                            {r.check_in_time ? (
                              <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> {formatPKTTime(r.check_in_time)}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Not Marked</span>
                            )}
                          </td>
                          <td>
                            {r.check_out_time ? (
                              <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> {formatPKTTime(r.check_out_time)}
                              </span>
                            ) : r.check_in_time ? (
                              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                                ⚠️ Missing Checkout
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            {r.work_duration_hours !== null ? (
                              <strong style={{ color: '#0F2B5B' }}>{r.work_duration_formatted}</strong>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>{r.work_duration_formatted}</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 700,
                                background: r.attendance_status === 'present' ? '#DEF7EC' : r.attendance_status === 'late' ? '#FEF3C7' : '#F1F5F9',
                                color: r.attendance_status === 'present' ? '#03543F' : r.attendance_status === 'late' ? '#92400E' : '#475569'
                              }}
                            >
                              {r.attendance_status}
                            </span>
                          </td>
                          <td>
                            {r.vehicle_name ? (
                              <div style={{ fontSize: 11 }}>
                                <strong>{r.vehicle_name}</strong>
                                <div style={{ color: '#64748b' }}>{r.number_plate}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>None</span>
                            )}
                          </td>
                          <td>
                            {r.vehicle_checkin_time ? (
                              <div style={{ fontSize: 11 }}>
                                <div>In: {formatPKTTime(r.vehicle_checkin_time)}</div>
                                <div style={{ color: r.vehicle_checkout_time ? '#059669' : '#D97706' }}>
                                  Out: {r.vehicle_checkout_time ? formatPKTTime(r.vehicle_checkout_time) : 'Open'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.gps_distance_km || 0} KM</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{r.total_gps_points || 0} pts</div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: r.tracking_status === 'active' ? '#DEF7EC' : '#F1F5F9',
                                color: r.tracking_status === 'active' ? '#03543F' : '#475569'
                              }}
                            >
                              {r.tracking_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROUTE & GPS PATH */}
          {activeTab === 'route' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Select Route Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: 12 }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={fetchRoute}
                    disabled={loadingRoute}
                    style={{ fontSize: 12 }}
                  >
                    <RefreshCw size={12} className={loadingRoute ? 'animate-spin' : ''} /> Load Points
                  </button>
                </div>

                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Total GPS Breadcrumbs: <strong>{routePoints.length}</strong>
                </div>
              </div>

              {loadingRoute ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading route points...</div>
                </div>
              ) : routePoints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, color: '#94a3b8' }}>
                  <Navigation size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No GPS tracking breadcrumbs recorded on {selectedDate}.</p>
                </div>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <table className="table" style={{ margin: 0, fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th>#</th>
                        <th>Time (PKT)</th>
                        <th>Area / Address</th>
                        <th>Coordinates (Lat, Lng)</th>
                        <th>Speed</th>
                        <th>Accuracy</th>
                        <th>Battery</th>
                        <th>Status</th>
                        <th>Map</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routePoints.map((p, idx) => {
                        const coordKey = getCoordKey(p.latitude, p.longitude);
                        const addr = p.location_address || routeAddressMap[coordKey] || getCachedAddress(p.latitude, p.longitude)?.formatted || 'Resolving...';
                        return (
                          <tr key={p.id || idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{formatPKTTime(p.recorded_at)}</strong></td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ fontWeight: 700, color: '#0F2B5B', lineHeight: 1.35 }}>
                                📍 {addr}
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>
                              {parseFloat(p.latitude).toFixed(6)}, {parseFloat(p.longitude).toFixed(6)}
                            </td>
                            <td>{(p.speed_mps ? p.speed_mps * 3.6 : 0).toFixed(1)} km/h</td>
                            <td>&plusmn;{Math.round(p.accuracy_meters || 0)}m</td>
                            <td>{p.battery_level !== null ? `${Math.round(p.battery_level * 100)}%` : 'N/A'}</td>
                            <td>
                              <span style={{ color: p.is_moving ? '#059669' : '#D97706', fontWeight: 700 }}>
                                {p.is_moving ? '🚗 Moving' : '🅿️ Stopped'}
                              </span>
                            </td>
                            <td>
                              <a
                                href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#0F2B5B', fontWeight: 700, textDecoration: 'underline' }}
                              >
                                Pinpoint
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TODAY'S LIVE OVERVIEW */}
          {activeTab === 'today' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* GPS Live Status Box */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#0F2B5B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={16} /> Latest GPS Signal
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {/* Last Known Location */}
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                      Last Known Location:
                    </span>
                    <strong style={{ color: '#0F2B5B', fontSize: 12, lineHeight: 1.35, display: 'block', marginTop: 2 }}>
                      📍 {employee.latitude && employee.longitude
                        ? (employee.location_address || routeAddressMap[getCoordKey(employee.latitude, employee.longitude)] || getCachedAddress(employee.latitude, employee.longitude)?.formatted || 'Resolving address...')
                        : 'No GPS Signal'}
                    </strong>
                  </div>

                  {/* Last GPS Update (PKT date and time) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Last GPS Update:</span>
                    <strong style={{ color: '#0F2B5B' }}>
                      {employee.last_location_at
                        ? `${formatPKTDateTime(employee.last_location_at)} (${Math.round(employee.minutes_since_last_ping || 0)}m ago)`
                        : 'N/A'}
                    </strong>
                  </div>

                  {/* Coordinates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Coordinates:</span>
                    <strong style={{ fontFamily: 'monospace' }}>
                      {employee.latitude && employee.longitude
                        ? `${parseFloat(employee.latitude).toFixed(6)}, ${parseFloat(employee.longitude).toFixed(6)}`
                        : 'No GPS Signal'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Current Speed:</span>
                    <strong>{(employee.speed_mps ? employee.speed_mps * 3.6 : 0).toFixed(1)} km/h</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Battery:</span>
                    <strong>{employee.battery_level !== null ? `${Math.round(employee.battery_level * 100)}%` : 'N/A'}</strong>
                  </div>
                  {employee.latitude && employee.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${employee.latitude},${employee.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 8, textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                      🗺️ Open in Google Maps &nearr;
                    </a>
                  )}
                </div>
              </div>

              {/* Attendance Card */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#0F2B5B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} /> Attendance Status
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <strong style={{ color: employee.attendance_status === 'present' ? '#059669' : '#D97706' }}>
                      {employee.attendance_status ? employee.attendance_status.toUpperCase() : 'NOT MARKED'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Check-In Time:</span>
                    <strong style={{ color: '#059669' }}>
                      {employee.attendance_checkin_time ? formatPKTTime(employee.attendance_checkin_time) : 'N/A'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Check-Out Time:</span>
                    <strong style={{ color: employee.attendance_checkout_time ? '#DC2626' : '#D97706' }}>
                      {employee.attendance_checkout_time ? formatPKTTime(employee.attendance_checkout_time) : (employee.attendance_checkin_time ? 'Open / In Progress' : 'N/A')}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Type:</span>
                    <strong>{employee.attendance_type === 'site' ? '🏗️ Field Site' : '🏢 Office'}</strong>
                  </div>
                </div>
              </div>

              {/* Vehicle Check-In Card */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#0F2B5B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Car size={16} /> Vehicle Assignment
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Vehicle:</span>
                    <strong>{employee.vehicle_name || 'No Vehicle Assigned'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Plate:</span>
                    <strong>{employee.number_plate || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Vehicle Check-In:</span>
                    <strong>{employee.vehicle_checkin_time ? formatPKTTime(employee.vehicle_checkin_time) : 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Vehicle Check-Out:</span>
                    <strong style={{ color: employee.vehicle_checkout_time ? '#DC2626' : '#059669' }}>
                      {employee.vehicle_checkout_time ? formatPKTTime(employee.vehicle_checkout_time) : (employee.vehicle_checkin_time ? 'On Trip' : 'N/A')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

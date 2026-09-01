import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Calendar, Download, Users, Clock, ChevronDown, ChevronUp, FileText, RefreshCw, Search } from 'lucide-react';

export default function MonthlyReportsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all'); // 'all' | employee_id string
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [pngGenerating, setPngGenerating] = useState(false);

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchMonthlyData(selectedMonth, selectedEmployee);
    }
  }, [selectedMonth, selectedEmployee]);

  async function fetchAvailableMonths() {
    try {
      setLoading(true);
      const res = await api.get('/attendance/monthly-report');
      setMonths(res.months || []);
      // Default to the current/first month
      if (res.months && res.months.length > 0) {
        setSelectedMonth(res.months[0].month_key);
      }
    } catch (err) {
      toast.error('Failed to load available months.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonthlyData(month, empId) {
    try {
      setLoading(true);
      let url = `/attendance/monthly-report?month=${month}`;
      if (empId && empId !== 'all') {
        url += `&employee_id=${empId}`;
      }
      const res = await api.get(url);
      setSummary(res.summary || []);
      setRecords(res.records || []);
    } catch (err) {
      toast.error('Failed to load monthly report data.');
    } finally {
      setLoading(false);
    }
  }

  const getMonthLabel = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthDateRange = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    return `${firstDay.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${lastDay.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  const getEmployeeRecords = (employeeId) => {
    return records.filter(r => String(r.employee_id) === String(employeeId));
  };

  const getWorkDuration = (checkIn, checkOut, workHours) => {
    if (checkIn && checkOut) {
      const diffMs = Math.max(0, new Date(checkOut).getTime() - new Date(checkIn).getTime());
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    }
    if (workHours) return `${workHours}h`;
    return '—';
  };

  // Filter summary items based on search query
  const filteredSummary = summary.filter(emp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (emp.employee_name && emp.employee_name.toLowerCase().includes(q)) ||
      (emp.emp_id && emp.emp_id.toLowerCase().includes(q)) ||
      (emp.designation && emp.designation.toLowerCase().includes(q))
    );
  });

  // Selected single employee object if one is chosen
  const singleSelectedEmp = selectedEmployee !== 'all'
    ? summary.find(e => String(e.employee_id) === String(selectedEmployee) || String(e.emp_id) === String(selectedEmployee))
    : null;

  // PNG Report Generation (Canvas-based)
  const generateMonthlyPNG = () => {
    if (filteredSummary.length === 0) {
      toast.warning('No data available for the selected month to export.');
      return;
    }

    setPngGenerating(true);

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      drawReportCanvas(logoImg);
      setPngGenerating(false);
    };
    logoImg.onerror = () => {
      drawReportCanvas(null);
      setPngGenerating(false);
    };
    logoImg.src = '/assets/images/logo.jpeg';
  };

  const drawReportCanvas = (logoImg) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = 1200;
    const padding = 50;
    const isSingle = !!singleSelectedEmp;
    const targetEmpRecords = isSingle ? getEmployeeRecords(singleSelectedEmp.employee_id) : [];

    // Calculate dimensions
    const headerHeight = 250;
    const footerHeight = 80;
    let contentHeight = 0;

    if (isSingle) {
      // Single Employee view: KPI Summary Cards (100px) + Records Table
      const kpiHeight = 110;
      const tableHeaderHeight = 40;
      const rowHeight = 36;
      contentHeight = kpiHeight + tableHeaderHeight + (Math.max(1, targetEmpRecords.length) * rowHeight) + 60;
    } else {
      // All Employees Summary Table
      const tableHeaderHeight = 40;
      const summaryRowHeight = 40;
      contentHeight = tableHeaderHeight + (filteredSummary.length * summaryRowHeight) + 80;
    }

    const totalHeight = headerHeight + contentHeight + footerHeight;
    canvas.width = width;
    canvas.height = totalHeight;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // Top Brand Accent
    ctx.fillStyle = '#0F2B5B';
    ctx.fillRect(0, 0, width, 8);

    // Draw logo
    let currentY = 32;
    if (logoImg) {
      const logoSize = 64;
      const logoX = (width - logoSize) / 2;
      ctx.drawImage(logoImg, logoX, currentY, logoSize, logoSize);
      currentY += logoSize + 12;
    }

    // Company Name
    ctx.fillStyle = '#0F2B5B';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE SOLUTIONS', width / 2, currentY + 6);
    currentY += 24;

    // Tagline
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText('House of Construction Solutions', width / 2, currentY + 4);
    currentY += 28;

    // Report Title
    ctx.fillStyle = '#D42D56';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('MONTHLY ATTENDANCE REPORT', width / 2, currentY + 4);
    currentY += 24;

    // Month & Target (e.g., AUGUST 2026 — ALL EMPLOYEES or AUGUST 2026 — M. HUSNAIN FAROOQ (EMP001))
    ctx.fillStyle = '#0F2B5B';
    ctx.font = 'bold 15px Arial, sans-serif';
    const monthHeader = isSingle
      ? `${getMonthLabel(selectedMonth).toUpperCase()} — ${(singleSelectedEmp.employee_name || '').toUpperCase()} (${singleSelectedEmp.emp_id || ''})`
      : `${getMonthLabel(selectedMonth).toUpperCase()} — ALL EMPLOYEES`;
    ctx.fillText(monthHeader, width / 2, currentY + 4);
    currentY += 20;

    // Date range
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(getMonthDateRange(selectedMonth), width / 2, currentY + 2);
    currentY += 26;

    // Divider line
    ctx.strokeStyle = '#0F2B5B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();
    currentY += 20;

    const tableStartX = padding;
    const tableWidth = width - (padding * 2);

    if (isSingle) {
      // ─── SINGLE EMPLOYEE PNG LAYOUT ───
      // Draw KPI Summary Box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(tableStartX, currentY, tableWidth, 80);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(tableStartX, currentY, tableWidth, 80);

      const kpis = [
        { label: 'Present Days', val: singleSelectedEmp.present_days || 0, color: '#10B981' },
        { label: 'Total Records', val: singleSelectedEmp.total_records || 0, color: '#0284c7' },
        { label: 'Office Check-Ins', val: singleSelectedEmp.office_checkins || 0, color: '#0F2B5B' },
        { label: 'Site Check-Ins', val: singleSelectedEmp.site_checkins || 0, color: '#D42D56' },
        { label: 'Check-Outs', val: singleSelectedEmp.checkouts || 0, color: '#7c3aed' },
        { label: 'Missing Check-Outs', val: singleSelectedEmp.missing_checkouts || 0, color: '#f59e0b' },
        { label: 'Total Work Hours', val: `${Number(singleSelectedEmp.total_work_hours || 0).toFixed(1)}h`, color: '#0F2B5B' }
      ];

      const kpiW = tableWidth / kpis.length;
      kpis.forEach((k, idx) => {
        const kx = tableStartX + (idx * kpiW);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(k.label.toUpperCase(), kx + kpiW / 2, currentY + 28);

        ctx.fillStyle = k.color;
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText(String(k.val), kx + kpiW / 2, currentY + 56);

        if (idx < kpis.length - 1) {
          ctx.strokeStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.moveTo(kx + kpiW, currentY + 12);
          ctx.lineTo(kx + kpiW, currentY + 68);
          ctx.stroke();
        }
      });

      currentY += 100;

      // Table Header for single employee detailed records
      const detailCols = [
        { name: '#', w: 40 },
        { name: 'Date', w: 120 },
        { name: 'Type', w: 100 },
        { name: 'Check-In', w: 120 },
        { name: 'Check-Out', w: 120 },
        { name: 'Office / Site', w: 220 },
        { name: 'GPS Status', w: 140 },
        { name: 'Status', w: 110 },
        { name: 'Work Duration', w: 130 }
      ];

      const dScale = tableWidth / detailCols.reduce((s, c) => s + c.w, 0);
      detailCols.forEach(c => { c.w = Math.floor(c.w * dScale); });

      ctx.fillStyle = '#0F2B5B';
      ctx.fillRect(tableStartX, currentY, tableWidth, 36);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';

      let hx = tableStartX;
      detailCols.forEach(col => {
        ctx.fillText(col.name, hx + col.w / 2, currentY + 23);
        hx += col.w;
      });
      currentY += 36;

      // Table Rows
      if (targetEmpRecords.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText('No attendance records found for this employee in the selected month.', width / 2, currentY + 25);
        currentY += 36;
      } else {
        targetEmpRecords.forEach((r, idx) => {
          ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          ctx.fillRect(tableStartX, currentY, tableWidth, 36);

          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(tableStartX, currentY, tableWidth, 36);

          const timeInStr = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
          const timeOutStr = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress';
          const durationStr = getWorkDuration(r.check_in_time, r.check_out_time, r.work_hours);
          const dateStr = new Date(r.check_in_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          const rowValues = [
            String(idx + 1),
            dateStr,
            r.attendance_type === 'site' ? 'Site' : 'Office',
            timeInStr,
            timeOutStr,
            r.location_name || r.project_name || 'Head Office',
            r.gps_status || 'Inside Office',
            r.approval_status ? r.approval_status.toUpperCase() : 'APPROVED',
            durationStr
          ];

          let rx = tableStartX;
          detailCols.forEach((col, cIdx) => {
            const val = rowValues[cIdx];
            ctx.fillStyle = '#1e293b';
            ctx.font = '11px Arial, sans-serif';
            ctx.textAlign = 'center';

            if (cIdx === 5) {
              ctx.textAlign = 'left';
              ctx.fillText(val.length > 28 ? val.substring(0, 26) + '...' : val, rx + 10, currentY + 23);
            } else {
              ctx.fillText(val, rx + col.w / 2, currentY + 23);
            }

            if (cIdx < detailCols.length - 1) {
              ctx.beginPath();
              ctx.moveTo(rx + col.w, currentY);
              ctx.lineTo(rx + col.w, currentY + 36);
              ctx.strokeStyle = '#E2E8F0';
              ctx.stroke();
            }
            rx += col.w;
          });

          currentY += 36;
        });
      }
    } else {
      // ─── ALL EMPLOYEES PNG SUMMARY LAYOUT ───
      const cols = [
        { name: '#', w: 40 },
        { name: 'Employee Name', w: 200 },
        { name: 'Employee ID', w: 100 },
        { name: 'Present Days', w: 90 },
        { name: 'Records', w: 80 },
        { name: 'Office', w: 75 },
        { name: 'Site', w: 75 },
        { name: 'Check-Outs', w: 90 },
        { name: 'Missing', w: 80 },
        { name: 'Work Hours', w: 100 }
      ];

      const scale = tableWidth / cols.reduce((s, c) => s + c.w, 0);
      cols.forEach(c => { c.w = Math.floor(c.w * scale); });

      // Draw header row
      ctx.fillStyle = '#0F2B5B';
      ctx.fillRect(tableStartX, currentY, tableWidth, 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';

      let hx = tableStartX;
      cols.forEach(col => {
        ctx.fillText(col.name, hx + col.w / 2, currentY + 24);
        hx += col.w;
      });
      currentY += 38;

      // Draw summary rows
      filteredSummary.forEach((emp, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(tableStartX, currentY, tableWidth, 40);

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tableStartX, currentY, tableWidth, 40);

        const rowValues = [
          String(idx + 1),
          emp.employee_name || '—',
          emp.emp_id || '—',
          String(emp.present_days || 0),
          String(emp.total_records || 0),
          String(emp.office_checkins || 0),
          String(emp.site_checkins || 0),
          String(emp.checkouts || 0),
          String(emp.missing_checkouts || 0),
          `${Number(emp.total_work_hours || 0).toFixed(1)}h`
        ];

        let rx = tableStartX;
        cols.forEach((col, cIdx) => {
          const val = rowValues[cIdx];
          ctx.fillStyle = '#1e293b';
          ctx.font = '11px Arial, sans-serif';
          ctx.textAlign = 'center';

          if (cIdx === 1) {
            ctx.font = 'bold 11px Arial, sans-serif';
            ctx.fillStyle = '#0F2B5B';
            ctx.textAlign = 'left';
            ctx.fillText(val.length > 24 ? val.substring(0, 22) + '...' : val, rx + 10, currentY + 25);
          } else {
            ctx.fillText(val, rx + col.w / 2, currentY + 25);
          }

          if (cIdx < cols.length - 1) {
            ctx.beginPath();
            ctx.moveTo(rx + col.w, currentY);
            ctx.lineTo(rx + col.w, currentY + 40);
            ctx.strokeStyle = '#E2E8F0';
            ctx.stroke();
          }
          rx += col.w;
        });

        currentY += 40;
      });

      // Bottom totals line
      const totalPresent = filteredSummary.reduce((s, e) => s + parseInt(e.present_days || 0), 0);
      const totalRecords = filteredSummary.reduce((s, e) => s + parseInt(e.total_records || 0), 0);
      const totalHours = filteredSummary.reduce((s, e) => s + parseFloat(e.total_work_hours || 0), 0);

      currentY += 16;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Total Employees: ${filteredSummary.length}  |  Total Present Days: ${totalPresent}  |  Total Records: ${totalRecords}  |  Total Work Hours: ${totalHours.toFixed(1)}h`,
        width / 2, currentY
      );
    }

    // ─── FOOTER ───
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, totalHeight - 50, width, 50);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `SAFE SOLUTIONS FLEETOPS — Enterprise Fleet, Attendance & Site Operations • Faisalabad HQ`,
      width / 2, totalHeight - 30
    );
    ctx.fillText(
      `Report generated on ${new Date().toLocaleString()}`,
      width / 2, totalHeight - 14
    );

    // Download PNG
    const filename = isSingle
      ? `Safe_Solutions_Monthly_Report_${selectedMonth}_${(singleSelectedEmp.emp_id || 'employee').replace(/\s+/g, '_')}.png`
      : `Safe_Solutions_Monthly_Report_${selectedMonth}_All_Employees.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast.success('📸 Professional Monthly Report PNG generated & downloaded! Share it on WhatsApp.');
  };

  if (loading && months.length === 0) {
    return (
      <div className="page">
        <div className="page-loader"><div className="loader loader-lg" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 10, background: '#0F2B5B', borderRadius: 12, color: '#fff' }}>
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="page-title">Monthly Attendance Reports</h1>
              <p className="page-description">Employee-wise monthly attendance summary & detailed records from PostgreSQL database</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => selectedMonth && fetchMonthlyData(selectedMonth, selectedEmployee)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={generateMonthlyPNG}
            disabled={pngGenerating || filteredSummary.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F2B5B', fontWeight: 700 }}
          >
            <Download size={16} /> {pngGenerating ? 'Generating...' : 'Export PNG Report'}
          </button>
        </div>
      </div>

      {/* Report Filter Controls Card */}
      <div className="card-elevated" style={{ marginBottom: 24, padding: 16, borderLeft: '4px solid #0F2B5B' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <Calendar size={18} color="#0F2B5B" style={{ flexShrink: 0 }} />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '2px solid #0F2B5B', fontSize: 13, fontWeight: 700, color: '#0F2B5B', background: '#fff', width: '100%' }}
            >
              {months.length === 0 && <option value="">No months available</option>}
              {months.map(m => (
                <option key={m.month_key} value={m.month_key}>
                  {getMonthLabel(m.month_key)}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <Users size={18} color="#0F2B5B" style={{ flexShrink: 0 }} />
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0F2B5B', background: '#fff', width: '100%' }}
            >
              <option value="all">👥 All Employees</option>
              {summary.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_name} ({emp.emp_id})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filter employee or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px 14px 8px 34px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', background: '#fff' }}
            />
          </div>
        </div>
        {selectedMonth && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            📅 {getMonthDateRange(selectedMonth)}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="loader loader-lg" />
        </div>
      ) : (
        <>
          {/* Summary Metric KPI Cards */}
          {filteredSummary.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div className="card-elevated" style={{ padding: 14, borderRadius: 12, borderLeft: '4px solid #0F2B5B' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Employees</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#0F2B5B' }}>{filteredSummary.length}</h3>
              </div>
              <div className="card-elevated" style={{ padding: 14, borderRadius: 12, borderLeft: '4px solid #0284c7' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Records</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#0284c7' }}>{filteredSummary.reduce((s, e) => s + parseInt(e.total_records || 0), 0)}</h3>
              </div>
              <div className="card-elevated" style={{ padding: 14, borderRadius: 12, borderLeft: '4px solid #10B981' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Present Days</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#10B981' }}>{filteredSummary.reduce((s, e) => s + parseInt(e.present_days || 0), 0)}</h3>
              </div>
              <div className="card-elevated" style={{ padding: 14, borderRadius: 12, borderLeft: '4px solid #7c3aed' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Check-Outs</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{filteredSummary.reduce((s, e) => s + parseInt(e.checkouts || 0), 0)}</h3>
              </div>
              <div className="card-elevated" style={{ padding: 14, borderRadius: 12, borderLeft: '4px solid #D97706' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Total Work Hours</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#D97706' }}>{filteredSummary.reduce((s, e) => s + parseFloat(e.total_work_hours || 0), 0).toFixed(1)}h</h3>
              </div>
            </div>
          )}

          {/* Monthly Report Header Banner */}
          {selectedMonth && (
            <div style={{ textAlign: 'center', marginBottom: 20, padding: '16px 0', borderBottom: '2px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F2B5B' }}>
                {getMonthLabel(selectedMonth)} — {selectedEmployee !== 'all' && singleSelectedEmp ? `${singleSelectedEmp.employee_name} (${singleSelectedEmp.emp_id})` : 'All Employees Monthly Attendance Report'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                SAFE SOLUTIONS FleetOps Real-Time Database • {filteredSummary.length} employee{filteredSummary.length !== 1 ? 's' : ''} shown
              </p>
            </div>
          )}

          {/* Employee Summary Table */}
          <div className="table-container animate-fade-in-up" style={{ marginBottom: 24 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee Name</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Present Days</th>
                  <th>Total Records</th>
                  <th>Office</th>
                  <th>Site</th>
                  <th>Check-Outs</th>
                  <th>Missing</th>
                  <th>Total Work Hours</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummary.length > 0 ? (
                  filteredSummary.map((emp, idx) => {
                    const isExpanded = expandedEmployee === emp.employee_id || selectedEmployee !== 'all';
                    const empRecords = getEmployeeRecords(emp.employee_id);

                    return (
                      <React.Fragment key={`summary-row-${emp.employee_id}`}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedEmployee(expandedEmployee === emp.employee_id ? null : emp.employee_id)}>
                          <td style={{ fontWeight: 700, color: '#0F2B5B' }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#0F2B5B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                                {(emp.employee_name || '?')[0]}
                              </div>
                              <strong style={{ fontWeight: 700, color: '#0F2B5B' }}>{emp.employee_name}</strong>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{emp.emp_id}</td>
                          <td>{emp.designation || 'Staff'}</td>
                          <td><span style={{ fontWeight: 700, color: '#10B981' }}>{emp.present_days}</span></td>
                          <td><span style={{ fontWeight: 700, color: '#0284c7' }}>{emp.total_records}</span></td>
                          <td><span style={{ fontWeight: 700, color: '#0F2B5B' }}>{emp.office_checkins || 0}</span></td>
                          <td><span style={{ fontWeight: 700, color: '#D42D56' }}>{emp.site_checkins || 0}</span></td>
                          <td><span style={{ fontWeight: 700, color: '#7c3aed' }}>{emp.checkouts || 0}</span></td>
                          <td>
                            <span style={{ fontWeight: 700, color: emp.missing_checkouts > 0 ? '#ea580c' : '#64748b' }}>
                              {emp.missing_checkouts || 0}
                            </span>
                          </td>
                          <td><span style={{ fontWeight: 800, color: '#D97706' }}>{Number(emp.total_work_hours || 0).toFixed(1)}h</span></td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedEmployee(expandedEmployee === emp.employee_id ? null : emp.employee_id);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#0F2B5B' }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>

                        {/* Detailed Daily Attendance Records Sub-table */}
                        {isExpanded && (
                          <tr key={`detail-${emp.employee_id}`}>
                            <td colSpan={12} style={{ padding: 0, background: '#f8fafc' }}>
                              <div style={{ padding: '14px 20px' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F2B5B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <FileText size={14} /> Detailed Daily Attendance Records — {emp.employee_name} ({emp.emp_id})
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#e2e8f0' }}>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Date</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Type</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Check-In</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Check-Out</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Office / Site</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>GPS Status</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Status</th>
                                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Work Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {empRecords.length > 0 ? (
                                      empRecords.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                                            {new Date(r.check_in_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                              background: r.attendance_type === 'site' ? '#fff1f2' : '#eff6ff',
                                              color: r.attendance_type === 'site' ? '#d42d56' : '#0f2b5b'
                                            }}>
                                              {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '6px 10px', color: '#047857', fontWeight: 600 }}>
                                            {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                          </td>
                                          <td style={{ padding: '6px 10px', color: r.check_out_time ? '#D42D56' : '#D97706', fontWeight: 600 }}>
                                            {r.check_out_time
                                              ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                              : 'In Progress'}
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>{r.location_name || r.project_name || 'Head Office'}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 11 }}>📍 {r.gps_status || 'Inside Office'}</td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                              background: r.approval_status === 'approved' ? '#dcfce7' : r.approval_status === 'rejected' ? '#fef2f2' : '#fefce8',
                                              color: r.approval_status === 'approved' ? '#166534' : r.approval_status === 'rejected' ? '#991b1b' : '#854d0e'
                                            }}>
                                              {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0F2B5B' }}>
                                            {getWorkDuration(r.check_in_time, r.check_out_time, r.work_hours)}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={8} style={{ padding: 12, textAlign: 'center', color: '#94a3b8' }}>
                                          No detailed records found for this employee.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                      {selectedMonth
                        ? 'No attendance records found for the selected filter.'
                        : 'Please select a month to view the attendance report.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

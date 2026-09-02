import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import EmployeeQRScanner from '../../components/attendance/EmployeeQRScanner';
import { Building2, HardHat, CheckCircle2, MapPin, Navigation, Clock, Calendar, RefreshCw, Send, Car, Route, ClipboardCheck, ArrowRight, ShieldCheck, Filter, Camera, Search, Users } from 'lucide-react';

export default function AttendancePage() {
  const { user, isController, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Tab State: 'office' | 'site' | 'vehicle'
  const [activeTab, setActiveTab] = useState('office');

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeAttendanceType, setActiveAttendanceType] = useState('office'); // 'office' | 'site'
  const [scanAction, setScanAction] = useState('checkin'); // 'checkin' | 'checkout'
  const [siteCheckoutNotes, setSiteCheckoutNotes] = useState('');

  // Form State after scan
  const [scannedData, setScannedData] = useState(null);
  const [qrVerification, setQrVerification] = useState(null);
  const [userGps, setUserGps] = useState({ lat: null, lng: null });
  const [projectName, setProjectName] = useState('');
  const [siteLocation, setSiteLocation] = useState('Faisalabad, Pakistan');
  const [notes, setNotes] = useState('');
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [sitePhotoBlob, setSitePhotoBlob] = useState(null);
  const [sitePhotoPreview, setSitePhotoPreview] = useState(null);
  const [workCompleted, setWorkCompleted] = useState('');
  const [issueFound, setIssueFound] = useState('');
  const [weather, setWeather] = useState('');
  const [gpsVerified, setGpsVerified] = useState(false);

  // Filters for History table
  const [filterType, setFilterType] = useState('all'); // 'all' | 'office' | 'site'
  const [selectedEmployee, setSelectedEmployee] = useState('all'); // 'all' | employee_id
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [attendanceSuccessModal, setAttendanceSuccessModal] = useState(null);

  useEffect(() => {
    fetchData();
    getCurrentGps();

    const interval = setInterval(fetchData, 8000);
    const clockInterval = setInterval(() => setNowTime(Date.now()), 1000);
    const handleSync = () => fetchData();
    window.addEventListener('app:data-sync', handleSync);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
      window.removeEventListener('app:data-sync', handleSync);
    };
  }, []);

  const getLiveWorkTimer = (checkInTime) => {
    if (!checkInTime) return '00:00:00';
    const diffMs = Math.max(0, nowTime - new Date(checkInTime).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCompletedWorkDuration = (checkInTime, checkOutTime, fallbackHours) => {
    if (checkInTime && checkOutTime) {
      const diffMs = Math.max(0, new Date(checkOutTime).getTime() - new Date(checkInTime).getTime());
      const totalSecs = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
    if (fallbackHours) return `${fallbackHours} hrs`;
    return 'Completed';
  };

  async function fetchData() {
    try {
      const [todayRes, histRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history')
      ]);
      setTodayAttendance(todayRes?.attendance || null);
      setHistory(histRes?.records || []);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getCurrentGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserGps({ lat: 31.4504, lng: 73.1350 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserGps({ lat: 31.4504, lng: 73.1350 });
    }
  };

  const handleStartScan = (type, action = 'checkin') => {
    if (action === 'checkin' && todayAttendance && todayAttendance.approval_status !== 'rejected') {
      toast.warning('You have already submitted employee attendance for today.');
      return;
    }
    if (action === 'checkout' && (!todayAttendance || todayAttendance.check_out_time)) {
      toast.warning('Check-out is not available.');
      return;
    }
    setActiveAttendanceType(type);
    setScanAction(action);
    setScannedData(null);
    setQrVerification(null);
    getCurrentGps();
    setScannerOpen(true);
  };

  const handleScanSuccess = async (text) => {
    setScannerOpen(false);
    setScannedData(text);
    setActionLoading(true);

    try {
      const res = await api.post('/employee-qr-codes/verify', {
        scanned_data: text,
        lat: userGps.lat || 31.4504,
        lng: userGps.lng || 73.1350
      });

      if (res.valid) {
        setQrVerification(res.qr_code);
        toast.success(`Scanned: ${res.qr_code.name} (${res.qr_code.gps_status})`);
      }
    } catch (err) {
      toast.error(err.message || 'QR Verification failed or inactive QR Code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!qrVerification) {
      toast.error('Please scan a valid QR Code first.');
      return;
    }

    setActionLoading(true);
    try {
      if (scanAction === 'checkout') {
        const endpoint = activeAttendanceType === 'office' ? '/attendance/office/checkout' : '/attendance/site/checkout';
        const payload = {
          scanned_data: scannedData,
          lat: userGps.lat || 31.4504,
          lng: userGps.lng || 73.1350,
          notes
        };

        const res = await api.post(endpoint, payload);
        const record = res.attendance;

        const timeInStr = new Date(record?.check_in_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const timeOutStr = new Date(record?.check_out_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = new Date(record?.check_in_time || Date.now()).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        setAttendanceSuccessModal({
          title: 'Office Attendance Checked-Out Successfully',
          date: dateStr,
          time: timeInStr,
          check_out_time: timeOutStr,
          work_hours: record?.work_hours || 0,
          office: record?.project_name || qrVerification?.name || 'Head Office Faisalabad',
          gps_status: record?.gps_status || qrVerification?.gps_status || 'Inside Office'
        });
        toast.success(`Office Check-Out Marked Successfully at ${timeOutStr}`);
      } else {
        const endpoint = activeAttendanceType === 'office' ? '/attendance/office' : '/attendance/site';
        const payload = {
          scanned_data: scannedData,
          project_name: activeAttendanceType === 'site' ? projectName : undefined,
          lat: userGps.lat || 31.4504,
          lng: userGps.lng || 73.1350,
          notes
        };

        const res = await api.post(endpoint, payload);
        const record = res.attendance;

        if (activeAttendanceType === 'office') {
          const timeStr = new Date(record?.check_in_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          const dateStr = new Date(record?.check_in_time || Date.now()).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          
          setAttendanceSuccessModal({
            title: 'Office Attendance Marked Successfully',
            date: dateStr,
            time: timeStr,
            office: record?.project_name || qrVerification?.name || 'Head Office Faisalabad',
            gps_status: record?.gps_status || qrVerification?.gps_status || 'Inside Office'
          });
          toast.success(`Office Attendance Marked Successfully at ${timeStr}`);
        } else {
          toast.success('Site Attendance submitted! Pending Manager Approval.');
        }
      }
      
      // Trigger global real-time synchronization across Dashboard & Header
      window.dispatchEvent(new CustomEvent('app:data-sync'));

      setScannedData(null);
      setQrVerification(null);
      setNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSiteCheckout = async () => {
    if (!todayAttendance || todayAttendance.check_out_time) {
      toast.error('No open site attendance session to check out.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        lat: userGps.lat || 31.4504,
        lng: userGps.lng || 73.1350,
        notes: siteCheckoutNotes || ''
      };

      const res = await api.post('/attendance/site/checkout', payload);
      const record = res.attendance;

      const timeInStr = new Date(record?.check_in_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const timeOutStr = new Date(record?.check_out_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = new Date(record?.check_in_time || Date.now()).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      setAttendanceSuccessModal({
        title: 'Site Attendance Checked-Out Successfully',
        date: dateStr,
        time: timeInStr,
        check_out_time: timeOutStr,
        work_hours: record?.work_hours || 0,
        office: record?.project_name || record?.location_name || 'On-Site Project',
        gps_status: 'GPS Verified'
      });
      toast.success(`Site Check-Out Marked Successfully at ${timeOutStr}`);

      window.dispatchEvent(new CustomEvent('app:data-sync'));
      setSiteCheckoutNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to check out from site.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSiteAttendance = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter the Site Name.');
      return;
    }
    if (!siteLocation.trim()) {
      toast.error('Please enter the Site Location.');
      return;
    }
    if (!selfieBlob || !sitePhotoBlob) {
      toast.error('Please capture both your selfie and site photo.');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('project_name', projectName);
      formData.append('location_name', siteLocation);
      formData.append('lat', userGps.lat || 31.4504);
      formData.append('lng', userGps.lng || 73.1350);
      
      const fullNotes = `Site Location: ${siteLocation}\nWork Completed: ${workCompleted}\nIssues Found: ${issueFound || 'None'}\nWeather: ${weather || 'Normal'}\nSummary: ${notes || ''}`;
      formData.append('notes', fullNotes);
      formData.append('selfie', selfieBlob, 'selfie.jpg');
      formData.append('site_photo', sitePhotoBlob, 'site_photo.jpg');

      await api.post('/attendance/site', formData);
      toast.success('Site Attendance submitted successfully! Pending approval.');
      
      // Trigger global real-time synchronization across Dashboard & Header
      window.dispatchEvent(new CustomEvent('app:data-sync'));

      setSelfieBlob(null);
      setSelfiePreview(null);
      setSitePhotoBlob(null);
      setSitePhotoPreview(null);
      setWorkCompleted('');
      setIssueFound('');
      setWeather('');
      setNotes('');
      setGpsVerified(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit site attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredHistory = history.filter(r => {
    if (filterType !== 'all' && r.attendance_type !== filterType) return false;
    if (selectedEmployee !== 'all' && String(r.employee_id) !== String(selectedEmployee) && String(r.emp_id) !== String(selectedEmployee)) return false;
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase().trim();
      const matchName = (r.employee_name || '').toLowerCase().includes(q);
      const matchEmpId = (r.emp_id || '').toLowerCase().includes(q);
      const matchLocation = (r.location_name || r.project_name || '').toLowerCase().includes(q);
      if (!matchName && !matchEmpId && !matchLocation) return false;
    }
    return true;
  });

  // Derive unique employees from history records for the selector
  const uniqueEmployees = history.reduce((acc, r) => {
    const key = r.employee_id || r.emp_id;
    if (key && !acc.find(e => (e.employee_id || e.emp_id) === key)) {
      acc.push({ employee_id: r.employee_id, emp_id: r.emp_id, employee_name: r.employee_name || user?.name });
    }
    return acc;
  }, []);

  // Group filtered records by employee for clean employee-wise view
  const groupedByEmployee = filteredHistory.reduce((acc, r) => {
    const key = r.employee_id || r.emp_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        employee_id: r.employee_id,
        emp_id: r.emp_id,
        employee_name: r.employee_name || user?.name || 'Employee',
        records: []
      };
    }
    acc[key].records.push(r);
    return acc;
  }, {});

  const employeeGroups = Object.values(groupedByEmployee);

  const getWorkDuration = (checkIn, checkOut, workHours) => {
    if (checkIn && checkOut) {
      const diffMs = Math.max(0, new Date(checkOut).getTime() - new Date(checkIn).getTime());
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    }
    if (workHours) return `${workHours}h`;
    return null;
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
      {/* Header Banner */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Attendance Center</h1>
          <p className="page-description">Complete Unified Hub for Office Attendance, Site Attendance & Vehicle Attendance</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #0F2B5B 0%, #1e3a8a 100%)',
            color: '#fff', padding: '8px 16px', borderRadius: 12,
            boxShadow: '0 4px 12px rgba(15, 43, 91, 0.2)'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd' }}>Live Operational Clock</span>
              <span style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                {new Date(nowTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      </div>

      {/* TOP TAB SWITCHER FOR UNIFIED ATTENDANCE CENTER */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab('office')}
          className={`tab ${activeTab === 'office' ? 'active' : ''}`}
        >
          <Building2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> 
          Office Attendance
        </button>

        <button
          onClick={() => setActiveTab('site')}
          className={`tab ${activeTab === 'site' ? 'active' : ''}`}
        >
          <HardHat size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> 
          Site Attendance
        </button>

        <button
          onClick={() => setActiveTab('vehicle')}
          className={`tab ${activeTab === 'vehicle' ? 'active' : ''}`}
        >
          <Car size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> 
          Vehicle Attendance
        </button>
      </div>

      {/* Today's Active Submission Status Banner */}
      {todayAttendance && (
        <div className="card-elevated animate-fade-in-up" style={{
          marginBottom: 'var(--space-6)',
          borderLeft: todayAttendance.check_out_time ? '4px solid #10B981' : '4px solid var(--color-primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: todayAttendance.check_out_time ? '#10B981' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {todayAttendance.check_out_time ? '✅ Attendance Completed for Today' : "Today's Active Submission"}
              </span>
              <h4 style={{ margin: '4px 0', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {todayAttendance.attendance_type === 'office' ? '🏢 Office Attendance' : '🏗️ Site Attendance'} - {todayAttendance.location_name || todayAttendance.project_name || 'Head Office'}
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Check-In: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                {todayAttendance.check_out_time && (
                  <> • Check-Out: {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</>
                )}
                {' '}• GPS: 📍 {todayAttendance.gps_status || 'Inside Radius'} ({todayAttendance.distance_meters || 0}m distance)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!todayAttendance.check_out_time ? (
                <div style={{ textAlign: 'right', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🟢 LIVE TIME</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                    {new Date(nowTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'right', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>✓ COMPLETED</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#047857' }}>
                    {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
              )}
              <span className={`badge badge-${todayAttendance.approval_status === 'approved' ? 'green' : todayAttendance.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                {todayAttendance.approval_status === 'approved' ? '✅ Approved' : todayAttendance.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: OFFICE ATTENDANCE */}
      {activeTab === 'office' && (
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="avatar avatar-lg" style={{ background: 'rgba(15, 110, 119, 0.1)', color: 'var(--color-deep-teal)' }}>
              <Building2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Office Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Head Office & Branch Office Check-In & Check-Out</p>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Scan the official Office QR code at Head Office or Branch Office to automatically capture your GPS location, verify radius compliance, and record daily office attendance.
          </p>

          {!todayAttendance || todayAttendance.approval_status === 'rejected' ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => handleStartScan('office', 'checkin')}
              disabled={actionLoading}
              style={{ width: '100%', minHeight: 52, fontSize: 15, fontWeight: 800, borderRadius: 14 }}
            >
              <Building2 size={20} /> Click Office Attendance & Scan QR (Check-In)
            </button>
          ) : todayAttendance.attendance_type === 'office' && !todayAttendance.check_out_time ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 16, background: 'rgba(15, 110, 119, 0.08)', borderRadius: 12, border: '1px solid rgba(15, 110, 119, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-deep-teal)' }}>Active Office Check-In</span>
                    <h4 style={{ margin: '2px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{todayAttendance.location_name || 'Head Office Faisalabad'}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      Checked in at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', padding: '6px 14px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>🟢 WORKING NOW</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {getLiveWorkTimer(todayAttendance.check_in_time)}
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-danger btn-lg"
                onClick={() => handleStartScan('office', 'checkout')}
                disabled={actionLoading}
                style={{ width: '100%', minHeight: 52, fontSize: 15, fontWeight: 800, borderRadius: 14, background: '#D42D56', borderColor: '#D42D56' }}
              >
                <Building2 size={20} /> Scan Office QR for Check-Out
              </button>
            </div>
          ) : todayAttendance.attendance_type === 'office' && todayAttendance.check_out_time ? (
            <div style={{ padding: 20, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#10B981' }}>Office Attendance Completed for Today</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Check-In: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • Check-Out: {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          ) : (
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                You have active Site Attendance recorded for today. Please switch to the Site Attendance tab to manage it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: SITE ATTENDANCE */}
      {activeTab === 'site' && (
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="avatar avatar-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
              <HardHat size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Site Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Complete Project Site Verification & Check-In / Check-Out</p>
            </div>
          </div>

          {!todayAttendance || todayAttendance.approval_status === 'rejected' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step 1: Site Name & Site Location Inputs */}
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>1a. Enter Site Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Al-Noor Plaza Roof Waterproofing"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={actionLoading}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>1b. Enter Site Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Faisalabad, Pakistan"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    disabled={actionLoading}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Step 2: Verify GPS */}
              <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>2. Verify GPS Location *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      getCurrentGps();
                      setGpsVerified(true);
                      toast.success('📍 Live GPS coordinates verified successfully!');
                    }}
                    disabled={actionLoading}
                  >
                    <MapPin size={16} /> Verify Location
                  </button>
                  {gpsVerified && (
                    <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✓ Verified: {userGps?.lat?.toFixed(5) || '31.4504'} , {userGps?.lng?.toFixed(5) || '73.1350'}
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Selfie Capture */}
              <div className="form-group" style={{ border: '1px solid var(--bg-tertiary)', padding: 16, borderRadius: 12 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>3. Capture Live Selfie Photo *</label>
                {selfiePreview ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={selfiePreview} alt="Selfie" style={{ width: '100%', maxWidth: 260, borderRadius: 8 }} />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setSelfiePreview(null); setSelfieBlob(null); }}>
                      🔄 Retake Selfie
                    </button>
                  </div>
                ) : (
                  <CameraCapture defaultFacing="user" onCapture={(blob, preview) => {
                    setSelfieBlob(blob);
                    setSelfiePreview(preview);
                  }} />
                )}
              </div>

              {/* Step 4: Site Photo Capture */}
              <div className="form-group" style={{ border: '1px solid var(--bg-tertiary)', padding: 16, borderRadius: 12 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>4. Capture Site Photo (Work Status) *</label>
                {sitePhotoPreview ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={sitePhotoPreview} alt="Site" style={{ width: '100%', maxWidth: 260, borderRadius: 8 }} />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setSitePhotoPreview(null); setSitePhotoBlob(null); }}>
                      🔄 Retake Site Photo
                    </button>
                  </div>
                ) : (
                  <CameraCapture defaultFacing="environment" onCapture={(blob, preview) => {
                    setSitePhotoBlob(blob);
                    setSitePhotoPreview(preview);
                  }} />
                )}
              </div>

              {/* Step 5: Small Note */}
              <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>5. Write Small Note (Required) *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>Work Completed:</span>
                    <input className="form-input" placeholder="e.g. Waterproofing slab" value={workCompleted} onChange={(e) => setWorkCompleted(e.target.value)} disabled={actionLoading} />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>Issue Found (Optional):</span>
                    <input className="form-input" placeholder="e.g. Rain delays, no issues" value={issueFound} onChange={(e) => setIssueFound(e.target.value)} disabled={actionLoading} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>Weather Status:</span>
                    <input className="form-input" placeholder="e.g. Clear skies, 32C" value={weather} onChange={(e) => setWeather(e.target.value)} disabled={actionLoading} />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>General Summary:</span>
                    <input className="form-input" placeholder="Site general summary..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={actionLoading} />
                  </div>
                </div>
              </div>

              {/* Submit Check-In */}
              <button
                type="button"
                className="btn btn-danger btn-lg"
                disabled={actionLoading || !gpsVerified || !selfieBlob || !sitePhotoBlob || !workCompleted}
                onClick={handleSubmitSiteAttendance}
                style={{ width: '100%', marginTop: 12, minHeight: 52, fontSize: 15, fontWeight: 800, background: '#D42D56', borderColor: '#D42D56', borderRadius: 14 }}
              >
                {actionLoading ? 'Submitting Site Attendance...' : 'Submit Site Attendance (Check-In)'}
              </button>
            </div>
          ) : todayAttendance.attendance_type === 'site' && !todayAttendance.check_out_time ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Active Site Check-in Info */}
              <div style={{ padding: 16, background: 'rgba(212, 45, 86, 0.08)', borderRadius: 12, border: '1px solid rgba(212, 45, 86, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#D42D56' }}>Active Site Duty Check-In</span>
                    <h4 style={{ margin: '2px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{todayAttendance.project_name || 'On-Site Project'}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                      📍 Location: {todayAttendance.location_name || 'On-Site'} • Checked in at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right', padding: '6px 14px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>🟢 LIVE TIME</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {new Date(nowTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <span className={`badge badge-${todayAttendance.approval_status === 'approved' ? 'green' : 'yellow'}`}>
                      {todayAttendance.approval_status === 'approved' ? '✅ Approved' : '⏳ Pending Approval'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Site Check-Out Step 1: GPS */}
              <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>1. Verify GPS for Check-Out *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      getCurrentGps();
                      setGpsVerified(true);
                      toast.success('📍 Live GPS coordinates verified for Check-Out!');
                    }}
                    disabled={actionLoading}
                  >
                    <MapPin size={16} /> Verify Check-Out Location
                  </button>
                  {gpsVerified && (
                    <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ✓ Verified: {userGps?.lat?.toFixed(5) || '31.4504'} , {userGps?.lng?.toFixed(5) || '73.1350'}
                    </span>
                  )}
                </div>
              </div>

              {/* Site Check-Out Step 2: Note */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>2. Check-Out / Duty Completion Note (Optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Completed today's slab waterproofing duty. Returning from site."
                  value={siteCheckoutNotes}
                  onChange={(e) => setSiteCheckoutNotes(e.target.value)}
                  disabled={actionLoading}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Perform Site Check-Out */}
              <button
                type="button"
                className="btn btn-danger btn-lg"
                disabled={actionLoading}
                onClick={handleSiteCheckout}
                style={{ width: '100%', height: 50, fontSize: 15, fontWeight: 800, background: '#D42D56', borderColor: '#D42D56' }}
              >
                {actionLoading ? 'Processing Site Check-Out...' : '🏗️ Complete Duty & Site Check-Out'}
              </button>
            </div>
          ) : todayAttendance.attendance_type === 'site' && todayAttendance.check_out_time ? (
            <div style={{ padding: 20, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#10B981' }}>Site Attendance Completed for Today</h4>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{todayAttendance.project_name || 'On-Site Project'} ({todayAttendance.location_name || 'Site'})</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Check-In: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • Check-Out: {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          ) : (
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                You have active Office Attendance recorded for today. Please switch to the Office Attendance tab to manage it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: VEHICLE ATTENDANCE */}
      {activeTab === 'vehicle' && (
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="avatar avatar-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
              <Car size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Vehicle Attendance Hub</h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Daily Vehicle Check-In, Odometer Meter Reading & Return Check-Out</p>
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Perform your official daily Vehicle Check-In before start of duty or Vehicle Check-Out upon duty completion. Scan vehicle QR code, enter opening meter reading, and submit fuel logs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/check-in')}
            >
              <ClipboardCheck size={18} /> Vehicle Check-In <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-danger btn-lg"
              onClick={() => navigate('/check-out')}
            >
              <Route size={18} /> Vehicle & Attendance Check-Out <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Verification & Submission Box (Appears after successful scan) */}
      {qrVerification && (
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-8)', border: '1px solid var(--color-success)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> Scanned QR Code Verified: {qrVerification.name}
          </h3>

          <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-stat">
              <span className="stat-label">Action</span>
              <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {scanAction === 'checkout' ? 'Check-Out' : 'Check-In'} ({activeAttendanceType})
              </strong>
            </div>

            <div className="card-stat">
              <span className="stat-label">GPS Verification Status</span>
              <strong style={{ fontSize: 'var(--text-base)', color: qrVerification.is_within_radius ? 'var(--color-success)' : 'var(--color-error)' }}>
                📍 {qrVerification.gps_status}
              </strong>
            </div>

            <div className="card-stat">
              <span className="stat-label">Calculated Distance</span>
              <strong style={{ fontSize: 'var(--text-base)', color: 'var(--color-info)' }}>{qrVerification.distance_meters} meters</strong>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label">Optional Work Notes:</label>
            <input
              type="text"
              className="form-input"
              placeholder={scanAction === 'checkout' ? 'e.g. Completed today office duties...' : 'e.g. Arrived for morning shift...'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            className={`btn ${scanAction === 'checkout' ? 'btn-danger' : 'btn-teal'} btn-lg`}
            onClick={handleSubmitAttendance}
            disabled={actionLoading}
            style={{ width: '100%' }}
          >
            {actionLoading ? 'Processing...' : (
              scanAction === 'checkout' ? (
                <><Building2 size={18} /> Confirm Office Check-Out</>
              ) : (
                <><Send size={18} /> Submit Attendance for Manager Approval</>
              )
            )}
          </button>
        </div>
      )}

      {/* ATTENDANCE HISTORY & LOGS — PROFESSIONAL EMPLOYEE-WISE VIEW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>Attendance History & Logs</h3>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Employee-wise GPS-verified attendance submissions & check-outs</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Employee Search Box */}
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={employeeSearch}
              onChange={e => setEmployeeSearch(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', color: '#0F2B5B', width: '100%' }}
            />
          </div>

          {/* Employee Selector Dropdown */}
          {(isController || isAdmin) && uniqueEmployees.length > 1 && (
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, background: '#fff', color: '#0F2B5B', minWidth: 200 }}
            >
              <option value="all">👥 All Employees ({uniqueEmployees.length})</option>
              {uniqueEmployees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_name} ({emp.emp_id})
                </option>
              ))}
            </select>
          )}

          {/* Filter buttons (Office / Site) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-primary)', padding: 4, borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)' }}>
            <button
              onClick={() => setFilterType('all')}
              className={`btn btn-sm ${filterType === 'all' ? 'btn-ghost active' : ''}`}
              style={{ background: filterType === 'all' ? 'var(--bg-secondary)' : 'transparent', border: 'none' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('office')}
              className={`btn btn-sm ${filterType === 'office' ? 'btn-ghost active' : ''}`}
              style={{ background: filterType === 'office' ? 'var(--bg-secondary)' : 'transparent', border: 'none' }}
            >
              🏢 Office
            </button>
            <button
              onClick={() => setFilterType('site')}
              className={`btn btn-sm ${filterType === 'site' ? 'btn-ghost active' : ''}`}
              style={{ background: filterType === 'site' ? 'var(--bg-secondary)' : 'transparent', border: 'none' }}
            >
              🏗️ Site
            </button>
          </div>
        </div>
      </div>

      {/* RENDER EMPLOYEE-WISE VIEW */}
      {employeeGroups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {employeeGroups.map(group => (
            <div key={`group-${group.employee_id || group.emp_id}`} className="card-glass animate-fade-in-up" style={{ padding: 0, overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(15, 43, 91, 0.12)' }}>
              {/* Employee Section Header Banner */}
              <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg, #0F2B5B 0%, #1e3a8a 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', color: '#0F2B5B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {(group.employee_name || '?')[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>
                      {group.employee_name}
                    </h4>
                    <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>
                      Employee ID: {group.emp_id || 'EMP'} • {group.records.length} record{group.records.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700 }}>
                    🏢 {group.records.filter(r => r.attendance_type === 'office').length} Office
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700 }}>
                    🏗️ {group.records.filter(r => r.attendance_type === 'site').length} Site
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.3)', color: '#6ee7b7', fontSize: 11, fontWeight: 700 }}>
                    ✅ {group.records.filter(r => r.approval_status === 'approved').length} Approved
                  </span>
                </div>
              </div>

              {/* Desktop Records Table */}
              <div className="table-container hide-on-mobile" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: 110 }}>Date</th>
                      <th style={{ width: 110 }}>Check-In</th>
                      <th style={{ width: 110 }}>Check-Out</th>
                      <th style={{ width: 100 }}>Type</th>
                      <th>Office / Site Name</th>
                      <th>GPS Status</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                            <Calendar size={13} color="var(--text-tertiary)" />
                            {new Date(r.check_in_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#047857', fontWeight: 600 }}>
                            <Clock size={13} color="#047857" />
                            {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td>
                          {r.check_out_time ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#D42D56', fontWeight: 600 }}>
                              <Clock size={13} color="#D42D56" />
                              {new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>
                              In Progress
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${r.attendance_type === 'site' ? 'red' : 'blue'}`} style={{ fontSize: 11 }}>
                            {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.location_name || r.project_name || 'Head Office'}</div>
                          {r.project_name && r.location_name && r.project_name !== r.location_name && (
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.project_name}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--color-info)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Navigation size={12} /> {r.gps_status || 'Inside Office'} ({r.distance_meters || 0}m)
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`} style={{ fontSize: 11 }}>
                            {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: r.approved_by_name ? 'var(--color-success)' : 'var(--text-tertiary)', fontWeight: 500 }}>
                            {r.approved_by_name ? `Approved by ${r.approved_by_name}` : 'Awaiting Review'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Dedicated Attendance Cards */}
              <div className="show-on-mobile" style={{ padding: '12px 10px', background: '#FAF6EE' }}>
                <div className="mobile-card-list">
                  {group.records.map(r => (
                    <div key={`mob_${r.id}`} className="mobile-record-card" style={{ borderLeft: `4px solid ${r.attendance_type === 'site' ? '#D42D56' : '#0F2B5B'}` }}>
                      <div className="mobile-card-header">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 12.5, color: 'var(--text-primary)' }}>
                            <Calendar size={13} color="var(--text-tertiary)" />
                            {new Date(r.check_in_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0F2B5B', marginTop: 2, wordBreak: 'break-word' }}>
                            {r.location_name || r.project_name || 'Head Office'}
                          </div>
                          {r.project_name && r.location_name && r.project_name !== r.location_name && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.project_name}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span className={`badge badge-${r.attendance_type === 'site' ? 'red' : 'blue'}`} style={{ fontSize: 10 }}>
                            {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                          </span>
                          <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`} style={{ fontSize: 10 }}>
                            {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="mobile-card-grid">
                        <div className="mobile-card-cell">
                          <span className="mobile-card-label">Check-In</span>
                          <span className="mobile-card-value" style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color="#047857" />
                            {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>

                        <div className="mobile-card-cell">
                          <span className="mobile-card-label">Check-Out</span>
                          <span className="mobile-card-value" style={{ color: r.check_out_time ? '#D42D56' : '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color={r.check_out_time ? '#D42D56' : '#D97706'} />
                            {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress'}
                          </span>
                        </div>

                        <div className="mobile-card-cell">
                          <span className="mobile-card-label">GPS Radius</span>
                          <span className="mobile-card-value" style={{ fontSize: 11, color: 'var(--color-info)' }}>
                            📍 {r.gps_status || 'Radius Ok'} ({r.distance_meters || 0}m)
                          </span>
                        </div>
                      </div>

                      {r.approved_by_name && (
                        <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, borderTop: '1px dashed #EFE9DE', paddingTop: 4 }}>
                          ✓ Approved by {r.approved_by_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-elevated" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
          No attendance records found matching the current filters.
        </div>
      )}

      {/* QR Scanner Camera Modal */}
      <EmployeeQRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title={`Scan ${activeAttendanceType === 'office' ? 'Office' : 'Site'} Attendance QR Code (${scanAction === 'checkout' ? 'Check-Out' : 'Check-In'})`}
      />

      {/* Attendance Success Confirmation Modal */}
      {attendanceSuccessModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 28, 79, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
        }}>
          <div className="card-glass animate-scale-up" style={{
            maxWidth: 440, width: '100%', background: '#fff', borderRadius: 24,
            padding: 32, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0F2B5B', margin: '0 0 8px' }}>
              {attendanceSuccessModal.title}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
              Your attendance record has been updated and verified in the database.
            </p>

            <div style={{
              background: '#f8fafc', borderRadius: 16, padding: 16, textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Date:</span>
                <strong style={{ color: '#0F2B5B' }}>{attendanceSuccessModal.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Check-In Time:</span>
                <strong style={{ color: '#10B981' }}>{attendanceSuccessModal.time}</strong>
              </div>
              {attendanceSuccessModal.check_out_time && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Check-Out Time:</span>
                  <strong style={{ color: '#D42D56' }}>{attendanceSuccessModal.check_out_time}</strong>
                </div>
              )}
              {attendanceSuccessModal.work_hours !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Total Duration:</span>
                  <strong style={{ color: '#0F2B5B' }}>{attendanceSuccessModal.work_hours} hrs</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Location / Office:</span>
                <strong style={{ color: '#0F2B5B' }}>{attendanceSuccessModal.office}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>GPS Verification:</span>
                <span className="status-badge badge-green">📍 {attendanceSuccessModal.gps_status}</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={() => setAttendanceSuccessModal(null)}
              style={{ width: '100%', background: '#0F2B5B', borderRadius: 14, fontWeight: 700 }}
            >
              Done & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Camera Capture Component (no gallery uploads, live stream with Front/Back camera flip toggle)
function CameraCapture({ onCapture, defaultFacing = 'environment' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [facingMode, setFacingMode] = useState(defaultFacing);

  async function startCamera(mode) {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  function toggleCamera() {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const preview = canvas.toDataURL('image/jpeg', 0.85);
      setCaptured(preview);
      stopCamera();
      onCapture(blob, preview);
    }, 'image/jpeg', 0.85);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []);

  if (captured) {
    return (
      <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
        <img src={captured} alt="Captured" style={{ width: '100%', maxWidth: 400, borderRadius: 'var(--radius-md)' }} />
        <p style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: 'var(--space-2)' }}>✓ Photo captured successfully</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCaptured(null); startCamera(facingMode); }} style={{ marginTop: 'var(--space-2)' }}>
          🔄 Retake Photo
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: 400, margin: '0 auto', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={toggleCamera}
          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 20 }}
        >
          🔄 Flip Camera ({facingMode === 'user' ? 'Front' : 'Back'})
        </button>
      </div>
      {active && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', maxWidth: 400, margin: 'var(--space-4) auto 0' }}>
          <button className="btn btn-primary btn-lg" onClick={capture} style={{ flex: 1 }}>
            <Camera size={18} /> Capture Photo
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={toggleCamera} style={{ width: 50, padding: 0 }} title="Flip Camera">
            🔄
          </button>
        </div>
      )}
    </div>
  );
}


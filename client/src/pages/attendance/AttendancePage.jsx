import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import EmployeeQRScanner from '../../components/attendance/EmployeeQRScanner';
import { Building2, HardHat, CheckCircle2, MapPin, Navigation, Clock, Calendar, RefreshCw, Send, Car, Route, ClipboardCheck, ArrowRight, ShieldCheck, Filter } from 'lucide-react';

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

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeAttendanceType, setActiveAttendanceType] = useState('office'); // 'office' | 'site'

  // Form State after scan
  const [scannedData, setScannedData] = useState(null);
  const [qrVerification, setQrVerification] = useState(null);
  const [userGps, setUserGps] = useState({ lat: null, lng: null });
  const [projectName, setProjectName] = useState('Industrial Zone Waterproofing Project');
  const [notes, setNotes] = useState('');

  // Filters for History table
  const [filterType, setFilterType] = useState('all'); // 'all' | 'office' | 'site'

  // Sample site projects for selection
  const projectsList = [
    'Industrial Zone Waterproofing Project',
    'Client Plant #4 Site Application',
    'Gulberg Commercial Complex',
    'Multan Warehouse Insulation',
    'Faisalabad Depot Refurbishment'
  ];

  useEffect(() => {
    fetchData();
    getCurrentGps();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [todayRes, histRes] = await Promise.all([
        api.get('/attendance/today').catch(() => ({ attendance: null })),
        api.get('/attendance/history').catch(() => ({ records: [] }))
      ]);
      setTodayAttendance(todayRes.attendance);
      setHistory(histRes.records || []);
    } catch (err) {
      toast.error('Failed to load attendance data.');
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
          // Fallback to default Faisalabad GPS for development
          setUserGps({ lat: 31.4504, lng: 73.1350 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserGps({ lat: 31.4504, lng: 73.1350 });
    }
  };

  const handleStartScan = (type) => {
    if (todayAttendance && todayAttendance.approval_status !== 'rejected') {
      toast.warning('You have already submitted employee attendance for today.');
      return;
    }
    setActiveAttendanceType(type);
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
      const endpoint = activeAttendanceType === 'office' ? '/attendance/office' : '/attendance/site';
      const payload = {
        scanned_data: scannedData,
        project_name: activeAttendanceType === 'site' ? projectName : undefined,
        lat: userGps.lat || 31.4504,
        lng: userGps.lng || 73.1350,
        notes
      };

      const res = await api.post(endpoint, payload);
      toast.success(`${activeAttendanceType === 'office' ? 'Office' : 'Site'} Attendance submitted! Pending Manager Approval.`);
      setScannedData(null);
      setQrVerification(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredHistory = history.filter(r => {
    if (filterType === 'all') return true;
    return r.attendance_type === filterType;
  });

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

        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh Status
        </button>
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
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Active Submission
              </span>
              <h4 style={{ margin: '4px 0', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {todayAttendance.attendance_type === 'office' ? '🏢 Office Attendance' : '🏗️ Site Attendance'} - {todayAttendance.location_name || 'Head Office'}
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Time: {new Date(todayAttendance.check_in_time).toLocaleTimeString()} • GPS: 📍 {todayAttendance.gps_status || 'Inside Radius'} ({todayAttendance.distance_meters || 0}m distance)
              </p>
            </div>

            <span className={`badge badge-${todayAttendance.approval_status === 'approved' ? 'green' : todayAttendance.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
              {todayAttendance.approval_status === 'approved' ? '✅ Approved' : todayAttendance.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Manager Approval'}
            </span>
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
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Head Office & Branch Office Check-In</p>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Scan the official Office QR code at Head Office or Branch Office to automatically capture your GPS location, verify radius compliance, and record daily office attendance for Manager review.
          </p>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleStartScan('office')}
            disabled={actionLoading || (todayAttendance && todayAttendance.approval_status !== 'rejected')}
            style={{ width: '100%' }}
          >
            <Building2 size={18} /> Click Office Attendance & Scan QR
          </button>
        </div>
      )}

      {/* TAB CONTENT 2: SITE ATTENDANCE */}
      {activeTab === 'site' && (
        <div className="card-elevated animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="avatar avatar-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
              <HardHat size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Site Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>On-Site Client Project Check-In</p>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Select your assigned client project or construction site, scan the active Site QR Code, and verify GPS site radius before submitting to Manager / Controller for approval.
          </p>

          <button
            className="btn btn-danger btn-lg"
            onClick={() => handleStartScan('site')}
            disabled={actionLoading || (todayAttendance && todayAttendance.approval_status !== 'rejected')}
            style={{ width: '100%' }}
          >
            <HardHat size={18} /> Click Site Attendance & Scan QR
          </button>
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
              <Route size={18} /> Vehicle Check-Out <ArrowRight size={16} />
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
              <span className="stat-label">Attendance Type</span>
              <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{activeAttendanceType} Attendance</strong>
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

          {activeAttendanceType === 'site' && (
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Select Project / Site:</label>
              <select
                className="form-input form-select"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              >
                {projectsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label">Optional Work Notes:</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Arrived for morning shift client presentation..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            className="btn btn-teal btn-lg"
            onClick={handleSubmitAttendance}
            disabled={actionLoading}
            style={{ width: '100%' }}
          >
            {actionLoading ? 'Submitting...' : <><Send size={18} /> Submit Attendance for Manager Approval</>}
          </button>
        </div>
      )}

      {/* ATTENDANCE HISTORY TABLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>Attendance History & Logs</h3>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Recent GPS-verified attendance submissions</span>
        </div>

        {/* Filter buttons */}
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

      <div className="table-container animate-fade-in-up">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Employee</th>
              <th>Type</th>
              <th>Office / Site Name</th>
              <th>GPS Status</th>
              <th>Status</th>
              <th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <Calendar size={14} color="var(--text-tertiary)" />
                      {new Date(r.check_in_time).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <Clock size={14} color="var(--text-tertiary)" />
                      {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontWeight: 600 }}>{r.employee_name || user?.name}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>ID: {r.emp_id || user?.employee_id}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${r.attendance_type === 'site' ? 'red' : 'blue'}`}>
                      {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.location_name || 'Head Office'}</div>
                    {r.project_name && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{r.project_name}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-info)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={12} /> {r.gps_status || 'Inside Office'} ({r.distance_meters || 0}m)
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                      {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: r.approved_by_name ? 'var(--color-success)' : 'var(--text-tertiary)', fontWeight: 500 }}>
                      {r.approved_by_name ? `Approved by ${r.approved_by_name}` : 'Awaiting Review'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                  No attendance records found. Click Office, Site, or Vehicle Attendance above to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QR Scanner Camera Modal */}
      <EmployeeQRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title={`Scan ${activeAttendanceType === 'office' ? 'Office' : 'Site'} Attendance QR Code`}
      />
    </div>
  );
}


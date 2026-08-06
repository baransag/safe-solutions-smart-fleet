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
      <div className="card" style={{ padding: 6, marginBottom: 24, background: 'rgba(2, 28, 79, 0.04)', borderRadius: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <button
            onClick={() => setActiveTab('office')}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: activeTab === 'office' ? '#021C4F' : 'transparent',
              color: activeTab === 'office' ? '#ffffff' : '#021C4F',
              boxShadow: activeTab === 'office' ? '0 4px 12px rgba(2, 28, 79, 0.25)' : 'none'
            }}
          >
            <Building2 size={18} /> Office Attendance
          </button>

          <button
            onClick={() => setActiveTab('site')}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: activeTab === 'site' ? '#C50337' : 'transparent',
              color: activeTab === 'site' ? '#ffffff' : '#021C4F',
              boxShadow: activeTab === 'site' ? '0 4px 12px rgba(197, 3, 55, 0.25)' : 'none'
            }}
          >
            <HardHat size={18} /> Site Attendance
          </button>

          <button
            onClick={() => setActiveTab('vehicle')}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: activeTab === 'vehicle' ? '#10B981' : 'transparent',
              color: activeTab === 'vehicle' ? '#ffffff' : '#021C4F',
              boxShadow: activeTab === 'vehicle' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
            }}
          >
            <Car size={18} /> Vehicle Attendance
          </button>
        </div>
      </div>

      {/* Today's Active Submission Status Banner */}
      {todayAttendance && (
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 14, padding: 18, marginBottom: 24, borderLeft: '5px solid #021C4F', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Today's Active Submission
              </span>
              <h4 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#021C4F' }}>
                {todayAttendance.attendance_type === 'office' ? '🏢 Office Attendance' : '🏗️ Site Attendance'} - {todayAttendance.location_name || 'Head Office'}
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                Time: {new Date(todayAttendance.check_in_time).toLocaleTimeString()} • GPS: 📍 {todayAttendance.gps_status || 'Inside Radius'} ({todayAttendance.distance_meters || 0}m distance)
              </p>
            </div>

            <span className={`badge badge-${todayAttendance.approval_status === 'approved' ? 'green' : todayAttendance.approval_status === 'rejected' ? 'red' : 'yellow'}`} style={{ fontSize: 13, padding: '6px 14px', fontWeight: 700 }}>
              {todayAttendance.approval_status === 'approved' ? '✅ Approved' : todayAttendance.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Manager Approval'}
            </span>
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: OFFICE ATTENDANCE */}
      {activeTab === 'office' && (
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 24, border: '1px solid rgba(2, 28, 79, 0.12)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #021C4F 0%, #1e3a8a 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#021C4F' }}>Office Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Head Office & Branch Office Check-In</p>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20, lineHeight: 1.5 }}>
            Scan the official Office QR code at Head Office or Branch Office to automatically capture your GPS location, verify radius compliance, and record daily office attendance for Manager review.
          </p>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleStartScan('office')}
            disabled={actionLoading || (todayAttendance && todayAttendance.approval_status !== 'rejected')}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#021C4F', fontWeight: 700 }}
          >
            <Building2 size={18} /> Click Office Attendance & Scan QR
          </button>
        </div>
      )}

      {/* TAB CONTENT 2: SITE ATTENDANCE */}
      {activeTab === 'site' && (
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 24, border: '1px solid rgba(197, 3, 55, 0.12)', background: 'linear-gradient(180deg, #ffffff 0%, #fff5f5 100%)', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #C50337 0%, #991b1b 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardHat size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#C50337' }}>Site Attendance</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>On-Site Client Project Check-In</p>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20, lineHeight: 1.5 }}>
            Select your assigned client project or construction site, scan the active Site QR Code, and verify GPS site radius before submitting to Manager / Controller for approval.
          </p>

          <button
            className="btn btn-danger btn-lg"
            onClick={() => handleStartScan('site')}
            disabled={actionLoading || (todayAttendance && todayAttendance.approval_status !== 'rejected')}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#C50337', fontWeight: 700 }}
          >
            <HardHat size={18} /> Click Site Attendance & Scan QR
          </button>
        </div>
      )}

      {/* TAB CONTENT 3: VEHICLE ATTENDANCE */}
      {activeTab === 'vehicle' && (
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 24, border: '1px solid rgba(16, 185, 129, 0.2)', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#047857' }}>Vehicle Attendance Hub</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Daily Vehicle Check-In, Odometer Meter Reading & Return Check-Out</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 20, lineHeight: 1.5 }}>
            Perform your official daily Vehicle Check-In before start of duty or Vehicle Check-Out upon duty completion. Scan vehicle QR code, enter opening meter reading, and submit fuel logs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <button
              className="btn btn-lg"
              onClick={() => navigate('/check-in')}
              style={{ background: '#021C4F', color: '#ffffff', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              <ClipboardCheck size={18} /> Vehicle Check-In <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-lg"
              onClick={() => navigate('/check-out')}
              style={{ background: '#C50337', color: '#ffffff', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              <Route size={18} /> Vehicle Check-Out <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Verification & Submission Box (Appears after successful scan) */}
      {qrVerification && (
        <div className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 24, marginBottom: 32, border: '2px solid #10B981', background: '#f0fdf4' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={20} color="#10B981" /> Scanned QR Code Verified: {qrVerification.name}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Attendance Type</span>
              <strong style={{ fontSize: 14, color: '#021C4F', textTransform: 'capitalize' }}>{activeAttendanceType} Attendance</strong>
            </div>

            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>GPS Verification Status</span>
              <strong style={{ fontSize: 14, color: qrVerification.is_within_radius ? '#047857' : '#b91c1c' }}>
                📍 {qrVerification.gps_status}
              </strong>
            </div>

            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Calculated Distance</span>
              <strong style={{ fontSize: 14, color: '#0284c7' }}>{qrVerification.distance_meters} meters</strong>
            </div>
          </div>

          {activeAttendanceType === 'site' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#065f46', display: 'block', marginBottom: 6 }}>
                Select Project / Site:
              </label>
              <select
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #6ee7b7', fontSize: 13, background: '#fff' }}
              >
                {projectsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#065f46', display: 'block', marginBottom: 6 }}>
              Optional Work Notes:
            </label>
            <input
              type="text"
              placeholder="e.g. Arrived for morning shift client presentation..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #6ee7b7', fontSize: 13, background: '#fff' }}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmitAttendance}
            disabled={actionLoading}
            style={{ width: '100%', background: '#10B981', border: 'none', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            {actionLoading ? 'Submitting...' : <><Send size={18} /> Submit Attendance for Manager Approval</>}
          </button>
        </div>
      )}

      {/* ATTENDANCE HISTORY TABLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#021C4F' }}>Attendance History & Logs</h3>
          <span style={{ fontSize: 12, color: '#64748b' }}>Recent GPS-verified attendance submissions</span>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: 4, borderRadius: 10, border: '1px solid rgba(2, 28, 79, 0.1)' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterType === 'all' ? '#021C4F' : 'transparent',
              color: filterType === 'all' ? '#ffffff' : '#475569'
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('office')}
            style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterType === 'office' ? '#021C4F' : 'transparent',
              color: filterType === 'office' ? '#ffffff' : '#475569'
            }}
          >
            🏢 Office
          </button>
          <button
            onClick={() => setFilterType('site')}
            style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterType === 'site' ? '#C50337' : 'transparent',
              color: filterType === 'site' ? '#ffffff' : '#475569'
            }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Calendar size={14} color="#64748b" />
                      {new Date(r.check_in_time).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                      <Clock size={14} color="#64748b" />
                      {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <strong>{r.employee_name || user?.name}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>ID: {r.emp_id || user?.employee_id}</div>
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: r.attendance_type === 'site' ? '#fff1f2' : '#eff6ff',
                      color: r.attendance_type === 'site' ? '#c50337' : '#021c4f'
                    }}>
                      {r.attendance_type === 'site' ? '🏗️ Site' : '🏢 Office'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#021C4F' }}>{r.location_name || 'Head Office'}</div>
                    {r.project_name && <div style={{ fontSize: 11, color: '#64748b' }}>{r.project_name}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={12} /> {r.gps_status || 'Inside Office'} ({r.distance_meters || 0}m)
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`} style={{ fontWeight: 700 }}>
                      {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: r.approved_by_name ? '#047857' : '#94a3b8', fontWeight: 600 }}>
                      {r.approved_by_name ? `Approved by ${r.approved_by_name}` : 'Awaiting Review'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
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


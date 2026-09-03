import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, MapPin, Building2, HardHat, RefreshCw, Fuel, Eye, Calendar } from 'lucide-react';
import { getEmployeeAvatar } from '../../utils/avatarHelper';

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'office' | 'site' | 'fuel' | 'leave'
  const [remarks, setRemarks] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingFuel, setPendingFuel] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correctionModal, setCorrectionModal] = useState(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 6000);

    const handleSync = () => fetchPendingRequests();
    window.addEventListener('app:data-sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app:data-sync', handleSync);
    };
  }, []);

  async function fetchPendingRequests() {
    try {
      const [attRes, fuelRes, leaveRes] = await Promise.all([
        api.get('/attendance/pending').catch(() => ({ requests: [] })),
        api.get('/fuel?status=pending').catch(() => ({ fuelLogs: [] })),
        api.get('/attendance/leave-requests/pending').catch(() => ({ requests: [] }))
      ]);
      setPendingRequests(attRes.requests || []);
      setPendingFuel(fuelRes.fuelLogs || []);
      setPendingLeaves(leaveRes.requests || []);
    } catch (err) {
      // Quiet background fetch fail
    } finally {
      setLoading(false);
    }
  }

  // Attendance Approval
  const handleApprove = async (id) => {
    const noteText = remarks[id] || 'Approved by Controller';
    try {
      await api.patch(`/attendance/${id}/approve`, { notes: noteText });
      toast.success(`Attendance request approved!`);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to approve attendance.');
    }
  };

  const handleReject = async (id) => {
    const noteText = remarks[id] || 'Rejected by Controller';
    try {
      await api.patch(`/attendance/${id}/reject`, { notes: noteText });
      toast.error(`Attendance request rejected.`);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to reject attendance.');
    }
  };

  // Fuel Approval
  const handleFuelApprove = async (id) => {
    const noteText = remarks[`fuel_${id}`] || 'Approved by Controller';
    try {
      await api.put(`/fuel/${id}/approve`, { approval_status: 'approved', approval_notes: noteText });
      toast.success(`Fuel expense request approved!`);
      setPendingFuel(prev => prev.filter(f => f.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to approve fuel request.');
    }
  };

  const handleFuelReject = async (id) => {
    const noteText = remarks[`fuel_${id}`] || 'Rejected by Controller';
    try {
      await api.put(`/fuel/${id}/approve`, { approval_status: 'rejected', approval_notes: noteText });
      toast.error(`Fuel expense request rejected.`);
      setPendingFuel(prev => prev.filter(f => f.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to reject fuel request.');
    }
  };

  const handleLeaveApprove = async (id) => {
    const noteText = remarks[`leave_${id}`] || 'Approved by Controller/Manager';
    try {
      await api.patch(`/attendance/leave-requests/${id}/action`, { status: 'approved', manager_remarks: noteText });
      toast.success('Leave / Half-Day request approved!');
      setPendingLeaves(prev => prev.filter(l => l.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to approve leave request.');
    }
  };

  const handleLeaveReject = async (id) => {
    const noteText = remarks[`leave_${id}`] || 'Rejected by Controller/Manager';
    try {
      await api.patch(`/attendance/leave-requests/${id}/action`, { status: 'rejected', manager_remarks: noteText });
      toast.error('Leave / Half-Day request rejected.');
      setPendingLeaves(prev => prev.filter(l => l.id !== id));
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to reject leave request.');
    }
  };

  const submitCorrectionRequest = async () => {
    if (!correctionModal || !correctionNote) return;
    try {
      if (correctionModal.type === 'attendance') {
        await api.patch(`/attendance/${correctionModal.id}/reject`, { notes: `Correction Requested: ${correctionNote}` });
        setPendingRequests(prev => prev.filter(r => r.id !== correctionModal.id));
      } else {
        await api.put(`/fuel/${correctionModal.id}/approve`, { approval_status: 'correction_requested', approval_notes: correctionNote });
        setPendingFuel(prev => prev.filter(f => f.id !== correctionModal.id));
      }
      toast.info('Correction request sent back to employee.');
      setCorrectionModal(null);
      setCorrectionNote('');
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error('Failed to send correction request.');
    }
  };

  const totalPending = pendingRequests.length + pendingFuel.length + pendingLeaves.length;

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
            <div style={{ padding: 10, background: 'linear-gradient(135deg, #0F2B5B 0%, #D42D56 100%)', borderRadius: 12, color: '#fff' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="page-title">Master Approval Center</h1>
              <p className="page-description">Review & Action Site Attendance & Fuel Expense Approvals</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchPendingRequests} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 14px', background: 'rgba(217, 119, 6, 0.15)', color: '#D97706', fontWeight: 700 }}>
            ⏳ {totalPending} Total Pending Actions
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'all' ? '#0F2B5B' : '#f0f4f8', color: activeTab === 'all' ? '#fff' : '#666'
          }}
        >
          All Items ({totalPending})
        </button>
        <button
          onClick={() => setActiveTab('site')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'site' ? '#D42D56' : '#f0f4f8', color: activeTab === 'site' ? '#fff' : '#666'
          }}
        >
          🏗️ Site Attendance ({pendingRequests.filter(r => r.attendance_type === 'site').length})
        </button>
        <button
          onClick={() => setActiveTab('office')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'office' ? '#0284c7' : '#f0f4f8', color: activeTab === 'office' ? '#fff' : '#666'
          }}
        >
          🏢 Office Attendance ({pendingRequests.filter(r => r.attendance_type === 'office').length})
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'fuel' ? '#059669' : '#f0f4f8', color: activeTab === 'fuel' ? '#fff' : '#666'
          }}
        >
          ⛽ Fuel Expense Requests ({pendingFuel.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'leave' ? '#7C3AED' : '#f0f4f8', color: activeTab === 'leave' ? '#fff' : '#666'
          }}
        >
          📋 Leave & Half-Day Requests ({pendingLeaves.length})
        </button>
      </div>

      {/* Grid of Pending Requests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
        {/* 1. ATTENDANCE PENDING CARDS */}
        {(activeTab === 'all' || activeTab === 'office' || activeTab === 'site') &&
          pendingRequests
            .filter(req => activeTab === 'all' || req.attendance_type === activeTab)
            .map(req => (
              <div key={`att_${req.id}`} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid #E2E8F0', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img
                      src={getEmployeeAvatar(req.emp_code)}
                      alt={req.employee_name}
                      style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0F2B5B' }}
                      onError={(e) => { e.currentTarget.src = '/assets/images/logo.jpeg'; }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F2B5B' }}>{req.employee_name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{req.designation || 'Employee'} • Code: {req.emp_code}</p>
                    </div>
                  </div>

                  <span className="badge badge-yellow" style={{ fontWeight: 700 }}>
                    ⏳ Pending
                  </span>
                </div>

                {/* Meta details */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Attendance Type</span>
                    <strong style={{ color: req.attendance_type === 'site' ? '#D42D56' : '#0F2B5B', textTransform: 'capitalize' }}>
                      {req.attendance_type === 'site' ? '🏗️ Site Attendance' : '🏢 Office Attendance'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Office / Location</span>
                    <strong style={{ color: '#0F2B5B' }}>{req.location_name || 'Head Office'}</strong>
                  </div>
                  {req.project_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Project Name</span>
                      <strong style={{ color: '#0284c7' }}>{req.project_name}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Check-In Time</span>
                    <span>{new Date(req.check_in_time).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>GPS Radius Check</span>
                    <span style={{ fontSize: 11, color: '#047857', fontWeight: 700 }}>📍 {req.gps_status || 'Inside Radius'} ({req.distance_meters || 0}m)</span>
                  </div>
                </div>

                {/* Selfie and Site Photo display */}
                {(req.selfie_url || req.site_photo_url) && (
                  <div style={{ display: 'grid', gridTemplateColumns: req.selfie_url && req.site_photo_url ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 14 }}>
                    {req.selfie_url && (
                      <div onClick={() => setPreviewImage(req.selfie_url)} style={{ cursor: 'pointer' }}>
                        <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>Selfie Photo 🔍</span>
                        <img src={req.selfie_url.startsWith('/') ? req.selfie_url : `/${req.selfie_url}`} alt="Selfie" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                    {req.site_photo_url && (
                      <div onClick={() => setPreviewImage(req.site_photo_url)} style={{ cursor: 'pointer' }}>
                        <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>Site Photo 🔍</span>
                        <img src={req.site_photo_url.startsWith('/') ? req.site_photo_url : `/${req.site_photo_url}`} alt="Site Photo" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                )}

                {req.notes && (
                  <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '0 0 14px', background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                    💬 "{req.notes}"
                  </p>
                )}

                {/* Controller Remarks & Actions */}
                <div>
                  <input
                    type="text"
                    placeholder="Add Controller remarks..."
                    value={remarks[req.id] || ''}
                    onChange={(e) => setRemarks({ ...remarks, [req.id]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, marginBottom: 12 }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#059669', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      onClick={() => setCorrectionModal({ id: req.id, type: 'attendance', name: req.employee_name })}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                    >
                      <RotateCcw size={14} /> Correct
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="btn btn-danger btn-sm"
                      style={{ background: '#DC2626', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}

        {/* 2. FUEL EXPENSE PENDING CARDS */}
        {(activeTab === 'all' || activeTab === 'fuel') &&
          pendingFuel.map(fuel => (
            <div key={`fuel_${fuel.id}`} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid #E2E8F0', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(5, 150, 105, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Fuel size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F2B5B' }}>{fuel.employee_name || 'Rider / Employee'}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{fuel.vehicle_name} • {fuel.number_plate}</p>
                  </div>
                </div>

                <span className="badge" style={{ background: '#ECFDF5', color: '#059669', fontWeight: 800, fontSize: 12 }}>
                  Rs {parseFloat(fuel.fuel_amount || 0).toLocaleString()}
                </span>
              </div>

              {/* Meta details */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Station Name</span>
                  <strong style={{ color: '#0F2B5B' }}>{fuel.pump_name || 'Filling Station'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Volume / Litres</span>
                  <strong style={{ color: '#059669' }}>{fuel.liters} L {fuel.rate_per_liter ? `(@ Rs ${fuel.rate_per_liter}/L)` : ''}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Meter Reading</span>
                  <span>{fuel.meter_reading ? `${parseFloat(fuel.meter_reading).toLocaleString()} km` : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Receipt Date</span>
                  <span>{fuel.receipt_date || new Date(fuel.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Receipt Image Preview */}
              {(fuel.processed_receipt_url || fuel.receipt_photo_url) && (
                <div
                  onClick={() => setPreviewImage(fuel.processed_receipt_url || fuel.receipt_photo_url)}
                  style={{ cursor: 'pointer', marginBottom: 14 }}
                >
                  <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Eye size={12} /> Click to View Full Fuel Receipt Slip
                  </span>
                  <img
                    src={fuel.processed_receipt_url || fuel.receipt_photo_url}
                    alt="Fuel Slip"
                    style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Controller Remarks & Actions */}
              <div>
                <input
                  type="text"
                  placeholder="Add Controller remarks for fuel..."
                  value={remarks[`fuel_${fuel.id}`] || ''}
                  onChange={(e) => setRemarks({ ...remarks, [`fuel_${fuel.id}`]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, marginBottom: 12 }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <button
                    onClick={() => handleFuelApprove(fuel.id)}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#059669', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <CheckCircle2 size={14} /> Approve Fuel
                  </button>
                  <button
                    onClick={() => setCorrectionModal({ id: fuel.id, type: 'fuel', name: `${fuel.employee_name} (Rs ${fuel.fuel_amount})` })}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <RotateCcw size={14} /> Correct
                  </button>
                  <button
                    onClick={() => handleFuelReject(fuel.id)}
                    className="btn btn-danger btn-sm"
                    style={{ background: '#DC2626', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <XCircle size={14} /> Reject Fuel
                  </button>
                </div>
              </div>
            </div>
          ))}

        {/* 3. LEAVE & HALF-DAY PENDING CARDS */}
        {(activeTab === 'all' || activeTab === 'leave') &&
          pendingLeaves.map(leave => {
            const isHalfDay = leave.request_type === 'half_day';
            const isShort = leave.request_type === 'short_leave';
            const typeBadge = isHalfDay
              ? `🌗 Half-Day (${leave.half_day_slot === 'first_half_morning' ? 'Morning / First Half' : 'Afternoon / Second Half'})`
              : isShort
              ? '⏱️ Short Leave / Gate Pass'
              : `📅 Full Day Leave (${parseFloat(leave.total_days || 1)} Day)`;

            return (
              <div key={`leave_${leave.id}`} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid #E2E8F0', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F2B5B' }}>{leave.employee_name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{leave.designation || 'Staff'} • ID: {leave.emp_code}</p>
                    </div>
                  </div>

                  <span className="badge" style={{ background: '#EDE9FE', color: '#7C3AED', fontWeight: 800, fontSize: 11 }}>
                    {typeBadge}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Leave Reason</span>
                    <strong style={{ color: '#D42D56', textTransform: 'capitalize' }}>{leave.leave_reason} Reason</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Target Date</span>
                    <strong style={{ color: '#0F2B5B' }}>
                      {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                    </strong>
                  </div>
                  {leave.emergency_phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Contact Phone</span>
                      <span>{leave.emergency_phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Submitted At</span>
                    <span>{new Date(leave.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {leave.notes && (
                  <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '0 0 14px', background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                    💬 "{leave.notes}"
                  </p>
                )}

                <div>
                  <input
                    type="text"
                    placeholder="Add approval / rejection note..."
                    value={remarks[`leave_${leave.id}`] || ''}
                    onChange={(e) => setRemarks({ ...remarks, [`leave_${leave.id}`]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, marginBottom: 12 }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => handleLeaveApprove(leave.id)}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#059669', border: 'none', fontWeight: 700, fontSize: 12, padding: '9px 6px' }}
                    >
                      <CheckCircle2 size={15} /> Approve Request
                    </button>
                    <button
                      onClick={() => handleLeaveReject(leave.id)}
                      className="btn btn-danger btn-sm"
                      style={{ background: '#DC2626', border: 'none', fontWeight: 700, fontSize: 12, padding: '9px 6px' }}
                    >
                      <XCircle size={15} /> Reject Request
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {totalPending === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 48, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
            <CheckCircle2 size={40} color="#059669" style={{ marginBottom: 12 }} />
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F2B5B' }}>No Pending Approvals</h4>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>All employee attendance check-ins and fuel claims have been actioned.</p>
          </div>
        )}
      </div>

      {/* PHOTO PREVIEW MODAL */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="modal animate-scale-in" style={{ maxWidth: 640, padding: 20, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={previewImage.startsWith('/') ? previewImage : `/${previewImage}`} alt="Full Preview" style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 12 }} />
            <button className="btn btn-primary" onClick={() => setPreviewImage(null)} style={{ marginTop: 16, background: '#0F2B5B' }}>
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* REQUEST CORRECTION MODAL */}
      {correctionModal && (
        <div className="modal-backdrop" onClick={() => setCorrectionModal(null)}>
          <div className="modal animate-scale-in" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F2B5B' }}>Request Correction</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
              Specify the correction details for <strong>{correctionModal.name}</strong>:
            </p>

            <textarea
              rows={4}
              className="form-input"
              placeholder="e.g. Please re-upload a clearer receipt photo or verify odometer reading..."
              value={correctionNote}
              onChange={e => setCorrectionNote(e.target.value)}
              style={{ width: '100%', marginBottom: 16, padding: 12 }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCorrectionModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={submitCorrectionRequest} style={{ background: '#0F2B5B', fontWeight: 700 }}>
                Send Correction Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, MapPin, Building2, HardHat, RefreshCw } from 'lucide-react';

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [remarks, setRemarks] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingFuel, setPendingFuel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correctionModal, setCorrectionModal] = useState(null);
  const [correctionNote, setCorrectionNote] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  async function fetchPendingRequests() {
    try {
      setLoading(true);
      const [attRes, fuelRes] = await Promise.all([
        api.get('/attendance/pending').catch(() => ({ requests: [] })),
        api.get('/fuel?status=pending').catch(() => ({ fuelLogs: [] }))
      ]);
      setPendingRequests(attRes.requests || []);
      setPendingFuel(fuelRes.fuelLogs || []);
    } catch (err) {
      toast.error('Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id) => {
    const noteText = remarks[id] || 'Approved by Controller';
    try {
      await api.patch(`/attendance/${id}/approve`, { notes: noteText });
      toast.success(`Attendance request approved!`);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error('Failed to approve attendance.');
    }
  };

  const handleReject = async (id) => {
    const noteText = remarks[id] || 'Rejected by Controller';
    try {
      await api.patch(`/attendance/${id}/reject`, { notes: noteText });
      toast.error(`Attendance request rejected!`);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error('Failed to reject attendance.');
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
    } catch (err) {
      toast.error('Failed to send correction request.');
    }
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
            <div style={{ padding: 10, background: 'linear-gradient(135deg, #021C4F 0%, #C50337 100%)', borderRadius: 12, color: '#fff' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="page-title">Approval Center</h1>
              <p className="page-description">Review & Action Manager / Controller Attendance Approvals</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchPendingRequests} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 14px', background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', fontWeight: 700 }}>
            ⏳ {pendingRequests.length} Pending Approval
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 12, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'all' ? '#021C4F' : '#f0f4f8', color: activeTab === 'all' ? '#fff' : '#666'
          }}
        >
          All Pending ({pendingRequests.length})
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
          onClick={() => setActiveTab('site')}
          style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'site' ? '#C50337' : '#f0f4f8', color: activeTab === 'site' ? '#fff' : '#666'
          }}
        >
          🏗️ Site Attendance ({pendingRequests.filter(r => r.attendance_type === 'site').length})
        </button>
      </div>

      {/* Pending Requests Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {pendingRequests
          .filter(req => activeTab === 'all' || req.attendance_type === activeTab)
          .map(req => (
            <div key={req.id} className="card-elevated animate-fade-in-up" style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(2, 28, 79, 0.1)', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img
                    src={req.avatar_url || '/assets/images/logo.jpeg'}
                    alt={req.employee_name}
                    style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #021C4F' }}
                    onError={(e) => { e.currentTarget.src = '/assets/images/logo.jpeg'; }}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#021C4F' }}>{req.employee_name}</h4>
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
                  <strong style={{ color: req.attendance_type === 'site' ? '#C50337' : '#021C4F', textTransform: 'capitalize' }}>
                    {req.attendance_type === 'site' ? '🏗️ Site Attendance' : '🏢 Office Attendance'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Office / Location</span>
                  <strong style={{ color: '#021C4F' }}>{req.location_name || 'Head Office'}</strong>
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

              {req.notes && (
                <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '0 0 14px', background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                  💬 "{req.notes}"
                </p>
              )}

              {/* Manager Remarks Input & Action Buttons */}
              <div>
                <input
                  type="text"
                  placeholder="Add Controller / Manager remarks..."
                  value={remarks[req.id] || ''}
                  onChange={(e) => setRemarks({ ...remarks, [req.id]: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    fontSize: 12, marginBottom: 12
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#10B981', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setCorrectionModal({ id: req.id, type: 'attendance', name: req.name })}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <RotateCcw size={14} /> Correct
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="btn btn-danger btn-sm"
                    style={{ background: '#EF4444', border: 'none', fontWeight: 700, fontSize: 11, padding: '8px 4px' }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}

        {pendingRequests.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlignment: 'center', padding: 40, background: '#fff', borderRadius: 16, border: '1px solid #eee', textAlign: 'center', color: '#64748b' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: 10 }} />
            <h4 style={{ margin: 0, fontSize: 16, color: '#021C4F' }}>No Pending Attendance Requests</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>All employee office and site attendance check-ins are up to date.</p>
          </div>
        )}
      </div>

      {/* REQUEST CORRECTION MODAL */}
      {correctionModal && (
        <div className="modal-overlay" onClick={() => setCorrectionModal(null)}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: 460, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#021C4F' }}>Request Correction</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>
              Specify the correction details for <strong>{correctionModal.name || 'Employee Request'}</strong>:
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
              <button type="button" className="btn btn-secondary" onClick={() => setCorrectionModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={submitCorrectionRequest} style={{ background: '#021C4F', fontWeight: 700 }}>
                Send Correction Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

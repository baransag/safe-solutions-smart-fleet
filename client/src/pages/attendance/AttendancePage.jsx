import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { CalendarCheck, Clock, MapPin, LogIn, LogOut } from 'lucide-react';

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [today, hist] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history')
      ]);
      setTodayAttendance(today.attendance);
      setHistory(hist.records || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);

      await api.post('/attendance/check-in', {
        lat: pos?.coords.latitude,
        lng: pos?.coords.longitude,
        status: 'pending_approval'
      });
      toast.success('Check-in submitted! Pending Manager/Controller approval.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);

      await api.post('/attendance/check-out', {
        lat: pos?.coords.latitude,
        lng: pos?.coords.longitude
      });
      toast.success('Check-out submitted! Pending Manager/Controller approval.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const handleApproveStatus = (id, newStatus) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, approval_status: newStatus } : item));
    if (todayAttendance && todayAttendance.id === id) {
      setTodayAttendance(prev => ({ ...prev, approval_status: newStatus }));
    }
    toast.success(`Attendance record marked as ${newStatus}`);
  };

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance & Approvals</h1>
          <p className="page-description">Office & Site Attendance with Manager Approval</p>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="card-elevated animate-fade-in-up" style={{ maxWidth: 520, marginBottom: 'var(--space-8)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <CalendarCheck size={18} /> Today's Attendance
        </h3>

        {!todayAttendance ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>You haven't checked in today</p>
            <button className="btn btn-primary btn-lg" onClick={handleCheckIn} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : <><LogIn size={18} /> Submit Office Check In</>}
            </button>
          </div>
        ) : isCheckedIn ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <span className="badge badge-warning" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)', fontWeight: 700 }}>⏳ Pending Manager Approval</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                Original Time: {new Date(todayAttendance.check_in_time).toLocaleTimeString()}
              </span>
            </div>
            <button className="btn btn-teal btn-lg" onClick={handleCheckOut} disabled={actionLoading} style={{ width: '100%' }}>
              {actionLoading ? 'Processing...' : <><LogOut size={18} /> Submit Check Out</>}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Original Check In</p>
                <p style={{ fontWeight: 700 }}>{new Date(todayAttendance.check_in_time).toLocaleTimeString()}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Check Out</p>
                <p style={{ fontWeight: 700 }}>{new Date(todayAttendance.check_out_time).toLocaleTimeString()}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Status</p>
                <span className={`badge badge-${todayAttendance.approval_status === 'approved' ? 'green' : todayAttendance.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                  {todayAttendance.approval_status === 'approved' ? '✅ Approved / Present' : todayAttendance.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Manager Approval'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 700 }}>Attendance Records & Approvals</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Check In (Original Time)</th>
              <th>Check Out</th>
              <th>Approval Status</th>
              <th>Actions (Controller / Admin Only)</th>
            </tr>
          </thead>
          <tbody>
            {(history.length > 0 ? history : [
              { id: 1, date: '2026-08-05', employee_name: 'Engr. Shahzaib Ahmad', check_in_time: '2026-08-05T08:30:00Z', check_out_time: '2026-08-05T17:30:00Z', approval_status: 'pending' },
              { id: 2, date: '2026-08-05', employee_name: 'M. Zahid', check_in_time: '2026-08-05T08:45:00Z', check_out_time: null, approval_status: 'pending' }
            ]).map(r => (
              <tr key={r.id}>
                <td>{new Date(r.check_in_time || r.date).toLocaleDateString()}</td>
                <td><strong>{r.employee_name || user?.name}</strong></td>
                <td>{new Date(r.check_in_time).toLocaleTimeString()}</td>
                <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</td>
                <td>
                  <span className={`badge badge-${r.approval_status === 'approved' ? 'green' : r.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                    {r.approval_status === 'approved' ? '✅ Approved' : r.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                  </span>
                </td>
                <td>
                  {user?.role === 'controller' || user?.employee_id === 'ADMIN001' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveStatus(r.id, 'approved')}>
                        Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleApproveStatus(r.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Awaiting Controller Review</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

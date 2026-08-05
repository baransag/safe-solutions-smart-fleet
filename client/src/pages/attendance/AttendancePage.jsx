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
        lng: pos?.coords.longitude
      });
      toast.success('Checked in!');
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
      toast.success('Checked out!');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;
  const isComplete = todayAttendance && todayAttendance.check_out_time;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-description">Track your daily attendance</p>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="card-elevated animate-fade-in-up" style={{ maxWidth: 480, marginBottom: 'var(--space-8)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <CalendarCheck size={18} /> Today
        </h3>

        {!todayAttendance ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>You haven't checked in yet</p>
            <button className="btn btn-primary btn-lg" onClick={handleCheckIn} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : <><LogIn size={18} /> Check In</>}
            </button>
          </div>
        ) : isCheckedIn ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <span className="badge badge-green">Checked In</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                {new Date(todayAttendance.check_in_time).toLocaleTimeString()}
              </span>
            </div>
            <button className="btn btn-teal btn-lg" onClick={handleCheckOut} disabled={actionLoading} style={{ width: '100%' }}>
              {actionLoading ? 'Processing...' : <><LogOut size={18} /> Check Out</>}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Check In</p>
                <p style={{ fontWeight: 700 }}>{new Date(todayAttendance.check_in_time).toLocaleTimeString()}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Check Out</p>
                <p style={{ fontWeight: 700 }}>{new Date(todayAttendance.check_out_time).toLocaleTimeString()}</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Hours</p>
                <p style={{ fontWeight: 700, color: 'var(--color-deep-teal)' }}>{todayAttendance.work_hours}h</p>
              </div>
            </div>
            <span className="badge badge-green" style={{ marginTop: 'var(--space-3)' }}>Day Complete ✓</span>
          </div>
        )}
      </div>

      {/* History */}
      <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 700 }}>Attendance History</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              {isAdmin && <th>Employee</th>}
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.check_in_time).toLocaleDateString()}</td>
                {isAdmin && <td>{r.employee_name}</td>}
                <td>{new Date(r.check_in_time).toLocaleTimeString()}</td>
                <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</td>
                <td>{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                <td>
                  <span className={`badge badge-${r.status === 'present' ? 'green' : r.status === 'late' ? 'yellow' : 'red'}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>No records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

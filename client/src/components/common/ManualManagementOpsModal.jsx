import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { X, Calendar, ClipboardCheck, Route, Clock, User, Car, MapPin, CheckCircle2 } from 'lucide-react';

export default function ManualManagementOpsModal({ isOpen, onClose }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'checkin' | 'checkout'
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Manual Attendance Form
  const [attEmployeeId, setAttEmployeeId] = useState('');
  const [attType, setAttType] = useState('office');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attTime, setAttTime] = useState('08:30');
  const [attLocation, setAttLocation] = useState('Head Office Faisalabad');
  const [attStatus, setAttStatus] = useState('present');
  const [attNotes, setAttNotes] = useState('');

  // Manual Vehicle Check-in Form
  const [chkVehicleId, setChkVehicleId] = useState('');
  const [chkEmployeeId, setChkEmployeeId] = useState('');
  const [chkMeter, setChkMeter] = useState('');
  const [chkTime, setChkTime] = useState('08:30');
  const [chkNotes, setChkNotes] = useState('');

  // Manual Vehicle Check-out Form
  const [outVehicleId, setOutVehicleId] = useState('');
  const [outEmployeeId, setOutEmployeeId] = useState('');
  const [outMeter, setOutMeter] = useState('');
  const [outLocation, setOutLocation] = useState('Head Office Faisalabad');
  const [outTime, setOutTime] = useState('17:30');
  const [outNotes, setOutNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    try {
      const [empRes, vehRes] = await Promise.all([
        api.get('/employees').catch(() => ({ employees: [] })),
        api.get('/vehicles').catch(() => ({ vehicles: [] }))
      ]);
      const activeEmps = (empRes.employees || []).filter(e => e.is_active && e.role !== 'admin');
      const activeVehs = (vehRes.vehicles || []).filter(v => v.is_active);
      setEmployees(activeEmps);
      setVehicles(activeVehs);

      if (activeEmps.length > 0) {
        setAttEmployeeId(activeEmps[0].id);
        setChkEmployeeId(activeEmps[0].id);
        setOutEmployeeId(activeEmps[0].id);
      }
      if (activeVehs.length > 0) {
        setChkVehicleId(activeVehs[0].id);
        setOutVehicleId(activeVehs[0].id);
        setChkMeter(parseFloat(activeVehs[0].current_meter || 0).toString());
      }
    } catch {
      // quiet fail
    }
  }

  if (!isOpen) return null;

  // Handle Manual Attendance
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attEmployeeId) return toast.warning('Select an employee');
    setLoading(true);
    try {
      const checkInTimestamp = `${attDate}T${attTime}:00+05:00`;
      await api.post('/attendance/manual', {
        employee_id: parseInt(attEmployeeId, 10),
        attendance_type: attType,
        check_in_time: checkInTimestamp,
        location_name: attLocation,
        project_name: attType === 'office' ? 'SAFE SOLUTIONS HQ' : 'Field Operations Site',
        status: attStatus,
        notes: attNotes
      });
      toast.success('Manual Attendance logged successfully!');
      window.dispatchEvent(new CustomEvent('app:data-sync'));
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to record manual attendance');
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Check-In
  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!chkVehicleId || !chkEmployeeId) return toast.warning('Select vehicle and driver');
    if (chkMeter === '') return toast.warning('Enter opening meter');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkinTime = `${today}T${chkTime}:00+05:00`;
      await api.post('/checkins/manual-checkin', {
        vehicle_id: parseInt(chkVehicleId, 10),
        employee_id: parseInt(chkEmployeeId, 10),
        meter_reading: parseFloat(chkMeter),
        checkin_time: checkinTime,
        notes: chkNotes
      });
      toast.success('Manual Vehicle Check-In logged successfully!');
      window.dispatchEvent(new CustomEvent('app:data-sync'));
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to record manual check-in');
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Check-Out
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!outVehicleId || !outEmployeeId) return toast.warning('Select vehicle and driver');
    if (outMeter === '') return toast.warning('Enter closing meter');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkoutTime = `${today}T${outTime}:00+05:00`;
      const res = await api.post('/checkins/manual-checkout', {
        vehicle_id: parseInt(outVehicleId, 10),
        employee_id: parseInt(outEmployeeId, 10),
        meter_reading: parseFloat(outMeter),
        checkout_time: checkoutTime,
        checkout_location: outLocation,
        notes: outNotes
      });
      toast.success(`Manual Check-Out logged! Distance: +${res.distance_km || 0} KM`);
      window.dispatchEvent(new CustomEvent('app:data-sync'));
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to record manual check-out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 43, 91, 0.7)',
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
          maxWidth: 580,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #0F2B5B 0%, #1e3a8a 100%)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
              ⚡ Manager & Controller Operations Override
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
              Manual Emergency Entry: Attendance, Vehicle Check-In & Check-Out
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '12px 6px',
              border: 'none',
              background: activeTab === 'attendance' ? '#fff' : '#f8fafc',
              borderBottom: activeTab === 'attendance' ? '3px solid #0F2B5B' : 'none',
              fontWeight: 700,
              fontSize: 12,
              color: activeTab === 'attendance' ? '#0F2B5B' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Calendar size={15} /> Attendance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checkin')}
            style={{
              padding: '12px 6px',
              border: 'none',
              background: activeTab === 'checkin' ? '#fff' : '#f8fafc',
              borderBottom: activeTab === 'checkin' ? '3px solid #059669' : 'none',
              fontWeight: 700,
              fontSize: 12,
              color: activeTab === 'checkin' ? '#059669' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <ClipboardCheck size={15} /> Vehicle Check-In
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checkout')}
            style={{
              padding: '12px 6px',
              border: 'none',
              background: activeTab === 'checkout' ? '#fff' : '#f8fafc',
              borderBottom: activeTab === 'checkout' ? '3px solid #D42D56' : 'none',
              fontWeight: 700,
              fontSize: 12,
              color: activeTab === 'checkout' ? '#D42D56' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Route size={15} /> Vehicle Check-Out
          </button>
        </div>

        {/* Tab 1: Manual Attendance */}
        {activeTab === 'attendance' && (
          <form onSubmit={handleAttendanceSubmit} style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Select Employee *</label>
              <select
                className="form-input"
                value={attEmployeeId}
                onChange={e => setAttEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id}) — {emp.designation || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Attendance Type</label>
                <select
                  className="form-input"
                  value={attType}
                  onChange={e => setAttType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                >
                  <option value="office">🏢 Office Attendance</option>
                  <option value="site">🏗️ Site Attendance</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Status</label>
                <select
                  className="form-input"
                  value={attStatus}
                  onChange={e => setAttStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                >
                  <option value="present">Present (On-Duty)</option>
                  <option value="late">Late Arrival</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={attDate}
                  onChange={e => setAttDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Check-In Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={attTime}
                  onChange={e => setAttTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Location Name</label>
              <input
                type="text"
                className="form-input"
                value={attLocation}
                onChange={e => setAttLocation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Management Remarks (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Reason for manual entry..."
                value={attNotes}
                onChange={e => setAttNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', background: '#0F2B5B', fontWeight: 700, padding: '11px' }}
            >
              {loading ? 'Submitting...' : 'Mark Manual Attendance'}
            </button>
          </form>
        )}

        {/* Tab 2: Manual Vehicle Check-In */}
        {activeTab === 'checkin' && (
          <form onSubmit={handleCheckinSubmit} style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Select Vehicle *</label>
              <select
                className="form-input"
                value={chkVehicleId}
                onChange={e => {
                  setChkVehicleId(e.target.value);
                  const v = vehicles.find(veh => veh.id === parseInt(e.target.value, 10));
                  if (v) setChkMeter(parseFloat(v.current_meter || 0).toString());
                }}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.number_plate})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Select Driver / Employee *</label>
              <select
                className="form-input"
                value={chkEmployeeId}
                onChange={e => setChkEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Opening Meter (KM) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="e.g. 15400"
                  value={chkMeter}
                  onChange={e => setChkMeter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Check-In Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={chkTime}
                  onChange={e => setChkTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Remarks</label>
              <input
                type="text"
                className="form-input"
                placeholder="Reason / notes..."
                value={chkNotes}
                onChange={e => setChkNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', background: '#059669', fontWeight: 700, padding: '11px' }}
            >
              {loading ? 'Submitting...' : 'Log Manual Check-In'}
            </button>
          </form>
        )}

        {/* Tab 3: Manual Vehicle Check-Out */}
        {activeTab === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Select Vehicle *</label>
              <select
                className="form-input"
                value={outVehicleId}
                onChange={e => setOutVehicleId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.number_plate})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Select Driver / Employee *</label>
              <select
                className="form-input"
                value={outEmployeeId}
                onChange={e => setOutEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Closing Meter (KM) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="e.g. 15445"
                  value={outMeter}
                  onChange={e => setOutMeter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Check-Out Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={outTime}
                  onChange={e => setOutTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Check-Out Location (Address / City)</label>
              <input
                type="text"
                className="form-input"
                value={outLocation}
                onChange={e => setOutLocation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Remarks</label>
              <input
                type="text"
                className="form-input"
                placeholder="Evening return notes..."
                value={outNotes}
                onChange={e => setOutNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', background: '#D42D56', fontWeight: 700, padding: '11px' }}
            >
              {loading ? 'Submitting...' : 'Log Manual Check-Out'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

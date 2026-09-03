import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Calendar, Clock, FileText, X, CheckCircle2, Phone, AlertCircle } from 'lucide-react';

export default function LeaveRequestModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [requestType, setRequestType] = useState('full_day'); // 'full_day' | 'half_day' | 'short_leave'
  const [halfDaySlot, setHalfDaySlot] = useState('first_half_morning'); // 'first_half_morning' | 'second_half_afternoon'
  const [leaveReason, setLeaveReason] = useState('casual'); // 'casual' | 'sick' | 'emergency' | 'annual'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate) {
      toast.warning('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        request_type: requestType,
        half_day_slot: requestType === 'half_day' ? halfDaySlot : 'none',
        leave_reason: leaveReason,
        start_date: startDate,
        end_date: requestType === 'full_day' ? (endDate || startDate) : startDate,
        total_days: requestType === 'half_day' ? 0.5 : requestType === 'short_leave' ? 0.25 : 1.0,
        notes,
        emergency_phone: emergencyPhone
      };

      const res = await api.post('/attendance/leave-request', payload);
      toast.success(res.message || 'Leave request submitted successfully!');
      if (onSuccess) onSuccess(res.request);
      onClose();
      window.dispatchEvent(new CustomEvent('app:data-sync'));
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave request');
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
          maxWidth: 520,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} color="#fff" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
              Submit Leave / Half-Day Request
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Request Type Selector */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: 13, color: '#0F2B5B' }}>
              Select Request Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setRequestType('full_day')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: requestType === 'full_day' ? '2px solid #0F2B5B' : '1px solid #cbd5e1',
                  background: requestType === 'full_day' ? 'rgba(15, 43, 91, 0.08)' : '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  color: requestType === 'full_day' ? '#0F2B5B' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                📅 Full Day
              </button>

              <button
                type="button"
                onClick={() => setRequestType('half_day')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: requestType === 'half_day' ? '2px solid #D42D56' : '1px solid #cbd5e1',
                  background: requestType === 'half_day' ? 'rgba(212, 45, 86, 0.08)' : '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  color: requestType === 'half_day' ? '#D42D56' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                🌗 Half-Day
              </button>

              <button
                type="button"
                onClick={() => setRequestType('short_leave')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: requestType === 'short_leave' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: requestType === 'short_leave' ? 'rgba(5, 150, 105, 0.08)' : '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  color: requestType === 'short_leave' ? '#059669' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                ⏱️ Short Leave
              </button>
            </div>
          </div>

          {/* Half-Day Slot Options */}
          {requestType === 'half_day' && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#D42D56', marginBottom: 6, display: 'block' }}>
                Select Half-Day Slot *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="halfDaySlot"
                    checked={halfDaySlot === 'first_half_morning'}
                    onChange={() => setHalfDaySlot('first_half_morning')}
                  />
                  Morning (First Half)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="halfDaySlot"
                    checked={halfDaySlot === 'second_half_afternoon'}
                    onChange={() => setHalfDaySlot('second_half_afternoon')}
                  />
                  Afternoon (Second Half)
                </label>
              </div>
            </div>
          )}

          {/* Reason & Date Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: requestType === 'full_day' ? '1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Leave Reason *</label>
              <select
                className="form-input"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick / Medical Leave</option>
                <option value="emergency">Family / Emergency</option>
                <option value="annual">Annual Planned</option>
                <option value="official">Official Outdoor Duty</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                {requestType === 'full_day' ? 'Date *' : 'Target Date *'}
              </label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                required
              />
            </div>
          </div>

          {/* Emergency Phone */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              Contact Phone (while on leave)
            </label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 03001234567"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
            />
          </div>

          {/* Reason details */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              Details / Reason (Optional)
            </label>
            <textarea
              rows={2}
              className="form-input"
              placeholder="Provide reason for controller/manager review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ background: '#0F2B5B', fontWeight: 700, padding: '10px 24px' }}
            >
              {loading ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

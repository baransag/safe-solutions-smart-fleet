import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Fuel, Camera, CheckCircle2, Clock, MapPin, X } from 'lucide-react';

export default function FuelPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('submit');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState(null);

  // Form
  const [form, setForm] = useState({ pump_name: '', fuel_amount: '', liters: '', meter_reading: '' });
  const [receiptBlob, setReceiptBlob] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [gps, setGps] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [assignData, fuelData] = await Promise.all([
        api.get('/vehicle-assignments/my'),
        api.get('/fuel')
      ]);
      setAssignment(assignData.assignment);
      setFuelLogs(fuelData.fuelLogs || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!receiptBlob) { toast.warning('Please capture the fuel receipt'); return; }
    if (!form.fuel_amount || !form.liters) { toast.warning('Amount and liters are required'); return; }

    setSubmitting(true);
    try {
      // Get GPS
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      }).catch(() => null);

      const vehiclesData = await api.get('/vehicles');
      const matched = vehiclesData.vehicles?.find(v => v.vehicle_id === assignment?.v_id);
      if (!matched) { toast.error('No assigned vehicle found'); setSubmitting(false); return; }

      const formData = new FormData();
      formData.append('vehicle_id', matched.id);
      formData.append('pump_name', form.pump_name);
      formData.append('fuel_amount', form.fuel_amount);
      formData.append('liters', form.liters);
      if (form.meter_reading) formData.append('meter_reading', form.meter_reading);
      if (pos) {
        formData.append('gps_lat', pos.coords.latitude);
        formData.append('gps_lng', pos.coords.longitude);
      }
      formData.append('receipt_photo', receiptBlob, 'receipt.jpg');

      await api.upload('/fuel', formData);
      toast.success('Fuel entry submitted for approval');
      setForm({ pump_name: '', fuel_amount: '', liters: '', meter_reading: '' });
      setReceiptBlob(null);
      setReceiptPreview(null);
      fetchData();
      setTab('history');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(id, status) {
    try {
      await api.put(`/fuel/${id}/approve`, { approval_status: status });
      toast.success(`Fuel entry ${status}`);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fuel Management</h1>
          <p className="page-description">Submit and track fuel entries</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Submit Fuel</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
        {isAdmin && <button className={`tab ${tab === 'approvals' ? 'active' : ''}`} onClick={() => setTab('approvals')}>Approvals</button>}
      </div>

      {tab === 'submit' && (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="card-elevated">
            <h3 style={{ marginBottom: 'var(--space-5)', fontWeight: 700 }}>
              <Fuel size={18} style={{ display: 'inline', marginRight: 8 }} />
              Submit Fuel Entry
            </h3>

            {/* Receipt Camera */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label">Fuel Receipt (Camera Only) *</label>
              {receiptPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxWidth: 300, borderRadius: 'var(--radius-md)' }} />
                  <button onClick={() => { setReceiptBlob(null); setReceiptPreview(null); }} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 4, right: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <ReceiptCamera onCapture={(blob, preview) => { setReceiptBlob(blob); setReceiptPreview(preview); }} />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Pump Name</label>
                <input className="form-input" value={form.pump_name} onChange={(e) => setForm({...form, pump_name: e.target.value})} placeholder="e.g. PSO, Shell" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (Rs) *</label>
                <input className="form-input" type="number" value={form.fuel_amount} onChange={(e) => setForm({...form, fuel_amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Liters *</label>
                <input className="form-input" type="number" step="0.1" value={form.liters} onChange={(e) => setForm({...form, liters: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Meter Reading</label>
                <input className="form-input" type="number" step="0.1" value={form.meter_reading} onChange={(e) => setForm({...form, meter_reading: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} style={{ width: '100%', marginTop: 'var(--space-6)' }}>
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Pump</th>
                <th>Amount</th>
                <th>Liters</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.map(f => (
                <tr key={f.id}>
                  <td>{new Date(f.submitted_at).toLocaleDateString()}</td>
                  <td>{f.vehicle_name}</td>
                  <td>{f.pump_name || '-'}</td>
                  <td>Rs {parseFloat(f.fuel_amount).toLocaleString()}</td>
                  <td>{f.liters}L</td>
                  <td>
                    <span className={`badge badge-${f.approval_status === 'approved' ? 'green' : f.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                      {f.approval_status}
                    </span>
                  </td>
                </tr>
              ))}
              {fuelLogs.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>No fuel entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approvals' && isAdmin && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Employee</th><th>Vehicle</th><th>Amount</th><th>Liters</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {fuelLogs.filter(f => f.approval_status === 'pending').map(f => (
                <tr key={f.id}>
                  <td>{new Date(f.submitted_at).toLocaleDateString()}</td>
                  <td>{f.employee_name}</td>
                  <td>{f.vehicle_name} ({f.number_plate})</td>
                  <td>Rs {parseFloat(f.fuel_amount).toLocaleString()}</td>
                  <td>{f.liters}L</td>
                  <td><span className="badge badge-yellow">Pending</span></td>
                  <td style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-teal btn-sm" onClick={() => handleApproval(f.id, 'approved')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApproval(f.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
              {fuelLogs.filter(f => f.approval_status === 'pending').length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>No pending approvals</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReceiptCamera({ onCapture }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      }).catch(async () => {
        // Fallback to ideal facingMode if exact fails
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      });

      streamRef.current = stream;
      setActive(true);
    } catch (err) {
      console.warn('MediaDevices camera error, fallback to native camera intent:', err);
      // Trigger native camera intent directly on mobile
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setError('Camera permission denied or camera not found.');
      }
    }
  }

  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [active]);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);

    c.toBlob(blob => {
      const preview = c.toDataURL('image/jpeg', 0.85);
      stopStream();
      onCapture(blob, preview);
    }, 'image/jpeg', 0.85);
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        onCapture(file, evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div style={{ marginTop: 'var(--space-2)' }}>
      {/* Hidden file input strictly for native camera intent */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!active ? (
        <div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={start}
            style={{ width: '100%', padding: '16px' }}
          >
            <Camera size={20} /> Open Camera to Capture Fuel Receipt
          </button>
          {error && <p className="form-error" style={{ marginTop: 6, textAlign: 'center' }}>{error}</p>}
        </div>
      ) : (
        <div>
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', marginBottom: 12 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={stopStream}>
              Cancel
            </button>
            <button type="button" className="btn btn-teal" onClick={capture}>
              <Camera size={16} /> Snap Live Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

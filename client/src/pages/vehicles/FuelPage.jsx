import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ReceiptScanner from '../../components/fuel/ReceiptScanner';
import { Fuel, CheckCircle2, AlertTriangle, Eye, X, Image as ImageIcon } from 'lucide-react';

export default function FuelPage() {
  const { user, isManager, isController, isAdmin } = useAuth();
  const isManagerOrController = isManager || isController || isAdmin;
  const toast = useToast();
  const [tab, setTab] = useState('submit');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState(null);

  // Form State
  const [form, setForm] = useState({
    pump_name: '',
    fuel_amount: '',
    liters: '',
    meter_reading: '',
    fuel_type: 'Super Petrol',
    invoice_no: '',
    rate: '',
    receipt_date: '',
    receipt_time: ''
  });

  const [rawBlob, setRawBlob] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [assignData, fuelData] = await Promise.all([
        api.get('/vehicle-assignments/my').catch(() => ({ assignment: null })),
        api.get('/fuel').catch(() => ({ fuelLogs: [] }))
      ]);
      setAssignment(assignData.assignment);
      setFuelLogs(fuelData.fuelLogs || []);
    } catch {} finally { setLoading(false); }
  }

  const handleCaptureComplete = (data) => {
    setRawBlob(data.rawBlob);
    setProcessedBlob(data.processedBlob);
    setExtractedInfo(data.extracted);
    setLowConfidenceFields(data.lowConfidenceFields || []);

    if (data.extracted) {
      setForm(prev => ({
        ...prev,
        pump_name: data.extracted.pump_name || prev.pump_name,
        fuel_amount: data.extracted.fuel_amount || prev.fuel_amount,
        liters: data.extracted.liters || prev.liters,
        rate: data.extracted.rate || prev.rate,
        fuel_type: data.extracted.fuel_type || prev.fuel_type,
        invoice_no: data.extracted.invoice_no || prev.invoice_no,
        receipt_date: data.extracted.date || prev.receipt_date,
        receipt_time: data.extracted.time || prev.receipt_time
      }));
    }

    toast.success('📷 Receipt scanned & enhanced via CamScanner engine!');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!processedBlob && !rawBlob) {
      toast.warning('Please scan the fuel receipt using the camera.');
      return;
    }
    if (!form.fuel_amount || !form.liters) {
      toast.warning('Amount and liters are required');
      return;
    }

    setSubmitting(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      }).catch(() => null);

      const vehiclesData = await api.get('/vehicles');
      const matched = vehiclesData.vehicles?.find(v => v.vehicle_id === assignment?.v_id || v.id === assignment?.vehicle_id) || vehiclesData.vehicles?.[0];
      if (!matched) {
        toast.error('No valid assigned vehicle found');
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('vehicle_id', matched.id);
      formData.append('pump_name', form.pump_name);
      formData.append('fuel_amount', form.fuel_amount);
      formData.append('liters', form.liters);
      if (form.meter_reading) formData.append('meter_reading', form.meter_reading);
      if (form.invoice_no) formData.append('invoice_number', form.invoice_no);
      if (form.rate) formData.append('rate_per_liter', form.rate);
      if (form.fuel_type) formData.append('fuel_type', form.fuel_type);
      if (form.receipt_date) formData.append('receipt_date', form.receipt_date);
      if (form.receipt_time) formData.append('receipt_time', form.receipt_time);

      if (pos) {
        formData.append('gps_lat', pos.coords.latitude);
        formData.append('gps_lng', pos.coords.longitude);
      }

      if (rawBlob) formData.append('receipt_photo', rawBlob, 'raw_receipt.jpg');
      if (processedBlob) formData.append('processed_receipt_photo', processedBlob, 'processed_receipt.jpg');

      await api.upload('/fuel', formData);
      toast.success('Fuel receipt log saved to database & submitted for manager approval!');
      
      // Trigger global data synchronization event across app
      window.dispatchEvent(new CustomEvent('app:data-sync'));

      setForm({ pump_name: '', fuel_amount: '', liters: '', meter_reading: '', fuel_type: 'Super Petrol', invoice_no: '', rate: '', receipt_date: '', receipt_time: '' });
      setRawBlob(null);
      setProcessedBlob(null);
      setExtractedInfo(null);
      fetchData();
      setTab('history');
    } catch (err) {
      toast.error(err.message || 'Failed to submit fuel log.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(id, status) {
    try {
      await api.put(`/fuel/${id}/approve`, { approval_status: status });
      toast.success(`Fuel entry ${status}`);
      window.dispatchEvent(new CustomEvent('app:data-sync'));
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
          <p className="page-description">CamScanner-Style Receipt Scanner, OCR Extraction & Database Fuel Approvals</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Submit Fuel</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
        {isManagerOrController && <button className={`tab ${tab === 'approvals' ? 'active' : ''}`} onClick={() => setTab('approvals')}>Approvals Center</button>}
      </div>

      {tab === 'submit' && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="card-elevated">
            <h3 style={{ marginBottom: 'var(--space-5)', fontWeight: 800, color: '#021C4F', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fuel size={20} color="#C50337" />
              CamScanner Fuel Receipt Scanner
            </h3>

            {/* Receipt Camera & Enhancement Component */}
            <ReceiptScanner
              onCaptureComplete={handleCaptureComplete}
              assignedVehicleName={assignment?.vehicle_name ? `${assignment.vehicle_name} (${assignment.number_plate})` : null}
            />

            {/* Extracted Structured Input Fields */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid #cbd5e1', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#021C4F' }}>
                📋 Verified Receipt Information
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Station Name {lowConfidenceFields.includes('pump_name') && <span style={{ color: '#D97706', fontSize: 11 }}>(Verify)</span>}
                  </label>
                  <input
                    className="form-input"
                    value={form.pump_name}
                    onChange={(e) => setForm({...form, pump_name: e.target.value})}
                    placeholder="e.g. PSO Super Station"
                    style={{ borderColor: lowConfidenceFields.includes('pump_name') ? '#F59E0B' : undefined }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Invoice / Receipt No.</label>
                  <input
                    className="form-input"
                    value={form.invoice_no}
                    onChange={(e) => setForm({...form, invoice_no: e.target.value})}
                    placeholder="e.g. INV-10492"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Total Amount (Rs) * {lowConfidenceFields.includes('fuel_amount') && <span style={{ color: '#D97706', fontSize: 11 }}>(Verify)</span>}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.fuel_amount}
                    onChange={(e) => setForm({...form, fuel_amount: e.target.value})}
                    placeholder="e.g. 3500"
                    required
                    style={{ borderColor: lowConfidenceFields.includes('fuel_amount') ? '#F59E0B' : undefined }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Volume (Litres) * {lowConfidenceFields.includes('liters') && <span style={{ color: '#D97706', fontSize: 11 }}>(Verify)</span>}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={form.liters}
                    onChange={(e) => setForm({...form, liters: e.target.value})}
                    placeholder="e.g. 12.5"
                    required
                    style={{ borderColor: lowConfidenceFields.includes('liters') ? '#F59E0B' : undefined }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Rate / Litre (Rs)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={form.rate}
                    onChange={(e) => setForm({...form, rate: e.target.value})}
                    placeholder="e.g. 280.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Fuel Type</label>
                  <select
                    className="form-input form-select"
                    value={form.fuel_type}
                    onChange={(e) => setForm({...form, fuel_type: e.target.value})}
                  >
                    <option value="Super Petrol">Super Petrol</option>
                    <option value="High Speed Diesel">High Speed Diesel</option>
                    <option value="Hi-Octane / HOBC">Hi-Octane / HOBC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Current Odometer (KM)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.1"
                    value={form.meter_reading}
                    onChange={(e) => setForm({...form, meter_reading: e.target.value})}
                    placeholder="e.g. 15240"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Assigned Vehicle</label>
                  <input
                    className="form-input"
                    value={assignment ? `${assignment.vehicle_name} (${assignment.number_plate})` : 'Company Vehicle'}
                    disabled
                    style={{ background: '#e2e8f0' }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting || (!processedBlob && !rawBlob)}
              style={{ width: '100%', padding: '16px', fontWeight: 800, background: '#021C4F' }}
            >
              {submitting ? 'Saving to Database & Submitting...' : 'Confirm & Save Fuel Entry to Database'}
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
                <th>Receipt Image</th>
                <th>Vehicle</th>
                <th>Station</th>
                <th>Amount</th>
                <th>Liters</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.map(f => (
                <tr key={f.id}>
                  <td>{new Date(f.submitted_at).toLocaleDateString()}</td>
                  <td>
                    {(f.processed_receipt_url || f.receipt_photo_url) ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPreviewModalImg(f.processed_receipt_url || f.receipt_photo_url)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#021C4F', fontWeight: 700 }}
                      >
                        <ImageIcon size={14} /> View Receipt
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>No Image</span>
                    )}
                  </td>
                  <td>
                    <strong>{f.vehicle_name}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{f.number_plate}</div>
                  </td>
                  <td>{f.pump_name || 'Station'}</td>
                  <td><strong style={{ color: '#021C4F' }}>Rs {parseFloat(f.fuel_amount).toLocaleString()}</strong></td>
                  <td>{f.liters}L</td>
                  <td>
                    <span className={`badge badge-${f.approval_status === 'approved' ? 'green' : f.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                      {f.approval_status}
                    </span>
                  </td>
                </tr>
              ))}
              {fuelLogs.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>No fuel entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approvals' && isManagerOrController && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Receipt Photo</th>
                <th>Vehicle</th>
                <th>Station</th>
                <th>Amount</th>
                <th>Liters</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.filter(f => f.approval_status === 'pending').map(f => (
                <tr key={f.id}>
                  <td>{new Date(f.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <strong>{f.employee_name}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Code: {f.emp_id}</div>
                  </td>
                  <td>
                    {(f.processed_receipt_url || f.receipt_photo_url) ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setPreviewModalImg(f.processed_receipt_url || f.receipt_photo_url)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Eye size={14} /> Scanned Image
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>No Image</span>
                    )}
                  </td>
                  <td>{f.vehicle_name} ({f.number_plate})</td>
                  <td>{f.pump_name || 'Station'}</td>
                  <td><strong style={{ color: '#021C4F' }}>Rs {parseFloat(f.fuel_amount).toLocaleString()}</strong></td>
                  <td>{f.liters}L</td>
                  <td><span className="badge badge-yellow">⏳ Pending</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproval(f.id, 'approved')} style={{ background: '#10B981', border: 'none' }}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApproval(f.id, 'rejected')} style={{ background: '#EF4444', border: 'none' }}>Reject</button>
                  </td>
                </tr>
              ))}
              {fuelLogs.filter(f => f.approval_status === 'pending').length === 0 && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>No pending fuel approvals</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RECEIPT IMAGE LIGHTBOX MODAL */}
      {previewModalImg && (
        <div className="modal-overlay" onClick={() => setPreviewModalImg(null)}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: 540, padding: 20, textAlign: 'center', borderRadius: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#021C4F' }}>Scanned Fuel Receipt Image</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewModalImg(null)}><X size={18} /></button>
            </div>
            <img
              src={previewModalImg.startsWith('/') ? previewModalImg : `/${previewModalImg}`}
              alt="Receipt Preview"
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, border: '1px solid #cbd5e1' }}
              onError={(e) => { e.currentTarget.alt = 'Receipt Image Unavailable'; }}
            />
          </div>
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

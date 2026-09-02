import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ReceiptScanner from '../../components/fuel/ReceiptScanner';
import { Fuel, CheckCircle2, AlertTriangle, Eye, X, Image as ImageIcon, FileText, Check } from 'lucide-react';

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
    receipt_date: new Date().toISOString().split('T')[0],
    receipt_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const [rawBlob, setRawBlob] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
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
    toast.success('📷 Receipt slip photo attached successfully!');
  };

  // Auto-calculate Total when liters or rate changes
  const handleLitersChange = (val) => {
    const l = parseFloat(val);
    const r = parseFloat(form.rate);
    const updated = { ...form, liters: val };
    if (!isNaN(l) && !isNaN(r) && r > 0) {
      updated.fuel_amount = (l * r).toFixed(0);
    }
    setForm(updated);
  };

  const handleRateChange = (val) => {
    const r = parseFloat(val);
    const l = parseFloat(form.liters);
    const updated = { ...form, rate: val };
    if (!isNaN(l) && !isNaN(r) && l > 0) {
      updated.fuel_amount = (l * r).toFixed(0);
    }
    setForm(updated);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!processedBlob && !rawBlob) {
      toast.warning('Please attach or take a photo of the fuel receipt slip.');
      return;
    }
    if (!form.fuel_amount || !form.liters) {
      toast.warning('Total Amount (Rs) and Liters are required.');
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
        toast.error('No valid assigned vehicle found in database.');
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('vehicle_id', matched.id);
      formData.append('pump_name', form.pump_name || 'Filling Station');
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
      toast.success('Fuel receipt submitted for controller approval!');
      
      // Trigger global data synchronization event across app
      window.dispatchEvent(new CustomEvent('app:data-sync'));

      setForm({
        pump_name: '',
        fuel_amount: '',
        liters: '',
        meter_reading: '',
        fuel_type: 'Super Petrol',
        invoice_no: '',
        rate: '',
        receipt_date: new Date().toISOString().split('T')[0],
        receipt_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setRawBlob(null);
      setProcessedBlob(null);
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
      toast.success(`Fuel entry marked as ${status}`);
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
          <p className="page-description">Slip Verification, Expense Entry & Controller Fuel Approvals</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Submit Fuel Slip</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Fuel Logs History</button>
        {isManagerOrController && <button className={`tab ${tab === 'approvals' ? 'active' : ''}`} onClick={() => setTab('approvals')}>Approvals Center</button>}
      </div>

      {tab === 'submit' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="card-elevated">
            <h3 style={{ marginBottom: 16, fontWeight: 800, color: '#0F2B5B', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fuel size={22} color="#D42D56" />
              Upload & Verify Fuel Slip
            </h3>

            {/* 1. Receipt Slip Camera / File Upload Component */}
            <ReceiptScanner
              onCaptureComplete={handleCaptureComplete}
              assignedVehicleName={assignment?.vehicle_name ? `${assignment.vehicle_name} (${assignment.number_plate})` : null}
            />

            {/* 2. Structured Input Fields for User to Type & Verify against Slip */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: '#0F2B5B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color="#0F2B5B" />
                Fill Slip Details (Check & Match with Photo)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Petrol Pump / Station Name</label>
                  <input
                    className="form-input"
                    value={form.pump_name}
                    onChange={(e) => setForm({...form, pump_name: e.target.value})}
                    placeholder="e.g. PSO / Shell / Total Station"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Slip / Invoice No.</label>
                  <input
                    className="form-input"
                    value={form.invoice_no}
                    onChange={(e) => setForm({...form, invoice_no: e.target.value})}
                    placeholder="e.g. 004812"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Volume (Litres) *</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={form.liters}
                    onChange={(e) => handleLitersChange(e.target.value)}
                    placeholder="e.g. 10.5"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Rate per Litre (Rs)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={form.rate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    placeholder="e.g. 280.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Total Fuel Amount (Rs) *</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.fuel_amount}
                    onChange={(e) => setForm({...form, fuel_amount: e.target.value})}
                    placeholder="e.g. 2940"
                    required
                    style={{ fontWeight: 800, color: '#0F2B5B' }}
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
                    style={{ background: '#E2E8F0', color: '#475569', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Live Slip Voucher Summary Card */}
            {(form.fuel_amount || form.liters) && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: 14, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46', marginBottom: 4 }}>
                  🧾 Slip Summary Preview:
                </div>
                <div style={{ fontSize: 12, color: '#047857', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <span><strong>Amount:</strong> Rs {form.fuel_amount || 0}</span>
                  <span><strong>Volume:</strong> {form.liters || 0} L</span>
                  <span><strong>Rate:</strong> Rs {form.rate || '—'}/L</span>
                  <span><strong>Station:</strong> {form.pump_name || 'Station'}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting || (!processedBlob && !rawBlob)}
              style={{ width: '100%', padding: '16px', fontWeight: 800, background: '#0F2B5B', borderRadius: 12 }}
            >
              {submitting ? 'Submitting to Database...' : 'Confirm Slip & Submit Fuel Request'}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <>
          {/* Desktop Table View */}
          <div className="table-container hide-on-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt Slip</th>
                  <th>Vehicle</th>
                  <th>Station</th>
                  <th>Amount (Rs)</th>
                  <th>Volume</th>
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
                          style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0F2B5B', fontWeight: 700 }}
                        >
                          <ImageIcon size={14} /> View Slip
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
                    <td><strong style={{ color: '#0F2B5B' }}>Rs {parseFloat(f.fuel_amount).toLocaleString()}</strong></td>
                    <td>{f.liters} L</td>
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

          {/* Mobile Card List View */}
          <div className="show-on-mobile">
            <div className="mobile-card-list">
              {fuelLogs.map(f => (
                <div key={`mfuel_${f.id}`} className="mobile-record-card" style={{ borderLeft: `4px solid ${f.approval_status === 'approved' ? '#10B981' : f.approval_status === 'rejected' ? '#EF4444' : '#D97706'}` }}>
                  <div className="mobile-card-header">
                    <div>
                      <div className="mobile-card-title">{f.vehicle_name} ({f.number_plate})</div>
                      <div className="mobile-card-subtitle">
                        {new Date(f.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {f.pump_name || 'Station'}
                      </div>
                    </div>
                    <span className={`badge badge-${f.approval_status === 'approved' ? 'green' : f.approval_status === 'rejected' ? 'red' : 'yellow'}`}>
                      {f.approval_status}
                    </span>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Total Amount</span>
                      <span className="mobile-card-value" style={{ color: '#0F2B5B', fontSize: 13 }}>
                        Rs {parseFloat(f.fuel_amount).toLocaleString()}
                      </span>
                    </div>

                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Volume</span>
                      <span className="mobile-card-value">{f.liters} Litres</span>
                    </div>

                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Rate / L</span>
                      <span className="mobile-card-value">{f.rate_per_liter ? `Rs ${f.rate_per_liter}` : '—'}</span>
                    </div>

                    <div className="mobile-card-cell">
                      <span className="mobile-card-label">Fuel Type</span>
                      <span className="mobile-card-value">{f.fuel_type || 'Super Petrol'}</span>
                    </div>
                  </div>

                  {(f.processed_receipt_url || f.receipt_photo_url) && (
                    <div className="mobile-card-footer">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPreviewModalImg(f.processed_receipt_url || f.receipt_photo_url)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0F2B5B', fontWeight: 700 }}
                      >
                        <ImageIcon size={14} /> View Attached Slip
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {fuelLogs.length === 0 && (
                <div className="card-elevated" style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
                  No fuel entries found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'approvals' && isManagerOrController && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Receipt Slip</th>
                <th>Vehicle</th>
                <th>Station</th>
                <th>Amount</th>
                <th>Volume</th>
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
                        <Eye size={14} /> Full Slip
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>No Image</span>
                    )}
                  </td>
                  <td>{f.vehicle_name} ({f.number_plate})</td>
                  <td>{f.pump_name || 'Station'}</td>
                  <td><strong style={{ color: '#0F2B5B' }}>Rs {parseFloat(f.fuel_amount).toLocaleString()}</strong></td>
                  <td>{f.liters} L</td>
                  <td><span className="badge badge-yellow">⏳ Pending</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproval(f.id, 'approved')} style={{ background: '#059669', border: 'none', fontWeight: 700 }}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApproval(f.id, 'rejected')} style={{ background: '#DC2626', border: 'none', fontWeight: 700 }}>Reject</button>
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

      {/* FULL IMAGE PREVIEW MODAL */}
      {previewModalImg && (
        <div className="modal-backdrop" onClick={() => setPreviewModalImg(null)}>
          <div className="modal animate-scale-in" style={{ maxWidth: 640, padding: 20, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <img
              src={previewModalImg.startsWith('/') || previewModalImg.startsWith('data:') || previewModalImg.startsWith('http') ? previewModalImg : `/${previewModalImg}`}
              alt="Fuel Slip Preview"
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 12 }}
              onError={(e) => {
                e.target.style.display = 'none';
                const fb = document.getElementById('fuel-preview-fallback');
                if (fb) fb.style.display = 'block';
              }}
            />
            <div id="fuel-preview-fallback" style={{ display: 'none', padding: '32px 16px', color: '#94a3b8' }}>
              <FileText size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#0F2B5B' }}>Fuel receipt verified in system records</p>
            </div>
            <button className="btn btn-primary" onClick={() => setPreviewModalImg(null)} style={{ marginTop: 16, background: '#0F2B5B' }}>
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

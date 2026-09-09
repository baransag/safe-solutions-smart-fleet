import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Wrench, Plus, X, Calendar, DollarSign, Gauge,
  MapPin, FileText, Clock, ChevronRight, AlertCircle,
  CheckCircle2, Loader2
} from 'lucide-react';

// Service type labels map
const SERVICE_TYPE_LABELS = {
  oil_change: 'Oil Change',
  tire_replacement: 'Tire Replacement',
  brake_service: 'Brake Service',
  chain_service: 'Chain Service',
  general_service: 'General Service',
  engine_repair: 'Engine Repair',
  electrical: 'Electrical',
  battery: 'Battery',
  filter_change: 'Filter Change',
  clutch_service: 'Clutch Service',
  suspension: 'Suspension',
  other: 'Other',
};

// Badge colour per service type
function getServiceBadgeClass(type) {
  const map = {
    oil_change: 'badge-orange',
    tire_replacement: 'badge-teal',
    brake_service: 'badge-red',
    chain_service: 'badge-yellow',
    general_service: 'badge-blue',
    engine_repair: 'badge-red',
    electrical: 'badge-purple',
    battery: 'badge-yellow',
    filter_change: 'badge-teal',
    clutch_service: 'badge-orange',
    suspension: 'badge-blue',
    other: 'badge-gray',
  };
  return map[type] || 'badge-gray';
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return d;
  }
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isDueSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyMaintenance() {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      color: 'var(--text-tertiary)'
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        <Wrench size={28} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
        No maintenance records yet
      </p>
      <p style={{ fontSize: '0.82rem' }}>
        Add the first service record for this vehicle
      </p>
    </div>
  );
}

// ─── Add Record Form Modal ────────────────────────────────────────────────────
function AddMaintenanceModal({ vehicleDbId, vehicleName, numberPlate, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    service_type: '',
    description: '',
    service_date: new Date().toISOString().split('T')[0],
    next_service_date: '',
    next_service_km: '',
    cost: '',
    odometer: '',
    vendor: '',
    notes: '',
  });

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.service_type) { setError('Service type is required'); return; }
    if (!form.service_date) { setError('Service date is required'); return; }

    setSaving(true);
    try {
      await api.post('/vehicle-services', {
        vehicle_id: vehicleDbId,
        service_type: form.service_type,
        description: form.description || null,
        service_date: form.service_date,
        next_service_date: form.next_service_date || null,
        next_service_km: form.next_service_km ? parseFloat(form.next_service_km) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        odometer: form.odometer ? parseFloat(form.odometer) : null,
        vendor: form.vendor || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save record. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 1100 }}
    >
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, zIndex: 1101 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={18} />
              Add Maintenance Record
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {vehicleName} • {numberPlate}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            margin: '0 0 16px',
            padding: '10px 14px',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 8,
            color: '#DC2626',
            fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)'
          }}>
            {/* Service Type */}
            <div className="form-group">
              <label className="form-label">Service Type *</label>
              <select
                className="form-input form-select"
                value={form.service_type}
                onChange={e => setField('service_type', e.target.value)}
                required
              >
                <option value="">Select type...</option>
                <option value="oil_change">Oil Change</option>
                <option value="tire_replacement">Tire Replacement</option>
                <option value="brake_service">Brake Service</option>
                <option value="chain_service">Chain Service</option>
                <option value="general_service">General Service</option>
                <option value="engine_repair">Engine Repair</option>
                <option value="electrical">Electrical</option>
                <option value="battery">Battery</option>
                <option value="filter_change">Filter Change</option>
                <option value="clutch_service">Clutch Service</option>
                <option value="suspension">Suspension</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Service Date */}
            <div className="form-group">
              <label className="form-label">Service Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.service_date}
                onChange={e => setField('service_date', e.target.value)}
                required
              />
            </div>

            {/* Cost */}
            <div className="form-group">
              <label className="form-label">Cost (Rs)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 2500"
                value={form.cost}
                onChange={e => setField('cost', e.target.value)}
              />
            </div>

            {/* Odometer */}
            <div className="form-group">
              <label className="form-label">Odometer (KM)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 15000"
                value={form.odometer}
                onChange={e => setField('odometer', e.target.value)}
              />
            </div>

            {/* Next Service Date */}
            <div className="form-group">
              <label className="form-label">Next Service Date</label>
              <input
                className="form-input"
                type="date"
                value={form.next_service_date}
                onChange={e => setField('next_service_date', e.target.value)}
              />
            </div>

            {/* Next Service KM */}
            <div className="form-group">
              <label className="form-label">Next Service KM</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 17000"
                value={form.next_service_km}
                onChange={e => setField('next_service_km', e.target.value)}
              />
            </div>

            {/* Vendor */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Vendor / Workshop</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Ali's Auto Workshop"
                value={form.vendor}
                onChange={e => setField('vendor', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description / Issue</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Describe the issue or work done..."
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Notes */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {saving ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Wrench size={15} /> Save Record</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Maintenance Panel ───────────────────────────────────────────────────
export default function MaintenancePanel({ vehicle, onClose }) {
  const { isAdmin, isController, isManager } = useAuth();
  const canAdd = isAdmin || isController || isManager;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await api.get(`/vehicle-services?vehicle_id=${vehicle.id}`);
      setRecords(data.services || []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }, [vehicle.id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  function handleRecordSaved() {
    setShowAddModal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    fetchRecords();
  }

  // ── Last service summary ──
  const lastRecord = records[0] || null;
  const nextDueRecord = records.find(r => r.next_service_date);

  return (
    <>
      {/* ── Main Maintenance Panel Modal ── */}
      <div
        className="modal-backdrop"
        onClick={onClose}
        style={{ zIndex: 1050, alignItems: 'flex-start', paddingTop: 24 }}
      >
        <div
          className="modal"
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: 780,
            width: '100%',
            maxHeight: 'calc(100vh - 48px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1051,
          }}
        >
          {/* ── Panel Header ── */}
          <div className="modal-header" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'linear-gradient(135deg, #E06D34 0%, #c45a25 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Wrench size={20} color="#fff" />
              </div>
              <div>
                <h2 className="modal-title" style={{ marginBottom: 2 }}>
                  Maintenance History
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {vehicle.name}
                  </span>
                  {' '}•{' '}
                  <span className="badge badge-teal" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {vehicle.number_plate}
                  </span>
                  {' '}•{' '}
                  <span style={{ textTransform: 'capitalize' }}>{vehicle.type}</span>
                  {vehicle.assigned_employee_name && (
                    <> • Assigned to <strong>{vehicle.assigned_employee_name}</strong></>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {canAdd && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={14} /> Add Record
                </button>
              )}
              <button className="modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ── Success Banner ── */}
          {saveSuccess && (
            <div style={{
              margin: '0 0 12px',
              padding: '10px 16px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              color: '#059669',
              fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: 8,
              flexShrink: 0
            }}>
              <CheckCircle2 size={15} /> Maintenance record saved successfully.
            </div>
          )}

          {/* ── Summary Cards ── */}
          {!loading && !fetchError && records.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 16,
              flexShrink: 0
            }}>
              {/* Total Records */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 10, padding: '12px 14px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Total Services
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {records.length}
                </div>
              </div>

              {/* Last Service */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 10, padding: '12px 14px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Last Service
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {lastRecord ? formatDate(lastRecord.service_date) : '—'}
                </div>
                {lastRecord && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {SERVICE_TYPE_LABELS[lastRecord.service_type] || lastRecord.service_type}
                  </div>
                )}
              </div>

              {/* Next Due */}
              <div style={{
                background: nextDueRecord && isOverdue(nextDueRecord.next_service_date)
                  ? 'rgba(220,38,38,0.05)'
                  : nextDueRecord && isDueSoon(nextDueRecord.next_service_date)
                  ? 'rgba(234,179,8,0.08)'
                  : 'var(--bg-secondary)',
                borderRadius: 10, padding: '12px 14px',
                border: `1px solid ${
                  nextDueRecord && isOverdue(nextDueRecord.next_service_date)
                    ? 'rgba(220,38,38,0.25)'
                    : nextDueRecord && isDueSoon(nextDueRecord.next_service_date)
                    ? 'rgba(234,179,8,0.3)'
                    : 'var(--border-color)'
                }`
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Next Service Due
                </div>
                <div style={{
                  fontSize: '0.9rem', fontWeight: 600,
                  color: nextDueRecord && isOverdue(nextDueRecord.next_service_date)
                    ? '#DC2626'
                    : nextDueRecord && isDueSoon(nextDueRecord.next_service_date)
                    ? '#CA8A04'
                    : 'var(--text-primary)'
                }}>
                  {nextDueRecord ? formatDate(nextDueRecord.next_service_date) : '—'}
                </div>
                {nextDueRecord && isOverdue(nextDueRecord.next_service_date) && (
                  <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 2, fontWeight: 600 }}>
                    ⚠ OVERDUE
                  </div>
                )}
                {nextDueRecord && isDueSoon(nextDueRecord.next_service_date) && !isOverdue(nextDueRecord.next_service_date) && (
                  <div style={{ fontSize: '0.7rem', color: '#CA8A04', marginTop: 2, fontWeight: 600 }}>
                    Due soon
                  </div>
                )}
              </div>

              {/* Total Cost */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 10, padding: '12px 14px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Total Cost
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {records.some(r => r.cost) ? (
                    `Rs ${records
                      .filter(r => r.cost)
                      .reduce((sum, r) => sum + parseFloat(r.cost), 0)
                      .toLocaleString()}`
                  ) : '—'}
                </div>
              </div>
            </div>
          )}

          {/* ── Records List ── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-tertiary)' }}>
                <div className="loader loader-lg" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading maintenance records...</p>
              </div>
            ) : fetchError ? (
              <div style={{
                textAlign: 'center', padding: '40px 24px',
                color: '#DC2626'
              }}>
                <AlertCircle size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, marginBottom: 6 }}>Failed to load records</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: 16 }}>
                  {fetchError}
                </p>
                <button className="btn btn-ghost btn-sm" onClick={fetchRecords}>
                  Try Again
                </button>
              </div>
            ) : records.length === 0 ? (
              <EmptyMaintenance />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hide-on-mobile">
                  <table className="table" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Service Type</th>
                        <th>Vendor</th>
                        <th>Odometer</th>
                        <th>Cost</th>
                        <th>Next Due</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Calendar size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                              {formatDate(r.service_date)}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${getServiceBadgeClass(r.service_type)}`}>
                              {SERVICE_TYPE_LABELS[r.service_type] || r.service_type}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem', maxWidth: 140 }}>
                            {r.vendor || (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {r.odometer ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Gauge size={13} style={{ color: 'var(--text-tertiary)' }} />
                                {parseFloat(r.odometer).toLocaleString()} km
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: r.cost ? 600 : 400 }}>
                            {r.cost ? (
                              `Rs ${parseFloat(r.cost).toLocaleString()}`
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {r.next_service_date ? (
                              <span style={{
                                fontSize: '0.82rem',
                                color: isOverdue(r.next_service_date)
                                  ? '#DC2626'
                                  : isDueSoon(r.next_service_date)
                                  ? '#CA8A04'
                                  : 'var(--text-secondary)',
                                fontWeight: (isOverdue(r.next_service_date) || isDueSoon(r.next_service_date)) ? 600 : 400
                              }}>
                                {isOverdue(r.next_service_date) && '⚠ '}
                                {formatDate(r.next_service_date)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 200 }}>
                            <div style={{
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: 200
                            }}
                              title={[r.description, r.notes].filter(Boolean).join(' | ')}
                            >
                              {r.description || r.notes || (
                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="show-on-mobile">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {records.map(r => (
                      <div
                        key={`mob_${r.id}`}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: 12,
                          padding: 14,
                          border: '1px solid var(--border-color)',
                          borderLeft: `4px solid ${
                            isOverdue(r.next_service_date) ? '#DC2626' : '#E06D34'
                          }`
                        }}
                      >
                        {/* Card top */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <span className={`badge ${getServiceBadgeClass(r.service_type)}`}>
                            {SERVICE_TYPE_LABELS[r.service_type] || r.service_type}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> {formatDate(r.service_date)}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {r.vendor && (
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                Vendor
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r.vendor}</div>
                            </div>
                          )}
                          {r.cost && (
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                Cost
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Rs {parseFloat(r.cost).toLocaleString()}
                              </div>
                            </div>
                          )}
                          {r.odometer && (
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                Odometer
                              </div>
                              <div style={{ fontSize: '0.82rem' }}>
                                {parseFloat(r.odometer).toLocaleString()} km
                              </div>
                            </div>
                          )}
                          {r.next_service_date && (
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                Next Due
                              </div>
                              <div style={{
                                fontSize: '0.82rem', fontWeight: 600,
                                color: isOverdue(r.next_service_date) ? '#DC2626' : isDueSoon(r.next_service_date) ? '#CA8A04' : 'var(--text-secondary)'
                              }}>
                                {isOverdue(r.next_service_date) && '⚠ '}
                                {formatDate(r.next_service_date)}
                              </div>
                            </div>
                          )}
                        </div>

                        {(r.description || r.notes) && (
                          <div style={{
                            marginTop: 10, paddingTop: 10,
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '0.8rem', color: 'var(--text-secondary)'
                          }}>
                            {r.description || r.notes}
                          </div>
                        )}

                        {r.created_by_name && (
                          <div style={{
                            marginTop: 8,
                            fontSize: '0.72rem', color: 'var(--text-tertiary)',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}>
                            <Clock size={11} /> Logged by {r.created_by_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Panel Footer ── */}
          {!loading && !fetchError && records.length > 0 && (
            <div style={{
              flexShrink: 0,
              paddingTop: 14,
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.78rem',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{records.length} record{records.length !== 1 ? 's' : ''} found</span>
              {canAdd && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={13} /> Add New Record
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Record Modal (layered on top) ── */}
      {showAddModal && (
        <AddMaintenanceModal
          vehicleDbId={vehicle.id}
          vehicleName={vehicle.name}
          numberPlate={vehicle.number_plate}
          onClose={() => setShowAddModal(false)}
          onSaved={handleRecordSaved}
        />
      )}
    </>
  );
}

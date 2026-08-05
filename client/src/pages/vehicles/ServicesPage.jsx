import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Wrench, Plus, X, Calendar } from 'lucide-react';

export default function ServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', service_type: '', description: '', service_date: '',
    next_service_date: '', cost: '', odometer: '', vendor: '', notes: ''
  });

  useEffect(() => {
    Promise.all([
      api.get('/vehicle-services').then(d => setServices(d.services || [])),
      api.get('/vehicles').then(d => setVehicles(d.vehicles || []))
    ]).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/vehicle-services', form);
      toast.success('Service record added');
      setShowModal(false);
      const data = await api.get('/vehicle-services');
      setServices(data.services || []);
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Services</h1>
          <p className="page-description">Track maintenance and service records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Wrench size={28} /></div>
          <p className="empty-title">No service records</p>
          <p className="empty-text">Add your first vehicle service record</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Vehicle</th><th>Service Type</th><th>Vendor</th><th>Cost</th><th>Odometer</th><th>Next Service</th></tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>{new Date(s.service_date).toLocaleDateString()}</td>
                  <td>{s.vehicle_name} ({s.number_plate})</td>
                  <td><span className="badge badge-orange">{s.service_type}</span></td>
                  <td>{s.vendor || '-'}</td>
                  <td>{s.cost ? `Rs ${parseFloat(s.cost).toLocaleString()}` : '-'}</td>
                  <td>{s.odometer ? `${parseFloat(s.odometer).toLocaleString()} km` : '-'}</td>
                  <td>{s.next_service_date ? new Date(s.next_service_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Service Record</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <select className="form-input form-select" value={form.vehicle_id} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} required>
                    <option value="">Select...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.number_plate})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select className="form-input form-select" value={form.service_type} onChange={(e) => setForm({...form, service_type: e.target.value})} required>
                    <option value="">Select...</option>
                    <option value="oil_change">Oil Change</option>
                    <option value="tire_replacement">Tire Replacement</option>
                    <option value="brake_service">Brake Service</option>
                    <option value="chain_service">Chain Service</option>
                    <option value="general_service">General Service</option>
                    <option value="engine_repair">Engine Repair</option>
                    <option value="electrical">Electrical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Date *</label>
                  <input className="form-input" type="date" value={form.service_date} onChange={(e) => setForm({...form, service_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Service Date</label>
                  <input className="form-input" type="date" value={form.next_service_date} onChange={(e) => setForm({...form, next_service_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (Rs)</label>
                  <input className="form-input" type="number" value={form.cost} onChange={(e) => setForm({...form, cost: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer (KM)</label>
                  <input className="form-input" type="number" value={form.odometer} onChange={(e) => setForm({...form, odometer: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Vendor</label>
                  <input className="form-input" value={form.vendor} onChange={(e) => setForm({...form, vendor: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="3" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

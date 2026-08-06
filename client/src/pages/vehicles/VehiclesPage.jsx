import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Car, Plus, Search, Edit2, X, Eye } from 'lucide-react';

export default function VehiclesPage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState({
    vehicle_id: '', name: '', number_plate: '', type: 'bike', make: '', model: '',
    year: '', color: '', fuel_type: 'petrol', tank_capacity: '', avg_mileage: ''
  });

  useEffect(() => { fetchVehicles(); }, []);

  async function fetchVehicles() {
    try {
      const data = await api.get(`/vehicles${search ? `?search=${search}` : ''}`);
      setVehicles(data.vehicles || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editVehicle) {
        await api.put(`/vehicles/${editVehicle.id}`, form);
        toast.success('Vehicle updated');
      } else {
        await api.post('/vehicles', form);
        toast.success('Vehicle added');
      }
      setShowModal(false);
      setEditVehicle(null);
      setForm({ vehicle_id: '', name: '', number_plate: '', type: 'bike', make: '', model: '', year: '', color: '', fuel_type: 'petrol', tank_capacity: '', avg_mileage: '' });
      fetchVehicles();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function openEdit(v) {
    setEditVehicle(v);
    setForm({
      vehicle_id: v.vehicle_id, name: v.name, number_plate: v.number_plate,
      type: v.type, make: v.make || '', model: v.model || '', year: v.year || '',
      color: v.color || '', fuel_type: v.fuel_type, tank_capacity: v.tank_capacity || '',
      avg_mileage: v.avg_mileage || ''
    });
    setShowModal(true);
  }

  const filtered = vehicles.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.number_plate?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicle_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Registry</h1>
          <p className="page-description">{vehicles.length} vehicles in fleet</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditVehicle(null); setForm({ vehicle_id: '', name: '', number_plate: '', type: 'bike', make: '', model: '', year: '', color: '', fuel_type: 'petrol', tank_capacity: '', avg_mileage: '' }); setShowModal(true); }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-input-wrapper" style={{ maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
        <Search className="search-icon" size={18} />
        <input
          className="form-input"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loader"><div className="loader loader-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Car size={28} /></div>
          <p className="empty-title">No vehicles found</p>
          <p className="empty-text">Add your first vehicle to get started</p>
        </div>
      ) : (
        <div className="table-container animate-fade-in-up">
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Name</th>
                <th>Number Plate</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Current KM</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{v.vehicle_id}</span></td>
                  <td><span style={{ fontWeight: 500 }}>{v.name}</span></td>
                  <td><span className="badge badge-teal">{v.number_plate}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.type}</td>
                  <td>
                    <span className={`badge badge-${v.status === 'active' ? 'green' : v.status === 'maintenance' ? 'yellow' : 'red'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td>{v.assigned_employee_name || <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>}</td>
                  <td>{parseFloat(v.current_meter || 0).toLocaleString()} km</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle ID *</label>
                  <input className="form-input" value={form.vehicle_id} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} required disabled={!!editVehicle} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Number Plate *</label>
                  <input className="form-input" value={form.number_plate} onChange={(e) => setForm({...form, number_plate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input form-select" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                    <option value="suv">SUV</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Make</label>
                  <input className="form-input" value={form.make} onChange={(e) => setForm({...form, make: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="form-input" value={form.model} onChange={(e) => setForm({...form, model: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="form-input" type="number" value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input className="form-input" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Type</label>
                  <select className="form-input form-select" value={form.fuel_type} onChange={(e) => setForm({...form, fuel_type: e.target.value})}>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="cng">CNG</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tank Capacity (L)</label>
                  <input className="form-input" type="number" step="0.1" value={form.tank_capacity} onChange={(e) => setForm({...form, tank_capacity: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editVehicle ? 'Update' : 'Add Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

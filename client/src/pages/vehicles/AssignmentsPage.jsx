import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Users, ArrowRight, X } from 'lucide-react';

export default function AssignmentsPage() {
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    Promise.all([fetchAssignments(), fetchEmployees(), fetchVehicles()])
      .finally(() => setLoading(false));
  }, []);

  async function fetchAssignments() {
    const data = await api.get('/vehicle-assignments?current=true');
    setAssignments(data.assignments || []);
  }

  async function fetchEmployees() {
    const data = await api.get('/employees?active=true');
    setEmployees(data.employees || []);
  }

  async function fetchVehicles() {
    const data = await api.get('/vehicles?status=active');
    setVehicles(data.vehicles || []);
  }

  async function handleAssign(e) {
    e.preventDefault();
    try {
      await api.post('/vehicle-assignments', {
        vehicle_id: parseInt(selectedVehicle),
        employee_id: parseInt(selectedEmployee)
      });
      toast.success('Vehicle assigned successfully');
      setShowModal(false);
      setSelectedVehicle('');
      setSelectedEmployee('');
      fetchAssignments();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUnassign(id) {
    if (!window.confirm('Unassign this vehicle?')) return;
    try {
      await api.delete(`/vehicle-assignments/${id}`);
      toast.success('Vehicle unassigned');
      fetchAssignments();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <div className="page"><div className="page-loader"><div className="loader loader-lg" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Assignments</h1>
          <p className="page-description">{assignments.length} active assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Users size={16} /> Assign Vehicle
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={28} /></div>
          <p className="empty-title">No active assignments</p>
          <p className="empty-text">Assign vehicles to employees to get started</p>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: 'var(--space-4)' }}>
          {assignments.map(a => (
            <div key={a.id} className="card-elevated" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '18px 20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{a.employee_name}</span>
                  <span className="badge badge-gray" style={{ fontSize: '11px', fontWeight: 700 }}>{a.emp_id || a.employee_code || 'EMP'}</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontWeight: 700, color: '#D42D56' }}>{a.vehicle_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-teal" style={{ fontWeight: 700 }}>{a.number_plate}</span>
                  <span className="badge badge-green" style={{ textTransform: 'uppercase', fontSize: '10px' }}>Active Duty</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    Assigned: {new Date(a.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleUnassign(a.id)} title="Unassign Vehicle">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Assign Vehicle</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Employee</label>
                <select className="form-input form-select" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required>
                  <option value="">Select employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle</label>
                <select className="form-input form-select" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.number_plate})</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

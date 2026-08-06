import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Users, UserPlus, Search, Filter, Mail, Phone, Shield,
  Building, CheckCircle, XCircle, Edit3, Trash2, Key, RefreshCw
} from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Operations',
    role: 'employee',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      let url = '/employees?1=1';
      if (roleFilter) url += `&role=${roleFilter}`;
      const res = await api.get(url);
      setEmployees(res.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingEmp(null);
    setFormData({
      employee_id: `EMP0${employees.length + 1}`,
      name: '',
      email: '',
      phone: '',
      designation: '',
      department: 'Operations',
      role: 'employee',
      password: 'Safe@2024'
    });
    setShowModal(true);
  }

  function handleOpenEdit(emp) {
    setEditingEmp(emp);
    setFormData({
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Operations',
      role: emp.role || 'employee',
      password: ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      if (editingEmp) {
        await api.put(`/employees/${editingEmp.id}`, {
          name: formData.name,
          phone: formData.phone,
          designation: formData.designation,
          department: formData.department,
          role: formData.role
        });
        setMessage({ type: 'success', text: 'Employee updated successfully' });
      } else {
        await api.post('/employees', formData);
        setMessage({ type: 'success', text: 'Employee created successfully' });
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      setMessage({ type: 'error', text: err.error || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(empId) {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      await api.delete(`/employees/${empId}`);
      setMessage({ type: 'success', text: 'Employee deactivated successfully' });
      fetchEmployees();
    } catch (err) {
      setMessage({ type: 'error', text: err.error || 'Failed to deactivate employee' });
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.75rem', fontWeight: 800 }}>
            <Users size={28} className="text-primary" />
            Employee Management
          </h1>
          <p className="text-secondary" style={{ marginTop: 4 }}>
            Manage company workforce, access roles, designations, and account statuses
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={18} /> Add Employee
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {/* Filters bar */}
      <div className="card-elevated" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8 }}>
          <Search size={18} className="text-tertiary" />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} className="text-tertiary" />
          <select
            className="input-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ minWidth: 150 }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="boss">Boss</option>
            <option value="controller">Controller</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <button className="btn btn-ghost" onClick={fetchEmployees} title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Employee Table */}
      {loading ? (
        <div className="page-loader"><div className="loader loader-lg" /></div>
      ) : (
        <div className="card-elevated" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Employee</th>
                  <th style={{ padding: '12px 16px' }}>Contact</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Designation</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-md" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                          {emp.name ? emp.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{emp.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} className="text-tertiary" /> {emp.email}</div>
                      {emp.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--text-tertiary)' }}><Phone size={14} /> {emp.phone}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge badge-${
                        emp.role === 'admin' ? 'purple' :
                        emp.role === 'boss' ? 'red' :
                        emp.role === 'controller' ? 'orange' :
                        emp.role === 'manager' ? 'blue' : 'green'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{emp.department || 'Operations'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>{emp.designation || 'Staff'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge badge-${emp.is_active ? 'green' : 'gray'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn-icon" onClick={() => handleOpenEdit(emp)} title="Edit Employee">
                          <Edit3 size={16} />
                        </button>
                        {emp.is_active && (
                          <button className="btn-icon text-danger" onClick={() => handleDeactivate(emp.id)} title="Deactivate Employee">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card-elevated" style={{ maxWidth: 500, width: '100%', padding: 24 }}>
            <h3>{editingEmp ? 'Edit Employee' : 'Add New Employee'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  disabled={!!editingEmp}
                  required
                />
              </div>

              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingEmp}
                  required
                />
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Role</label>
                  <select
                    className="input-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="controller">Controller</option>
                    <option value="boss">Boss</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>

              {!editingEmp && (
                <div>
                  <label className="form-label">Initial Password</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingEmp ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

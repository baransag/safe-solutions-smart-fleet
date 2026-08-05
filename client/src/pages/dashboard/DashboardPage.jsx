import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import HeroSection from '../../components/vehicle/HeroSection';
import {
  Car, ClipboardCheck, Route, Fuel, AlertTriangle, Wrench,
  TrendingUp, Users, Clock, MapPin, CheckCircle2, XCircle,
  Building2, HardHat, ShieldCheck, UserX, CalendarCheck
} from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, isEmployee, isManager, isController, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      let endpoint = '/dashboard/employee';
      if (isController) endpoint = '/dashboard/controller';
      else if (isManager) endpoint = '/dashboard/manager';

      const result = await api.get(endpoint);
      setData(result);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader"><div className="loader loader-lg" /></div>
      </div>
    );
  }

  const empAtt = data?.employeeAttendance || { total_attendance: 0, office_present: 0, site_present: 0, pending_approval: 0, late_employees: 0 };

  return (
    <div className="page dashboard-page">
      <HeroSection />

      {/* Quick greeting */}
      <div className="dashboard-greeting animate-fade-in-up">
        <h2>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
        <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* EMPLOYEE ATTENDANCE KPI METRICS SUMMARY BANNER */}
      <div className="dashboard-section animate-fade-in-up" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Today's Employee Attendance Overview</h3>
        <div className="stats-grid">
          <div className="card-stat orange" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon orange"><CalendarCheck size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{empAtt.total_attendance || 0}</div>
              <div className="stat-label">Today's Attendance</div>
            </div>
          </div>

          <div className="card-stat teal" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon teal"><Building2 size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{empAtt.office_present || 0}</div>
              <div className="stat-label">Office Present</div>
            </div>
          </div>

          <div className="card-stat green" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon green"><HardHat size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{empAtt.site_present || 0}</div>
              <div className="stat-label">Site Present</div>
            </div>
          </div>

          <div className="card-stat red" onClick={() => navigate('/approvals')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon red"><ShieldCheck size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{empAtt.pending_approval || 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>

          <div className="card-stat purple" onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon purple"><Clock size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{empAtt.late_employees || 0}</div>
              <div className="stat-label">Late Employees</div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Dashboard */}
      {isEmployee && <EmployeeDashboard data={data} navigate={navigate} />}

      {/* Manager Dashboard */}
      {isManager && <ManagerDashboard data={data} navigate={navigate} />}

      {/* Controller Dashboard */}
      {isController && <ControllerDashboard data={data} navigate={navigate} />}
    </div>
  );
}

function EmployeeDashboard({ data, navigate }) {
  const assignment = data?.assignment;
  const todayCheckin = data?.todayCheckin;

  return (
    <>
      {/* My Vehicle */}
      {assignment ? (
        <div className="dashboard-section animate-fade-in-up delay-1">
          <h3 className="section-title">My Vehicle</h3>
          <div className="my-vehicle-card card-elevated">
            <div className="vehicle-card-content">
              <div className="vehicle-card-icon">
                <Car size={28} />
              </div>
              <div className="vehicle-card-info">
                <h4>{assignment.vehicle_name}</h4>
                <p className="vehicle-plate">{assignment.number_plate}</p>
                <p className="vehicle-meter">Current Meter: {parseFloat(assignment.current_meter || 0).toLocaleString()} km</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-section animate-fade-in-up delay-1">
          <div className="card-elevated" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Car size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }} />
            <h4 style={{ color: 'var(--text-secondary)' }}>No Vehicle Assigned</h4>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Contact your manager for vehicle assignment</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section animate-fade-in-up delay-2">
        <h3 className="section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => navigate('/attendance')}>
            <div className="qa-icon blue"><CalendarCheck size={22} /></div>
            <span>Employee Attendance</span>
          </button>
          <button className="quick-action-card" onClick={() => navigate('/check-in')}>
            <div className="qa-icon orange"><ClipboardCheck size={22} /></div>
            <span>Vehicle Check In</span>
          </button>
          <button className="quick-action-card" onClick={() => navigate('/check-out')}>
            <div className="qa-icon teal"><Route size={22} /></div>
            <span>Vehicle Check Out</span>
          </button>
          <button className="quick-action-card" onClick={() => navigate('/fuel')}>
            <div className="qa-icon green"><Fuel size={22} /></div>
            <span>Submit Fuel</span>
          </button>
        </div>
      </div>

      {/* Today's Status */}
      {todayCheckin && (
        <div className="dashboard-section animate-fade-in-up delay-3">
          <h3 className="section-title">Today's Status</h3>
          <div className="card-elevated">
            <div className="today-status-grid">
              <div className="today-status-item">
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                <div>
                  <p className="status-label">Checked In</p>
                  <p className="status-value">{new Date(todayCheckin.checkin_time).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="today-status-item">
                <MapPin size={18} style={{ color: 'var(--color-deep-teal)' }} />
                <div>
                  <p className="status-label">Opening KM</p>
                  <p className="status-value">{parseFloat(todayCheckin.meter_reading).toLocaleString()}</p>
                </div>
              </div>
              {todayCheckin.checkout_time && (
                <>
                  <div className="today-status-item">
                    <XCircle size={18} style={{ color: 'var(--color-primary-orange)' }} />
                    <div>
                      <p className="status-label">Checked Out</p>
                      <p className="status-value">{new Date(todayCheckin.checkout_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="today-status-item">
                    <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
                    <div>
                      <p className="status-label">Distance</p>
                      <p className="status-value">{todayCheckin.distance_km} km</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ManagerDashboard({ data, navigate }) {
  if (!data) return null;

  const stats = [
    { label: 'Total Vehicles', value: data.vehicles?.total_vehicles || 0, icon: Car, color: 'orange' },
    { label: 'Checked In Today', value: data.today?.checked_in || 0, icon: ClipboardCheck, color: 'teal' },
    { label: 'Checked Out Today', value: data.today?.checked_out || 0, icon: Route, color: 'green' },
    { label: 'Pending Fuel', value: data.pendingFuel || 0, icon: Fuel, color: 'red' },
  ];

  return (
    <>
      {/* Stats Grid */}
      <div className="dashboard-section animate-fade-in-up delay-1">
        <div className="stats-grid">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`card-stat delay-${i + 1}`} style={{ animationFillMode: 'both', animation: 'fadeInUp 0.4s ease-out' }}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KM Summary */}
      <div className="dashboard-section animate-fade-in-up delay-2">
        <h3 className="section-title">Distance Summary</h3>
        <div className="grid grid-3">
          <div className="card-elevated" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-primary-orange)' }}>
              {parseFloat(data.weeklyKm?.total_km || 0).toLocaleString()}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>Weekly KM</p>
          </div>
          <div className="card-elevated" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-deep-teal)' }}>
              {parseFloat(data.monthlyKm?.total_km || 0).toLocaleString()}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>Monthly KM</p>
          </div>
          <div className="card-elevated" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-success)' }}>
              {parseFloat(data.weeklyKm?.avg_km || 0).toFixed(1)}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>Avg KM/Day</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="dashboard-section animate-fade-in-up delay-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Recent Alerts</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View All</button>
          </div>
          <div className="card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
            {data.alerts.slice(0, 5).map((alert, i) => (
              <div key={alert.id} className="alert-row">
                <AlertTriangle size={16} style={{
                  color: alert.severity === 'critical' ? 'var(--color-error)' :
                         alert.severity === 'high' ? 'var(--color-warning)' : 'var(--color-info)',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{alert.title}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`badge badge-${alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'yellow' : 'gray'}`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ControllerDashboard({ data, navigate }) {
  if (!data) return null;

  const stats = [
    { label: "Today's KM", value: data.todayKm?.toLocaleString() || '0', icon: TrendingUp, color: 'orange' },
    { label: 'Weekly KM', value: parseFloat(data.weeklyKm || 0).toLocaleString(), icon: Route, color: 'teal' },
    { label: 'Monthly KM', value: parseFloat(data.monthlyKm || 0).toLocaleString(), icon: Car, color: 'green' },
    { label: 'Unresolved Alerts', value: data.unresolvedAlerts || 0, icon: AlertTriangle, color: 'red' },
  ];

  return (
    <>
      <div className="dashboard-section animate-fade-in-up delay-1">
        <div className="stats-grid">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card-stat" style={{ animationFillMode: 'both', animation: `fadeInUp 0.4s ease-out ${i * 0.08}s` }}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fuel Cost & Vehicle Health */}
      <div className="dashboard-section animate-fade-in-up delay-2">
        <div className="grid grid-2">
          <div className="card-elevated">
            <h4 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              <Fuel size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Monthly Fuel
            </h4>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <div>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-primary-orange)' }}>
                  Rs {parseFloat(data.fuelCost?.total_cost || 0).toLocaleString()}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Total Cost</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-deep-teal)' }}>
                  {parseFloat(data.fuelCost?.total_liters || 0).toFixed(1)}L
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Total Liters</p>
              </div>
            </div>
          </div>

          <div className="card-elevated">
            <h4 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              <Wrench size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Fleet Health
            </h4>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {(data.vehicleHealth || []).map((h, i) => (
                <div key={i} className={`badge badge-${h.status === 'active' ? 'green' : h.status === 'maintenance' ? 'yellow' : 'red'}`}>
                  {h.status}: {h.count}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
              {data.pendingVehicles} vehicle(s) pending check-in today
            </p>
          </div>
        </div>
      </div>

      {/* Service Due */}
      {data.serviceDue?.length > 0 && (
        <div className="dashboard-section animate-fade-in-up delay-3">
          <h3 className="section-title">
            <Wrench size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Service Due Soon
          </h3>
          <div className="card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
            {data.serviceDue.map((s, i) => (
              <div key={i} className="alert-row">
                <Wrench size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{s.name} ({s.number_plate})</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {s.service_type} — Due {new Date(s.next_service_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

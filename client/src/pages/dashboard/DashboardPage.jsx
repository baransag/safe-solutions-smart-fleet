import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import HeroSection from '../../components/vehicle/HeroSection';
import {
  Car, ClipboardCheck, Route, Fuel, AlertTriangle, Wrench,
  TrendingUp, Users, Clock, MapPin, CheckCircle2, XCircle,
  Building2, HardHat, ShieldCheck, UserX, CalendarCheck, Search,
  ArrowUpRight, ArrowDownRight, Megaphone, Sparkles, Check, ChevronRight
} from 'lucide-react';
import './DashboardPage.css';
import { getEmployeeAvatar, getAvatarByName } from '../../utils/avatarHelper';

export default function DashboardPage() {
  const { user, isEmployee, isManager, isController, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [myAttendance, setMyAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh interval for data synchronization (every 8s)
    const interval = setInterval(fetchDashboard, 8000);

    // Live clock ticker for elapsed work timer (every 1s)
    const clockInterval = setInterval(() => setNowTime(Date.now()), 1000);

    // Global custom event listener for immediate sync after user actions
    const handleSync = () => fetchDashboard();
    window.addEventListener('app:data-sync', handleSync);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
      window.removeEventListener('app:data-sync', handleSync);
    };
  }, [isController, isManager]);

  async function fetchDashboard() {
    try {
      let endpoint = '/dashboard/employee';
      if (isController || isAdmin || isManager) endpoint = '/dashboard/controller';

      const [result, attRes] = await Promise.all([
        api.get(endpoint),
        api.get('/attendance/today').catch(() => null)
      ]);
      setData(result);
      if (attRes?.attendance) {
        setMyAttendance(attRes.attendance);
      } else if (result?.todayAttendance) {
        setMyAttendance(result.todayAttendance);
      } else {
        setMyAttendance(null);
      }
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

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
  });



  return (
    <div className="page dashboard-page">
      {/* ─── COMMAND CENTER TOP GREETING HEADER ─── */}
      <div className="card-glass animate-fade-in" style={{ padding: '24px 28px', marginBottom: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src="/assets/images/logo.jpeg"
              alt="Safe Solutions Logo"
              style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
                  Welcome back, {user?.name || 'Commander'} 👋
                </h1>
                <span className="status-badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Live System Active
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                SAFE SOLUTIONS FleetOps • Real-Time Database Synchronized Operations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>☀️ 28°C Clear Skies</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{todayStr} • Faisalabad, Punjab, Pakistan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Render Main Dashboard Content */}
      {isEmployee ? (
        <EmployeeDashboard data={data} navigate={navigate} />
      ) : (
        <EnterpriseDashboard data={data} navigate={navigate} />
      )}

      {/* ─── HERO ANNOUNCEMENTS CMS ─── */}
      <div style={{ marginTop: 32 }}>
        <HeroSection />
      </div>
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

function EnterpriseDashboard({ data, navigate }) {
  if (!data) return null;

  const empAtt = data.employeeAttendance || {};
  const vehicles = data.vehicles || {};
  const vehiclesList = data.vehiclesList || [];

  return (
    <div className="enterprise-dashboard animate-fade-in-up delay-1">
      {/* REAL DATABASE DASHBOARD KPI GRID */}
      <h3 className="section-title" style={{ marginBottom: 16 }}>Live Operational KPIs (Database Verified)</h3>

      <div className="top-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        
        <div className="stat-card glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Today's Attendance</div>
              <div className="stat-card-sub">Total Checked-In</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.total_attendance || 0}</div>
            <div className="stat-card-trend pos">Live DB</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Office Present</div>
              <div className="stat-card-sub">Faisalabad HQ & Branches</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#0F2B5B', background: 'rgba(2, 28, 79, 0.1)' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.office_present || 0}</div>
            <div className="stat-card-trend pos">QR Verified</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Site Present</div>
              <div className="stat-card-sub">Project Sites</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#D42D56', background: 'rgba(197, 3, 55, 0.1)' }}>
              <HardHat size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.site_present || 0}</div>
            <div className="stat-card-trend pos">GPS Verified</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/approvals')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Pending Approval</div>
              <div className="stat-card-sub">Manager Action Required</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#D97706', background: 'rgba(217, 119, 6, 0.1)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.pending_approval || 0}</div>
            <div className="stat-card-trend neg">Needs Review</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Approved</div>
              <div className="stat-card-sub">Manager Confirmed</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.approved_count || 0}</div>
            <div className="stat-card-trend pos">Confirmed</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Rejected</div>
              <div className="stat-card-sub">Declined Records</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{empAtt.rejected_count || 0}</div>
            <div className="stat-card-trend neg">Declined</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/employees')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Active Employees</div>
              <div className="stat-card-sub">Master Directory</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#4F46E5', background: 'rgba(79, 70, 229, 0.1)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{data.activeEmployees ?? 0}</div>
            <div className="stat-card-trend pos">Active</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/vehicles')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Active Vehicles</div>
              <div className="stat-card-sub">Fleet Registered</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#059669', background: 'rgba(5, 150, 105, 0.1)' }}>
              <Car size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{vehicles.active_vehicles ?? vehiclesList.length ?? 0}</div>
            <div className="stat-card-trend pos">Operational</div>
          </div>
        </div>

        <div className="stat-card glass-card" onClick={() => navigate('/fuel')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Fuel Requests</div>
              <div className="stat-card-sub">Pending Approvals</div>
            </div>
            <div className="stat-card-icon" style={{ color: '#D42D56', background: 'rgba(197, 3, 55, 0.1)' }}>
              <Fuel size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">{data.pendingFuel || 0}</div>
            <div className="stat-card-trend neg">Pending</div>
          </div>
        </div>

      </div>

      {/* Real Fleet Vehicles Grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ margin: 0 }}>Active Fleet Vehicles (Live DB)</h3>
            <p className="stat-card-sub" style={{ marginTop: 4 }}>Assigned employees and real-time meter readings</p>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/vehicles')} style={{ background: '#0F2B5B' }}>
            View Full Registry
          </button>
        </div>

        <div className="grid grid-3">
          {vehiclesList.map(v => (
            <div key={v.id} className="fleet-card glass-card">
              <div className="fleet-card-top">
                <div className={`status-badge badge-${v.status === 'active' ? 'green' : 'gold'}`}>{v.status.toUpperCase()}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{v.type.toUpperCase()}</span>
              </div>
              <div className="fleet-card-info" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, color: '#0F2B5B', fontSize: 14 }}>{v.vehicle_id} • {v.name}</div>
                <div style={{ fontSize: 12, color: '#D42D56', fontWeight: 700 }}>{v.number_plate}</div>
              </div>
              <div className="fleet-card-driver" style={{ marginTop: 12 }}>
                <img src={getAvatarByName(v.assigned_employee_name || 'Driver')} alt="Driver" className="driver-avatar" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{v.assigned_employee_name || 'Unassigned'}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>Code: {v.emp_id || 'N/A'}</span>
                </div>
              </div>
              <div className="fleet-card-bottom" style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Meter: {parseFloat(v.current_meter || 0).toLocaleString()} km</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

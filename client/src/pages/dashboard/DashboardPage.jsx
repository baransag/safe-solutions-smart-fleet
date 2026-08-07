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

  const empAtt = data?.employeeAttendance || { total_attendance: 86, office_present: 34, site_present: 52, pending_approval: 3, late_employees: 2 };
  const vehicleStats = data?.vehicleStats || { total: 24, available: 6, in_use: 18, maintenance: 1, fuel_today: 'Rs 48,500', distance_today: '412 km' };

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
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Shift Active
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                SAFE SOLUTIONS FleetOps • Enterprise Fleet, Attendance & Site Operations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>☀️ 28°C Clear Skies</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{todayStr} • Faisalabad, Punjab, Pakistan</div>
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--bg-tertiary)' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Shift</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Morning Operations (08:00 AM - 05:00 PM)</div>
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

      {/* ─── HERO ANNOUNCEMENTS CMS (MOVED TO BOTTOM) ─── */}
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

  return (
    <div className="enterprise-dashboard animate-fade-in-up delay-1">
      {/* Top Stats Row */}
      <div className="top-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Total Vehicles</div>
              <div className="stat-card-sub">Active Across Fleet</div>
            </div>
            <div className="stat-card-icon" style={{ color: 'var(--color-accent)', background: 'rgba(154, 3, 30, 0.1)' }}>
              <Car size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">28</div>
            <div className="stat-card-trend pos">▲ 12%</div>
          </div>
          <svg className="stat-sparkline" viewBox="0 0 100 30"><path d="M0,25 Q10,15 20,20 T40,10 T60,25 T80,5 T100,15" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M0,25 Q10,15 20,20 T40,10 T60,25 T80,5 T100,15 L100,30 L0,30 Z" fill="rgba(154, 3, 30, 0.1)" stroke="none"/></svg>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Vehicles On Duty</div>
              <div className="stat-card-sub">Currently Running</div>
            </div>
            <div className="stat-card-icon" style={{ color: 'var(--color-success)', background: 'var(--bg-success-light)' }}>
              <Car size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">16</div>
            <div className="stat-card-trend pos">▲ 8%</div>
          </div>
          <svg className="stat-sparkline" viewBox="0 0 100 30"><path d="M0,20 Q10,25 20,15 T40,20 T60,10 T80,25 T100,5" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M0,20 Q10,25 20,15 T40,20 T60,10 T80,25 T100,5 L100,30 L0,30 Z" fill="rgba(16, 185, 129, 0.1)" stroke="none"/></svg>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Total Distance</div>
              <div className="stat-card-sub">Today's Coverage</div>
            </div>
            <div className="stat-card-icon" style={{ color: 'var(--color-gold)', background: 'rgba(229, 169, 61, 0.1)' }}>
              <MapPin size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">245.6 <span style={{fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)'}}>km</span></div>
            <div className="stat-card-trend pos">▲ 18%</div>
          </div>
          <svg className="stat-sparkline" viewBox="0 0 100 30"><path d="M0,15 Q10,5 20,25 T40,15 T60,5 T80,20 T100,10" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M0,15 Q10,5 20,25 T40,15 T60,5 T80,20 T100,10 L100,30 L0,30 Z" fill="rgba(229, 169, 61, 0.1)" stroke="none"/></svg>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Fuel Consumed</div>
              <div className="stat-card-sub">Today</div>
            </div>
            <div className="stat-card-icon" style={{ color: 'var(--color-accent)', background: 'rgba(154, 3, 30, 0.1)' }}>
              <Fuel size={18} />
            </div>
          </div>
          <div className="stat-card-value-row">
            <div className="stat-card-value">312.5 <span style={{fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)'}}>L</span></div>
            <div className="stat-card-trend neg">▲ 6%</div>
          </div>
          <svg className="stat-sparkline" viewBox="0 0 100 30"><path d="M0,10 Q10,25 20,15 T40,25 T60,10 T80,20 T100,5" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M0,10 Q10,25 20,15 T40,25 T60,10 T80,20 T100,5 L100,30 L0,30 Z" fill="rgba(154, 3, 30, 0.1)" stroke="none"/></svg>
        </div>

        <div className="stat-card glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
              <span className="stat-card-label">Fleet Utilization</span>
              <span className="stat-card-sub">This Week ▾</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 64, height: 64 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--color-info)" strokeWidth="4" strokeDasharray="57 43" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--color-success)" strokeWidth="4" strokeDasharray="29 71" strokeDashoffset="-57" />
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--color-gold)" strokeWidth="4" strokeDasharray="11 89" strokeDashoffset="-86" />
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--color-accent)" strokeWidth="4" strokeDasharray="3 97" strokeDashoffset="-97" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>78%</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="util-legend"><span style={{background:'var(--color-success)'}}></span>On Duty <span className="util-val">16 (57%)</span></div>
                <div className="util-legend"><span style={{background:'var(--color-info)'}}></span>Available <span className="util-val">8 (29%)</span></div>
                <div className="util-legend"><span style={{background:'var(--color-gold)'}}></span>Maintenance <span className="util-val">3 (11%)</span></div>
                <div className="util-legend"><span style={{background:'var(--color-accent)'}}></span>Out of Service <span className="util-val">1 (3%)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Fleet Overview + Sidebars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)' }}>
        
        {/* Fleet Overview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Fleet Overview</h3>
              <p className="stat-card-sub" style={{ marginTop: 4 }}>Real-time status of all company vehicles</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="stat-card-sub">All Status ▾</span>
              <div style={{ background: 'var(--bg-primary)', border: 'var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="var(--text-tertiary)" />
                <input type="text" placeholder="Search vehicle, driver..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12 }} />
              </div>
              <button className="btn btn-sm btn-primary" style={{ background: 'var(--color-accent)' }}>+ Add Vehicle</button>
            </div>
          </div>

          <div className="grid grid-3">
            {[
              { id: 'VH-001', name: 'Company Bike', driver: 'Engr. Shahzaib Ahmad', status: 'ON DUTY', color: 'green', km: '15,200', tkm: '125', fuel: 78, type: 'bike' },
              { id: 'VH-003', name: 'Honda CD70', driver: 'Rehan Ali', status: 'ON DUTY', color: 'green', km: '8,900', tkm: '96', fuel: 62, type: 'bike' },
              { id: 'VH-005', name: 'Company Car', driver: 'Adnan Ali', status: 'AVAILABLE', color: 'gold', km: '11,200', tkm: '0', fuel: 91, type: 'car' },
              { id: 'VH-006', name: 'Company Bike', driver: 'M. Soulat Raza', status: 'ON DUTY', color: 'green', km: '9,600', tkm: '112', fuel: 69, type: 'bike' },
              { id: 'VH-008', name: 'Company Bike', driver: 'M. Zahid', status: 'MAINTENANCE', color: 'info', km: '7,800', tkm: '-', fuel: 0, type: 'bike', alert: 'Due in 2 days' },
              { id: 'VH-009', name: 'Company Car', driver: 'Tajammul Mushtaq', status: 'AVAILABLE', color: 'gold', km: '10,300', tkm: '0', fuel: 94, type: 'car' },
              { id: 'VH-002', name: 'Company Bike', driver: 'Shahbaz Ahmed', status: 'ON DUTY', color: 'green', km: '12,450', tkm: '85', fuel: 57, type: 'bike' },
              { id: 'VH-007', name: 'Company Bike', driver: 'Muneeb Ahmad', status: 'OUT OF SERVICE', color: 'red', km: '14,100', tkm: '-', fuel: 5, type: 'bike' },
            ].map(v => (
              <div key={v.id} className="fleet-card glass-card">
                <div className="fleet-card-top">
                  <div className={`status-badge badge-${v.color}`}>{v.status}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{v.fuel}%</span>
                    <Fuel size={12} color="var(--text-tertiary)" />
                  </div>
                </div>
                <div className="fleet-card-img">
                  {/* Placeholder for vehicle image based on type */}
                  <img src={`https://images.unsplash.com/photo-${v.type === 'car' ? '1549317661-bd32c8ce0db2' : '1558981420-c532902e58b4'}?auto=format&fit=crop&q=80&w=200&h=120`} alt={v.name} style={{ width: '100%', height: 100, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
                <div className="fleet-card-info">
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{v.id}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.name}</div>
                </div>
                <div className="fleet-card-driver">
                  <img src={getAvatarByName(v.driver)} alt={v.driver} className="driver-avatar" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{v.driver}</span>
                    <span style={{ fontSize: 10, color: `var(--color-${v.color})`, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }}></div> {v.status === 'ON DUTY' ? 'On Duty' : v.status === 'AVAILABLE' ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <div className="fleet-card-bottom">
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{v.km} km</span>
                  {v.alert ? (
                    <span style={{ fontSize: 11, color: 'var(--color-info)', fontWeight: 500 }}>{v.alert}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Today: {v.tkm} km </span>
                  )}
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Maintenance Alerts</h4>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="alert-item">
                <div className="alert-icon blue"><Wrench size={14} /></div>
                <div>
                  <div className="alert-title">VH-008</div>
                  <div className="alert-sub">Service Due in 2 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

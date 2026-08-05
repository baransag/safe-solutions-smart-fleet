import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Car, Users, ClipboardCheck, Fuel, QrCode,
  BarChart3, AlertTriangle, Bell, Settings, LogOut, Wrench,
  Route, CalendarCheck, FileText, Shield, ShieldCheck
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isController } = useAuth();
  const location = useLocation();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItems = [
    { section: 'Overview' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },

    { section: 'Fleet Management', adminOnly: false },
    { to: '/vehicles', icon: Car, label: 'Vehicles', adminOnly: true },
    { to: '/assignments', icon: Users, label: 'Assignments', adminOnly: true },
    { to: '/qr-codes', icon: QrCode, label: 'QR Codes', adminOnly: true },

    { section: 'Daily Operations' },
    { to: '/check-in', icon: ClipboardCheck, label: 'Vehicle Check-in' },
    { to: '/check-out', icon: Route, label: 'Vehicle Check-out' },
    { to: '/fuel', icon: Fuel, label: 'Fuel Management' },

    { section: 'Attendance & Approvals' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/employee-qr-codes', icon: QrCode, label: 'QR Code Management', adminOnly: true },
    { to: '/approvals', icon: ShieldCheck, label: 'Approval Center', badge: 'PENDING' },

    { section: 'Reports & Analytics', adminOnly: true },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', adminOnly: true },
    { to: '/alerts', icon: AlertTriangle, label: 'Alerts', adminOnly: true },
    { to: '/services', icon: Wrench, label: 'Vehicle Services', adminOnly: true },
    { to: '/reports', icon: FileText, label: 'Reports', adminOnly: true },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img
              src="/assets/images/logo.jpeg"
              alt="Safe Solutions"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }}
            />
            <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">SAFE SOLUTIONS</span>
            <span className="sidebar-brand-sub">Smart Fleet Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              if (item.adminOnly && !isAdmin) return null;
              return (
                <div key={`section-${i}`} className="sidebar-section-label">
                  {item.section}
                </div>
              );
            }

            if (item.adminOnly && !isAdmin) return null;
            if (item.controllerOnly && !isController) return null;

            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => onClose?.()}
              >
                <Icon className="link-icon" size={18} />
                <span>{item.label}</span>
                {item.badge && <span className="link-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-sm">
              {user?.avatar_url
                ? <img
                    src={user.avatar_url.startsWith('http') || user.avatar_url.startsWith('/assets') ? user.avatar_url : `http://localhost:5000${user.avatar_url}`}
                    alt={user.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      if (!e.currentTarget.src.includes(':5000')) {
                        e.currentTarget.src = `http://localhost:5000${user.avatar_url}`;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                : getInitials(user?.name)
              }
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="btn-icon"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'none' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

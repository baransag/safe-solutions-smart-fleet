import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Car, Users, ClipboardCheck, Fuel, QrCode,
  BarChart3, AlertTriangle, Bell, Settings, LogOut, Wrench,
  Route, CalendarCheck, FileText, Shield, ShieldCheck, Megaphone
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isController, isSuperAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { section: 'Overview' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hero-management', icon: Megaphone, label: 'Hero Banners', superAdminOnly: true },

    { section: 'Fleet Management', adminOnly: false },
    { to: '/employees', icon: Users, label: 'Employee Registry', adminOnly: true },
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

    { section: 'Reports & Settings', adminOnly: true },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', adminOnly: true },
    { to: '/alerts', icon: AlertTriangle, label: 'Alerts', adminOnly: true },
    { to: '/services', icon: Wrench, label: 'Vehicle Services', adminOnly: true },
    { to: '/reports', icon: FileText, label: 'Reports', adminOnly: true },
    { to: '/system-logs', icon: Shield, label: 'System Audit Logs', superAdminOnly: true },
    { to: '/settings', icon: Settings, label: 'System Settings', superAdminOnly: true },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">S</div>
            <div>
              <div style={{ lineHeight: 1.1, fontWeight: 900, letterSpacing: '0.04em', fontSize: 13 }}>SAFE SOLUTIONS COMMAND CENTER</div>
              <div style={{ fontSize: 8, color: 'var(--color-gold)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Enterprise Workforce & Fleet Intelligence</div>
            </div>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={`section-${i}`} className="sidebar-section-label">
                  {item.section}
                </div>
              );
            }

            if (item.adminOnly && !isAdmin) return null;
            if (item.superAdminOnly && !isSuperAdmin) return null;
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
          <div className="sidebar-user" onClick={logout}>
            <div className="sidebar-user-avatar">
              <img src="https://i.pravatar.cc/150?img=11" alt="User" />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className="sidebar-user-role" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></div>
                Online
              </span>
            </div>
            <LogOut size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto' }} />
          </div>
        </div>
      </aside>
    </>
  );
}

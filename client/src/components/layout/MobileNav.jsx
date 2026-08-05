import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, ClipboardCheck, Fuel, Car, CalendarCheck } from 'lucide-react';

export default function MobileNav() {
  const { isAdmin } = useAuth();

  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/check-in', icon: ClipboardCheck, label: 'Check-in' },
    { to: '/fuel', icon: Fuel, label: 'Fuel' },
    ...(isAdmin ? [{ to: '/vehicles', icon: Car, label: 'Vehicles' }] : []),
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  ];

  return (
    <div className="mobile-nav">
      <div className="mobile-nav-inner">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

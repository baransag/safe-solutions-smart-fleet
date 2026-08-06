import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Menu, Search } from 'lucide-react';
import api from '../../services/api';

const pageNames = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/assignments': 'Vehicle Assignments',
  '/qr-codes': 'QR Code Management',
  '/check-in': 'Vehicle Check-in',
  '/check-out': 'Vehicle Check-out',
  '/fuel': 'Fuel Management',
  '/attendance': 'Attendance',
  '/analytics': 'Fleet Analytics',
  '/alerts': 'Vehicle Alerts',
  '/services': 'Vehicle Services',
  '/reports': 'Fleet Reports',
  '/employees': 'Employee Directory',
  '/settings': 'Settings',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const pageName = pageNames[location.pathname] || 'Dashboard';

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silently fail
    }
  }

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-icon-btn mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="header-title">{pageName}</h1>
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-btn">
          <Search size={20} />
        </button>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown" style={{ width: '360px', maxHeight: '480px', overflowY: 'auto', right: 0 }}>
              <div style={{
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)'
              }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center',
                  color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)'
                }}>
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    className="dropdown-item"
                    onClick={() => markAsRead(n.id)}
                    style={{
                      flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                      background: n.is_read ? 'transparent' : 'rgba(0,0,0,0.03)',
                      padding: '10px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{
                        fontWeight: n.is_read ? 400 : 600, fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)'
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {n.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <a href="/settings" style={{ textDecoration: 'none' }}>
          <div className="header-user-pill">
            <div className="header-avatar" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <span className="header-user-name">{user?.name ? user.name.split(' ')[0] : 'User'}</span>
            <span style={{ marginLeft: 4, color: 'var(--text-tertiary)', fontSize: 10 }}>▼</span>
          </div>
        </a>
      </div>
    </header>
  );
}

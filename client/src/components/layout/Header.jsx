import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Menu, Search, CheckCircle2, AlertTriangle, Info, AlertCircle, Sparkles, Check, ChevronRight } from 'lucide-react';
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
  '/employee-qr-codes': 'QR Code Management',
  '/approvals': 'Approval Center',
  '/analytics': 'Fleet Analytics',
  '/alerts': 'Vehicle Alerts',
  '/services': 'Vehicle Services',
  '/reports': 'Fleet Reports',
  '/employees': 'Employee Directory',
  '/hero-management': 'Hero Banners',
  '/system-logs': 'System Audit Logs',
  '/settings': 'Settings',
  '/profile': 'Profile'
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  const pageName = pageNames[location.pathname] || 'SAFE SOLUTIONS FleetOps';

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);

    const handleSync = () => fetchNotifications();
    window.addEventListener('app:data-sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app:data-sync', handleSync);
    };
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

  async function markAsRead(n) {
    try {
      if (!n.is_read) {
        await api.put(`/notifications/${n.id}/read`);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setShowNotifications(false);
      if (n.link) {
        navigate(n.link);
      }
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} color="#059669" />;
      case 'warning':
        return <AlertTriangle size={16} color="#D97706" />;
      case 'error':
      case 'alert':
        return <AlertCircle size={16} color="#DC2626" />;
      default:
        return <Info size={16} color="#0F2B5B" />;
    }
  };

  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <header className="header">
      <div className="header-left" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button className="header-icon-btn mobile-menu-btn" onClick={onMenuClick} aria-label="Open Navigation Menu">
          <Menu size={22} />
        </button>

        {/* Mobile Branding Logo + Title */}
        <div className="show-on-mobile" style={{ alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="/assets/images/logo.jpeg"
              alt="Logo"
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: '#FFFFFF', padding: 1 }}
            />
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              FleetOps
            </span>
          </div>
        </div>

        {/* Desktop Search Bar */}
        <div className="hide-on-mobile" style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search vehicles, employees, site logs... (⌘K)"
            style={{
              width: '100%',
              padding: '10px 18px 10px 42px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              fontSize: '13px',
              color: '#1E293B',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          />
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Notification Bell Dropdown Container */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              position: 'relative',
              background: showNotifications ? '#F0F1F5' : 'transparent',
              borderRadius: '12px',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid ' + (showNotifications ? '#CBD5E1' : 'transparent')
            }}
          >
            <Bell size={20} color={unreadCount > 0 ? '#0F2B5B' : '#64748B'} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  background: '#D42D56',
                  boxShadow: '0 2px 8px rgba(212, 45, 86, 0.4)',
                  border: '2px solid #FFFFFF'
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Panel */}
          {showNotifications && (
            <div
              className="animate-scale-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: 'min(380px, calc(100vw - 24px))',
                maxHeight: 'min(520px, calc(100vh - 90px))',
                background: '#FFFFFF',
                borderRadius: 20,
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15), 0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #E2E8F0',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 20px 12px',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#0F2B5B' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 11, background: 'rgba(212, 45, 86, 0.12)', color: '#D42D56', fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0F2B5B',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Check size={13} /> Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', padding: '8px 16px', gap: 8, background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: filter === 'all' ? 700 : 500,
                    background: filter === 'all' ? '#0F2B5B' : '#F1F5F9',
                    color: filter === 'all' ? '#FFFFFF' : '#64748B',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: filter === 'unread' ? 700 : 500,
                    background: filter === 'unread' ? '#D42D56' : '#F1F5F9',
                    color: filter === 'unread' ? '#FFFFFF' : '#64748B',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                {displayedNotifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748B' }}>
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>You are all caught up!</p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n)}
                      style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #F1F5F9',
                        background: n.is_read ? '#FFFFFF' : '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        transition: 'background 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? '#FFFFFF' : '#F8FAFC'}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: n.is_read ? '#F1F5F9' : '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      >
                        {getNotifIcon(n.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: n.is_read ? 600 : 800, fontSize: 13, color: '#1E293B' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, fontWeight: 500 }}>
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        {n.link && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#0F2B5B', fontWeight: 700, marginTop: 4 }}>
                            View details <ChevronRight size={12} />
                          </span>
                        )}
                      </div>

                      {!n.is_read && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#D42D56',
                            flexShrink: 0,
                            marginTop: 6
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Display Pill */}
        <div
          className="hide-on-mobile"
          style={{
            background: 'var(--bg-primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid #E2E8F0',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: '#0F2B5B'
          }}
        >
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}

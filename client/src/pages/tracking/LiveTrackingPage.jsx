import { useState, useEffect, useRef } from 'react';
import {
  Navigation, RefreshCw, Car, Battery, Clock, MapPin,
  Search, Shield, AlertCircle, Play, CheckCircle2, ChevronRight,
  ExternalLink, Eye, ArrowUpRight, Calendar, Filter, Users, User,
  FileText, Activity, AlertTriangle, Layers
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EmployeeTrackingDetailModal from '../../components/tracking/EmployeeTrackingDetailModal';
import {
  formatPKTDate,
  formatPKTTime,
  getPKTTodayString
} from '../../utils/pakistanTime';

export default function LiveTrackingPage() {
  const { user } = useAuth();
  const [trackingList, setTrackingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const todayStr = getPKTTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'present' | 'late' | 'missing_checkout' | 'not_marked'
  const [trackingFilter, setTrackingFilter] = useState('all'); // 'all' | 'Active' | 'Stopped' | 'Offline' | 'Not Started'

  // Map & Route selection state
  const [selectedMapEmployee, setSelectedMapEmployee] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Detail Modal State
  const [detailModalEmployee, setDetailModalEmployee] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  // Load Leaflet dynamically via CDN without adding npm packages
  useEffect(() => {
    if (typeof window !== 'undefined' && window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    script.onerror = () => console.warn('Leaflet CDN load failed. Fallback active.');
    document.body.appendChild(script);
  }, []);

  // Fetch live tracking data for selected date
  async function fetchLiveTracking() {
    try {
      const res = await api.get(`/field-tracking/live?date=${selectedDate}`);
      if (res.success) {
        setTrackingList(res.tracking || []);
      }
    } catch (err) {
      console.warn('Live tracking fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLiveTracking();
    let timer = null;
    if (autoRefresh && selectedDate === todayStr) {
      timer = setInterval(fetchLiveTracking, 15000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh, selectedDate]);

  // Initialize or update Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      // Default center: Lahore / Faisalabad region, Pakistan
      const map = window.L.map(mapContainerRef.current).setView([31.5204, 74.3587], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const bounds = [];

    trackingList.forEach(item => {
      if (item.latitude && item.longitude) {
        const lat = parseFloat(item.latitude);
        const lng = parseFloat(item.longitude);
        bounds.push([lat, lng]);

        const isRecent = item.minutes_since_last_ping !== null && item.minutes_since_last_ping <= 15;
        const markerColor = item.tracking_status === 'Active'
          ? '#10B981'
          : item.tracking_status === 'Offline'
          ? '#F59E0B'
          : '#6B7280';

        const customIcon = window.L.divIcon({
          className: 'custom-fleet-pin',
          html: `<div style="
            background: ${markerColor};
            color: #fff;
            padding: 4px 8px;
            border-radius: 14px;
            font-size: 11px;
            font-weight: 800;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 2px solid #fff;
            cursor: pointer;
          ">
            <span>🚗 ${item.employee_name?.split(' ')[0]}</span>
          </div>`,
          iconSize: [85, 26],
          iconAnchor: [42, 13]
        });

        const marker = window.L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <strong style="font-size: 14px; color: #0F2B5B;">${item.employee_name}</strong><br/>
            <span>Code: <strong>${item.employee_code || item.employee_id}</strong></span><br/>
            <span>Vehicle: <strong>${item.vehicle_name || 'Assigned'} (${item.number_plate || 'N/A'})</strong></span><br/>
            <span>Tracking: <strong>${item.tracking_status}</strong></span><br/>
            <span>Speed: <strong>${(item.speed_mps ? item.speed_mps * 3.6 : 0).toFixed(1)} km/h</strong></span><br/>
            <span>Last Seen: ${item.last_location_at ? formatPKTTime(item.last_location_at) : 'N/A'}</span>
          </div>
        `);

        marker.on('click', () => {
          loadEmployeeRoute(item);
        });

        markersRef.current[item.employee_id] = marker;
      }
    });

    if (bounds.length > 0 && !selectedRoute) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [leafletLoaded, trackingList]);

  // Load employee route on map
  async function loadEmployeeRoute(employee) {
    setSelectedMapEmployee(employee);
    setLoadingRoute(true);
    try {
      const res = await api.get(`/field-tracking/route/${employee.employee_id}?date=${selectedDate}`);
      if (res.success) {
        setSelectedRoute(res.points || []);

        if (mapInstanceRef.current && window.L && res.points && res.points.length > 0) {
          if (polylineRef.current) {
            polylineRef.current.remove();
          }

          const latLngs = res.points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);
          const polyline = window.L.polyline(latLngs, {
            color: '#0F2B5B',
            weight: 4,
            opacity: 0.85,
            dashArray: '6, 6'
          }).addTo(mapInstanceRef.current);

          polylineRef.current = polyline;
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
      }
    } catch (err) {
      console.warn('Failed to load employee route:', err.message);
    } finally {
      setLoadingRoute(false);
    }
  }

  // Focus map on a specific employee's location
  function locateOnMap(employee) {
    if (!employee.latitude || !employee.longitude) return;
    if (mapInstanceRef.current && window.L) {
      const lat = parseFloat(employee.latitude);
      const lng = parseFloat(employee.longitude);
      mapInstanceRef.current.setView([lat, lng], 15);
      const m = markersRef.current[employee.employee_id];
      if (m) m.openPopup();
    }
    // Also load route
    loadEmployeeRoute(employee);
  }

  // Clear selected route view
  function clearSelectedRoute() {
    setSelectedMapEmployee(null);
    setSelectedRoute(null);
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (mapInstanceRef.current && trackingList.length > 0) {
      const bounds = trackingList
        .filter(t => t.latitude && t.longitude)
        .map(t => [parseFloat(t.latitude), parseFloat(t.longitude)]);
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  // Open Detail View for an Employee
  function openEmployeeDetails(emp, e) {
    if (e) e.stopPropagation();
    setDetailModalEmployee(emp);
    setIsDetailModalOpen(true);
  }

  // Filter List Logic
  const filteredList = trackingList.filter(item => {
    // Search
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      const matchName = item.employee_name?.toLowerCase().includes(q);
      const matchCode = String(item.employee_code || item.employee_id).toLowerCase().includes(q);
      const matchPlate = item.number_plate?.toLowerCase().includes(q);
      const matchDept = item.department?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPlate && !matchDept) return false;
    }

    // Tracking status filter
    if (trackingFilter !== 'all') {
      if (item.tracking_status !== trackingFilter) return false;
    }

    // Attendance status filter
    if (attendanceFilter !== 'all') {
      if (attendanceFilter === 'present' && item.attendance_status !== 'present') return false;
      if (attendanceFilter === 'late' && item.attendance_status !== 'late') return false;
      if (attendanceFilter === 'missing_checkout' && (!item.attendance_checkin_time || item.attendance_checkout_time)) return false;
      if (attendanceFilter === 'not_marked' && item.attendance_checkin_time) return false;
    }

    return true;
  });

  // KPI Metrics Calculation
  const totalEmployeesCount = trackingList.length;
  const activeCount = trackingList.filter(t => t.tracking_status === 'Active').length;
  const stoppedCount = trackingList.filter(t => t.tracking_status === 'Stopped').length;
  const offlineCount = trackingList.filter(t => t.tracking_status === 'Offline').length;
  const notStartedCount = trackingList.filter(t => t.tracking_status === 'Not Started').length;
  const checkedInAttendanceCount = trackingList.filter(t => t.attendance_checkin_time).length;

  return (
    <div className="page animate-fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 24, fontWeight: 900, color: '#0F2B5B' }}>
              <Navigation size={28} style={{ color: '#0F2B5B' }} />
              Live GPS Tracking & Field Employee Dashboard
            </h1>
            <span style={{ background: '#DEF7EC', color: '#03543F', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, border: '1px solid #31C48D' }}>
              ● LIVE OPS
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            Real-time field monitoring, individual employee telemetry, daily route breadcrumbs, and verified activity reports.
          </p>
        </div>

        {/* Top Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Calendar size={14} color="#64748b" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', fontSize: 12, fontWeight: 600, color: '#0F2B5B', outline: 'none' }}
            />
          </div>

          <button
            type="button"
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Clock size={14} />
            {autoRefresh ? 'Auto-Refresh (15s)' : 'Auto-Refresh Paused'}
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={fetchLiveTracking}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 14, borderLeft: '4px solid #0F2B5B' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Workforce</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F2B5B', marginTop: 2 }}>
            {totalEmployeesCount} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>staff</span>
          </div>
          <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{checkedInAttendanceCount} checked in today</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #10B981', background: '#F0FDF4' }}>
          <div style={{ fontSize: 11, color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>🟢 Active Tracking</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#047857', marginTop: 2 }}>
            {activeCount} <span style={{ fontSize: 12, fontWeight: 500, color: '#047857' }}>on duty</span>
          </div>
          <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>Transmitting live pings</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #F59E0B', background: '#FFFBEB' }}>
          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 700, textTransform: 'uppercase' }}>🟠 Offline Signal</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#B45309', marginTop: 2 }}>
            {offlineCount} <span style={{ fontSize: 12, fontWeight: 500, color: '#B45309' }}>idle</span>
          </div>
          <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>No ping &gt; 15 mins</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #6B7280' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>⚪ Stopped / Returned</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#374151', marginTop: 2 }}>
            {stoppedCount} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>completed</span>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Checked out from trip</div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: '4px solid #94A3B8' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>⚪ Not Started</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#64748B', marginTop: 2 }}>
            {notStartedCount} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>employees</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>No field duty today</div>
        </div>
      </div>

      {/* Shared Interactive Map Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 20px rgba(15, 43, 91, 0.08)' }}>
        <div style={{ padding: '12px 18px', background: '#0F2B5B', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#93C5FD" />
            <strong style={{ fontSize: 14 }}>Fleet Live Map & Route Trajectory</strong>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              ({trackingList.filter(t => t.latitude && t.longitude).length} active GPS pins visible)
            </span>
          </div>

          {selectedMapEmployee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                Tracing: {selectedMapEmployee.employee_name} ({selectedRoute ? `${selectedRoute.length} points` : 'Loading...'})
              </span>
              <button
                type="button"
                onClick={clearSelectedRoute}
                style={{ background: '#fff', color: '#0F2B5B', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
              >
                Reset Route
              </button>
            </div>
          )}
        </div>

        <div style={{ height: 380, width: '100%', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />

          {!leafletLoaded && (
            <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <MapPin size={36} color="#0F2B5B" />
              <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>Interactive map loading or restricted. Live coordinates shown in employee cards below.</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar for Employee Cards */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by employee name, ID, vehicle or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Tracking Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#64748b' }}>GPS Status:</span>
            <select
              className="form-input"
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
            >
              <option value="all">All Statuses ({totalEmployeesCount})</option>
              <option value="Active">🟢 Active ({activeCount})</option>
              <option value="Stopped">⚪ Stopped ({stoppedCount})</option>
              <option value="Offline">🟠 Offline ({offlineCount})</option>
              <option value="Not Started">⚪ Not Started ({notStartedCount})</option>
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#64748b' }}>Attendance:</span>
            <select
              className="form-input"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
            >
              <option value="all">All Attendance</option>
              <option value="present">Present (On-Duty)</option>
              <option value="late">Late Arrival</option>
              <option value="missing_checkout">⚠️ Missing Checkout</option>
              <option value="not_marked">Not Marked Today</option>
            </select>
          </div>

          {(searchTerm || trackingFilter !== 'all' || attendanceFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setSearchTerm('');
                setTrackingFilter('all');
                setAttendanceFilter('all');
              }}
              style={{ color: '#DC2626', fontSize: 11, fontWeight: 700 }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Individual Employee Cards Section */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F2B5B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} color="#0F2B5B" />
          Individual Employee Field Telemetry ({filteredList.length} shown)
        </h2>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Click any card to inspect that employee's isolated reports & daily route
        </span>
      </div>

      {filteredList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <Search size={36} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
          <h3 style={{ margin: 0, fontSize: 16, color: '#475569' }}>No employees matched your criteria</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>Try resetting your search terms or filters above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredList.map((emp) => {
            const hasGps = emp.latitude && emp.longitude;
            const isSelectedMap = selectedMapEmployee?.employee_id === emp.employee_id;

            const badgeConfig = {
              Active: { bg: '#DEF7EC', text: '#03543F', border: '#31C48D', dot: '#10B981', label: 'Active Tracking' },
              Stopped: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB', dot: '#9CA3AF', label: 'Trip Stopped' },
              Offline: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', dot: '#F59E0B', label: 'Signal Offline' },
              'Not Started': { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', dot: '#94A3B8', label: 'Not Started' }
            }[emp.tracking_status] || { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', dot: '#94A3B8', label: 'Not Started' };

            return (
              <div
                key={emp.employee_id}
                className="card animate-fade-in"
                onClick={(e) => openEmployeeDetails(emp, e)}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: isSelectedMap ? '2px solid #0F2B5B' : '1px solid #e2e8f0',
                  boxShadow: isSelectedMap ? '0 10px 25px rgba(15, 43, 91, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  background: isSelectedMap ? '#FAF6EE' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Card Header: Name, ID and Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0F2B5B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.employee_name}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                          {emp.employee_code || `EMP#${emp.employee_id}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {emp.department || 'Operations'} &bull; {emp.designation || 'Field Staff'}
                      </div>
                    </div>

                    <span
                      style={{
                        background: badgeConfig.bg,
                        color: badgeConfig.text,
                        border: `1px solid ${badgeConfig.border}`,
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: badgeConfig.dot,
                          animation: emp.tracking_status === 'Active' ? 'pulse 2s infinite' : 'none'
                        }}
                      />
                      {emp.tracking_status}
                    </span>
                  </div>

                  {/* GPS & Location Section */}
                  <div
                    style={{
                      background: hasGps ? '#F8FAFC' : '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '8px 10px',
                      marginBottom: 10,
                      fontSize: 11
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Navigation size={12} color="#0F2B5B" /> GPS Telemetry
                      </span>
                      {hasGps && emp.battery_level !== null && (
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          🔋 {Math.round(emp.battery_level * 100)}%
                        </span>
                      )}
                    </div>

                    {hasGps ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F2B5B', fontSize: 11 }}>
                          {parseFloat(emp.latitude).toFixed(4)}, {parseFloat(emp.longitude).toFixed(4)}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 10, marginTop: 2 }}>
                          <span>Speed: {(emp.speed_mps ? emp.speed_mps * 3.6 : 0).toFixed(0)} km/h</span>
                          <span>
                            Updated {emp.last_location_at ? formatPKTTime(emp.last_location_at) : 'N/A'}
                            {emp.minutes_since_last_ping !== null && ` (${Math.round(emp.minutes_since_last_ping)}m ago)`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        No GPS signal recorded today
                      </div>
                    )}
                  </div>

                  {/* Attendance Info Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11 }}>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Attendance In</div>
                      <div style={{ color: emp.attendance_checkin_time ? '#059669' : '#94A3B8', fontWeight: 700, marginTop: 2 }}>
                        {emp.attendance_checkin_time ? formatPKTTime(emp.attendance_checkin_time) : 'Not Marked'}
                      </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Attendance Out</div>
                      <div style={{ color: emp.attendance_checkout_time ? '#DC2626' : (emp.attendance_checkin_time ? '#D97706' : '#94A3B8'), fontWeight: 700, marginTop: 2 }}>
                        {emp.attendance_checkout_time ? formatPKTTime(emp.attendance_checkout_time) : (emp.attendance_checkin_time ? 'Open' : '-')}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Info Block (if linked) */}
                  <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 12, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Car size={12} color="#0F2B5B" /> Assigned Vehicle
                      </span>
                      <strong style={{ color: '#0F2B5B' }}>
                        {emp.number_plate || 'None'}
                      </strong>
                    </div>
                    {emp.vehicle_name && (
                      <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
                        {emp.vehicle_name} &bull; Check-In: {emp.vehicle_checkin_time ? formatPKTTime(emp.vehicle_checkin_time) : 'N/A'}
                        {emp.vehicle_checkout_time && ` &bull; Out: ${formatPKTTime(emp.vehicle_checkout_time)}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                  {hasGps && (
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        locateOnMap(emp);
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11 }}
                    >
                      <MapPin size={12} /> Locate
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={(e) => openEmployeeDetails(emp, e)}
                    style={{
                      flex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      fontSize: 11,
                      background: '#0F2B5B',
                      color: '#ffffff'
                    }}
                  >
                    <FileText size={12} /> History & Reports <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Detail & Isolated Reports Modal */}
      <EmployeeTrackingDetailModal
        employee={detailModalEmployee}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}

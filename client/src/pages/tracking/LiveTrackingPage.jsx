import { useState, useEffect, useRef } from 'react';
import {
  Navigation, RefreshCw, Car, Battery, Clock, MapPin,
  Search, Shield, AlertCircle, Play, CheckCircle2, ChevronRight,
  ExternalLink, Eye, ArrowUpRight
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function LiveTrackingPage() {
  const { user } = useAuth();
  const [trackingList, setTrackingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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
    script.onerror = () => console.warn('Leaflet CDN load failed. Fallback table active.');
    document.body.appendChild(script);

    return () => {
      // Keep script in cache
    };
  }, []);

  // Fetch live tracking data
  async function fetchLiveTracking() {
    try {
      const res = await api.get('/field-tracking/live');
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
    if (autoRefresh) {
      timer = setInterval(fetchLiveTracking, 15000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh]);

  // Initialize or update Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      // Default center: Lahore, Pakistan (Safe Solutions headquarters base)
      const map = window.L.map(mapContainerRef.current).setView([31.5204, 74.3587], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
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

        const isRecent = item.minutes_since_last_ping !== null && item.minutes_since_last_ping < 10;
        const markerColor = item.checkout_time ? '#6B7280' : (isRecent ? '#10B981' : '#F59E0B');

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
          ">
            <span>🚗 ${item.employee_name?.split(' ')[0]}</span>
          </div>`,
          iconSize: [80, 26],
          iconAnchor: [40, 13]
        });

        const marker = window.L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <strong style="font-size: 14px; color: #0F2B5B;">${item.employee_name}</strong><br/>
            <span>Code: ${item.employee_code}</span><br/>
            <span>Vehicle: <strong>${item.vehicle_name || 'Assigned'} (${item.number_plate || 'N/A'})</strong></span><br/>
            <span>Speed: ${(item.speed_mps ? item.speed_mps * 3.6 : 0).toFixed(1)} km/h</span><br/>
            <span>Last Seen: ${item.last_location_at ? new Date(item.last_location_at).toLocaleTimeString() : 'N/A'}</span>
          </div>
        `);

        marker.on('click', () => {
          loadEmployeeRoute(item);
        });

        markersRef.current[item.employee_id] = marker;
      }
    });

    if (bounds.length > 0 && !selectedRoute) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [leafletLoaded, trackingList]);

  // Load employee route
  async function loadEmployeeRoute(employee) {
    setSelectedEmployee(employee);
    setLoadingRoute(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/field-tracking/route/${employee.employee_id}?date=${today}`);
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
            opacity: 0.8,
            dashArray: '8, 8'
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

  // Clear selected route view
  function clearSelectedRoute() {
    setSelectedEmployee(null);
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

  const filteredList = trackingList.filter(t => {
    const q = searchTerm.toLowerCase();
    return (
      t.employee_name?.toLowerCase().includes(q) ||
      t.employee_code?.toLowerCase().includes(q) ||
      t.number_plate?.toLowerCase().includes(q) ||
      t.vehicle_name?.toLowerCase().includes(q)
    );
  });

  const activeOnDutyCount = trackingList.filter(t => !t.checkout_time).length;
  const withGpsCount = trackingList.filter(t => t.latitude && t.longitude).length;

  return (
    <div className="page animate-fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 24, fontWeight: 800 }}>
            <Navigation size={26} style={{ color: 'var(--color-primary)' }} />
            Field Ops Live GPS Tracking
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            Real-time monitoring of active field duty employees, live coordinates, and today's route paths.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Clock size={14} />
            {autoRefresh ? 'Auto-Refresh (15s)' : 'Auto-Refresh Paused'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={fetchLiveTracking}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Active Field Duty</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
            {activeOnDutyCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>employees</span>
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Live GPS Connected</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', marginTop: 4 }}>
            {withGpsCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>transmitting</span>
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Checked-In Today</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6366F1', marginTop: 4 }}>
            {trackingList.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>total trips</span>
          </div>
        </div>
      </div>

      {/* Map & List Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left Column: Employee List */}
        <div className="card" style={{ padding: 16, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search employee or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #e5e7eb)',
                fontSize: 13
              }}
            />
          </div>

          {selectedEmployee && (
            <div style={{
              background: 'rgba(15, 43, 91, 0.08)',
              border: '1px solid rgba(15, 43, 91, 0.2)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F2B5B' }}>Viewing Route: {selectedEmployee.employee_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {selectedRoute ? `${selectedRoute.length} GPS points logged today` : 'Loading route...'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={clearSelectedRoute}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                Reset
              </button>
            </div>
          )}

          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-tertiary)' }}>
              <Navigation size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>No active field check-ins found for today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredList.map((item) => {
                const isSelected = selectedEmployee?.employee_id === item.employee_id;
                const isRecent = item.minutes_since_last_ping !== null && item.minutes_since_last_ping < 10;
                const isCheckedOut = !!item.checkout_time;

                return (
                  <div
                    key={item.employee_id}
                    onClick={() => loadEmployeeRoute(item)}
                    style={{
                      border: isSelected ? '2px solid #0F2B5B' : '1px solid var(--border-color, #E5E7EB)',
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(15, 43, 91, 0.04)' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.employee_name}</div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 10,
                        background: isCheckedOut ? '#F3F4F6' : (isRecent ? '#DEF7EC' : '#FEF3C7'),
                        color: isCheckedOut ? '#6B7280' : (isRecent ? '#03543F' : '#92400E')
                      }}>
                        {isCheckedOut ? 'Checked Out' : (isRecent ? '🟢 Live' : '🟡 Idle')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      <Car size={13} />
                      <span>{item.vehicle_name || 'Assigned'} ({item.number_plate || 'No Plate'})</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      <span>Speed: {(item.speed_mps ? item.speed_mps * 3.6 : 0).toFixed(0)} km/h</span>
                      {item.battery_level !== null && (
                        <span>🔋 {Math.round(item.battery_level * 100)}%</span>
                      )}
                      <span>
                        {item.last_location_at
                          ? new Date(item.last_location_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'No GPS yet'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Map & Coordinates Visualizer */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 240px)', minHeight: 450, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#F3F4F6' }} />

          {!leafletLoaded && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#FFFFFF',
              padding: 24,
              overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <MapPin size={36} style={{ color: 'var(--color-primary)', margin: '0 auto 8px' }} />
                <h3 style={{ margin: 0 }}>Coordinates & Live Locations</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Map loading or restricted network environment. Live coordinates available below:
                </p>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Vehicle</th>
                      <th>Coordinates</th>
                      <th>Speed</th>
                      <th>Last Ping</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map(t => (
                      <tr key={t.employee_id}>
                        <td style={{ fontWeight: 600 }}>{t.employee_name} ({t.employee_code})</td>
                        <td>{t.number_plate || 'N/A'}</td>
                        <td>
                          {t.latitude && t.longitude ? `${parseFloat(t.latitude).toFixed(4)}, ${parseFloat(t.longitude).toFixed(4)}` : 'Awaiting GPS'}
                        </td>
                        <td>{(t.speed_mps ? t.speed_mps * 3.6 : 0).toFixed(1)} km/h</td>
                        <td>{t.last_location_at ? new Date(t.last_location_at).toLocaleTimeString() : 'N/A'}</td>
                        <td>
                          {t.latitude && t.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-xs"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              Maps <ExternalLink size={12} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

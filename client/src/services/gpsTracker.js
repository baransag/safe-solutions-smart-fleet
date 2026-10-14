import api from './api';

/**
 * SAFE SOLUTIONS FleetOps - Client GPS Tracking Service
 * Operates strictly during active field duty (vehicle check-in to vehicle check-out).
 * Zero background tracking when off-duty.
 */

class GPSTrackerService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.buffer = this.loadQueue();
    this.flushInterval = null;
    this.lastPosition = null;
    this.activeSession = null;
    this.permissionState = 'prompt';
    this.batteryLevel = null;
    this.isFlushing = false;

    // Check battery if API supported
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then((batt) => {
        this.batteryLevel = batt.level;
        batt.addEventListener('levelchange', () => {
          this.batteryLevel = batt.level;
        });
      }).catch(() => {});
    }

    // Network reconnection listener to flush buffered points
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.buffer.length > 0) {
          this.flushBuffer();
        }
      });
    }
  }

  // Check if current user has an active field session
  async checkSessionStatus() {
    try {
      const res = await api.get('/field-tracking/status');
      this.activeSession = res;
      this.notifyStatus();
      return res;
    } catch (err) {
      console.warn('GPS session status check failed:', err.message);
      return { activeFieldDuty: false };
    }
  }

  // Start tracking session (only if active field duty is confirmed)
  async startTracking() {
    if (this.isTracking) return true;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation API is not supported by this browser');
      this.permissionState = 'unsupported';
      this.notifyStatus();
      return false;
    }

    const session = await this.checkSessionStatus();
    if (!session || !session.activeFieldDuty) {
      console.log('No active field duty session. GPS tracking will not start.');
      this.stopTracking();
      return false;
    }

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handlePositionUpdate(pos),
        (err) => this.handlePositionError(err),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 10000
        }
      );

      this.isTracking = true;
      this.permissionState = 'granted';

      // Start periodic flush timer (every 45 seconds)
      if (!this.flushInterval) {
        this.flushInterval = setInterval(() => this.flushBuffer(), 45000);
      }

      this.notifyStatus();
      return true;
    } catch (err) {
      console.error('Failed to start GPS tracking:', err);
      this.permissionState = 'denied';
      this.notifyStatus();
      return false;
    }
  }

  // Handle incoming geolocation reading
  handlePositionUpdate(pos) {
    const coords = pos.coords;
    const point = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
      altitude: coords.altitude || null,
      speed: coords.speed !== null && !isNaN(coords.speed) ? coords.speed : 0,
      heading: coords.heading !== null && !isNaN(coords.heading) ? coords.heading : 0,
      battery_level: this.batteryLevel,
      is_moving: coords.speed ? coords.speed > 0.8 : true,
      recorded_at: new Date(pos.timestamp).toISOString(),
      source: 'gps'
    };

    this.lastPosition = point;
    this.buffer.push(point);

    // Keep buffer capped at 100 to prevent unbounded memory growth if offline
    if (this.buffer.length > 100) {
      this.buffer.shift();
    }
    this.saveQueue();

    // Flush immediately if buffer reaches 5 points
    if (this.buffer.length >= 5) {
      this.flushBuffer();
    }

    this.notifyStatus();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps:point', { detail: point }));
    }
  }

  saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fleetops_gps_queue', JSON.stringify(this.buffer));
      }
    } catch {
      // quota or private mode
    }
  }

  loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('fleetops_gps_queue');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
    }
    return [];
  }

  handlePositionError(err) {
    console.warn('Geolocation warning/error:', err.code, err.message);
    if (err.code === 1) { // PERMISSION_DENIED
      this.permissionState = 'denied';
      this.stopTracking();
    } else if (err.code === 2 || err.code === 3) {
      this.permissionState = 'unavailable';
    }
    this.notifyStatus();
  }

  // Flush queued points to backend API
  async flushBuffer() {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const pointsToSend = [...this.buffer];

    try {
      await api.post('/field-tracking/location', { points: pointsToSend });
      // Remove sent points from buffer upon server acknowledgement
      this.buffer = this.buffer.filter(p => !pointsToSend.includes(p));
      this.saveQueue();
    } catch (err) {
      console.warn('Failed to send GPS points to server (will retry):', err.message);
      // Auto-stop tracking if server reports duty ended / checkout occurred
      if (err.status === 403 || (err.message && err.message.toLowerCase().includes('checked out'))) {
        this.stopTracking();
      }
    } finally {
      this.isFlushing = false;
      this.notifyStatus();
    }
  }

  // Stop tracking immediately
  async stopTracking() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.isTracking = false;

    // Send any remaining points
    if (this.buffer.length > 0) {
      await this.flushBuffer();
    }

    this.notifyStatus();
  }

  notifyStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps:status', {
        detail: {
          isTracking: this.isTracking,
          lastPosition: this.lastPosition,
          bufferSize: this.buffer.length,
          activeSession: this.activeSession,
          permissionState: this.permissionState
        }
      }));
    }
  }

  getStatus() {
    return {
      isTracking: this.isTracking,
      lastPosition: this.lastPosition,
      bufferSize: this.buffer.length,
      activeSession: this.activeSession,
      permissionState: this.permissionState
    };
  }
}

const gpsTracker = new GPSTrackerService();
export default gpsTracker;

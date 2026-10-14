const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Helper: Haversine distance in meters
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/field-tracking/status - Check if employee has active field duty requiring GPS
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if employee checked in today for vehicle duty
    const { rows: checkinRows } = await query(`
      SELECT vc.id, vc.vehicle_id, vc.checkin_time, v.name AS vehicle_name, v.number_plate
      FROM vehicle_checkins vc
      LEFT JOIN vehicles v ON vc.vehicle_id = v.id
      WHERE vc.employee_id = $1 AND vc.checkin_date = $2
      ORDER BY vc.id DESC LIMIT 1
    `, [employeeId, today]);

    if (checkinRows.length === 0) {
      return res.json({
        activeFieldDuty: false,
        reason: 'no_checkin',
        message: 'No vehicle check-in recorded for today'
      });
    }

    const checkin = checkinRows[0];

    // Check if checkout exists for this checkin
    const { rows: checkoutRows } = await query(`
      SELECT id, checkout_time FROM vehicle_checkouts
      WHERE checkin_id = $1
      LIMIT 1
    `, [checkin.id]);

    const hasCheckedOut = checkoutRows.length > 0;

    return res.json({
      activeFieldDuty: !hasCheckedOut,
      checkinId: checkin.id,
      vehicleId: checkin.vehicle_id,
      vehicleName: checkin.vehicle_name,
      numberPlate: checkin.number_plate,
      checkinTime: checkin.checkin_time,
      sessionDate: today
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/field-tracking/location - Ingest single or batch GPS readings during active field duty
router.post('/location', authenticate, async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const rawPoints = Array.isArray(req.body.points) ? req.body.points : (req.body.latitude ? [req.body] : []);

    if (rawPoints.length === 0) {
      return res.status(400).json({ error: 'No GPS data provided' });
    }

    // Strict Off-Duty Guard: Require verified active vehicle check-in for today
    const { rows: checkinRows } = await query(`
      SELECT vc.id, vc.vehicle_id
      FROM vehicle_checkins vc
      WHERE vc.employee_id = $1 AND vc.checkin_date = $2
      ORDER BY vc.id DESC LIMIT 1
    `, [employeeId, today]);

    const checkin = checkinRows[0];
    if (!checkin || !checkin.id) {
      return res.status(403).json({
        error: 'Access denied: No active vehicle check-in found for today. Field tracking is strictly permitted during active duty only.'
      });
    }

    const checkinId = checkin.id;
    const vehicleId = checkin.vehicle_id || null;

    // Strict Off-Duty Guard: Reject if checkout has already occurred
    const { rows: checkoutRows } = await query(`
      SELECT id FROM vehicle_checkouts WHERE checkin_id = $1 LIMIT 1
    `, [checkinId]);

    if (checkoutRows.length > 0) {
      return res.status(403).json({
        error: 'Access denied: Field duty session has ended (vehicle checked out). Tracking is stopped for off-duty hours.'
      });
    }

    // Filter and sanitize points
    const validPoints = [];
    for (const p of rawPoints) {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }
      validPoints.push({
        latitude: lat,
        longitude: lng,
        accuracy_meters: p.accuracy ? parseFloat(p.accuracy) : null,
        altitude_meters: p.altitude ? parseFloat(p.altitude) : null,
        speed_mps: p.speed ? parseFloat(p.speed) : null,
        heading: p.heading ? parseFloat(p.heading) : null,
        battery_level: p.battery_level ? parseFloat(p.battery_level) : null,
        is_moving: p.is_moving !== undefined ? Boolean(p.is_moving) : (p.speed ? p.speed > 0.5 : true),
        source: p.source || 'gps',
        recorded_at: p.recorded_at ? new Date(p.recorded_at) : new Date(),
        session_date: today
      });
    }

    if (validPoints.length === 0) {
      return res.status(400).json({ error: 'No valid GPS coordinates in payload' });
    }

    // Get last logged point to calculate distance increment
    const { rows: lastPointRows } = await query(`
      SELECT latitude, longitude FROM field_location_logs
      WHERE employee_id = $1 AND session_date = $2
      ORDER BY id DESC LIMIT 1
    `, [employeeId, today]);

    let additionalDistance = 0;
    let prevLat = lastPointRows[0]?.latitude ? parseFloat(lastPointRows[0].latitude) : null;
    let prevLng = lastPointRows[0]?.longitude ? parseFloat(lastPointRows[0].longitude) : null;

    for (const pt of validPoints) {
      if (prevLat !== null && prevLng !== null) {
        const dist = haversineDistanceMeters(prevLat, prevLng, pt.latitude, pt.longitude);
        // Ignore jitter (< 10 meters) and impossible teleportation (> 50 km)
        if (dist >= 10 && dist <= 50000) {
          additionalDistance += dist;
        }
      }
      prevLat = pt.latitude;
      prevLng = pt.longitude;

      await query(`
        INSERT INTO field_location_logs (
          employee_id, vehicle_id, checkin_id, latitude, longitude,
          accuracy_meters, altitude_meters, speed_mps, heading,
          battery_level, is_moving, source, recorded_at, session_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        employeeId, vehicleId, checkinId, pt.latitude, pt.longitude,
        pt.accuracy_meters, pt.altitude_meters, pt.speed_mps, pt.heading,
        pt.battery_level, pt.is_moving, pt.source, pt.recorded_at, pt.session_date
      ]);
    }

    // Upsert tracking session metadata
    const latestPt = validPoints[validPoints.length - 1];
    await query(`
      INSERT INTO field_tracking_sessions (
        employee_id, vehicle_id, checkin_id, session_date,
        started_at, total_points, total_distance_meters,
        status, last_point_at, permission_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, 'granted')
      ON CONFLICT (employee_id, session_date) DO UPDATE SET
        total_points = field_tracking_sessions.total_points + EXCLUDED.total_points,
        total_distance_meters = field_tracking_sessions.total_distance_meters + EXCLUDED.total_distance_meters,
        last_point_at = EXCLUDED.last_point_at,
        vehicle_id = COALESCE(EXCLUDED.vehicle_id, field_tracking_sessions.vehicle_id),
        checkin_id = COALESCE(EXCLUDED.checkin_id, field_tracking_sessions.checkin_id),
        status = 'active'
    `, [
      employeeId, vehicleId, checkinId, today,
      validPoints[0].recorded_at, validPoints.length, additionalDistance,
      latestPt.recorded_at
    ]);

    res.json({
      success: true,
      insertedCount: validPoints.length,
      distanceIncrementMeters: Math.round(additionalDistance)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/field-tracking/live - Real-time/latest positions of active field employees
router.get('/live', authenticate, authorize('boss', 'admin', 'controller', 'manager'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { rows } = await query(`
      WITH latest_loc AS (
        SELECT DISTINCT ON (employee_id)
          id, employee_id, latitude, longitude, accuracy_meters,
          speed_mps, heading, battery_level, is_moving, recorded_at, received_at
        FROM field_location_logs
        WHERE session_date = $1
        ORDER BY employee_id, id DESC
      )
      SELECT
        e.id AS employee_id,
        e.employee_id AS employee_code,
        e.name AS employee_name,
        e.phone,
        e.department,
        e.role,
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.number_plate,
        vc.checkin_time,
        vco.checkout_time,
        fts.total_points,
        COALESCE(fts.total_distance_meters, 0) AS total_distance_meters,
        fts.status AS session_status,
        fts.started_at AS session_started_at,
        ll.latitude,
        ll.longitude,
        ll.accuracy_meters,
        ll.speed_mps,
        ll.heading,
        ll.battery_level,
        ll.is_moving,
        ll.recorded_at AS last_location_at,
        EXTRACT(EPOCH FROM (NOW() - ll.recorded_at)) / 60 AS minutes_since_last_ping
      FROM employees e
      INNER JOIN vehicle_checkins vc ON vc.employee_id = e.id AND vc.checkin_date = $1
      LEFT JOIN vehicles v ON vc.vehicle_id = v.id
      LEFT JOIN vehicle_checkouts vco ON vco.checkin_id = vc.id
      LEFT JOIN field_tracking_sessions fts ON fts.employee_id = e.id AND fts.session_date = $1
      LEFT JOIN latest_loc ll ON ll.employee_id = e.id
      WHERE e.is_active = true
      ORDER BY vc.checkin_time DESC
    `, [today]);

    res.json({ success: true, tracking: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/field-tracking/route/:employeeId - Full path & stops for an employee on a given date
router.get('/route/:employeeId', authenticate, async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Access check: only self or management
    const isSelf = req.user.id === employeeId;
    const isManagement = ['boss', 'admin', 'controller', 'manager'].includes(req.user.role);
    if (!isSelf && !isManagement) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: points } = await query(`
      SELECT
        id, latitude, longitude, accuracy_meters, speed_mps,
        heading, battery_level, is_moving, recorded_at
      FROM field_location_logs
      WHERE employee_id = $1 AND session_date = $2
      ORDER BY id ASC
    `, [employeeId, date]);

    const { rows: sessionRows } = await query(`
      SELECT fts.*, e.name AS employee_name, e.employee_id AS employee_code,
             v.name AS vehicle_name, v.number_plate
      FROM field_tracking_sessions fts
      JOIN employees e ON fts.employee_id = e.id
      LEFT JOIN vehicles v ON fts.vehicle_id = v.id
      WHERE fts.employee_id = $1 AND fts.session_date = $2
      LIMIT 1
    `, [employeeId, date]);

    res.json({
      success: true,
      points,
      session: sessionRows[0] || null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/field-tracking/reports - Aggregated daily, weekly, and monthly reports
router.get('/reports', authenticate, authorize('boss', 'admin', 'controller', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let whereClause = `WHERE fts.session_date BETWEEN $1 AND $2`;
    const params = [
      startDate || today,
      endDate || today
    ];

    if (employeeId) {
      params.push(employeeId);
      whereClause += ` AND fts.employee_id = $${params.length}`;
    }

    const { rows } = await query(`
      SELECT
        fts.id,
        fts.session_date,
        fts.employee_id,
        e.employee_id AS employee_code,
        e.name AS employee_name,
        e.department,
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.number_plate,
        vc.checkin_time,
        vco.checkout_time,
        fts.started_at,
        fts.ended_at,
        fts.total_points,
        ROUND((COALESCE(fts.total_distance_meters, 0) / 1000.0)::numeric, 2) AS total_distance_km,
        fts.status,
        fts.last_point_at,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(vco.checkout_time, fts.last_point_at, NOW()) - vc.checkin_time)) / 3600.0::numeric, 2) AS duty_hours
      FROM field_tracking_sessions fts
      JOIN employees e ON fts.employee_id = e.id
      LEFT JOIN vehicle_checkins vc ON fts.checkin_id = vc.id
      LEFT JOIN vehicle_checkouts vco ON vco.checkin_id = vc.id
      LEFT JOIN vehicles v ON fts.vehicle_id = v.id
      ${whereClause}
      ORDER BY fts.session_date DESC, vc.checkin_time DESC
    `, params);

    res.json({ success: true, reports: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

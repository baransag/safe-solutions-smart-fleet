const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const geocodingService = require('../services/geocoding.service');

// GET /api/field-tracking/reverse-geocode - Reverse geocode latitude & longitude into readable address
router.get('/reverse-geocode', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }
    const result = await geocodingService.reverseGeocode(lat, lng);
    res.json({
      success: true,
      data: result,
      formatted: result.formatted || 'Address unavailable',
      provider: 'OpenStreetMap Nominatim'
    });
  } catch (err) {
    res.json({
      success: false,
      formatted: 'Address unavailable',
      error: err.message
    });
  }
});

// NOTE: vehicle_checkins has NO checkin_date column (only checkin_time TIMESTAMP).
// Naive TIMESTAMP columns are written in UTC (Vercel + Neon run in UTC), so the
// Pakistan (Asia/Karachi) calendar date is derived explicitly from the timestamp.
const pktDateSql = (col) => `((${col}) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Karachi')::date`;

// Today's calendar date in Asia/Karachi as YYYY-MM-DD
function pktToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

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
    const today = pktToday();

    // Check if employee checked in today for vehicle duty
    const { rows: checkinRows } = await query(`
      SELECT vc.id, vc.vehicle_id, vc.checkin_time, v.name AS vehicle_name, v.number_plate
      FROM vehicle_checkins vc
      LEFT JOIN vehicles v ON vc.vehicle_id = v.id
      WHERE vc.employee_id = $1 AND ${pktDateSql('vc.checkin_time')} = $2
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
    const today = pktToday();
    const rawPoints = Array.isArray(req.body.points) ? req.body.points : (req.body.latitude ? [req.body] : []);

    if (rawPoints.length === 0) {
      return res.status(400).json({ error: 'No GPS data provided' });
    }

    // Strict Off-Duty Guard: Require verified active vehicle check-in for today
    const { rows: checkinRows } = await query(`
      SELECT vc.id, vc.vehicle_id
      FROM vehicle_checkins vc
      WHERE vc.employee_id = $1 AND ${pktDateSql('vc.checkin_time')} = $2
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

// GET /api/field-tracking/live - Real-time/latest positions and card status of all employees
router.get('/live', authenticate, authorize('boss', 'admin', 'controller', 'manager'), async (req, res, next) => {
  try {
    const today = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : pktToday();

    const { rows } = await query(`
      WITH latest_loc AS (
        SELECT DISTINCT ON (employee_id)
          id, employee_id, latitude, longitude, accuracy_meters,
          speed_mps, heading, battery_level, is_moving, recorded_at, received_at
        FROM field_location_logs
        WHERE session_date = $1
        ORDER BY employee_id, id DESC
      ),
      latest_attendance AS (
        SELECT DISTINCT ON (employee_id)
          id, employee_id, check_in_time, check_out_time, attendance_type, status, approval_status, work_hours
        FROM attendance_records
        WHERE ${pktDateSql('check_in_time')} = $1
        ORDER BY employee_id, id DESC
      ),
      latest_checkin AS (
        SELECT DISTINCT ON (employee_id)
          id, employee_id, vehicle_id, checkin_time, meter_reading, gps_lat, gps_lng
        FROM vehicle_checkins
        WHERE ${pktDateSql('checkin_time')} = $1
        ORDER BY employee_id, id DESC
      )
      SELECT
        e.id AS employee_id,
        e.employee_id AS employee_code,
        e.name AS employee_name,
        e.phone,
        e.department,
        e.role,
        e.designation,
        -- Attendance Details
        la.id AS attendance_id,
        la.check_in_time AS attendance_checkin_time,
        la.check_out_time AS attendance_checkout_time,
        la.status AS attendance_status,
        la.attendance_type,
        la.work_hours AS attendance_work_hours,
        -- Vehicle Details
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.number_plate,
        vc.id AS checkin_id,
        vc.checkin_time AS vehicle_checkin_time,
        vco.checkout_time AS vehicle_checkout_time,
        vc.meter_reading AS opening_meter,
        vco.meter_reading AS closing_meter,
        vc.gps_lat AS checkin_lat,
        vc.gps_lng AS checkin_lng,
        -- Tracking Session
        fts.id AS session_id,
        fts.total_points,
        COALESCE(fts.total_distance_meters, 0) AS total_distance_meters,
        ROUND((COALESCE(fts.total_distance_meters, 0) / 1000.0)::numeric, 2) AS total_distance_km,
        fts.status AS session_status,
        fts.started_at AS session_started_at,
        fts.ended_at AS session_ended_at,
        fts.last_point_at AS session_last_point_at,
        -- Latest Location: latest stored GPS point, else the real check-in coordinates
        COALESCE(ll.latitude, vc.gps_lat) AS latitude,
        COALESCE(ll.longitude, vc.gps_lng) AS longitude,
        CASE
          WHEN ll.latitude IS NOT NULL THEN 'gps'
          WHEN vc.gps_lat IS NOT NULL AND vc.gps_lng IS NOT NULL THEN 'checkin'
          ELSE NULL
        END AS location_source,
        ll.accuracy_meters,
        ll.speed_mps,
        ll.heading,
        ll.battery_level,
        ll.is_moving,
        COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END) AS last_location_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END))) / 60.0, 1) AS minutes_since_last_ping,
        -- Computed Tracking Status: 'Active', 'Stopped', 'Offline', or 'Not Started'
        CASE
          WHEN vco.checkout_time IS NOT NULL OR fts.status = 'completed' THEN 'Stopped'
          WHEN vc.checkin_time IS NOT NULL THEN
            CASE
              WHEN COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END) IS NOT NULL
                   AND EXTRACT(EPOCH FROM (NOW() - COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END))) <= 900 THEN 'Active'
              ELSE 'Offline'
            END
          ELSE 'Not Started'
        END AS tracking_status
      FROM employees e
      LEFT JOIN latest_attendance la ON la.employee_id = e.id
      LEFT JOIN latest_checkin vc ON vc.employee_id = e.id
      LEFT JOIN vehicles v ON vc.vehicle_id = v.id
      LEFT JOIN vehicle_checkouts vco ON vco.checkin_id = vc.id
      LEFT JOIN field_tracking_sessions fts ON fts.employee_id = e.id AND fts.session_date = $1
      LEFT JOIN latest_loc ll ON ll.employee_id = e.id
      WHERE (e.is_active = true OR e.is_active IS NULL)
      ORDER BY
        CASE
          WHEN vco.checkout_time IS NULL AND vc.checkin_time IS NOT NULL
               AND COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END) IS NOT NULL
               AND EXTRACT(EPOCH FROM (NOW() - COALESCE(ll.recorded_at, CASE WHEN vc.gps_lat IS NOT NULL THEN vc.checkin_time ELSE NULL END))) <= 900 THEN 1
          WHEN vc.checkin_time IS NOT NULL AND vco.checkout_time IS NULL THEN 2
          WHEN la.check_in_time IS NOT NULL THEN 3
          ELSE 4
        END,
        e.name ASC
    `, [today]);

    // Attach readable reverse-geocoded addresses
    for (const item of rows) {
      if (item.latitude && item.longitude) {
        const cached = geocodingService.getCachedGeocode(item.latitude, item.longitude);
        if (cached) {
          item.location_address = cached.formatted;
          item.location_details = cached;
        } else {
          try {
            const resAddr = await geocodingService.reverseGeocode(item.latitude, item.longitude);
            item.location_address = resAddr.formatted;
            item.location_details = resAddr;
          } catch {
            item.location_address = 'Address unavailable';
          }
        }
      } else {
        item.location_address = null;
      }
    }

    res.json({ success: true, tracking: rows, targetDate: today });
  } catch (err) {
    next(err);
  }
});

// GET /api/field-tracking/route/:employeeId - Full path & stops for an employee on a given date
router.get('/route/:employeeId', authenticate, async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : pktToday();

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

    // Fallback: If no continuous GPS logs yet, show the vehicle check-in GPS coordinate if present
    if (points.length === 0) {
      const { rows: chkGps } = await query(`
        SELECT id, gps_lat AS latitude, gps_lng AS longitude, 10 AS accuracy_meters,
               0 AS speed_mps, NULL AS heading, NULL AS battery_level, false AS is_moving,
               checkin_time AS recorded_at
        FROM vehicle_checkins
        WHERE employee_id = $1 AND ${pktDateSql('checkin_time')} = $2
          AND gps_lat IS NOT NULL AND gps_lng IS NOT NULL
        ORDER BY id DESC LIMIT 1
      `, [employeeId, date]);
      if (chkGps.length > 0) {
        points.push(chkGps[0]);
      }
    }

    // Attach any already-cached addresses to points
    for (const pt of points) {
      if (pt.latitude && pt.longitude) {
        const cached = geocodingService.getCachedGeocode(pt.latitude, pt.longitude);
        if (cached) {
          pt.location_address = cached.formatted;
          pt.location_details = cached;
        }
      }
    }

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

// GET /api/field-tracking/employee-report/:employeeId - Detailed daily, weekly, monthly report for a specific employee
router.get('/employee-report/:employeeId', authenticate, async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const { period, date, startDate, endDate, month, year } = req.query;

    const isSelf = req.user.id === employeeId;
    const isManagement = ['boss', 'admin', 'controller', 'manager'].includes(req.user.role);
    if (!isSelf && !isManagement) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine Start and End date
    const today = pktToday();
    let fromDate = today;
    let toDate = today;

    if (period === 'daily') {
      fromDate = date || today;
      toDate = date || today;
    } else if (period === 'weekly') {
      if (startDate && endDate) {
        fromDate = startDate;
        toDate = endDate;
      } else {
        const base = date ? new Date(date) : new Date();
        const d = new Date(base);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        fromDate = monday.toISOString().split('T')[0];
        toDate = sunday.toISOString().split('T')[0];
      }
    } else if (period === 'monthly') {
      const now = new Date();
      const m = parseInt(month || now.getMonth() + 1);
      const y = parseInt(year || now.getFullYear());
      const firstDay = new Date(Date.UTC(y, m - 1, 1));
      const lastDay = new Date(Date.UTC(y, m, 0));
      fromDate = firstDay.toISOString().split('T')[0];
      toDate = lastDay.toISOString().split('T')[0];
    } else if (period === 'custom') {
      fromDate = startDate || today;
      toDate = endDate || today;
    } else if (startDate && endDate) {
      fromDate = startDate;
      toDate = endDate;
    }

    // Fetch employee details
    const { rows: empRows } = await query(
      `SELECT id, employee_id AS employee_code, name, department, role, designation, phone, email
       FROM employees WHERE id = $1`,
      [employeeId]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const employee = empRows[0];

    // Query combined daily records for the selected employee in the date range
    const { rows: attendanceList } = await query(`
      SELECT
        ar.id AS attendance_id,
        ${pktDateSql('ar.check_in_time')} AS date_key,
        ar.check_in_time,
        ar.check_out_time,
        ar.status AS attendance_status,
        ar.attendance_type,
        ar.location_name,
        ar.project_name,
        ar.work_hours,
        ar.approval_status,
        ar.notes
      FROM attendance_records ar
      WHERE ar.employee_id = $1 AND ${pktDateSql('ar.check_in_time')} BETWEEN $2 AND $3
      ORDER BY ar.check_in_time ASC
    `, [employeeId, fromDate, toDate]);

    const { rows: vehicleCheckinList } = await query(`
      SELECT
        vc.id AS checkin_id,
        ${pktDateSql('vc.checkin_time')} AS date_key,
        vc.checkin_time,
        vco.checkout_time,
        vc.meter_reading AS opening_meter,
        vco.meter_reading AS closing_meter,
        vco.distance_km,
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.number_plate
      FROM vehicle_checkins vc
      LEFT JOIN vehicle_checkouts vco ON vco.checkin_id = vc.id
      LEFT JOIN vehicles v ON vc.vehicle_id = v.id
      WHERE vc.employee_id = $1 AND ${pktDateSql('vc.checkin_time')} BETWEEN $2 AND $3
      ORDER BY vc.checkin_time ASC
    `, [employeeId, fromDate, toDate]);

    const { rows: trackingSessionList } = await query(`
      SELECT
        fts.id AS session_id,
        fts.session_date AS date_key,
        fts.started_at,
        fts.ended_at,
        fts.total_points,
        ROUND((COALESCE(fts.total_distance_meters, 0) / 1000.0)::numeric, 2) AS total_distance_km,
        fts.status AS session_status,
        fts.last_point_at
      FROM field_tracking_sessions fts
      WHERE fts.employee_id = $1 AND fts.session_date BETWEEN $2 AND $3
      ORDER BY fts.session_date ASC
    `, [employeeId, fromDate, toDate]);

    // Aggregate into daily chronological entries
    const datesMap = new Map();

    attendanceList.forEach(a => {
      const k = String(a.date_key).slice(0, 10);
      if (!datesMap.has(k)) datesMap.set(k, { date: k });
      const entry = datesMap.get(k);
      entry.attendance = a;
    });

    vehicleCheckinList.forEach(v => {
      const k = String(v.date_key).slice(0, 10);
      if (!datesMap.has(k)) datesMap.set(k, { date: k });
      const entry = datesMap.get(k);
      entry.vehicle = v;
    });

    trackingSessionList.forEach(t => {
      const k = String(t.date_key).slice(0, 10);
      if (!datesMap.has(k)) datesMap.set(k, { date: k });
      const entry = datesMap.get(k);
      entry.tracking = t;
    });

    // Build ordered list
    const sortedDates = Array.from(datesMap.keys()).sort().reverse();
    const records = sortedDates.map(dateKey => {
      const entry = datesMap.get(dateKey);
      const a = entry.attendance;
      const v = entry.vehicle;
      const t = entry.tracking;

      // Calculate working duration only when both timestamps are valid
      let workDurationFormatted = 'N/A';
      let workDurationHours = null;
      let missingCheckout = false;

      if (a && a.check_in_time) {
        if (a.check_out_time) {
          const inD = new Date(a.check_in_time);
          const outD = new Date(a.check_out_time);
          if (outD >= inD) {
            const diffMs = outD - inD;
            const totalMinutes = Math.floor(diffMs / 60000);
            const hrs = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            workDurationFormatted = `${hrs}h ${mins}m`;
            workDurationHours = +(diffMs / (1000 * 60 * 60)).toFixed(2);
          }
        } else {
          missingCheckout = true;
          workDurationFormatted = 'Missing Check-Out';
        }
      }

      return {
        date: dateKey,
        employee_id: employee.id,
        employee_code: employee.employee_code,
        employee_name: employee.name,
        department: employee.department,
        // Attendance
        attendance_id: a ? a.attendance_id : null,
        attendance_status: a ? a.attendance_status : 'absent',
        attendance_type: a ? a.attendance_type : null,
        check_in_time: a ? a.check_in_time : null,
        check_out_time: a ? a.check_out_time : null,
        work_duration_formatted: workDurationFormatted,
        work_duration_hours: workDurationHours,
        missing_checkout: missingCheckout,
        location_name: a ? a.location_name : null,
        project_name: a ? a.project_name : null,
        // Vehicle
        vehicle_id: v ? v.vehicle_id : null,
        vehicle_name: v ? v.vehicle_name : null,
        number_plate: v ? v.number_plate : null,
        vehicle_checkin_time: v ? v.checkin_time : null,
        vehicle_checkout_time: v ? v.checkout_time : null,
        opening_meter: v ? v.opening_meter : null,
        closing_meter: v ? v.closing_meter : null,
        vehicle_distance_km: v ? (v.distance_km || (v.closing_meter && v.opening_meter ? v.closing_meter - v.opening_meter : 0)) : 0,
        // GPS Tracking
        tracking_session_id: t ? t.session_id : null,
        tracking_started_at: t ? t.started_at : null,
        tracking_ended_at: t ? t.ended_at : null,
        total_gps_points: t ? t.total_points : 0,
        gps_distance_km: t ? t.total_distance_km : 0,
        tracking_status: t ? t.session_status : 'no_data'
      };
    });

    // Summary statistics
    const totalDays = records.length;
    const totalWorkHours = records.reduce((acc, r) => acc + (r.work_duration_hours || 0), 0);
    const totalGpsKm = records.reduce((acc, r) => acc + Number(r.gps_distance_km || 0), 0);
    const totalVehicleKm = records.reduce((acc, r) => acc + Number(r.vehicle_distance_km || 0), 0);
    const missingCheckoutsCount = records.filter(r => r.missing_checkout).length;

    res.json({
      success: true,
      employee,
      period: period || 'custom',
      fromDate,
      toDate,
      records,
      summary: {
        totalDays,
        totalWorkHours: +totalWorkHours.toFixed(2),
        totalGpsKm: +totalGpsKm.toFixed(2),
        totalVehicleKm: +totalVehicleKm.toFixed(2),
        missingCheckoutsCount
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/field-tracking/reports - Aggregated daily, weekly, and monthly reports
router.get('/reports', authenticate, authorize('boss', 'admin', 'controller', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const today = pktToday();

    let whereClause = `WHERE (fts.session_date BETWEEN $1 AND $2 OR ${pktDateSql('ar.check_in_time')} BETWEEN $1 AND $2)`;
    const params = [
      startDate || today,
      endDate || today
    ];

    if (employeeId) {
      params.push(employeeId);
      whereClause += ` AND e.id = $${params.length}`;
    }

    const { rows } = await query(`
      SELECT
        COALESCE(fts.session_date, ${pktDateSql('ar.check_in_time')}, ${pktDateSql('vc.checkin_time')}) AS session_date,
        e.id AS employee_id,
        e.employee_id AS employee_code,
        e.name AS employee_name,
        e.department,
        v.id AS vehicle_id,
        v.name AS vehicle_name,
        v.number_plate,
        -- Attendance
        ar.check_in_time AS attendance_checkin_time,
        ar.check_out_time AS attendance_checkout_time,
        ar.status AS attendance_status,
        CASE
          WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL AND ar.check_out_time >= ar.check_in_time THEN
            ROUND(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time)) / 3600.0::numeric, 2)
          ELSE NULL
        END AS attendance_duty_hours,
        -- Vehicle Check-in / Checkout
        vc.checkin_time AS vehicle_checkin_time,
        vco.checkout_time AS vehicle_checkout_time,
        -- GPS Tracking
        fts.id AS tracking_id,
        fts.started_at,
        fts.ended_at,
        COALESCE(fts.total_points, 0) AS total_points,
        ROUND((COALESCE(fts.total_distance_meters, 0) / 1000.0)::numeric, 2) AS total_distance_km,
        COALESCE(fts.status, 'no_data') AS status,
        fts.last_point_at
      FROM employees e
      LEFT JOIN field_tracking_sessions fts ON fts.employee_id = e.id AND fts.session_date BETWEEN $1 AND $2
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ${pktDateSql('ar.check_in_time')} BETWEEN $1 AND $2
      LEFT JOIN vehicle_checkins vc ON (vc.id = fts.checkin_id OR (vc.employee_id = e.id AND ${pktDateSql('vc.checkin_time')} BETWEEN $1 AND $2))
      LEFT JOIN vehicle_checkouts vco ON vco.checkin_id = vc.id
      LEFT JOIN vehicles v ON (v.id = fts.vehicle_id OR v.id = vc.vehicle_id)
      ${whereClause}
      ORDER BY session_date DESC, e.name ASC
    `, params);

    res.json({ success: true, reports: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/field-tracking/close-session/:id - Authorized manual closure for missing checkout
router.post('/close-session/:id', authenticate, authorize('boss', 'admin', 'controller', 'manager'), async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { close_time, reason, notes } = req.body;

    const { rows: sessionRows } = await query(
      `SELECT * FROM field_tracking_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: 'Tracking session not found' });
    }

    const session = sessionRows[0];
    const endedAt = close_time ? new Date(close_time) : new Date();

    // 1. Mark tracking session completed
    const { rows: updatedSession } = await query(
      `UPDATE field_tracking_sessions
       SET status = 'completed',
           ended_at = $1
       WHERE id = $2
       RETURNING *`,
      [endedAt, sessionId]
    );

    // 2. If linked to vehicle check-in and check-out is missing, complete check-in
    if (session.checkin_id) {
      const { rows: chkRows } = await query(
        `SELECT id FROM vehicle_checkouts WHERE checkin_id = $1`,
        [session.checkin_id]
      );
      if (chkRows.length === 0) {
        const { rows: parentChk } = await query(
          `SELECT vehicle_id, meter_reading FROM vehicle_checkins WHERE id = $1`,
          [session.checkin_id]
        );
        if (parentChk.length > 0) {
          const closingKm = parseFloat(parentChk[0].meter_reading) + Math.round((session.total_distance_meters || 0) / 1000.0);
          await query(
            `INSERT INTO vehicle_checkouts (
               checkin_id, vehicle_id, employee_id, checkout_time,
               meter_reading, distance_km, notes, is_confirmed
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              session.checkin_id,
              parentChk[0].vehicle_id,
              session.employee_id,
              endedAt,
              closingKm,
              Math.round((session.total_distance_meters || 0) / 1000.0),
              `Manual session closure by ${req.user.name}: ${reason || notes || 'Missing checkout resolved'}`
            ]
          );
        }
        await query(
          `UPDATE vehicle_checkins SET status = 'completed' WHERE id = $1`,
          [session.checkin_id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Session closed successfully',
      session: updatedSession[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

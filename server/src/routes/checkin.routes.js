const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');
const storageService = require('../services/storage.service');
const multer = require('multer');

// Helper: create alert
async function createAlert(client, { vehicle_id, employee_id, alert_type, severity, title, message, metadata }) {
  await client.query(
    `INSERT INTO vehicle_alerts (vehicle_id, employee_id, alert_type, severity, title, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [vehicle_id, employee_id, alert_type, severity, title, message, JSON.stringify(metadata || {})]
  );

  // Create notification for managers/controllers
  const { rows: admins } = await client.query(
    `SELECT id FROM employees WHERE role IN ('manager', 'controller') AND is_active = true`
  );
  for (const admin of admins) {
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, title, message, severity === 'critical' ? 'error' : 'warning',
       JSON.stringify({ alert_type, vehicle_id, employee_id })]
    );
  }
}

// POST /api/checkins/vehicle-checkin - Morning check-in
const checkinUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10485760 }
}).fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'meter_photo', maxCount: 1 }
]);

router.post('/vehicle-checkin', authenticate, checkinUpload, async (req, res, next) => {
  try {
    const { vehicle_id, gps_lat, gps_lng, gps_address, meter_reading, ocr_reading, ocr_confidence, ocr_raw_text } = req.body;

    if (!vehicle_id || !meter_reading) {
      return res.status(400).json({ error: 'vehicle_id and meter_reading are required' });
    }

    const meterVal = parseFloat(meter_reading);
    const employeeId = req.user.id;

    const selfieFile = req.files?.selfie?.[0];
    const meterFile = req.files?.meter_photo?.[0];

    const selfieUrl = selfieFile ? await storageService.uploadFile(selfieFile, 'selfies') : null;
    const meterPhotoUrl = meterFile ? await storageService.uploadFile(meterFile, 'meters') : null;

    const result = await transaction(async (client) => {
      // 1. Verify vehicle assignment
      const { rows: assignment } = await client.query(
        `SELECT va.id, v.id as vid, v.vehicle_id as v_id, v.name as vehicle_name, v.current_meter
         FROM vehicle_assignments va
         JOIN vehicles v ON v.id = va.vehicle_id
         WHERE va.employee_id = $1 AND va.is_current = true AND v.id = $2`,
        [employeeId, vehicle_id]
      );

      if (assignment.length === 0) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'wrong_vehicle',
          severity: 'high',
          title: 'Wrong Vehicle Check-in Attempt',
          message: `Employee ${req.user.name} attempted to check in with a vehicle not assigned to them.`
        });
        throw Object.assign(new Error('This vehicle is not assigned to you'), { status: 403 });
      }

      // 2. Check for duplicate check-in today
      const today = new Date().toISOString().split('T')[0];
      const { rows: existing } = await client.query(
        `SELECT id FROM vehicle_checkins
         WHERE employee_id = $1 AND vehicle_id = $2 AND checkin_time::date = $3`,
        [employeeId, vehicle_id, today]
      );

      if (existing.length > 0) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'duplicate_checkin',
          severity: 'medium',
          title: 'Duplicate Check-in Attempt',
          message: `Employee ${req.user.name} attempted a duplicate check-in.`
        });
        throw Object.assign(new Error('Already checked in today'), { status: 400 });
      }

      // 3. Validate meter reading
      const prevMeter = parseFloat(assignment[0].current_meter) || 0;
      if (meterVal < prevMeter) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'negative_km',
          severity: 'high',
          title: 'Negative Kilometer Reading',
          message: `Meter reading ${meterVal} is less than previous reading ${prevMeter}. Vehicle: ${assignment[0].vehicle_name}`,
          metadata: { submitted: meterVal, previous: prevMeter }
        });
      }

      // 4. Insert check-in
      const { rows: checkin } = await client.query(
        `INSERT INTO vehicle_checkins
         (vehicle_id, employee_id, gps_lat, gps_lng, gps_address, selfie_url, meter_photo_url,
          meter_reading, ocr_reading, ocr_confidence, ocr_raw_text, is_confirmed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [vehicle_id, employeeId, gps_lat, gps_lng, gps_address, selfieUrl, meterPhotoUrl,
         meterVal, ocr_reading ? parseFloat(ocr_reading) : null,
         ocr_confidence ? parseFloat(ocr_confidence) : null, ocr_raw_text, true]
      );

      // 5. Update vehicle current meter
      await client.query(
        'UPDATE vehicles SET current_meter = $1, updated_at = NOW() WHERE id = $2',
        [meterVal, vehicle_id]
      );

      // 6. Log meter reading
      await client.query(
        `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type, photo_url)
         VALUES ($1, $2, $3, 'checkin', $4, 'vehicle_checkins', $5)`,
        [vehicle_id, employeeId, meterVal, checkin[0].id, meterPhotoUrl]
      );

      return checkin[0];
    });

    res.status(201).json({ checkin: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/checkins/vehicle-checkout - Evening checkout
router.post('/vehicle-checkout', authenticate, checkinUpload, async (req, res, next) => {
  try {
    const { vehicle_id, gps_lat, gps_lng, gps_address, meter_reading, ocr_reading, ocr_confidence, ocr_raw_text } = req.body;

    if (!vehicle_id || !meter_reading) {
      return res.status(400).json({ error: 'vehicle_id and meter_reading are required' });
    }

    const meterVal = parseFloat(meter_reading);
    const employeeId = req.user.id;

    const selfieFile = req.files?.selfie?.[0];
    const meterFile = req.files?.meter_photo?.[0];

    const selfieUrl = selfieFile ? await storageService.uploadFile(selfieFile, 'selfies') : null;
    const meterPhotoUrl = meterFile ? await storageService.uploadFile(meterFile, 'meters') : null;

    const result = await transaction(async (client) => {
      // 1. Find today's check-in
      const today = new Date().toISOString().split('T')[0];
      const { rows: checkins } = await client.query(
        `SELECT * FROM vehicle_checkins
         WHERE employee_id = $1 AND vehicle_id = $2 AND checkin_time::date = $3 AND status = 'active'
         ORDER BY checkin_time DESC LIMIT 1`,
        [employeeId, vehicle_id, today]
      );

      if (checkins.length === 0) {
        throw Object.assign(new Error('No active check-in found for today'), { status: 400 });
      }

      const checkin = checkins[0];

      // 2. Check for duplicate checkout
      const { rows: existingOut } = await client.query(
        `SELECT id FROM vehicle_checkouts WHERE checkin_id = $1`,
        [checkin.id]
      );

      if (existingOut.length > 0) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'duplicate_checkout',
          severity: 'medium',
          title: 'Duplicate Check-out Attempt',
          message: `Employee ${req.user.name} attempted a duplicate check-out.`
        });
        throw Object.assign(new Error('Already checked out for this session'), { status: 400 });
      }

      // 3. Calculate distance and duration
      const openingKm = parseFloat(checkin.meter_reading);
      const closingKm = meterVal;
      const distanceKm = closingKm - openingKm;
      const checkinTime = new Date(checkin.checkin_time);
      const now = new Date();
      const durationMinutes = Math.round((now - checkinTime) / (1000 * 60));

      // 4. Validate
      if (distanceKm < 0) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'negative_km',
          severity: 'high',
          title: 'Negative Distance at Checkout',
          message: `Closing KM (${closingKm}) is less than Opening KM (${openingKm}).`,
          metadata: { opening: openingKm, closing: closingKm }
        });
      }

      if (distanceKm > 500) {
        await createAlert(client, {
          vehicle_id: parseInt(vehicle_id),
          employee_id: employeeId,
          alert_type: 'impossible_distance',
          severity: 'high',
          title: 'Impossible Distance Detected',
          message: `Distance of ${distanceKm} km in ${durationMinutes} minutes seems impossible.`,
          metadata: { distance: distanceKm, duration: durationMinutes }
        });
      }

      // 5. Insert checkout
      const { rows: checkout } = await client.query(
        `INSERT INTO vehicle_checkouts
         (vehicle_id, employee_id, checkin_id, gps_lat, gps_lng, gps_address,
          selfie_url, meter_photo_url, meter_reading, ocr_reading, ocr_confidence, ocr_raw_text,
          opening_km, closing_km, distance_km, duration_minutes, is_confirmed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [vehicle_id, employeeId, checkin.id, gps_lat, gps_lng, gps_address,
         selfieUrl, meterPhotoUrl, meterVal, ocr_reading ? parseFloat(ocr_reading) : null,
         ocr_confidence ? parseFloat(ocr_confidence) : null, ocr_raw_text,
         openingKm, closingKm, distanceKm, durationMinutes, true]
      );

      // 6. Update check-in status
      await client.query(
        `UPDATE vehicle_checkins SET status = 'completed' WHERE id = $1`,
        [checkin.id]
      );

      // 7. Update vehicle meter
      await client.query(
        'UPDATE vehicles SET current_meter = $1, updated_at = NOW() WHERE id = $2',
        [meterVal, vehicle_id]
      );

      // 8. Log meter
      await client.query(
        `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type, photo_url)
         VALUES ($1, $2, $3, 'checkout', $4, 'vehicle_checkouts', $5)`,
        [vehicle_id, employeeId, meterVal, checkout[0].id, meterPhotoUrl]
      );

      return {
        ...checkout[0],
        opening_km: openingKm,
        closing_km: closingKm,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
      };
    });

    res.status(201).json({ checkout: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/checkins/today - Today's check-in status for current user
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows: checkin } = await query(
      `SELECT vc.*, v.name as vehicle_name, v.number_plate
       FROM vehicle_checkins vc
       JOIN vehicles v ON v.id = vc.vehicle_id
       WHERE vc.employee_id = $1 AND vc.checkin_time::date = $2
       ORDER BY vc.checkin_time DESC LIMIT 1`,
      [req.user.id, today]
    );

    const { rows: checkout } = await query(
      `SELECT vo.* FROM vehicle_checkouts vo
       WHERE vo.employee_id = $1 AND vo.checkout_time::date = $2
       ORDER BY vo.checkout_time DESC LIMIT 1`,
      [req.user.id, today]
    );

    res.json({
      checkin: checkin?.[0] || null,
      checkout: checkout?.[0] || null,
      hasCheckedIn: (checkin?.length || 0) > 0,
      hasCheckedOut: (checkout?.length || 0) > 0
    });
  } catch (err) {
    console.error('Checkin status fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch checkin status' });
  }
});

// GET /api/checkins/all-today - All employees' check-in/out status today (manager/controller)
router.get('/all-today', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await query(`
      SELECT
        e.id, e.employee_id, e.name, e.designation,
        v.name as vehicle_name, v.number_plate, v.vehicle_id as v_id,
        vc.checkin_time, vc.meter_reading as checkin_meter, vc.status as checkin_status,
        vo.checkout_time, vo.meter_reading as checkout_meter, vo.distance_km, vo.duration_minutes
      FROM employees e
      JOIN vehicle_assignments va ON va.employee_id = e.id AND va.is_current = true
      JOIN vehicles v ON v.id = va.vehicle_id
      LEFT JOIN vehicle_checkins vc ON vc.employee_id = e.id AND vc.vehicle_id = v.id AND vc.checkin_time::date = $1
      LEFT JOIN vehicle_checkouts vo ON vo.employee_id = e.id AND vo.vehicle_id = v.id AND vo.checkout_time::date = $1
      WHERE e.is_active = true
      ORDER BY e.name
    `, [today]);

    res.json({ records: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

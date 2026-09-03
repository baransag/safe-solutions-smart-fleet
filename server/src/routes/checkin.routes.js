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
    let { vehicle_id, gps_lat, gps_lng, gps_address, meter_reading, ocr_reading, ocr_confidence, ocr_raw_text } = req.body;

    if (Array.isArray(vehicle_id)) {
      vehicle_id = vehicle_id[vehicle_id.length - 1];
    }
    const cleanVehicleId = parseInt(vehicle_id, 10);

    if (!cleanVehicleId || isNaN(cleanVehicleId) || !meter_reading) {
      return res.status(400).json({ error: 'vehicle_id and meter_reading are required' });
    }

    const meterVal = parseFloat(meter_reading);
    const employeeId = req.user.id;

    const selfieFile = req.files?.selfie?.[0];
    const meterFile = req.files?.meter_photo?.[0];

    const rawSelfieUrl = selfieFile ? await storageService.uploadFile(selfieFile, 'selfies') : null;
    const rawMeterPhotoUrl = meterFile ? await storageService.uploadFile(meterFile, 'meters') : null;
    const selfieUrl = rawSelfieUrl ? String(rawSelfieUrl).substring(0, 500) : null;
    const meterPhotoUrl = rawMeterPhotoUrl ? String(rawMeterPhotoUrl).substring(0, 500) : null;

    const result = await transaction(async (client) => {
      // 1. Verify vehicle assignment
      const { rows: assignment } = await client.query(
        `SELECT va.id, v.id as vid, v.vehicle_id as v_id, v.name as vehicle_name, v.current_meter
         FROM vehicle_assignments va
         JOIN vehicles v ON v.id = va.vehicle_id
         WHERE va.employee_id = $1 AND va.is_current = true AND v.id = $2`,
        [employeeId, cleanVehicleId]
      );

      if (assignment.length === 0) {
        await createAlert(client, {
          vehicle_id: cleanVehicleId,
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
        [employeeId, cleanVehicleId, today]
      );

      if (existing.length > 0) {
        await createAlert(client, {
          vehicle_id: cleanVehicleId,
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
          vehicle_id: cleanVehicleId,
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
        [cleanVehicleId, employeeId, gps_lat, gps_lng, gps_address, selfieUrl, meterPhotoUrl,
         meterVal, ocr_reading ? parseFloat(ocr_reading) : null,
         ocr_confidence ? parseFloat(ocr_confidence) : null, ocr_raw_text, true]
      );

      // 5. Update vehicle current meter
      await client.query(
        'UPDATE vehicles SET current_meter = $1, updated_at = NOW() WHERE id = $2',
        [meterVal, cleanVehicleId]
      );

      // 6. Log meter reading
      await client.query(
        `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type, photo_url)
         VALUES ($1, $2, $3, 'checkin', $4, 'vehicle_checkins', $5)`,
        [cleanVehicleId, employeeId, meterVal, checkin[0].id, meterPhotoUrl]
      );

      // 7. Auto-create linked attendance record (pending approval) if not yet marked today
      const { rows: existingAtt } = await client.query(
        `SELECT id FROM attendance_records WHERE employee_id = $1 AND check_in_time::date = $2`,
        [employeeId, today]
      );

      if (existingAtt.length === 0) {
        const now = new Date();
        const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
        await client.query(
          `INSERT INTO attendance_records (
            employee_id, check_in_time, check_in_lat, check_in_lng, status,
            attendance_type, location_name, project_name,
            approval_status, is_late, gps_status, distance_meters, notes,
            selfie_url
          ) VALUES ($1, NOW(), $2, $3, 'present', 'site', $4, $5, 'pending', $6, 'GPS Verified', 0, $7, $8)`,
          [
            employeeId,
            gps_lat || 31.4504,
            gps_lng || 73.1350,
            gps_address || 'Field / Fleet Operation',
            `Vehicle Check-In (${assignment[0].vehicle_name} - ${assignment[0].number_plate || ''})`,
            isLate,
            `Meter: ${meterVal} KM`,
            selfieUrl
          ]
        );
      }

      // 8. Send instant approval notification to Controller & Manager
      const { rows: controllers } = await client.query(
        `SELECT id FROM employees WHERE role IN ('manager', 'controller', 'boss', 'admin') AND is_active = true`
      );
      for (const c of controllers) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, link, metadata)
           VALUES ($1, 'New Vehicle Check-In Submitted', $2, 'info', '/approvals', $3)`,
          [
            c.id,
            `${req.user.name} submitted Vehicle Check-In for ${assignment[0].vehicle_name} (${meterVal} KM). Approval pending.`,
            JSON.stringify({
              employee_name: req.user.name,
              vehicle_name: assignment[0].vehicle_name,
              meter_reading: meterVal,
              selfie_url: selfieUrl,
              meter_photo_url: meterPhotoUrl,
              time: new Date().toISOString()
            })
          ]
        );
      }

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
    let { vehicle_id, gps_lat, gps_lng, gps_address, meter_reading, ocr_reading, ocr_confidence, ocr_raw_text } = req.body;

    if (Array.isArray(vehicle_id)) {
      vehicle_id = vehicle_id[vehicle_id.length - 1];
    }
    const cleanVehicleId = parseInt(vehicle_id, 10);

    if (!cleanVehicleId || isNaN(cleanVehicleId) || !meter_reading) {
      return res.status(400).json({ error: 'vehicle_id and meter_reading are required' });
    }

    const meterVal = parseFloat(meter_reading);
    const employeeId = req.user.id;

    const selfieFile = req.files?.selfie?.[0];
    const meterFile = req.files?.meter_photo?.[0];

    const rawSelfieUrl = selfieFile ? await storageService.uploadFile(selfieFile, 'selfies') : null;
    const rawMeterPhotoUrl = meterFile ? await storageService.uploadFile(meterFile, 'meters') : null;
    const selfieUrl = rawSelfieUrl ? String(rawSelfieUrl).substring(0, 500) : null;
    const meterPhotoUrl = rawMeterPhotoUrl ? String(rawMeterPhotoUrl).substring(0, 500) : null;

    const result = await transaction(async (client) => {
      // 1. Find today's check-in
      const today = new Date().toISOString().split('T')[0];
      let { rows: checkins } = await client.query(
        `SELECT * FROM vehicle_checkins
         WHERE employee_id = $1 AND vehicle_id = $2 AND checkin_time::date = $3 AND status = 'active'
         ORDER BY checkin_time DESC LIMIT 1`,
        [employeeId, cleanVehicleId, today]
      );

      let checkin;
      if (checkins.length === 0) {
        // Graceful fallback: If no check-in today, use vehicle's current meter as opening baseline
        const { rows: vehRows } = await client.query('SELECT * FROM vehicles WHERE id = $1', [cleanVehicleId]);
        const baseMeter = vehRows.length > 0 ? parseFloat(vehRows[0].current_meter || 0) : 0;
        const morningDispatchTime = `${today}T08:30:00+05:00`;

        const { rows: autoCheckin } = await client.query(
          `INSERT INTO vehicle_checkins (
             vehicle_id, employee_id, checkin_time, meter_reading, gps_lat, gps_lng,
             gps_address, status, is_confirmed
           ) VALUES ($1, $2, $3, $4, $5, $6, 'Head Office Dispatch, Faisalabad', 'active', true)
           RETURNING *`,
          [cleanVehicleId, employeeId, morningDispatchTime, baseMeter, gps_lat || 31.4504, gps_lng || 73.1350]
        );
        checkin = autoCheckin[0];
      } else {
        checkin = checkins[0];
      }

      // 2. Check for duplicate checkout
      const { rows: existingOut } = await client.query(
        `SELECT id FROM vehicle_checkouts WHERE checkin_id = $1`,
        [checkin.id]
      );

      if (existingOut.length > 0) {
        await createAlert(client, {
          vehicle_id: cleanVehicleId,
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
          vehicle_id: cleanVehicleId,
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
          vehicle_id: cleanVehicleId,
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
        [cleanVehicleId, employeeId, checkin.id, gps_lat, gps_lng, gps_address,
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
        [meterVal, cleanVehicleId]
      );

      // 8. Log meter
      await client.query(
        `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type, photo_url)
         VALUES ($1, $2, $3, 'checkout', $4, 'vehicle_checkouts', $5)`,
        [cleanVehicleId, employeeId, meterVal, checkout[0].id, meterPhotoUrl]
      );

      // 9. If employee has an open attendance record today, update attendance checkout as well
      let attCheckoutResult = null;
      const { rows: openAtt } = await client.query(
        `SELECT id, check_in_time, attendance_type, project_name, location_name
         FROM attendance_records
         WHERE employee_id = $1 AND check_in_time::date = $2 AND check_out_time IS NULL
         ORDER BY check_in_time DESC LIMIT 1`,
        [employeeId, today]
      );

      if (openAtt.length > 0) {
        const attRec = openAtt[0];
        const attInTime = new Date(attRec.check_in_time);
        const attHours = Math.max(0, Math.round(((now - attInTime) / (1000 * 60 * 60)) * 100) / 100);
        const { rows: updatedAtt } = await client.query(
          `UPDATE attendance_records
           SET check_out_time = NOW(),
               check_out_lat = COALESCE($1, check_out_lat),
               check_out_lng = COALESCE($2, check_out_lng),
               work_hours = $3
           WHERE id = $4
           RETURNING *`,
          [gps_lat || null, gps_lng || null, attHours, attRec.id]
        );
        attCheckoutResult = updatedAtt[0];
      }

      return {
        ...checkout[0],
        opening_km: openingKm,
        closing_km: closingKm,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        attendance_checkout: attCheckoutResult
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

// POST /api/checkins/manual-checkin - Manual Vehicle Check-in by Manager/Controller
router.post('/manual-checkin', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const { vehicle_id, employee_id, meter_reading, checkin_time, notes } = req.body;
    if (!vehicle_id || !employee_id || meter_reading === undefined) {
      return res.status(400).json({ error: 'vehicle_id, employee_id, and meter_reading are required' });
    }

    const meterVal = parseFloat(meter_reading);
    const inTime = checkin_time ? new Date(checkin_time).toISOString() : new Date().toISOString();

    const { rows: checkin } = await query(
      `INSERT INTO vehicle_checkins (
        vehicle_id, employee_id, checkin_time, meter_reading,
        gps_lat, gps_lng, gps_address, status, is_confirmed
      ) VALUES ($1, $2, $3, $4, 31.4504, 73.1350, $5, 'active', true)
      RETURNING *`,
      [vehicle_id, employee_id, inTime, meterVal, notes || 'Manual Check-in by Management']
    );

    // Update vehicle meter
    await query('UPDATE vehicles SET current_meter = $1, updated_at = NOW() WHERE id = $2', [meterVal, vehicle_id]);

    // Meter log
    await query(
      `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type)
       VALUES ($1, $2, $3, 'manual_checkin', $4, 'vehicle_checkins')`,
      [vehicle_id, employee_id, meterVal, checkin[0].id]
    );

    res.status(201).json({ message: 'Manual vehicle check-in recorded successfully!', checkin: checkin[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkins/manual-checkout - Manual Vehicle Check-out by Manager/Controller
router.post('/manual-checkout', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const { vehicle_id, employee_id, meter_reading, checkout_time, checkout_location, notes } = req.body;
    if (!vehicle_id || !employee_id || meter_reading === undefined) {
      return res.status(400).json({ error: 'vehicle_id, employee_id, and meter_reading are required' });
    }

    const closingKm = parseFloat(meter_reading);
    const outTime = checkout_time ? new Date(checkout_time).toISOString() : new Date().toISOString();

    // 1. Find or create checkin for baseline
    let { rows: checkins } = await query(
      `SELECT * FROM vehicle_checkins
       WHERE vehicle_id = $1 AND employee_id = $2 AND status = 'active'
       ORDER BY checkin_time DESC LIMIT 1`,
      [vehicle_id, employee_id]
    );

    let checkin = checkins[0];
    if (!checkin) {
      const { rows: autoIn } = await query(
        `INSERT INTO vehicle_checkins (
          vehicle_id, employee_id, checkin_time, meter_reading,
          gps_lat, gps_lng, gps_address, status, is_confirmed
        ) VALUES ($1, $2, NOW() - INTERVAL '6 hours', 0.00, 31.4504, 73.1350, 'Head Office Depot', 'active', true)
        RETURNING *`,
        [vehicle_id, employee_id]
      );
      checkin = autoIn[0];
    }

    const openingKm = parseFloat(checkin.meter_reading || 0);
    const distanceKm = Math.max(0, +(closingKm - openingKm).toFixed(2));
    const durationMinutes = Math.max(0, Math.round((new Date(outTime) - new Date(checkin.checkin_time)) / (1000 * 60)));

    // 2. Insert checkout
    const { rows: checkout } = await query(
      `INSERT INTO vehicle_checkouts (
        checkin_id, vehicle_id, employee_id, checkout_time,
        meter_reading, distance_km, duration_minutes,
        gps_lat, gps_lng, gps_address, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 31.4504, 73.1350, $8, $9)
      RETURNING *`,
      [
        checkin.id, vehicle_id, employee_id, outTime,
        closingKm, distanceKm, durationMinutes,
        checkout_location || 'Head Office Faisalabad',
        notes || 'Manual Check-out by Management'
      ]
    );

    // 3. Update checkin status to completed
    await query(`UPDATE vehicle_checkins SET status = 'completed' WHERE id = $1`, [checkin.id]);

    // 4. Update vehicle current meter
    await query('UPDATE vehicles SET current_meter = $1, updated_at = NOW() WHERE id = $2', [closingKm, vehicle_id]);

    // 5. Meter log
    await query(
      `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type)
       VALUES ($1, $2, $3, 'manual_checkout', $4, 'vehicle_checkouts')`,
      [vehicle_id, employee_id, closingKm, checkout[0].id]
    );

    res.status(201).json({ message: 'Manual vehicle check-out recorded successfully!', checkout: checkout[0], distance_km: distanceKm });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

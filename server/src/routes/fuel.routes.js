const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadReceipt } = require('../middleware/upload.middleware');

// POST /api/fuel - Submit fuel entry
router.post('/', authenticate, uploadReceipt.single('receipt_photo'), async (req, res, next) => {
  try {
    const { vehicle_id, pump_name, fuel_amount, liters, meter_reading, gps_lat, gps_lng, gps_address } = req.body;

    if (!vehicle_id || !fuel_amount || !liters) {
      return res.status(400).json({ error: 'vehicle_id, fuel_amount, and liters are required' });
    }

    const result = await transaction(async (client) => {
      // Verify vehicle assignment
      const { rows: assignment } = await client.query(
        `SELECT va.id FROM vehicle_assignments va
         WHERE va.employee_id = $1 AND va.vehicle_id = $2 AND va.is_current = true`,
        [req.user.id, vehicle_id]
      );

      if (assignment.length === 0) {
        throw Object.assign(new Error('This vehicle is not assigned to you'), { status: 403 });
      }

      // Check for duplicate fuel entry (same vehicle, same day, similar amount)
      const today = new Date().toISOString().split('T')[0];
      const { rows: duplicate } = await client.query(
        `SELECT id FROM fuel_logs
         WHERE vehicle_id = $1 AND employee_id = $2 AND submitted_at::date = $3
         AND ABS(liters - $4) < 1`,
        [vehicle_id, req.user.id, today, parseFloat(liters)]
      );

      if (duplicate.length > 0) {
        // Alert but still allow
        await client.query(
          `INSERT INTO vehicle_alerts (vehicle_id, employee_id, alert_type, severity, title, message, metadata)
           VALUES ($1, $2, 'duplicate_fuel', 'medium', 'Possible Duplicate Fuel Entry',
                   $3, $4)`,
          [vehicle_id, req.user.id,
           `Employee ${req.user.name} submitted a similar fuel entry today.`,
           JSON.stringify({ liters, fuel_amount })]
        );
      }

      // Check for fuel without travel
      const { rows: checkins } = await client.query(
        `SELECT id FROM vehicle_checkins WHERE vehicle_id = $1 AND checkin_time::date = $2`,
        [vehicle_id, today]
      );

      if (checkins.length === 0) {
        await client.query(
          `INSERT INTO vehicle_alerts (vehicle_id, employee_id, alert_type, severity, title, message)
           VALUES ($1, $2, 'fuel_without_travel', 'medium', 'Fuel Without Travel',
                   $3)`,
          [vehicle_id, req.user.id,
           `Fuel submitted for vehicle without any check-in today by ${req.user.name}.`]
        );
      }

      // Check excessive fuel (> 20 liters for a bike)
      const { rows: vehicleData } = await client.query(
        'SELECT type, tank_capacity FROM vehicles WHERE id = $1',
        [vehicle_id]
      );
      const vehicle = vehicleData[0];
      const maxLiters = vehicle?.tank_capacity || (vehicle?.type === 'bike' ? 15 : 60);

      if (parseFloat(liters) > maxLiters) {
        await client.query(
          `INSERT INTO vehicle_alerts (vehicle_id, employee_id, alert_type, severity, title, message, metadata)
           VALUES ($1, $2, 'excessive_fuel', 'high', 'Excessive Fuel Entry',
                   $3, $4)`,
          [vehicle_id, req.user.id,
           `${parseFloat(liters)}L exceeds max capacity of ${maxLiters}L for this vehicle.`,
           JSON.stringify({ liters: parseFloat(liters), max: maxLiters })]
        );
      }

      const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;

      const { rows: fuel } = await client.query(
        `INSERT INTO fuel_logs
         (vehicle_id, employee_id, receipt_photo_url, pump_name, fuel_amount, liters,
          meter_reading, gps_lat, gps_lng, gps_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [vehicle_id, req.user.id, receiptUrl, pump_name,
         parseFloat(fuel_amount), parseFloat(liters),
         meter_reading ? parseFloat(meter_reading) : null,
         gps_lat, gps_lng, gps_address]
      );

      // Log meter if provided
      if (meter_reading) {
        await client.query(
          `INSERT INTO vehicle_meter_logs (vehicle_id, employee_id, reading, source, reference_id, reference_type, photo_url)
           VALUES ($1, $2, $3, 'fuel', $4, 'fuel_logs', $5)`,
          [vehicle_id, req.user.id, parseFloat(meter_reading), fuel[0].id, receiptUrl]
        );
      }

      return fuel[0];
    });

    res.status(201).json({ fuel: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/fuel - List fuel entries
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, vehicle_id, start_date, end_date } = req.query;
    let sql = `SELECT fl.*, v.name as vehicle_name, v.number_plate, v.vehicle_id as v_id,
                      e.name as employee_name, e.employee_id as emp_id,
                      a.name as approver_name
               FROM fuel_logs fl
               JOIN vehicles v ON v.id = fl.vehicle_id
               JOIN employees e ON e.id = fl.employee_id
               LEFT JOIN employees a ON a.id = fl.approved_by
               WHERE 1=1`;
    const params = [];

    if (req.user.role === 'employee') {
      params.push(req.user.id);
      sql += ` AND fl.employee_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND fl.approval_status = $${params.length}`;
    }
    if (vehicle_id) {
      params.push(vehicle_id);
      sql += ` AND fl.vehicle_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      sql += ` AND fl.submitted_at::date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND fl.submitted_at::date <= $${params.length}`;
    }

    sql += ' ORDER BY fl.submitted_at DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json({ fuelLogs: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/fuel/:id/approve
router.put('/:id/approve', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { approval_status, approval_notes } = req.body;

    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'approval_status must be approved or rejected' });
    }

    const { rows } = await query(
      `UPDATE fuel_logs SET
        approval_status = $1, approved_by = $2, approval_notes = $3, approved_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [approval_status, req.user.id, approval_notes, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fuel entry not found' });
    }

    // Notify employee
    const fuel = rows[0];
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [fuel.employee_id,
       `Fuel Request ${approval_status === 'approved' ? 'Approved' : 'Rejected'}`,
       `Your fuel request of ${fuel.liters}L has been ${approval_status}.`,
       approval_status === 'approved' ? 'success' : 'warning']
    );

    res.json({ fuel: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

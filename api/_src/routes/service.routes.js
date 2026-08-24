const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/vehicle-services
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { vehicle_id } = req.query;
    let sql = `SELECT vs.*, v.name as vehicle_name, v.number_plate, v.vehicle_id as v_id,
                      e.name as created_by_name
               FROM vehicle_services vs
               JOIN vehicles v ON v.id = vs.vehicle_id
               LEFT JOIN employees e ON e.id = vs.created_by
               WHERE 1=1`;
    const params = [];

    if (vehicle_id) {
      params.push(vehicle_id);
      sql += ` AND vs.vehicle_id = $${params.length}`;
    }

    sql += ' ORDER BY vs.service_date DESC';

    const { rows } = await query(sql, params);
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicle-services
router.post('/', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const {
      vehicle_id, service_type, description, service_date,
      next_service_date, next_service_km, cost, odometer, vendor, notes
    } = req.body;

    if (!vehicle_id || !service_type || !service_date) {
      return res.status(400).json({ error: 'vehicle_id, service_type, and service_date are required' });
    }

    const { rows } = await query(
      `INSERT INTO vehicle_services
       (vehicle_id, service_type, description, service_date, next_service_date,
        next_service_km, cost, odometer, vendor, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [vehicle_id, service_type, description, service_date, next_service_date,
       next_service_km, cost, odometer, vendor, notes, req.user.id]
    );

    res.status(201).json({ service: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicle-services/due - Upcoming services
router.get('/due', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT DISTINCT ON (vs.vehicle_id)
        vs.*, v.name as vehicle_name, v.number_plate, v.vehicle_id as v_id, v.current_meter
      FROM vehicle_services vs
      JOIN vehicles v ON v.id = vs.vehicle_id
      WHERE vs.next_service_date IS NOT NULL
        AND vs.next_service_date <= CURRENT_DATE + INTERVAL '30 days'
        AND v.is_active = true
      ORDER BY vs.vehicle_id, vs.next_service_date ASC
    `);
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

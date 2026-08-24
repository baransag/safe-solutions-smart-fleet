const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/alerts
router.get('/', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const { resolved, severity, type } = req.query;
    let sql = `SELECT va.*, v.name as vehicle_name, v.number_plate, v.vehicle_id as v_id,
                      e.name as employee_name, e.employee_id as emp_id,
                      r.name as resolver_name
               FROM vehicle_alerts va
               LEFT JOIN vehicles v ON v.id = va.vehicle_id
               LEFT JOIN employees e ON e.id = va.employee_id
               LEFT JOIN employees r ON r.id = va.resolved_by
               WHERE 1=1`;
    const params = [];

    if (resolved !== undefined) {
      params.push(resolved === 'true');
      sql += ` AND va.is_resolved = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      sql += ` AND va.severity = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND va.alert_type = $${params.length}`;
    }

    sql += ' ORDER BY va.created_at DESC LIMIT 100';

    const { rows } = await query(sql, params);
    res.json({ alerts: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const { resolution_notes } = req.body;
    const { rows } = await query(
      `UPDATE vehicle_alerts SET is_resolved = true, resolved_by = $1, resolved_at = NOW(),
       resolution_notes = $2 WHERE id = $3 RETURNING *`,
      [req.user.id, resolution_notes, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

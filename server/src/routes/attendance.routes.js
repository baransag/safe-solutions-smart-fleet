const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// POST /api/attendance/check-in
router.post('/check-in', authenticate, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;

    // Check for existing check-in today
    const today = new Date().toISOString().split('T')[0];
    const { rows: existing } = await query(
      `SELECT id FROM attendance_records
       WHERE employee_id = $1 AND check_in_time::date = $2 AND check_out_time IS NULL`,
      [req.user.id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const { rows } = await query(
      `INSERT INTO attendance_records (employee_id, check_in_time, check_in_lat, check_in_lng, status)
       VALUES ($1, NOW(), $2, $3, 'present')
       RETURNING *`,
      [req.user.id, lat, lng]
    );

    res.status(201).json({ attendance: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/check-out
router.post('/check-out', authenticate, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const { rows: active } = await query(
      `SELECT id, check_in_time FROM attendance_records
       WHERE employee_id = $1 AND check_in_time::date = $2 AND check_out_time IS NULL`,
      [req.user.id, today]
    );

    if (active.length === 0) {
      return res.status(400).json({ error: 'No active check-in found for today' });
    }

    const checkInTime = new Date(active[0].check_in_time);
    const now = new Date();
    const workHours = ((now - checkInTime) / (1000 * 60 * 60)).toFixed(2);

    const { rows } = await query(
      `UPDATE attendance_records
       SET check_out_time = NOW(), check_out_lat = $1, check_out_lng = $2, work_hours = $3
       WHERE id = $4
       RETURNING *`,
      [lat, lng, workHours, active[0].id]
    );

    res.json({ attendance: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await query(
      `SELECT * FROM attendance_records WHERE employee_id = $1 AND check_in_time::date = $2`,
      [req.user.id, today]
    );
    res.json({ attendance: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    let sql = `SELECT ar.*, e.name as employee_name, e.employee_id as emp_id
               FROM attendance_records ar
               JOIN employees e ON e.id = ar.employee_id
               WHERE 1=1`;
    const params = [];

    // Employees can only see their own, managers/controllers see all
    if (req.user.role === 'employee') {
      params.push(req.user.id);
      sql += ` AND ar.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND ar.employee_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      sql += ` AND ar.check_in_time::date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND ar.check_in_time::date <= $${params.length}`;
    }

    sql += ' ORDER BY ar.check_in_time DESC LIMIT 100';

    const { rows } = await query(sql, params);
    res.json({ records: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/summary
router.get('/summary', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { rows: todayStats } = await query(`
      SELECT
        COUNT(DISTINCT ar.employee_id) as present_today,
        (SELECT COUNT(*) FROM employees WHERE is_active = true) as total_employees,
        COUNT(CASE WHEN ar.check_out_time IS NULL THEN 1 END) as currently_checked_in,
        COALESCE(AVG(ar.work_hours), 0) as avg_hours
      FROM attendance_records ar
      WHERE ar.check_in_time::date = $1
    `, [today]);

    res.json({ summary: todayStats[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

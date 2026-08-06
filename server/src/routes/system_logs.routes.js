const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/system-logs - Get audit logs (admin, boss, controller)
router.get('/', authenticate, authorize('admin', 'boss', 'controller'), async (req, res, next) => {
  try {
    const { level, module: mod, limit = 50, offset = 0 } = req.query;
    let sql =
      SELECT sl.id, sl.action, sl.module, sl.details, sl.ip_address, sl.level, sl.created_at,
      e.name as employee_name, e.employee_id, e.role
      FROM system_logs sl
      LEFT JOIN employees e ON e.id = sl.employee_id
      WHERE 1 = 1
      `;
    const params = [];

    if (level) {
      params.push(level);
      sql += ` AND sl.level = $${ params.length } `;
    }
    if (mod) {
      params.push(mod);
      sql += ` AND sl.module = $${ params.length } `;
    }

    sql += ` ORDER BY sl.created_at DESC LIMIT $${ params.length + 1 } OFFSET $${ params.length + 2 } `;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(sql, params);
    const countRes = await query('SELECT COUNT(*) FROM system_logs');

    res.json({ logs: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// POST /api/system-logs - Create audit log entry
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { action, module: mod, details, level = 'info' } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    const { rows } = await query(
      `INSERT INTO system_logs(employee_id, action, module, details, ip_address, user_agent, level)
    VALUES($1, $2, $3, $4, $5, $6, $7)
    RETURNING * `,
      [req.user.id, action, mod, details, ip, userAgent, level]
    );

    res.status(201).json({ log: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

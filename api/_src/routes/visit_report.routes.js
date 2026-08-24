const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// POST /api/visit-reports - Submit visit reports (single or multiple rows)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { reports, report } = req.body;
    const items = Array.isArray(reports) ? reports : (report ? [report] : [req.body]);
    const userId = req.user.id;
    const userName = req.user.name;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No visit report data provided' });
    }

    const inserted = [];
    for (const r of items) {
      if (!r.project_location || !r.purpose_of_visit) {
        continue;
      }

      const { rows } = await query(`
        INSERT INTO daily_visit_reports (
          employee_id, sales_person_name, visit_date, project_location,
          client_name, contractor_name, architect_consultant,
          contact_number, purpose_of_visit, product_of_interest, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        userId,
        r.sales_person_name || userName,
        r.visit_date || new Date().toISOString().split('T')[0],
        r.project_location,
        r.client_name || null,
        r.contractor_name || null,
        r.architect_consultant || null,
        r.contact_number || null,
        r.purpose_of_visit,
        r.product_of_interest || null,
        r.remarks || null
      ]);

      inserted.push(rows[0]);
    }

    // Send notification to Boss & Controller
    const { rows: managers } = await query(`SELECT id FROM employees WHERE role IN ('boss', 'controller', 'manager', 'admin') AND is_active = true`);
    for (const m of managers) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, 'New Daily Visit Report Submitted', $2, 'info', '/visit-reports')
      `, [m.id, `${userName} submitted ${inserted.length} Daily Field Visit Report(s).`]);
    }

    res.status(201).json({ success: true, reports: inserted });
  } catch (err) {
    next(err);
  }
});

// GET /api/visit-reports - List visit reports
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { date, employee_id, start_date, end_date } = req.query;
    let sql = `
      SELECT vr.*, e.employee_id as emp_code, e.department, e.designation
      FROM daily_visit_reports vr
      JOIN employees e ON e.id = vr.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'employee') {
      params.push(req.user.id);
      sql += ` AND vr.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND vr.employee_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND vr.visit_date = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      sql += ` AND vr.visit_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND vr.visit_date <= $${params.length}`;
    }

    sql += ' ORDER BY vr.visit_date DESC, vr.created_at DESC LIMIT 300';

    const { rows } = await query(sql, params);
    res.json({ reports: rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/visit-reports/:id
router.delete('/:id', authenticate, authorize('admin', 'boss', 'controller', 'manager'), async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM daily_visit_reports WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, message: 'Visit report deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

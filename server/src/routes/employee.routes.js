const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

// GET /api/employees - List all employees
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, role, department, active } = req.query;
    let sql = `SELECT id, employee_id, name, email, phone, designation, department, role, avatar_url, is_active, created_at
               FROM employees WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR employee_id ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    if (department) {
      params.push(department);
      sql += ` AND department = $${params.length}`;
    }
    if (active !== undefined) {
      params.push(active === 'true');
      sql += ` AND is_active = $${params.length}`;
    }

    sql += ' ORDER BY name ASC';

    const { rows } = await query(sql, params);
    res.json({ employees: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.id, e.employee_id, e.name, e.email, e.phone, e.designation, e.department,
              e.role, e.avatar_url, e.is_active, e.created_at,
              va.id as assignment_id, v.vehicle_id as assigned_vehicle_id, v.name as vehicle_name,
              v.number_plate as vehicle_plate, v.type as vehicle_type
       FROM employees e
       LEFT JOIN vehicle_assignments va ON va.employee_id = e.id AND va.is_current = true
       LEFT JOIN vehicles v ON v.id = va.vehicle_id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ employee: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees - Create employee (manager/controller only)
router.post('/', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { employee_id, name, email, phone, designation, department, role, password } = req.body;

    if (!employee_id || !name || !email || !password) {
      return res.status(400).json({ error: 'employee_id, name, email, and password are required' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO employees (employee_id, name, email, phone, designation, department, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, employee_id, name, email, phone, designation, department, role, is_active, created_at`,
      [employee_id, name, email.toLowerCase().trim(), phone, designation, department, role || 'employee', hash]
    );

    res.status(201).json({ employee: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Employee ID or email already exists' });
    }
    next(err);
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { name, phone, designation, department, role, is_active } = req.body;

    const { rows } = await query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        designation = COALESCE($3, designation),
        department = COALESCE($4, department),
        role = COALESCE($5, role),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7
       RETURNING id, employee_id, name, email, phone, designation, department, role, is_active`,
      [name, phone, designation, department, role, is_active, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ employee: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/:id/avatar
router.post('/:id/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Avatar image is required' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await query('UPDATE employees SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, req.params.id]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

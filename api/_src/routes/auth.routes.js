const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, generateToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

// POST /api/auth/login
router.post('/login', validate({
  email: { required: true },
  password: { required: true, min: 4 }
}), async (req, res, next) => {
  const { email = '', password = '' } = req.body || {};
  const cleanEmail = String(email).toLowerCase().trim();

  try {
    const { rows } = await query(
      `SELECT id, employee_id, name, email, role, password_hash, designation, department, avatar_url, is_active 
       FROM employees 
       WHERE LOWER(email) = $1 OR LOWER(employee_id) = $1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/employee ID or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email/employee ID or password' });
    }

    const payload = { 
      id: user.id, 
      employee_id: user.employee_id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    };

    return res.json({
      token: generateToken(payload),
      refreshToken: generateRefreshToken({ id: user.id }),
      user: { 
        id: user.id, 
        employee_id: user.employee_id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        designation: user.designation, 
        department: user.department, 
        avatar_url: user.avatar_url 
      }
    });
  } catch (err) {
    console.error('Database login error:', err.message);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, employee_id, name, email, phone, role, designation, department, avatar_url, is_active, created_at
       FROM employees WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    console.error('Database /me error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, validate({
  currentPassword: { required: true },
  newPassword: { required: true, min: 6 }
}), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query('SELECT password_hash FROM employees WHERE id = $1', [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'safe-solutions-refresh-secret-2024');

    const { rows } = await query(
      'SELECT id, employee_id, name, email, role FROM employees WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    const user = rows[0];
    const token = generateToken({
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.json({ token });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    next(err);
  }
});

module.exports = router;

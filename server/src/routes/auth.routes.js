const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, generateToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

const MOCK_USERS = [
  { id: 0, employee_id: 'ADMIN001', name: 'SAFE SOLUTIONS Boss', email: 'boss@safesolutions.com', phone: '', role: 'controller', designation: 'Managing Director', department: 'Executive', avatar_url: '/assets/images/logo.jpeg', pass: 'SS@Admin26' },
  { id: 1, employee_id: 'EMP001', name: 'M. Husnain Farooq', email: 'baransag68@gmail.com', phone: '03468760963', role: 'controller', designation: 'Controller', department: 'Management', avatar_url: '/assets/images/Husnain.jpeg', pass: 'Controller@2024' },
  { id: 2, employee_id: 'EMP002', name: 'Samaira Mubashar', email: 'sm.bajwa786fsd@gmail.com', phone: '03006646124', role: 'manager', designation: 'Manager Accounts & Finance', department: 'Finance', avatar_url: '/assets/images/Samaira.jpeg', pass: 'Safe@2024' },
  { id: 3, employee_id: 'EMP003', name: 'Engr. Shahzaib Ahmad', email: 'zaiberana37@gmail.com', phone: '03007684761', role: 'employee', designation: 'Marketing Executive', department: 'Marketing', avatar_url: '/assets/images/Shahzaib.jpeg', pass: 'Safe@2024' },
  { id: 4, employee_id: 'EMP004', name: 'Shahbaz Ahmed', email: 'shabazbutt1132@gmail.com', phone: '03237684200', role: 'employee', designation: 'Application Supervisor', department: 'Operations', avatar_url: '/assets/images/Shahbaz.jpeg', pass: 'Safe@2024' },
  { id: 5, employee_id: 'EMP005', name: 'Rehan Ali', email: 'Arehan079@gmail.com', phone: '03237674000', role: 'employee', designation: 'Application Supervisor', department: 'Operations', avatar_url: '/assets/images/Rehan.jpeg', pass: 'Safe@2024' },
  { id: 6, employee_id: 'EMP006', name: 'Adnan Tahir', email: 'tahiradnan31@gmail.com', phone: '03237864100', role: 'employee', designation: 'ASM', department: 'Sales', avatar_url: '/assets/images/Adnan-Tahir.jpeg', pass: 'Safe@2024' },
  { id: 7, employee_id: 'EMP007', name: 'Adnan Ali', email: 'mianadnanali88@gmail.com', phone: '03217684400', role: 'employee', designation: 'Area Sales Manager', department: 'Sales', avatar_url: '/assets/images/Adnan-Ali.jpeg', pass: 'Safe@2024' },
  { id: 8, employee_id: 'EMP008', name: 'M. Soulat Raza', email: 'mirzasoulat112@gmail.com', phone: '03397684700', role: 'employee', designation: 'Execution Officer', department: 'Operations', avatar_url: '/assets/images/Soulat.jpeg', pass: 'Safe@2024' },
  { id: 9, employee_id: 'EMP009', name: 'Muneeb Ahmad', email: 'muneeb01250@gmail.com', phone: '03077684400', role: 'employee', designation: 'Store & Inventory', department: 'Inventory', avatar_url: '/assets/images/Muneeb.jpeg', pass: 'Safe@2024' },
  { id: 10, employee_id: 'EMP010', name: 'M. Zahid', email: 'muhammadzahid5324@gmail.com', phone: '03079682902', role: 'employee', designation: 'Helper', department: 'Support', avatar_url: '/assets/images/Zahid.jpeg', pass: 'Safe@2024', number_plate: 'FDL-6381-07' },
  { id: 11, employee_id: 'EMP011', name: 'Tajammul Mushtaq', email: 'tajammulbajwa545@gmail.com', phone: '03217684500', role: 'employee', designation: 'Area Sales Manager', department: 'Sales', avatar_url: '/assets/images/Tajammul.jpeg', pass: 'Safe@2024' }
];

// POST /api/auth/login
router.post('/login', validate({
  email: { required: true },
  password: { required: true, min: 4 }
}), async (req, res, next) => {
  const { email = '', password = '' } = req.body || {};
  const cleanEmail = String(email).toLowerCase().trim();

  try {
    const { rows } = await query(
      'SELECT id, employee_id, name, email, role, password_hash, designation, department, avatar_url, is_active FROM employees WHERE LOWER(email) = $1 OR LOWER(employee_id) = $1',
      [cleanEmail]
    );

    if (rows.length > 0) {
      const user = rows[0];
      if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (valid) {
        const payload = { id: user.id, employee_id: user.employee_id, name: user.name, email: user.email, role: user.role };
        return res.json({
          token: generateToken(payload),
          refreshToken: generateRefreshToken({ id: user.id }),
          user: { id: user.id, employee_id: user.employee_id, name: user.name, email: user.email, role: user.role, designation: user.designation, department: user.department, avatar_url: user.avatar_url }
        });
      }
    }
  } catch (err) {
    console.warn('DB query notice, checking static account authentication:', err.message);
  }

  // Cloud/Fallback Auth Check
  const fallbackUser = MOCK_USERS.find(u =>
    u.email.toLowerCase() === cleanEmail ||
    u.employee_id.toLowerCase() === cleanEmail ||
    (cleanEmail === 'boss' && u.employee_id === 'ADMIN001')
  );
  if (fallbackUser && password === fallbackUser.pass) {
    const payload = { id: fallbackUser.id, employee_id: fallbackUser.employee_id, name: fallbackUser.name, email: fallbackUser.email, role: fallbackUser.role };
    return res.json({
      token: generateToken(payload),
      refreshToken: generateRefreshToken({ id: fallbackUser.id }),
      user: { id: fallbackUser.id, employee_id: fallbackUser.employee_id, name: fallbackUser.name, email: fallbackUser.email, role: fallbackUser.role, designation: fallbackUser.designation, department: fallbackUser.department, avatar_url: fallbackUser.avatar_url }
    });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, employee_id, name, email, phone, role, designation, department, avatar_url, is_active, created_at
       FROM employees WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length > 0) {
      return res.json({ user: rows[0] });
    }
  } catch (err) {
    console.warn('DB query notice in /me:', err.message);
  }

  const fallbackUser = MOCK_USERS.find(u => u.id === parseInt(req.user.id) || u.email === req.user.email);
  if (fallbackUser) {
    return res.json({ user: fallbackUser });
  }

  res.json({ user: req.user });
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
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');

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

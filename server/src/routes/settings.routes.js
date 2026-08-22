const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/settings - Get current System Settings
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {
      vehicle_attendance_enabled: true,
      employee_attendance_enabled: true,
      office_attendance_enabled: true,
      site_attendance_enabled: true
    };

    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value === 'true';
    });

    res.json({ settings });
  } catch (err) {
    // Fallback default enabled in production
    res.json({
      settings: {
        vehicle_attendance_enabled: true,
        employee_attendance_enabled: true,
        office_attendance_enabled: true,
        site_attendance_enabled: true
      }
    });
  }
});

// PUT /api/settings - Update System Settings (Boss, Admin, Controller, Manager)
router.put('/', authenticate, authorize('manager', 'controller', 'boss', 'admin'), async (req, res, next) => {
  try {
    const updates = req.body;
    const allowedKeys = [
      'vehicle_attendance_enabled',
      'employee_attendance_enabled',
      'office_attendance_enabled',
      'site_attendance_enabled'
    ];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        const strVal = String(updates[key] === true || updates[key] === 'true');
        await query(
          `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (setting_key) DO UPDATE
           SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
          [key, strVal, req.user.id]
        );
      }
    }

    const { rows } = await query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {
      vehicle_attendance_enabled: true,
      employee_attendance_enabled: true,
      office_attendance_enabled: true,
      site_attendance_enabled: true
    };

    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value === 'true';
    });

    res.json({ settings, message: 'System Settings updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

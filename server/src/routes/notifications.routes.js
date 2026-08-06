const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authorize } = require('../middleware/auth.middleware');

// Get all notifications for the current user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark all as read
router.post('/mark-read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

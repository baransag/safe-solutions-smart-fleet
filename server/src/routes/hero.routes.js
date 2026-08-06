const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authorize } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure Multer for Hero Media Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/media'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hero-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Create New Hero Post
router.post('/', authorize(['admin', 'boss', 'controller', 'manager']), upload.single('media_file'), async (req, res) => {
  try {
    const { title, description, rich_text, priority, status, start_date, expiry_date } = req.body;
    let media_url = null;
    let media_type = 'none';

    if (req.file) {
      media_url = `/uploads/media/${req.file.filename}`;
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) media_type = 'image';
      else if (mime.startsWith('video/')) media_type = 'video';
      else if (mime === 'application/pdf') media_type = 'pdf';
    }

    const query = `
      INSERT INTO hero_posts (title, description, rich_text, media_url, media_type, priority, status, start_date, expiry_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      title, description, rich_text, media_url, media_type,
      priority || 'normal', status || 'published',
      start_date || new Date(), expiry_date || null, req.user.id
    ];

    const result = await pool.query(query, values);

    // Create Notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT id, $1, $2, 'alert' FROM employees WHERE role != 'employee'`,
      [`New Company Announcement: ${title}`, `A new post has been published.`]
    );

    res.status(201).json({ success: true, post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Active Hero Posts
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, e.name as author_name 
      FROM hero_posts h 
      LEFT JOIN employees e ON h.created_by = e.id
      WHERE h.status = 'published'
        AND h.start_date <= NOW()
        AND (h.expiry_date IS NULL OR h.expiry_date > NOW())
      ORDER BY 
        CASE WHEN priority = 'high' THEN 1 WHEN priority = 'normal' THEN 2 ELSE 3 END,
        created_at DESC
    `);
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get All Hero Posts (For Management)
router.get('/all', authorize(['admin', 'boss', 'controller', 'manager']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, e.name as author_name 
      FROM hero_posts h 
      LEFT JOIN employees e ON h.created_by = e.id
      ORDER BY created_at DESC
    `);
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Post
router.delete('/:id', authorize(['admin', 'boss', 'controller', 'manager']), async (req, res) => {
  try {
    await pool.query('DELETE FROM hero_posts WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

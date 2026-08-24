const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure media upload directory exists
const mediaDir = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Configure Multer for Hero Media Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mediaDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hero-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/hero-slides — Return active hero slides (public, no auth needed for dashboard display)
router.get('/', async (req, res) => {
  try {
    // First try hero_slides table (seeded data)
    const { rows: slides } = await query(
      `SELECT * FROM hero_slides WHERE is_active = true ORDER BY sort_order ASC`
    );
    
    // Also get hero_posts if any
    const { rows: posts } = await query(`
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
    
    res.json({ slides, posts });
  } catch (err) {
    console.error('Hero slides fetch error:', err.message);
    res.json({ slides: [], posts: [] });
  }
});

// Create New Hero Post
router.post('/', authenticate, authorize('admin', 'boss', 'controller', 'manager'), upload.single('media_file'), async (req, res) => {
  try {
    const { title, description, rich_text, priority, status, start_date, expiry_date, end_date, category } = req.body;
    let media_url = null;
    let media_type = 'none';

    if (req.file) {
      media_url = `/uploads/media/${req.file.filename}`;
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) media_type = 'image';
      else if (mime.startsWith('video/')) media_type = 'video';
      else if (mime === 'application/pdf') media_type = 'pdf';
    }

    const result = await pool.query(`
      INSERT INTO hero_posts (title, description, rich_text, media_url, media_type, priority, status, start_date, expiry_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title, description || null, rich_text || category || 'Company Notice', media_url, media_type,
      priority || 'normal', status || 'published',
      start_date || new Date(), expiry_date || end_date || null, req.user.id
    ]);

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

// Update / Edit Hero Post or Toggle Status
router.put('/:id', authenticate, authorize('admin', 'boss', 'controller', 'manager'), upload.single('media_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, rich_text, priority, status, is_active, start_date, expiry_date, end_date, category } = req.body;

    let statusVal = status;
    if (is_active !== undefined) {
      statusVal = (is_active === true || is_active === 'true') ? 'published' : 'archived';
    }

    let media_url = undefined;
    let media_type = undefined;
    if (req.file) {
      media_url = `/uploads/media/${req.file.filename}`;
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) media_type = 'image';
      else if (mime.startsWith('video/')) media_type = 'video';
      else if (mime === 'application/pdf') media_type = 'pdf';
    }

    const { rows: existing } = await pool.query('SELECT * FROM hero_posts WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Announcement not found.' });
    }

    const updatedResult = await pool.query(`
      UPDATE hero_posts
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          rich_text = COALESCE($3, rich_text),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          start_date = COALESCE($6, start_date),
          expiry_date = COALESCE($7, expiry_date),
          media_url = COALESCE($8, media_url),
          media_type = COALESCE($9, media_type),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      (rich_text || category) !== undefined ? (rich_text || category) : null,
      priority !== undefined ? priority : null,
      statusVal !== undefined ? statusVal : null,
      start_date !== undefined ? start_date : null,
      (expiry_date || end_date) !== undefined ? (expiry_date || end_date) : null,
      media_url !== undefined ? media_url : null,
      media_type !== undefined ? media_type : null,
      id
    ]);

    res.json({ success: true, post: updatedResult.rows[0] });
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
router.get('/all', authenticate, authorize('admin', 'boss', 'controller', 'manager'), async (req, res) => {
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
router.delete('/:id', authenticate, authorize('admin', 'boss', 'controller', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM hero_posts WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

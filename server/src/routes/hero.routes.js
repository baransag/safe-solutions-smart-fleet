const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadSlide } = require('../middleware/upload.middleware');

// GET /api/hero-slides
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM hero_slides WHERE is_active = true ORDER BY sort_order ASC, created_at DESC'
    );
    if (rows && rows.length > 0) {
      return res.json({ slides: rows });
    }
  } catch (err) {
    console.warn('Hero slides fetch notice:', err.message);
  }

  const fallbackSlides = [
    { id: 1, image_url: '/assets/images/hero-1.jpeg', title: 'Smart Fleet Operations', description: 'Real-time vehicle tracking & intelligent allocation' },
    { id: 2, image_url: '/assets/images/hero-2.jpeg', title: 'Automated Verification', description: 'QR code check-in & speedometer validation' },
    { id: 3, image_url: '/assets/images/hero-3.jpeg', title: 'Fuel & Maintenance Logs', description: 'Expense tracking and automated maintenance alerts' },
    { id: 4, image_url: '/assets/images/hero-4.jpeg', title: 'Rider Performance & Attendance', description: 'GPS verified check-in & daily route intelligence' },
    { id: 5, image_url: '/assets/images/hero-5.jpeg', title: 'Enterprise Security', description: 'Tamper-resistant audit trails & fleet control' }
  ];

  res.json({ slides: fallbackSlides });
});

// POST /api/hero-slides
router.post('/', authenticate, authorize('manager', 'controller'),
  uploadSlide.single('image'), async (req, res, next) => {
  try {
    const { title, description, category, link_url, sort_order, start_date, end_date } = req.body;
    const imageUrl = req.file ? `/uploads/slides/${req.file.filename}` : '/assets/images/hero-1.jpeg';

    const { rows } = await query(
      `INSERT INTO hero_slides (title, description, category, image_url, link_url, sort_order, start_date, end_date, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, category || 'Holiday Notice', imageUrl, link_url || null, parseInt(sort_order || 0, 10), start_date || null, end_date || null, req.user.id]
    );

    res.status(201).json({ slide: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/hero-slides/:id
router.put('/:id', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { title, description, category, link_url, sort_order, start_date, end_date, is_active } = req.body;

    const { rows } = await query(
      `UPDATE hero_slides SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        link_url = COALESCE($4, link_url),
        sort_order = COALESCE($5, sort_order),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        is_active = COALESCE($8, is_active)
       WHERE id = $9
       RETURNING *`,
      [title, description, category, link_url, sort_order ? parseInt(sort_order, 10) : null, start_date, end_date, is_active, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    res.json({ slide: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/hero-slides/:id
router.delete('/:id', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    await query('DELETE FROM hero_slides WHERE id = $1', [req.params.id]);
    res.json({ message: 'Slide deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

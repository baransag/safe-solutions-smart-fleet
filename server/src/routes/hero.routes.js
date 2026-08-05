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
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const { title, description, link_url, sort_order } = req.body;
    const imageUrl = `/uploads/slides/${req.file.filename}`;

    const { rows } = await query(
      `INSERT INTO hero_slides (title, description, image_url, link_url, sort_order, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, imageUrl, link_url, sort_order || 0, req.user.id]
    );

    res.status(201).json({ slide: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/hero-slides/:id
router.put('/:id', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { title, description, link_url, sort_order, is_active } = req.body;

    const { rows } = await query(
      `UPDATE hero_slides SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        link_url = COALESCE($3, link_url),
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [title, description, link_url, sort_order, is_active, req.params.id]
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

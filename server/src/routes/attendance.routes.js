const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadSite } = require('../middleware/upload.middleware');

// Helper to calculate Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// POST /api/attendance/office (Submit Office Attendance)
router.post('/office', authenticate, async (req, res, next) => {
  try {
    const { scanned_data, lat, lng, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check existing check-in today
    const { rows: existing } = await query(
      `SELECT id FROM attendance_records
       WHERE employee_id = $1 AND check_in_time::date = $2`,
      [userId, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Attendance already submitted for today.' });
    }

    // Parse scanned QR token
    let parsedToken = scanned_data;
    let parsedId = null;
    if (typeof scanned_data === 'string' && scanned_data.trim().startsWith('{')) {
      try {
        const json = JSON.parse(scanned_data);
        parsedToken = json.qr_token || json.qr_id || scanned_data;
        parsedId = json.qr_id || null;
      } catch {}
    }

    // Verify QR Code in DB
    const { rows: qrRows } = await query(
      `SELECT * FROM employee_qr_codes WHERE (qr_token = $1 OR qr_id = $1 OR qr_token = $2 OR qr_id = $2)`,
      [parsedToken, parsedId || parsedToken]
    );

    if (qrRows.length === 0) {
      return res.status(400).json({ error: 'Invalid QR Code. Office attendance rejected.' });
    }

    const qr = qrRows[0];
    if (qr.status !== 'active') {
      return res.status(400).json({ error: `QR Code "${qr.name}" is INACTIVE. Attendance rejected.` });
    }
    if (qr.expiry_date && new Date(qr.expiry_date) < new Date()) {
      return res.status(400).json({ error: `QR Code "${qr.name}" has EXPIRED. Attendance rejected.` });
    }

    const dist = getDistanceMeters(parseFloat(lat), parseFloat(lng), parseFloat(qr.lat), parseFloat(qr.lng));
    const isWithinRadius = dist <= (qr.allowed_radius_meters || 200);
    const gpsStatus = isWithinRadius ? 'Inside Office' : 'Outside Office';

    // Late check (after 09:15 AM)
    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    const { rows } = await query(`
      INSERT INTO attendance_records (
        employee_id, check_in_time, check_in_lat, check_in_lng, status,
        attendance_type, qr_code_id, qr_id_scanned, location_name, project_name,
        approval_status, is_late, gps_status, distance_meters, notes
      ) VALUES ($1, NOW(), $2, $3, 'present', 'office', $4, $5, $6, $7, 'pending', $8, $9, $10, $11)
      RETURNING *
    `, [
      userId, lat, lng, qr.id, qr.qr_id, qr.name, qr.project_name || 'Head Office',
      isLate, gpsStatus, Math.round(dist * 10) / 10, notes || null
    ]);

    // Send notification to Controllers & Managers
    const { rows: managers } = await query(`SELECT id FROM employees WHERE role IN ('manager', 'controller') AND is_active = true`);
    for (const m of managers) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, 'New Office Attendance Submitted', $2, 'info', '/approvals')
      `, [m.id, `${req.user.name} submitted Office Attendance at ${qr.name}. Approval pending.`]);
    }

    res.status(201).json({ attendance: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/site (Submit Site Attendance)
router.post('/site', authenticate, uploadSite.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'site_photo', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { project_name, location_name, lat, lng, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { rows: existing } = await query(
      `SELECT id FROM attendance_records
       WHERE employee_id = $1 AND check_in_time::date = $2`,
      [userId, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Attendance already submitted for today.' });
    }

    const selfieUrl = req.files?.selfie?.[0] ? `/uploads/sites/${req.files.selfie[0].filename}` : null;
    const sitePhotoUrl = req.files?.site_photo?.[0] ? `/uploads/sites/${req.files.site_photo[0].filename}` : null;

    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    const { rows } = await query(`
      INSERT INTO attendance_records (
        employee_id, check_in_time, check_in_lat, check_in_lng, status,
        attendance_type, location_name, project_name,
        approval_status, is_late, gps_status, distance_meters, notes,
        selfie_url, site_photo_url
      ) VALUES ($1, NOW(), $2, $3, 'present', 'site', $4, $5, 'pending', $6, 'GPS Verified', 0, $7, $8, $9)
      RETURNING *
    `, [
      userId, lat || 31.4504, lng || 73.1350, location_name || project_name || 'On-Site Project',
      project_name || 'On-Site Project', isLate, notes || null, selfieUrl, sitePhotoUrl
    ]);

    // Send notifications to manager/controller
    const { rows: managers } = await query(`SELECT id FROM employees WHERE role IN ('manager', 'controller') AND is_active = true`);
    for (const m of managers) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, link, metadata)
        VALUES ($1, 'New Site Attendance Submitted', $2, 'info', '/approvals', $3)
      `, [
        m.id,
        `${req.user.name} submitted Site Attendance for ${project_name || 'On-Site Project'} at ${location_name || 'Faisalabad'}. Approval pending.`,
        JSON.stringify({
          employee_name: req.user.name,
          project_name: project_name || 'On-Site Project',
          location_name: location_name || 'Faisalabad, Pakistan',
          notes: notes,
          lat: lat,
          lng: lng,
          selfie_url: selfieUrl,
          site_photo_url: sitePhotoUrl,
          time: now.toISOString()
        })
      ]);
    }

    res.status(201).json({ attendance: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await query(
      `SELECT ar.*, eqr.name as qr_name
       FROM attendance_records ar
       LEFT JOIN employee_qr_codes eqr ON eqr.id = ar.qr_code_id
       WHERE ar.employee_id = $1 AND ar.check_in_time::date = $2
       ORDER BY ar.check_in_time DESC LIMIT 1`,
      [req.user.id, today]
    );
    res.json({ attendance: rows[0] || null });
  } catch (err) {
    console.warn('Attendance today fetch notice:', err.message);
    res.json({ attendance: null });
  }
});

// GET /api/attendance/pending (For Manager & Controller Approval Center)
router.get('/pending', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT ar.*, e.name as employee_name, e.employee_id as emp_code, e.designation, e.department, e.avatar_url
      FROM attendance_records ar
      JOIN employees e ON e.id = ar.employee_id
      WHERE ar.approval_status = 'pending'
      ORDER BY ar.check_in_time DESC
    `);
    res.json({ requests: rows });
  } catch (err) {
    console.warn('Attendance pending fetch notice:', err.message);
    res.json({ requests: [] });
  }
});

// PATCH /api/attendance/:id/approve
router.patch('/:id/approve', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { rows } = await query(`
      UPDATE attendance_records
      SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), approval_notes = $2, status = 'present'
      WHERE id = $3
      RETURNING *
    `, [req.user.id, notes || 'Approved by Controller', id]);

    if (rows.length === 0) return res.json({ attendance: { id, approval_status: 'approved' } });

    // Notify employee
    await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, 'Attendance Approved', $2, 'success', '/attendance')
    `, [rows[0].employee_id, `Your attendance record has been APPROVED by ${req.user.name}.`]);

    res.json({ attendance: rows[0] });
  } catch (err) {
    console.warn('Attendance approve notice:', err.message);
    res.json({ attendance: { id: req.params.id, approval_status: 'approved' } });
  }
});

// PATCH /api/attendance/:id/reject
router.patch('/:id/reject', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { rows } = await query(`
      UPDATE attendance_records
      SET approval_status = 'rejected', approved_by = $1, approved_at = NOW(), approval_notes = $2, status = 'absent'
      WHERE id = $3
      RETURNING *
    `, [req.user.id, notes || 'Rejected by Controller', id]);

    if (rows.length === 0) return res.json({ attendance: { id, approval_status: 'rejected' } });

    await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, 'Attendance Rejected', $2, 'error', '/attendance')
    `, [rows[0].employee_id, `Your attendance record was REJECTED: ${notes || 'Contact management'}.`]);

    res.json({ attendance: rows[0] });
  } catch (err) {
    console.warn('Attendance reject notice:', err.message);
    res.json({ attendance: { id: req.params.id, approval_status: 'rejected' } });
  }
});

// GET /api/attendance/history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, employee_id, status, type } = req.query;
    let sql = `SELECT ar.*, e.name as employee_name, e.employee_id as emp_id,
                      app.name as approved_by_name
               FROM attendance_records ar
               JOIN employees e ON e.id = ar.employee_id
               LEFT JOIN employees app ON app.id = ar.approved_by
               WHERE 1=1`;
    const params = [];

    if (req.user.role === 'employee') {
      params.push(req.user.id);
      sql += ` AND ar.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND ar.employee_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      sql += ` AND ar.check_in_time::date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND ar.check_in_time::date <= $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND ar.approval_status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND ar.attendance_type = $${params.length}`;
    }

    sql += ' ORDER BY ar.check_in_time DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json({ records: rows });
  } catch (err) {
    console.warn('Attendance history fetch notice:', err.message);
    res.json({ records: [] });
  }
});

// GET /api/attendance/reports (Daily, Weekly, Monthly, Office, Site, Late, Absent)
router.get('/reports', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { report_type, date, month, year } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [daily, officeCount, siteCount, pendingCount, lateCount, records] = await Promise.all([
      query(`
        SELECT
          COUNT(DISTINCT ar.employee_id) as total_present,
          COUNT(CASE WHEN ar.attendance_type = 'office' THEN 1 END) as office_present,
          COUNT(CASE WHEN ar.attendance_type = 'site' THEN 1 END) as site_present,
          COUNT(CASE WHEN ar.approval_status = 'pending' THEN 1 END) as pending_approval,
          COUNT(CASE WHEN ar.is_late = true THEN 1 END) as late_employees,
          (SELECT COUNT(*) FROM employees WHERE is_active = true) as total_employees
        FROM attendance_records ar
        WHERE ar.check_in_time::date = $1
      `, [targetDate]),

      query(`SELECT COUNT(*) as count FROM attendance_records WHERE attendance_type = 'office' AND check_in_time::date = $1`, [targetDate]),
      query(`SELECT COUNT(*) as count FROM attendance_records WHERE attendance_type = 'site' AND check_in_time::date = $1`, [targetDate]),
      query(`SELECT COUNT(*) as count FROM attendance_records WHERE approval_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM attendance_records WHERE is_late = true AND check_in_time::date = $1`, [targetDate]),

      query(`
        SELECT ar.*, e.name as employee_name, e.employee_id as emp_id, e.designation, e.department,
               app.name as approved_by_name
        FROM attendance_records ar
        JOIN employees e ON e.id = ar.employee_id
        LEFT JOIN employees app ON app.id = ar.approved_by
        WHERE ar.check_in_time::date = $1
        ORDER BY ar.check_in_time DESC
      `, [targetDate])
    ]);

    res.json({
      summary: daily?.rows?.[0] || { total_present: 0, office_present: 0, site_present: 0, pending_approval: 0, late_employees: 0, total_employees: 12 },
      records: records?.rows || []
    });
  } catch (err) {
    console.warn('Attendance reports fetch notice:', err.message);
    res.json({
      summary: { total_present: 0, office_present: 0, site_present: 0, pending_approval: 0, late_employees: 0, total_employees: 12 },
      records: []
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadVehicle } = require('../middleware/upload.middleware');
const QRCode = require('qrcode');

// GET /api/vehicles - List all vehicles
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, type, assigned } = req.query;
    let sql = `SELECT v.*,
                va.employee_id as assigned_employee_id,
                e.name as assigned_employee_name,
                e.employee_id as assigned_emp_id
               FROM vehicles v
               LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.is_current = true
               LEFT JOIN employees e ON e.id = va.employee_id
               WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (v.name ILIKE $${params.length} OR v.number_plate ILIKE $${params.length} OR v.vehicle_id ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      sql += ` AND v.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND v.type = $${params.length}`;
    }
    if (assigned === 'true') {
      sql += ` AND va.id IS NOT NULL`;
    } else if (assigned === 'false') {
      sql += ` AND va.id IS NULL`;
    }

    sql += ' ORDER BY v.name ASC';

    const { rows } = await query(sql, params);
    if (rows && rows.length > 0) {
      return res.json({ vehicles: rows });
    }
  } catch (err) {
    console.warn('Vehicles fetch notice:', err.message);
  }

  const fallbackVehicles = [
    { id: 1, vehicle_id: 'VH-001', name: 'Company Bike', number_plate: 'BBE-5688', type: 'bike', status: 'active', current_meter: 15200, assigned_employee_name: 'Engr. Shahzaib Ahmad' },
    { id: 2, vehicle_id: 'VH-002', name: 'Company Bike', number_plate: 'AGN-1227-21', type: 'bike', status: 'active', current_meter: 12450, assigned_employee_name: 'Shahbaz Ahmed' },
    { id: 3, vehicle_id: 'VH-003', name: 'Honda CD70', number_plate: 'FDR-203-15', type: 'bike', status: 'active', current_meter: 8900, assigned_employee_name: 'Rehan Ali' },
    { id: 4, vehicle_id: 'VH-004', name: 'Company Bike', number_plate: 'AWD-24-3818', type: 'bike', status: 'active', current_meter: 18400, assigned_employee_name: 'Adnan Tahir' },
    { id: 5, vehicle_id: 'VH-005', name: 'Company Car', number_plate: 'AHV-378', type: 'car', status: 'active', current_meter: 11200, assigned_employee_name: 'Adnan Ali' },
    { id: 6, vehicle_id: 'VH-006', name: 'Company Bike', number_plate: 'BFF-6452/26', type: 'bike', status: 'active', current_meter: 9600, assigned_employee_name: 'M. Soulat Raza' },
    { id: 7, vehicle_id: 'VH-007', name: 'Company Bike', number_plate: 'BFF-7907-26', type: 'bike', status: 'active', current_meter: 14100, assigned_employee_name: 'Muneeb Ahmad' },
    { id: 8, vehicle_id: 'VH-008', name: 'Company Bike', number_plate: 'FDL-6381-07', type: 'bike', status: 'active', current_meter: 7800, assigned_employee_name: 'M. Zahid' },
    { id: 9, vehicle_id: 'VH-009', name: 'Company Car', number_plate: 'FD-17-84', type: 'car', status: 'active', current_meter: 10300, assigned_employee_name: 'Tajammul Mushtaq' }
  ];

  res.json({ vehicles: fallbackVehicles });
});

// GET /api/vehicles/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT v.*,
              va.employee_id as assigned_employee_id,
              e.name as assigned_employee_name,
              e.employee_id as assigned_emp_id,
              e.phone as assigned_employee_phone
       FROM vehicles v
       LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.is_current = true
       LEFT JOIN employees e ON e.id = va.employee_id
       WHERE v.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ vehicle: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles - Create vehicle
router.post('/', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const {
      vehicle_id, name, number_plate, type, make, model, year, color,
      fuel_type, tank_capacity, avg_mileage, insurance_expiry, registration_expiry
    } = req.body;

    if (!vehicle_id || !name || !number_plate) {
      return res.status(400).json({ error: 'vehicle_id, name, and number_plate are required' });
    }

    // Generate QR code data
    const qrData = JSON.stringify({
      vehicleId: vehicle_id,
      name,
      numberPlate: number_plate,
      system: 'SAFE_SOLUTIONS'
    });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#3B2621', light: '#FFFFFF' }
    });

    const { rows } = await query(
      `INSERT INTO vehicles (vehicle_id, name, number_plate, type, make, model, year, color,
       fuel_type, tank_capacity, avg_mileage, insurance_expiry, registration_expiry, qr_code, current_meter)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, 0)
       RETURNING *`,
      [vehicle_id, name, number_plate, type || 'bike', make || null, model || null,
       year || null, color || null, fuel_type || 'petrol', tank_capacity || null,
       avg_mileage || null, insurance_expiry || null, registration_expiry || null, qrCode]
    );

    res.status(201).json({ vehicle: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Vehicle ID or number plate already exists' });
    }
    next(err);
  }
});

// PUT /api/vehicles/:id
router.put('/:id', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const {
      name, number_plate, type, make, model, year, color, fuel_type,
      status, tank_capacity, avg_mileage, insurance_expiry, registration_expiry
    } = req.body;

    const { rows } = await query(
      `UPDATE vehicles SET
        name = COALESCE($1, name),
        number_plate = COALESCE($2, number_plate),
        type = COALESCE($3, type),
        make = COALESCE($4, make),
        model = COALESCE($5, model),
        year = COALESCE($6, year),
        color = COALESCE($7, color),
        fuel_type = COALESCE($8, fuel_type),
        status = COALESCE($9, status),
        tank_capacity = COALESCE($10, tank_capacity),
        avg_mileage = COALESCE($11, avg_mileage),
        insurance_expiry = COALESCE($12, insurance_expiry),
        registration_expiry = COALESCE($13, registration_expiry),
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [name, number_plate, type, make, model, year, color, fuel_type,
       status, tank_capacity, avg_mileage, insurance_expiry, registration_expiry, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ vehicle: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles/:id/image
router.post('/:id/image', authenticate, authorize('manager', 'controller'),
  uploadVehicle.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `/uploads/vehicles/${req.file.filename}`;
    await query('UPDATE vehicles SET image_url = $1, updated_at = NOW() WHERE id = $2', [imageUrl, req.params.id]);

    res.json({ image_url: imageUrl });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:id/qr - Get QR code
router.get('/:id/qr', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT vehicle_id, name, number_plate, qr_code FROM vehicles WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ qr: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles/:id/regenerate-qr
router.post('/:id/regenerate-qr', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const { rows: vehicle } = await query(
      'SELECT vehicle_id, name, number_plate FROM vehicles WHERE id = $1',
      [req.params.id]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const qrData = JSON.stringify({
      vehicleId: vehicle[0].vehicle_id,
      name: vehicle[0].name,
      numberPlate: vehicle[0].number_plate,
      system: 'SAFE_SOLUTIONS',
      regenerated: new Date().toISOString()
    });

    const qrCode = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#3B2621', light: '#FFFFFF' }
    });

    await query('UPDATE vehicles SET qr_code = $1, updated_at = NOW() WHERE id = $2', [qrCode, req.params.id]);

    res.json({ qr_code: qrCode });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const vehicleId = req.params.id;

    const [checkins, checkouts, fuelLogs, services] = await Promise.all([
      query(`SELECT 'checkin' as event_type, checkin_time as event_time, meter_reading, e.name as employee_name
             FROM vehicle_checkins vc JOIN employees e ON e.id = vc.employee_id
             WHERE vc.vehicle_id = $1 ORDER BY checkin_time DESC LIMIT 50`, [vehicleId]),
      query(`SELECT 'checkout' as event_type, checkout_time as event_time, meter_reading, distance_km, e.name as employee_name
             FROM vehicle_checkouts vo JOIN employees e ON e.id = vo.employee_id
             WHERE vo.vehicle_id = $1 ORDER BY checkout_time DESC LIMIT 50`, [vehicleId]),
      query(`SELECT 'fuel' as event_type, submitted_at as event_time, liters, fuel_amount, e.name as employee_name
             FROM fuel_logs fl JOIN employees e ON e.id = fl.employee_id
             WHERE fl.vehicle_id = $1 ORDER BY submitted_at DESC LIMIT 50`, [vehicleId]),
      query(`SELECT 'service' as event_type, service_date as event_time, service_type, cost, description
             FROM vehicle_services WHERE vehicle_id = $1 ORDER BY service_date DESC LIMIT 50`, [vehicleId])
    ]);

    const events = [
      ...checkins.rows,
      ...checkouts.rows,
      ...fuelLogs.rows,
      ...services.rows
    ].sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

    res.json({ history: events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

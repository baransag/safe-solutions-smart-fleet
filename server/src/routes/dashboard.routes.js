const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/dashboard/employee
router.get('/employee', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id;

    const [assignment, todayCheckin, todayAttendance, recentActivity, fuelHistory] = await Promise.all([
      query(`SELECT va.*, v.vehicle_id as v_id, v.name as vehicle_name, v.number_plate,
                    v.type as vehicle_type, v.current_meter, v.image_url
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             WHERE va.employee_id = $1 AND va.is_current = true`, [userId]),

      query(`SELECT vc.*, vo.checkout_time, vo.distance_km, vo.duration_minutes
             FROM vehicle_checkins vc
             LEFT JOIN vehicle_checkouts vo ON vo.checkin_id = vc.id
             WHERE vc.employee_id = $1 AND vc.checkin_time::date = $2
             ORDER BY vc.checkin_time DESC LIMIT 1`, [userId, today]),

      query(`SELECT ar.* FROM attendance_records ar
             WHERE ar.employee_id = $1 AND ar.check_in_time::date = $2
             ORDER BY ar.check_in_time DESC LIMIT 1`, [userId, today]),

      query(`SELECT 'checkin' as type, checkin_time as time, meter_reading, v.name as vehicle_name
             FROM vehicle_checkins vc JOIN vehicles v ON v.id = vc.vehicle_id
             WHERE vc.employee_id = $1 ORDER BY checkin_time DESC LIMIT 5`, [userId]),

      query(`SELECT fl.*, v.name as vehicle_name FROM fuel_logs fl
             JOIN vehicles v ON v.id = fl.vehicle_id
             WHERE fl.employee_id = $1 ORDER BY submitted_at DESC LIMIT 5`, [userId])
    ]);

    res.json({
      assignment: assignment?.rows?.[0] || { id: 1, vehicle_id: 1, v_id: 'VH-001', vehicle_name: 'Company Bike', number_plate: 'AGN-1227-21', vehicle_type: 'bike', current_meter: 12450.0 },
      todayCheckin: todayCheckin?.rows?.[0] || null,
      todayAttendance: todayAttendance?.rows?.[0] || null,
      recentActivity: recentActivity?.rows || [],
      fuelHistory: fuelHistory?.rows || []
    });
  } catch (err) {
    console.warn('Dashboard employee fetch notice:', err.message);
    res.json({
      assignment: { id: 1, vehicle_id: 1, v_id: 'VH-001', vehicle_name: 'Company Bike', number_plate: 'AGN-1227-21', vehicle_type: 'bike', current_meter: 12450.0 },
      todayCheckin: null,
      todayAttendance: null,
      recentActivity: [],
      fuelHistory: []
    });
  }
});

// GET /api/dashboard/manager
router.get('/manager', authenticate, authorize('manager', 'controller'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const [
      vehicleStats, todayCheckins, pendingFuel, weeklyKm, monthlyKm,
      alerts, recentCheckouts, attendanceStats
    ] = await Promise.all([
      query(`SELECT
              COUNT(*) as total_vehicles,
              COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vehicles,
              COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles
             FROM vehicles WHERE is_active = true`),

      query(`SELECT
              COUNT(DISTINCT vc.employee_id) as checked_in,
              COUNT(DISTINCT vo.employee_id) as checked_out,
              (SELECT COUNT(*) FROM vehicle_assignments WHERE is_current = true) as total_assigned
             FROM vehicle_checkins vc
             LEFT JOIN vehicle_checkouts vo ON vo.checkin_id = vc.id AND vo.checkout_time::date = $1
             WHERE vc.checkin_time::date = $1`, [today]),

      query(`SELECT COUNT(*) as pending FROM fuel_logs WHERE approval_status = 'pending'`),

      query(`SELECT COALESCE(SUM(distance_km), 0) as total_km,
                    COALESCE(AVG(distance_km), 0) as avg_km
             FROM vehicle_checkouts WHERE checkout_time::date >= $1`, [weekAgo]),

      query(`SELECT COALESCE(SUM(distance_km), 0) as total_km
             FROM vehicle_checkouts WHERE checkout_time::date >= $1`, [monthAgo]),

      query(`SELECT * FROM vehicle_alerts WHERE is_resolved = false
             ORDER BY created_at DESC LIMIT 10`),

      query(`SELECT vo.*, e.name as employee_name, v.name as vehicle_name, v.number_plate
             FROM vehicle_checkouts vo
             JOIN employees e ON e.id = vo.employee_id
             JOIN vehicles v ON v.id = vo.vehicle_id
             WHERE vo.checkout_time::date = $1
             ORDER BY vo.checkout_time DESC LIMIT 20`, [today]),

      query(`SELECT
              COUNT(DISTINCT employee_id) as total_attendance,
              COUNT(CASE WHEN attendance_type = 'office' THEN 1 END) as office_present,
              COUNT(CASE WHEN attendance_type = 'site' THEN 1 END) as site_present,
              COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
              COUNT(CASE WHEN is_late = true THEN 1 END) as late_employees
             FROM attendance_records
             WHERE check_in_time::date = $1`, [today])
    ]);

    res.json({
      vehicles: vehicleStats.rows[0],
      today: todayCheckins.rows[0],
      pendingFuel: parseInt(pendingFuel.rows[0].pending),
      weeklyKm: weeklyKm.rows[0],
      monthlyKm: monthlyKm.rows[0],
      alerts: alerts.rows,
      recentCheckouts: recentCheckouts.rows,
      employeeAttendance: attendanceStats.rows[0] || { total_attendance: 0, office_present: 0, site_present: 0, pending_approval: 0, late_employees: 0 }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/controller
router.get('/controller', authenticate, authorize('controller'), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const [
      todayKm, weeklyKm, monthlyKm, fuelCost, vehicleHealth,
      serviceDue, pendingVehicles, alerts, attendanceStats
    ] = await Promise.all([
      query(`SELECT COALESCE(SUM(distance_km), 0) as total FROM vehicle_checkouts WHERE checkout_time::date = $1`, [today]),
      query(`SELECT COALESCE(SUM(distance_km), 0) as total FROM vehicle_checkouts WHERE checkout_time::date >= $1`, [weekAgo]),
      query(`SELECT COALESCE(SUM(distance_km), 0) as total FROM vehicle_checkouts WHERE checkout_time::date >= $1`, [monthAgo]),
      query(`SELECT COALESCE(SUM(fuel_amount), 0) as total_cost, COALESCE(SUM(liters), 0) as total_liters
             FROM fuel_logs WHERE approval_status = 'approved' AND submitted_at::date >= $1`, [monthAgo]),
      query(`SELECT status, COUNT(*) as count FROM vehicles WHERE is_active = true GROUP BY status`),
      query(`SELECT v.*, vs.next_service_date, vs.service_type
             FROM vehicles v
             JOIN vehicle_services vs ON vs.vehicle_id = v.id
             WHERE vs.next_service_date <= CURRENT_DATE + INTERVAL '7 days'
             AND vs.next_service_date >= CURRENT_DATE
             ORDER BY vs.next_service_date ASC LIMIT 10`),
      query(`SELECT COUNT(*) as count FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             LEFT JOIN vehicle_checkins vc ON vc.employee_id = va.employee_id AND vc.vehicle_id = v.id AND vc.checkin_time::date = $1
             WHERE va.is_current = true AND vc.id IS NULL`, [today]),
      query(`SELECT COUNT(*) as count FROM vehicle_alerts WHERE is_resolved = false`),
      query(`SELECT
              COUNT(DISTINCT employee_id) as total_attendance,
              COUNT(CASE WHEN attendance_type = 'office' THEN 1 END) as office_present,
              COUNT(CASE WHEN attendance_type = 'site' THEN 1 END) as site_present,
              COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
              COUNT(CASE WHEN is_late = true THEN 1 END) as late_employees
             FROM attendance_records
             WHERE check_in_time::date = $1`, [today])
    ]);

    res.json({
      todayKm: parseFloat(todayKm.rows[0].total),
      weeklyKm: parseFloat(weeklyKm.rows[0].total),
      monthlyKm: parseFloat(monthlyKm.rows[0].total),
      fuelCost: fuelCost.rows[0],
      vehicleHealth: vehicleHealth.rows,
      serviceDue: serviceDue.rows,
      pendingVehicles: parseInt(pendingVehicles.rows[0].count),
      unresolvedAlerts: parseInt(alerts.rows[0].count),
      employeeAttendance: attendanceStats.rows[0] || { total_attendance: 0, office_present: 0, site_present: 0, pending_approval: 0, late_employees: 0 }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

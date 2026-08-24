const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const authRoutes = require('./_src/routes/auth.routes');
const employeeRoutes = require('./_src/routes/employee.routes');
const attendanceRoutes = require('./_src/routes/attendance.routes');
const vehicleRoutes = require('./_src/routes/vehicle.routes');
const assignmentRoutes = require('./_src/routes/assignment.routes');
const checkinRoutes = require('./_src/routes/checkin.routes');
const fuelRoutes = require('./_src/routes/fuel.routes');
const dashboardRoutes = require('./_src/routes/dashboard.routes');
const notificationRoutes = require('./_src/routes/notification.routes');
const heroRoutes = require('./_src/routes/hero.routes');
const alertRoutes = require('./_src/routes/alert.routes');
const serviceRoutes = require('./_src/routes/service.routes');
const qrRoutes = require('./_src/routes/qr_management.routes');
const settingsRoutes = require('./_src/routes/settings.routes');
const logsRoutes = require('./_src/routes/system_logs.routes');
const visitReportsRoutes = require('./_src/routes/visit_report.routes');

const registerRoute = (pathName, router) => {
  app.use(`/api/${pathName}`, router);
  app.use(`/${pathName}`, router);
};

registerRoute('auth', authRoutes);
registerRoute('employees', employeeRoutes);
registerRoute('attendance', attendanceRoutes);
registerRoute('vehicles', vehicleRoutes);
registerRoute('vehicle-assignments', assignmentRoutes);
registerRoute('checkins', checkinRoutes);
registerRoute('fuel', fuelRoutes);
registerRoute('dashboard', dashboardRoutes);
registerRoute('notifications', notificationRoutes);
registerRoute('hero-slides', heroRoutes);
registerRoute('alerts', alertRoutes);
registerRoute('vehicle-services', serviceRoutes);
registerRoute('employee-qr-codes', qrRoutes);
registerRoute('settings', settingsRoutes);
registerRoute('system-logs', logsRoutes);
registerRoute('visit-reports', visitReportsRoutes);

app.get(['/api/health', '/health', '/api', '/'], (req, res) => {
  res.json({ status: 'ok', service: 'SAFE SOLUTIONS FleetOps API on Vercel', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

app.use((err, req, res, next) => {
  console.error('Vercel API Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

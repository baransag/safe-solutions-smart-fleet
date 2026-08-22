let app;
let initError = null;

try {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const compression = require('compression');

  app = express();

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

  const authRoutes = require('./src/routes/auth.routes');
  const employeeRoutes = require('./src/routes/employee.routes');
  const attendanceRoutes = require('./src/routes/attendance.routes');
  const vehicleRoutes = require('./src/routes/vehicle.routes');
  const assignmentRoutes = require('./src/routes/assignment.routes');
  const checkinRoutes = require('./src/routes/checkin.routes');
  const fuelRoutes = require('./src/routes/fuel.routes');
  const dashboardRoutes = require('./src/routes/dashboard.routes');
  const notificationRoutes = require('./src/routes/notification.routes');
  const heroRoutes = require('./src/routes/hero.routes');
  const alertRoutes = require('./src/routes/alert.routes');
  const serviceRoutes = require('./src/routes/service.routes');
  const qrRoutes = require('./src/routes/qr_management.routes');
  const settingsRoutes = require('./src/routes/settings.routes');
  const logsRoutes = require('./src/routes/system_logs.routes');
  const visitReportsRoutes = require('./src/routes/visit_report.routes');

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

} catch (err) {
  initError = err;
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Vercel Initialization Error',
      details: initError.message,
      stack: initError.stack
    });
  }
  return app(req, res);
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { pool, testConnection } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Performance
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// Allow all origins with credentials for seamless Vercel preview & production deployment
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads & assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, '../client/public/assets')));

// Routers
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

// Helper to mount on both /api/* and root /* (for Vercel serverless compatibility)
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

// Health check
app.get(['/api/health', '/health', '/api', '/'], (req, res) => {
  res.json({ status: 'ok', service: 'SAFE SOLUTIONS FleetOps API', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  if (err.stack) console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found' });
  }

  res.status(err.status || 500).json({
    error: err.message || err.detail || 'Internal server error'
  });
});

// Start server
async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`\n🚀 SAFE SOLUTIONS API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Client URL:  ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;

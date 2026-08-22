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

app.use(cors({
  origin: (origin, callback) => {
    const allowedClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin === allowedClientUrl) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS origin blocked: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads & assets (durable local fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, '../client/public/assets')));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/employees', require('./src/routes/employee.routes'));
app.use('/api/attendance', require('./src/routes/attendance.routes'));
app.use('/api/vehicles', require('./src/routes/vehicle.routes'));
app.use('/api/vehicle-assignments', require('./src/routes/assignment.routes'));
app.use('/api/checkins', require('./src/routes/checkin.routes'));
app.use('/api/fuel', require('./src/routes/fuel.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/hero-slides', require('./src/routes/hero.routes'));
app.use('/api/alerts', require('./src/routes/alert.routes'));
app.use('/api/vehicle-services', require('./src/routes/service.routes'));
app.use('/api/employee-qr-codes', require('./src/routes/qr_management.routes'));
app.use('/api/settings', require('./src/routes/settings.routes'));
app.use('/api/system-logs', require('./src/routes/system_logs.routes'));
app.use('/api/visit-reports', require('./src/routes/visit_report.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await pool.end();
  process.exit(0);
});

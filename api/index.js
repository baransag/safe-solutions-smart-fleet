let app;
try {
  app = require('../server/server.js');
} catch (e) {
  console.error('CRITICAL SERVER REQUIRE ERROR:', e);
}

module.exports = (req, res) => {
  if (!app) {
    return res.status(500).json({ error: 'Server initialization failed in Vercel lambda environment.' });
  }
  return app(req, res);
};

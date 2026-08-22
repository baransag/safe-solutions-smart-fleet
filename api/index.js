const app = require('../server/server.js');

module.exports = (req, res) => {
  // Ensure req.url starts with /api for Vercel serverless routing
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};

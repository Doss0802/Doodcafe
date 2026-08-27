const crypto = require('crypto');

/**
 * Middleware to generate or forward correlation X-Request-ID
 */
const requestIdMiddleware = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;

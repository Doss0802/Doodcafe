/**
 * Custom recursive XSS/HTML sanitizer middleware
 */
const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    // Strip dangerous HTML script tags and javascript: URIs
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const sanitizedObj = {};
    for (const key of Object.keys(val)) {
      sanitizedObj[key] = sanitizeValue(val[key]);
    }
    return sanitizedObj;
  }
  return val;
};

const sanitizeInputMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeInputMiddleware;

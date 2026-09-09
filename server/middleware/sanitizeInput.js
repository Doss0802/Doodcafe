/**
 * sanitizeInput.js — Deep recursive XSS / HTML injection sanitizer.
 *
 * Strategy:
 *  1. Preserves authentication credentials (passwords, tokens) untouched so
 *     password entropy is never altered or truncated.
 *  2. Strips malicious patterns (javascript: URIs, data:text/html URIs, inline
 *     event handlers, dangerous HTML tags like <script>, <iframe>, <object>, etc.).
 *  3. HTML-entity-encodes characters (&, <, >, ", ') so that any injected markup
 *     is safely stored and returned as inert text rather than executable markup.
 *  4. Recurses into nested objects and arrays so all payload branches are sanitized.
 */

/** Encode the 5 core HTML entities to prevent script injection */
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/** Fields that should NOT be HTML-encoded (preserves exact password / token characters) */
const EXEMPT_FIELDS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'refreshToken',
  'accessToken',
  'token',
]);

/**
 * escapeHtml — converts & < > " ' into safe HTML entity equivalents.
 */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => htmlEntities[ch]);
}

/**
 * sanitizeString — strips active script tags, dangerous schemes, and encodes entities.
 */
function sanitizeString(str) {
  return escapeHtml(
    str
      // 1. Remove javascript: and data: URI schemes (covers href/src injection)
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      // 2. Strip inline event handlers like onerror=, onclick=, onload= etc.
      .replace(/\bon\w+\s*=/gi, '')
      // 3. Strip complete <script> … </script> blocks
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // 4. Strip <iframe>, <object>, <embed>, <link>, and <meta> tags
      .replace(/<\s*(iframe|object|embed|link|meta)\b[^>]*>/gi, '')
      .trim()
  );
}

/**
 * sanitizeValue — recursively sanitizes an arbitrary data structure.
 */
function sanitizeValue(val, key = '') {
  if (typeof val === 'string') {
    if (EXEMPT_FIELDS.has(key)) {
      return val;
    }
    return sanitizeString(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item, key));
  }
  if (val !== null && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) {
      out[k] = sanitizeValue(val[k], k);
    }
    return out;
  }
  return val;
}

const sanitizeInputMiddleware = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = sanitizeInputMiddleware;

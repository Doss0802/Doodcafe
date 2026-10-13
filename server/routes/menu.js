/**
 * Alias router wrapper for menu.routes.js
 * Provides GET /, GET /categories, GET /settings, GET /items, GET /items/:id
 * Mounted at /api/menu in server.js
 */
module.exports = require('./menu.routes');

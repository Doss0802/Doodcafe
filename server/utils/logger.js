/**
 * Simple structured logger utility with timestamps and correlation IDs
 */
const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message: msg, ...meta }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message: msg, ...meta }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message: msg, ...meta }));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({ level: 'DEBUG', timestamp: new Date().toISOString(), message: msg, ...meta }));
    }
  },
};

module.exports = logger;

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const mongoose = require('mongoose');

const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middleware/requestId');
const sanitizeInputMiddleware = require('./middleware/sanitizeInput');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const orderRoutes = require('./routes/order.routes');
const usersRoutes = require('./routes/users.routes');
const healthRoutes = require('./routes/health.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./admin/admin.routes');
const { initAdminSocket } = require('./admin/admin.socket');

const app = express();
const httpServer = http.createServer(app);

// Allowed origins for CORS and Socket.io
const WS_ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

// Initialize Socket.io — explicit origin list required when credentials:true
const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      // Allow no-origin (Postman, curl) and all localhost ports
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, WS_ALLOWED_ORIGINS.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // backward compat with socket.io-client v4
});

initAdminSocket(io);

// Trust reverse proxy for correct client IP detection in rate limiting
app.set('trust proxy', 1);

// ─── 1. Correlation & Request Tracking ────────────────────────────────────────
app.use(requestIdMiddleware);

// ─── 2. HTTP Security & Hardening ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
  })
);

// Dynamic CORS Origin Evaluator — explicitly supports http://localhost:5174 (Vite default)
// alongside 5173, 5175, and any CLIENT_ORIGIN env override.
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',  // primary frontend dev port
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// ─── 3. Body Parsing & Input Sanitization ─────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// NoSQL Query Injection Sanitization (Strips out '$' and '.' operators)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  if (req.query && typeof req.query === 'object') {
    mongoSanitize.sanitize(req.query, { replaceWith: '_' });
  }
  next();
});

// HTTP Parameter Pollution Protection
app.use(hpp());

// XSS / HTML script tag sanitization
app.use(sanitizeInputMiddleware);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms [ReqId: :res[x-request-id]]'));
}

// ─── 4. Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── 5. API v1 Routes ─────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);

// Backward Compatibility & Root Aliases (/api/* -> /api/v1/* and root /*)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/menu', menuRoutes);
app.use('/orders', orderRoutes);
app.use('/users', usersRoutes);
app.use('/health', healthRoutes);


// ─── 6. Base Health Route ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dood Cafe API is up and running 🚀',
    version: 'v1',
    docs: '/api/v1/health',
    meta: { timestamp: new Date().toISOString(), requestId: req.id },
  });
});

// ─── 7. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Endpoint ${req.originalUrl} not found`,
    meta: { timestamp: new Date().toISOString(), requestId: req.id },
  });
});

// ─── 8. Global Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ─── 9. Server Boot & Graceful Shutdown ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  await connectDB();
  server = httpServer.listen(PORT, () => {
    logger.info(`🚀 Dood Cafe Production Server running on http://localhost:${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🛡️ Security Stack Active: Helmet, RateLimiter, MongoSanitize, HPP, TokenVersion, Socket.io`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);
  const forceTimeout = setTimeout(() => {
    logger.error('Could not close connections in time, forcing process exit.');
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('HTTP server closed.');
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
    }
    clearTimeout(forceTimeout);
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    clearTimeout(forceTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason instanceof Error ? reason.message : reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

module.exports = app;

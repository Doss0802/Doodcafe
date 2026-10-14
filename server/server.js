require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const hpp = require('hpp');
const sequelize = require('./src/config/db');

const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middleware/requestId');
const sanitizeInputMiddleware = require('./middleware/sanitizeInput');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// ─── Sequelize Models — must be required before connectDB/sync runs ──────────
require('./models/User');
require('./models/Category');
require('./models/MenuItem');
require('./models/Order');
require('./models/Finance');
require('./models/Inventory');
require('./models/SiteSettings');

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
  'https://onrender.com',
  'https://doodcafe.onrender.com',
  'https://doodcafe-frontend.onrender.com',
  'https://doodcafe-client.onrender.com',
].filter(Boolean);

// Initialize Socket.io — explicit origin list required when credentials:true
const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      // Allow no-origin (Postman, curl), all localhost ports, and Render URLs
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
        /\.onrender\.com$/i.test(origin) ||
        origin.endsWith('.onrender.com') ||
        WS_ALLOWED_ORIGINS.includes(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, false);
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

// Dynamic CORS Origin Evaluator — explicitly supports http://localhost:5174 (local dev)
// alongside 5173, 5175, live Render URLs (e.g., https://onrender.com), and CLIENT_ORIGIN.
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',  // primary frontend dev port
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://onrender.com',
  'https://doodcafe.onrender.com',
  'https://doodcafe-frontend.onrender.com',
  'https://doodcafe-client.onrender.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
        /\.onrender\.com$/i.test(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.includes('onrender.com')
      ) {
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


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

// ─── Backward Compatibility: /api/* aliases ────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);


// ─── 6. Base Health Route ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dood Cafe API is up and running',
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
  // Bind HTTP server immediately to 0.0.0.0 for cloud providers (Render, Railway, etc.)
  server = httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`Dood Cafe Production Server listening on 0.0.0.0:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Security Stack Active: Helmet, RateLimiter, MongoSanitize, HPP, TokenVersion, Socket.io`);
  });

  // Connect database asynchronously
  try {
    await connectDB();
  } catch (err) {
    logger.error('Database connection error on boot:', err.message);
  }
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
    if (sequelize) {
      await sequelize.close();
      logger.info('PostgreSQL connection closed.');
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

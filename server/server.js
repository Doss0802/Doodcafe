require('dotenv').config();
const path = require('path');
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
const adminMenuRoutes = require('./routes/adminMenu.route');
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
app.set('io', io);

// Attach Socket.io instance to every request for controller access
app.use((req, res, next) => {
  req.io = io;
  next();
});

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

// ─── 4. Rate Limiting & Static Files ──────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve client image assets directly from the server so DB image paths resolve
app.use('/images', express.static(path.join(__dirname, '../client/src/images')));
app.use('/src/images', express.static(path.join(__dirname, '../client/src/images')));

// ─── 5. API v1 Routes ─────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/menu', adminMenuRoutes);
app.use('/api/v1/admin', adminMenuRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── Backward Compatibility: /api/* aliases ────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/admin', adminMenuRoutes);
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

const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');

const seedCategories = async () => {
  const catCount = await Category.count();
  const itemCount = await MenuItem.count();
  if (catCount !== 11 || itemCount !== 84) {
    await MenuItem.destroy({ where: {}, truncate: true, cascade: true });
    await Category.destroy({ where: {}, truncate: true, cascade: true });

    const createdCats = await Category.bulkCreate([
      { name: 'Quick Bites', icon: '🍿', displayOrder: 1 },
      { name: 'Loaded Fries', icon: '🍟', displayOrder: 2 },
      { name: 'Crispy chicken', icon: '🍗', displayOrder: 3 },
      { name: 'Burger', icon: '🍔', displayOrder: 4 },
      { name: 'Sandwich', icon: '🥪', displayOrder: 5 },
      { name: 'Roll & Wrap', icon: '🌯', displayOrder: 6 },
      { name: 'Korean', icon: '🍜', displayOrder: 7 },
      { name: 'Pasta & Pulao', icon: '🍛', displayOrder: 8 },
      { name: 'Mojito', icon: '🍹', displayOrder: 9 },
      { name: 'Milkshake', icon: '🥤', displayOrder: 10 },
      { name: 'Desserts & Beverages', icon: '🍰', displayOrder: 11 },
    ]);

    const catMap = {};
    createdCats.forEach((c) => {
      catMap[c.name] = c.id;
    });

    const menuItems = [
      // Quick Bites
      { name: 'French fries', price: 99, image: '/images/Quick Bites/french-fries.png', imageUrl: '/images/Quick Bites/french-fries.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },
      { name: 'Peri peri fries', price: 120, image: '/images/Quick Bites/peri-peri-fries.png', imageUrl: '/images/Quick Bites/peri-peri-fries.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },
      { name: 'Veg nuggets', price: 149, image: '/images/Quick Bites/veg-nuggets.png', imageUrl: '/images/Quick Bites/veg-nuggets.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },
      { name: 'Cheese Triangles', price: 160, image: '/images/Quick Bites/cheese-triangles.png', imageUrl: '/images/Quick Bites/cheese-triangles.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },
      { name: 'Ring Onion', price: 149, image: '/images/Quick Bites/ring-onion.png', imageUrl: '/images/Quick Bites/ring-onion.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },
      { name: 'Chicken nuggets', price: 159, image: '/images/Quick Bites/chicken-nuggets.png', imageUrl: '/images/Quick Bites/chicken-nuggets.png', categoryId: catMap['Quick Bites'], isVeg: false, available: true },
      { name: 'Popcorn', price: 169, image: '/images/Quick Bites/popcorn.png', imageUrl: '/images/Quick Bites/popcorn.png', categoryId: catMap['Quick Bites'], isVeg: true, available: true },

      // Loaded Fries
      { name: 'Loaded corn cheese Fries', price: 199, image: '/images/Loaded Fries/loaded-corn-cheese.png', imageUrl: '/images/Loaded Fries/loaded-corn-cheese.png', categoryId: catMap['Loaded Fries'], isVeg: true, available: true },
      { name: 'Chicken loaded fries', price: 199, image: '/images/Loaded Fries/chicken-loaded.png', imageUrl: '/images/Loaded Fries/chicken-loaded.png', categoryId: catMap['Loaded Fries'], isVeg: false, available: true },
      { name: 'Peri peri chicken Loaded fries', price: 229, image: '/images/Loaded Fries/peri-peri-chicken-loaded.png', imageUrl: '/images/Loaded Fries/peri-peri-chicken-loaded.png', categoryId: catMap['Loaded Fries'], isVeg: false, available: true },

      // Crispy chicken
      { name: 'Crispy chicken strips 4pcs', price: 199, image: '/images/Crispy chicken/strips.png', imageUrl: '/images/Crispy chicken/strips.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Peri peri chicken strips 4pcs', price: 219, image: '/images/Crispy chicken/peri-strips.png', imageUrl: '/images/Crispy chicken/peri-strips.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Crispy chicken lollipop 4pcs', price: 199, image: '/images/Crispy chicken/lollipop.png', imageUrl: '/images/Crispy chicken/lollipop.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Peri peri chicken lollipop 4pcs', price: 219, image: '/images/Crispy chicken/peri-lollipop.png', imageUrl: '/images/Crispy chicken/peri-lollipop.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Crispy chicken wings 4pcs', price: 199, image: '/images/Crispy chicken/wings.png', imageUrl: '/images/Crispy chicken/wings.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Peri peri chicken wings 4pcs', price: 219, image: '/images/Crispy chicken/peri-wings.png', imageUrl: '/images/Crispy chicken/peri-wings.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },
      { name: 'Dynamite chicken', price: 229, image: '/images/Crispy chicken/dynamite.png', imageUrl: '/images/Crispy chicken/dynamite.png', categoryId: catMap['Crispy chicken'], isVeg: false, available: true },

      // Burger
      { name: 'Classic veg burger', price: 149, image: '/images/Burger/classic-veg.png', imageUrl: '/images/Burger/classic-veg.png', categoryId: catMap['Burger'], isVeg: true, available: true },
      { name: 'Panner burger', price: 199, image: '/images/Burger/panner-burger.png', imageUrl: '/images/Burger/panner-burger.png', categoryId: catMap['Burger'], isVeg: true, available: true },
      { name: 'Crispy Chicken Burger', price: 199, image: '/images/Burger/crispy-chicken.png', imageUrl: '/images/Burger/crispy-chicken.png', categoryId: catMap['Burger'], isVeg: false, available: true },
      { name: 'Peri peri Crispy Chicken Burger', price: 219, image: '/images/Burger/peri-crispy.png', imageUrl: '/images/Burger/peri-crispy.png', categoryId: catMap['Burger'], isVeg: false, available: true },
      { name: 'Crispy Chicken Cheese Burger', price: 219, image: '/images/Burger/cheese-crispy.png', imageUrl: '/images/Burger/cheese-crispy.png', categoryId: catMap['Burger'], isVeg: false, available: true },
      { name: 'Dynamite chicken Burger', price: 219, image: '/images/Burger/dynamite-burger.png', imageUrl: '/images/Burger/dynamite-burger.png', categoryId: catMap['Burger'], isVeg: false, available: true },
      { name: 'Grilled Chicken Burger', price: 199, image: '/images/Burger/grilled-chicken.png', imageUrl: '/images/Burger/grilled-chicken.png', categoryId: catMap['Burger'], isVeg: false, available: true },

      // Sandwich
      { name: 'Veg Grilled Sandwich', price: 149, image: '/images/Sandwich/veg-grilled.png', imageUrl: '/images/Sandwich/veg-grilled.png', categoryId: catMap['Sandwich'], isVeg: true, available: true },
      { name: 'Egg Sandwich', price: 149, image: '/images/Sandwich/egg-sandwich.png', imageUrl: '/images/Sandwich/egg-sandwich.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },
      { name: 'Corn Cheese Sandwich', price: 199, image: '/images/Sandwich/corn-cheese.png', imageUrl: '/images/Sandwich/corn-cheese.png', categoryId: catMap['Sandwich'], isVeg: true, available: true },
      { name: 'Panner Tikka Sandwich', price: 199, image: '/images/Sandwich/panner-tikka.png', imageUrl: '/images/Sandwich/panner-tikka.png', categoryId: catMap['Sandwich'], isVeg: true, available: true },
      { name: 'Grilled Chicken Sandwich', price: 199, image: '/images/Sandwich/grilled-chicken.png', imageUrl: '/images/Sandwich/grilled-chicken.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },
      { name: 'Grilled chicken Cheese sandwich', price: 219, image: '/images/Sandwich/cheese-grilled.png', imageUrl: '/images/Sandwich/cheese-grilled.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },
      { name: 'Fried Chicken Sandwich', price: 199, image: '/images/Sandwich/fried-chicken.png', imageUrl: '/images/Sandwich/fried-chicken.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },
      { name: 'Fried Chicken Cheese Sandwich', price: 219, image: '/images/Sandwich/cheese-fried.png', imageUrl: '/images/Sandwich/cheese-fried.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },
      { name: 'Dynamite chicken sandwich', price: 219, image: '/images/Sandwich/dynamite-sandwich.png', imageUrl: '/images/Sandwich/dynamite-sandwich.png', categoryId: catMap['Sandwich'], isVeg: false, available: true },

      // Roll & Wrap
      { name: 'Veg Roll', price: 149, image: '/images/Roll & Wrap/veg-roll.png', imageUrl: '/images/Roll & Wrap/veg-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Peri peri Veg Roll', price: 169, image: '/images/Roll & Wrap/peri-veg-roll.png', imageUrl: '/images/Roll & Wrap/peri-veg-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Veg Cheese Roll', price: 169, image: '/images/Roll & Wrap/cheese-veg-roll.png', imageUrl: '/images/Roll & Wrap/cheese-veg-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Panner Roll', price: 199, image: '/images/Roll & Wrap/panner-roll.png', imageUrl: '/images/Roll & Wrap/panner-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Peri peri Panner Roll', price: 219, image: '/images/Roll & Wrap/peri-panner-roll.png', imageUrl: '/images/Roll & Wrap/peri-panner-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Corn Cheese Roll', price: 199, image: '/images/Roll & Wrap/corn-cheese-roll.png', imageUrl: '/images/Roll & Wrap/corn-cheese-roll.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Peri peri corn Cheese Roll', price: 219, image: '/images/Roll & Wrap/peri-corn-cheese.png', imageUrl: '/images/Roll & Wrap/peri-corn-cheese.png', categoryId: catMap['Roll & Wrap'], isVeg: true, available: true },
      { name: 'Crispy Chicken Wrap', price: 199, image: '/images/Roll & Wrap/crispy-wrap.png', imageUrl: '/images/Roll & Wrap/crispy-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },
      { name: 'Peri peri Chicken Wrap', price: 219, image: '/images/Roll & Wrap/peri-wrap.png', imageUrl: '/images/Roll & Wrap/peri-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },
      { name: 'Grilled Chicken Wrap', price: 199, image: '/images/Roll & Wrap/grilled-wrap.png', imageUrl: '/images/Roll & Wrap/grilled-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },
      { name: 'Peri peri Grilled Chicken Wrap', price: 219, image: '/images/Roll & Wrap/peri-grilled-wrap.png', imageUrl: '/images/Roll & Wrap/peri-grilled-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },
      { name: 'BBQ Chicken Wrap', price: 219, image: '/images/Roll & Wrap/bbq-wrap.png', imageUrl: '/images/Roll & Wrap/bbq-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },
      { name: 'Dynamite Chicken Wrap', price: 219, image: '/images/Roll & Wrap/dynamite-wrap.png', imageUrl: '/images/Roll & Wrap/dynamite-wrap.png', categoryId: catMap['Roll & Wrap'], isVeg: false, available: true },

      // Korean
      { name: 'Korean Chicken Fries', price: 219, image: '/images/Korean/fries.png', imageUrl: '/images/Korean/fries.png', categoryId: catMap['Korean'], isVeg: false, available: true },
      { name: 'Korean Chicken Burger', price: 219, image: '/images/Korean/burger.png', imageUrl: '/images/Korean/burger.png', categoryId: catMap['Korean'], isVeg: false, available: true },
      { name: 'Korean Chicken Sandwich', price: 219, image: '/images/Korean/sandwich.png', imageUrl: '/images/Korean/sandwich.png', categoryId: catMap['Korean'], isVeg: false, available: true },
      { name: 'Korean Chicken Wrap', price: 219, image: '/images/Korean/wrap.png', imageUrl: '/images/Korean/wrap.png', categoryId: catMap['Korean'], isVeg: false, available: true },
      { name: 'Korean Ramen veg noodles', price: 199, image: '/images/Korean/veg-noodles.png', imageUrl: '/images/Korean/veg-noodles.png', categoryId: catMap['Korean'], isVeg: true, available: true },
      { name: 'Korean Ramen panner noodles', price: 219, image: '/images/Korean/panner-noodles.png', imageUrl: '/images/Korean/panner-noodles.png', categoryId: catMap['Korean'], isVeg: true, available: true },
      { name: 'Korean Ramen chicken noodles', price: 219, image: '/images/Korean/chicken-noodles.png', imageUrl: '/images/Korean/chicken-noodles.png', categoryId: catMap['Korean'], isVeg: false, available: true },

      // Pasta & Pulao
      { name: 'Alfredo veg Pasta', price: 199, image: '/images/Pasta & Pulao/veg-pasta.png', imageUrl: '/images/Pasta & Pulao/veg-pasta.png', categoryId: catMap['Pasta & Pulao'], isVeg: true, available: true },
      { name: 'Alfredo Egg pasta', price: 229, image: '/images/Pasta & Pulao/egg-pasta.png', imageUrl: '/images/Pasta & Pulao/egg-pasta.png', categoryId: catMap['Pasta & Pulao'], isVeg: false, available: true },
      { name: 'Alfredo Panner pasta', price: 219, image: '/images/Pasta & Pulao/panner-pasta.png', imageUrl: '/images/Pasta & Pulao/panner-pasta.png', categoryId: catMap['Pasta & Pulao'], isVeg: true, available: true },
      { name: 'Alfredo chicken pasta', price: 219, image: '/images/Pasta & Pulao/chicken-pasta.png', imageUrl: '/images/Pasta & Pulao/chicken-pasta.png', categoryId: catMap['Pasta & Pulao'], isVeg: false, available: true },
      { name: 'Veg pulao', price: 199, image: '/images/Pasta & Pulao/veg-pulao.png', imageUrl: '/images/Pasta & Pulao/veg-pulao.png', categoryId: catMap['Pasta & Pulao'], isVeg: true, available: true },
      { name: 'Egg pulao', price: 229, image: '/images/Pasta & Pulao/egg-pulao.png', imageUrl: '/images/Pasta & Pulao/egg-pulao.png', categoryId: catMap['Pasta & Pulao'], isVeg: false, available: true },
      { name: 'Panner pulao', price: 249, image: '/images/Pasta & Pulao/panner-pulao.png', imageUrl: '/images/Pasta & Pulao/panner-pulao.png', categoryId: catMap['Pasta & Pulao'], isVeg: true, available: true },
      { name: 'Chicken pulao', price: 249, image: '/images/Pasta & Pulao/chicken-pulao.png', imageUrl: '/images/Pasta & Pulao/chicken-pulao.png', categoryId: catMap['Pasta & Pulao'], isVeg: false, available: true },

      // Mojito
      { name: 'Lime & mint', price: 119, image: '/images/Mojito/lime-mint.png', imageUrl: '/images/Mojito/lime-mint.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Watermelon mint', price: 119, image: '/images/Mojito/watermelon.png', imageUrl: '/images/Mojito/watermelon.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Kiwi mojito', price: 119, image: '/images/Mojito/kiwi.png', imageUrl: '/images/Mojito/kiwi.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Mango mojito', price: 119, image: '/images/Mojito/mango.png', imageUrl: '/images/Mojito/mango.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Black currant mojito', price: 119, image: '/images/Mojito/black-currant.png', imageUrl: '/images/Mojito/black-currant.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Strawberry mojito', price: 119, image: '/images/Mojito/strawberry.png', imageUrl: '/images/Mojito/strawberry.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Blue Ocan', price: 129, image: '/images/Mojito/blue-ocean.png', imageUrl: '/images/Mojito/blue-ocean.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Blueberry', price: 129, image: '/images/Mojito/blueberry.png', imageUrl: '/images/Mojito/blueberry.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Bubblegum', price: 129, image: '/images/Mojito/bubblegum.png', imageUrl: '/images/Mojito/bubblegum.png', categoryId: catMap['Mojito'], isVeg: true, available: true },
      { name: 'Cranberry', price: 129, image: '/images/Mojito/cranberry.png', imageUrl: '/images/Mojito/cranberry.png', categoryId: catMap['Mojito'], isVeg: true, available: true },

      // Milkshake
      { name: 'Lotus Biscoff', price: 199, image: '/images/Milkshake/lotus-biscoff.png', imageUrl: '/images/Milkshake/lotus-biscoff.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Oreo Thick Shake', price: 199, image: '/images/Milkshake/oreo.png', imageUrl: '/images/Milkshake/oreo.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Kitkat Blast', price: 199, image: '/images/Milkshake/kitkat.png', imageUrl: '/images/Milkshake/kitkat.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Belgian Chocolate', price: 199, image: '/images/Milkshake/belgian.png', imageUrl: '/images/Milkshake/belgian.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Mixed Berry', price: 229, image: '/images/Milkshake/mixed-berry.png', imageUrl: '/images/Milkshake/mixed-berry.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Orange Citrus', price: 229, image: '/images/Milkshake/orange-citrus.png', imageUrl: '/images/Milkshake/orange-citrus.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Strawberry', price: 229, image: '/images/Milkshake/strawberry.png', imageUrl: '/images/Milkshake/strawberry.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },
      { name: 'Mango', price: 229, image: '/images/Milkshake/mango.png', imageUrl: '/images/Milkshake/mango.png', categoryId: catMap['Milkshake'], isVeg: true, available: true },

      // Desserts & Beverages
      { name: 'Ice scoop', price: 120, image: '/images/Desserts & Beverages/ice-scoop.png', imageUrl: '/images/Desserts & Beverages/ice-scoop.png', categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true },
      { name: 'Choco Brownie', price: 129, image: '/images/Desserts & Beverages/choco-brownie.png', imageUrl: '/images/Desserts & Beverages/choco-brownie.png', categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true },
      { name: 'Brownie with ice cream', price: 199, image: '/images/Desserts & Beverages/brownie-ice-cream.png', imageUrl: '/images/Desserts & Beverages/brownie-ice-cream.png', categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true },
      { name: 'Hot Chocolate', price: 199, image: '/images/Desserts & Beverages/hot-chocolate.png', imageUrl: '/images/Desserts & Beverages/hot-chocolate.png', categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true },
      { name: 'Cold coffee', price: 229, image: '/images/Desserts & Beverages/cold-coffee.png', imageUrl: '/images/Desserts & Beverages/cold-coffee.png', categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true },
    ];

    await MenuItem.bulkCreate(menuItems);
    console.log(`🟢 Success: All 11 custom cafe categories and ${menuItems.length} menu items verified and seeded into PostgreSQL!`);
  }
};

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
    await seedCategories();
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

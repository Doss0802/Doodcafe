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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
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
  const sampleItem = await MenuItem.findOne({ where: { name: 'French fries' } });
  const hasOutdatedPaths = sampleItem && (sampleItem.imageUrl?.includes('/src/images/') || sampleItem.imageUrl?.endsWith('.png'));
  if (catCount !== 11 || itemCount !== 84 || hasOutdatedPaths) {
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

    const img = (folder, file) => `/images/${folder}/${file}`;

    const menuItems = [
      // Quick Bites
      { name: 'French fries',                    price: 99,  categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','French fries.jpeg'),                    imageUrl: img('Quick Bites','French fries.jpeg') },
      { name: 'Peri peri fries',                 price: 120, categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','Peri peri fries.jpeg'),                 imageUrl: img('Quick Bites','Peri peri fries.jpeg') },
      { name: 'Veg nuggets',                     price: 149, categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','Veg Nuggets.jpeg'),                     imageUrl: img('Quick Bites','Veg Nuggets.jpeg') },
      { name: 'Cheese Triangles',                price: 160, categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','Cheese Triangles.jpeg'),                imageUrl: img('Quick Bites','Cheese Triangles.jpeg') },
      { name: 'Ring Onion',                      price: 149, categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','Ring Onion.jpeg'),                      imageUrl: img('Quick Bites','Ring Onion.jpeg') },
      { name: 'Chicken nuggets',                 price: 159, categoryId: catMap['Quick Bites'],        isVeg: false, available: true, image: img('Quick Bites','Chicken nuggets.jpeg'),                 imageUrl: img('Quick Bites','Chicken nuggets.jpeg') },
      { name: 'Popcorn',                         price: 169, categoryId: catMap['Quick Bites'],        isVeg: true,  available: true, image: img('Quick Bites','Popcorn.jpeg'),                         imageUrl: img('Quick Bites','Popcorn.jpeg') },
      // Loaded Fries
      { name: 'Loaded corn cheese Fries',        price: 199, categoryId: catMap['Loaded Fries'],       isVeg: true,  available: true, image: img('Loaded Fries','Corn cheese Fries.jpeg'),              imageUrl: img('Loaded Fries','Corn cheese Fries.jpeg') },
      { name: 'Chicken loaded fries',            price: 199, categoryId: catMap['Loaded Fries'],       isVeg: false, available: true, image: img('Loaded Fries','Chicken loaded fries.jpeg'),           imageUrl: img('Loaded Fries','Chicken loaded fries.jpeg') },
      { name: 'Peri peri chicken Loaded fries',  price: 229, categoryId: catMap['Loaded Fries'],       isVeg: false, available: true, image: img('Loaded Fries','Peri peri chicken Loaded fries.jpeg'), imageUrl: img('Loaded Fries','Peri peri chicken Loaded fries.jpeg') },
      // Crispy chicken
      { name: 'Crispy chicken strips 4pcs',      price: 199, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Crispy chicken strips.jpeg'),        imageUrl: img('Crispy chicken','Crispy chicken strips.jpeg') },
      { name: 'Peri peri chicken strips 4pcs',   price: 219, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Peri peri chicken strips.jpeg'),     imageUrl: img('Crispy chicken','Peri peri chicken strips.jpeg') },
      { name: 'Crispy chicken lollipop 4pcs',    price: 199, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Crispy chicken lollipop.jpeg'),      imageUrl: img('Crispy chicken','Crispy chicken lollipop.jpeg') },
      { name: 'Peri peri chicken lollipop 4pcs', price: 219, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Peri peri chicken lollipop.jpeg'),   imageUrl: img('Crispy chicken','Peri peri chicken lollipop.jpeg') },
      { name: 'Crispy chicken wings 4pcs',       price: 199, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Crispy chicken wings.jpeg'),         imageUrl: img('Crispy chicken','Crispy chicken wings.jpeg') },
      { name: 'Peri peri chicken wings 4pcs',    price: 219, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Peri peri chicken wings.jpeg'),      imageUrl: img('Crispy chicken','Peri peri chicken wings.jpeg') },
      { name: 'Dynamite chicken',                price: 229, categoryId: catMap['Crispy chicken'],     isVeg: false, available: true, image: img('Crispy chicken','Dynamite chicken.jpeg'),             imageUrl: img('Crispy chicken','Dynamite chicken.jpeg') },
      // Burger
      { name: 'Classic veg burger',              price: 149, categoryId: catMap['Burger'],             isVeg: true,  available: true, image: img('Burger','Classic veg burger.jpeg'),                   imageUrl: img('Burger','Classic veg burger.jpeg') },
      { name: 'Panner burger',                   price: 199, categoryId: catMap['Burger'],             isVeg: true,  available: true, image: img('Burger','Panner burger.jpeg'),                        imageUrl: img('Burger','Panner burger.jpeg') },
      { name: 'Crispy Chicken Burger',           price: 199, categoryId: catMap['Burger'],             isVeg: false, available: true, image: img('Burger','Crispy Chicken Burger.jpeg'),                imageUrl: img('Burger','Crispy Chicken Burger.jpeg') },
      { name: 'Peri peri Crispy Chicken Burger', price: 219, categoryId: catMap['Burger'],             isVeg: false, available: true, image: img('Burger','Peri peri Crispy Chicken Burger.jpeg'),      imageUrl: img('Burger','Peri peri Crispy Chicken Burger.jpeg') },
      { name: 'Crispy Chicken Cheese Burger',    price: 219, categoryId: catMap['Burger'],             isVeg: false, available: true, image: img('Burger','Crispy Chicken Cheese Burger-.jpeg'),        imageUrl: img('Burger','Crispy Chicken Cheese Burger-.jpeg') },
      { name: 'Dynamite chicken Burger',         price: 219, categoryId: catMap['Burger'],             isVeg: false, available: true, image: img('Burger','Dynamite chicken Burger.jpeg'),              imageUrl: img('Burger','Dynamite chicken Burger.jpeg') },
      { name: 'Grilled Chicken Burger',          price: 199, categoryId: catMap['Burger'],             isVeg: false, available: true, image: img('Burger','Grilled Chicken Burger.jpeg'),               imageUrl: img('Burger','Grilled Chicken Burger.jpeg') },
      // Sandwich
      { name: 'Veg Grilled Sandwich',            price: 149, categoryId: catMap['Sandwich'],           isVeg: true,  available: true, image: img('Sandwich','Veg Grilled Sandwich.jpeg'),               imageUrl: img('Sandwich','Veg Grilled Sandwich.jpeg') },
      { name: 'Egg Sandwich',                    price: 149, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Egg Sandwich.jpeg'),                       imageUrl: img('Sandwich','Egg Sandwich.jpeg') },
      { name: 'Corn Cheese Sandwich',            price: 199, categoryId: catMap['Sandwich'],           isVeg: true,  available: true, image: img('Sandwich','Corn Cheese Sandwich.jpeg'),               imageUrl: img('Sandwich','Corn Cheese Sandwich.jpeg') },
      { name: 'Panner Tikka Sandwich',           price: 199, categoryId: catMap['Sandwich'],           isVeg: true,  available: true, image: img('Sandwich','Panner Tikka Sandwich.jpeg'),              imageUrl: img('Sandwich','Panner Tikka Sandwich.jpeg') },
      { name: 'Grilled Chicken Sandwich',        price: 199, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Grilled Chicken Sandwich.jpeg'),           imageUrl: img('Sandwich','Grilled Chicken Sandwich.jpeg') },
      { name: 'Grilled chicken Cheese sandwich', price: 219, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Grilled chicken Cheese sandwich.jpeg'),    imageUrl: img('Sandwich','Grilled chicken Cheese sandwich.jpeg') },
      { name: 'Fried Chicken Sandwich',          price: 199, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Fried Chicken Sandwich.jpeg'),             imageUrl: img('Sandwich','Fried Chicken Sandwich.jpeg') },
      { name: 'Fried Chicken Cheese Sandwich',   price: 219, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Fried Chicken Cheese Sandwich.jpeg'),      imageUrl: img('Sandwich','Fried Chicken Cheese Sandwich.jpeg') },
      { name: 'Dynamite chicken sandwich',       price: 219, categoryId: catMap['Sandwich'],           isVeg: false, available: true, image: img('Sandwich','Dynamite chicken sandwic.jpeg'),           imageUrl: img('Sandwich','Dynamite chicken sandwic.jpeg') },
      // Roll & Wrap
      { name: 'Veg Roll',                        price: 149, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Veg Roll.jpeg'),                        imageUrl: img('Roll & Wrap','Veg Roll.jpeg') },
      { name: 'Peri peri Veg Roll',              price: 169, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Peri peri Veg Roll.jpeg'),              imageUrl: img('Roll & Wrap','Peri peri Veg Roll.jpeg') },
      { name: 'Veg Cheese Roll',                 price: 169, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Veg Cheese Roll.jpeg'),                 imageUrl: img('Roll & Wrap','Veg Cheese Roll.jpeg') },
      { name: 'Panner Roll',                     price: 199, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Panner Roll.jpeg'),                     imageUrl: img('Roll & Wrap','Panner Roll.jpeg') },
      { name: 'Peri peri Panner Roll',           price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Peri peri Panner Roll.jpeg'),           imageUrl: img('Roll & Wrap','Peri peri Panner Roll.jpeg') },
      { name: 'Corn Cheese Roll',                price: 199, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Corn Cheese Roll.jpeg'),                imageUrl: img('Roll & Wrap','Corn Cheese Roll.jpeg') },
      { name: 'Peri peri corn Cheese Roll',      price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: true,  available: true, image: img('Roll & Wrap','Peri peri corn Cheese Roll.jpeg'),      imageUrl: img('Roll & Wrap','Peri peri corn Cheese Roll.jpeg') },
      { name: 'Crispy Chicken Wrap',             price: 199, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','Crispy Chicken Wrap.jpeg'),             imageUrl: img('Roll & Wrap','Crispy Chicken Wrap.jpeg') },
      { name: 'Peri peri Chicken Wrap',          price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','Peri peri Chicken Wrap.jpeg'),          imageUrl: img('Roll & Wrap','Peri peri Chicken Wrap.jpeg') },
      { name: 'Grilled Chicken Wrap',            price: 199, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','Grilled Chicken Wrap.jpeg'),            imageUrl: img('Roll & Wrap','Grilled Chicken Wrap.jpeg') },
      { name: 'Peri peri Grilled Chicken Wrap',  price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','Peri peri Grilled Chicken Wrap.jpeg'),  imageUrl: img('Roll & Wrap','Peri peri Grilled Chicken Wrap.jpeg') },
      { name: 'BBQ Chicken Wrap',                price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','BBQ Chicken Wrap.jpeg'),                imageUrl: img('Roll & Wrap','BBQ Chicken Wrap.jpeg') },
      { name: 'Dynamite Chicken Wrap',           price: 219, categoryId: catMap['Roll & Wrap'],        isVeg: false, available: true, image: img('Roll & Wrap','Dynamite Chicken Wrap.jpeg'),           imageUrl: img('Roll & Wrap','Dynamite Chicken Wrap.jpeg') },
      // Korean
      { name: 'Korean Chicken Fries',            price: 219, categoryId: catMap['Korean'],             isVeg: false, available: true, image: img('Korean','Korean Chicken Fries.jpeg'),                 imageUrl: img('Korean','Korean Chicken Fries.jpeg') },
      { name: 'Korean Chicken Burger',           price: 219, categoryId: catMap['Korean'],             isVeg: false, available: true, image: img('Korean','Korean Chicken Burger.jpeg'),                imageUrl: img('Korean','Korean Chicken Burger.jpeg') },
      { name: 'Korean Chicken Sandwich',         price: 219, categoryId: catMap['Korean'],             isVeg: false, available: true, image: img('Korean','Korean Chicken Sandwich.jpeg'),              imageUrl: img('Korean','Korean Chicken Sandwich.jpeg') },
      { name: 'Korean Chicken Wrap',             price: 219, categoryId: catMap['Korean'],             isVeg: false, available: true, image: img('Korean','Korean Chicken Wrap.jpeg'),                  imageUrl: img('Korean','Korean Chicken Wrap.jpeg') },
      { name: 'Korean Ramen veg noodles',        price: 199, categoryId: catMap['Korean'],             isVeg: true,  available: true, image: img('Korean','Korean Ramen veg noodles.jpeg'),             imageUrl: img('Korean','Korean Ramen veg noodles.jpeg') },
      { name: 'Korean Ramen panner noodles',     price: 219, categoryId: catMap['Korean'],             isVeg: true,  available: true, image: img('Korean','Korean Ramen panner noodles.jpeg'),          imageUrl: img('Korean','Korean Ramen panner noodles.jpeg') },
      { name: 'Korean Ramen chicken noodles',    price: 219, categoryId: catMap['Korean'],             isVeg: false, available: true, image: img('Korean','Korean Ramen chicken noodles.jpeg'),         imageUrl: img('Korean','Korean Ramen chicken noodles.jpeg') },
      // Pasta & Pulao
      { name: 'Alfredo veg Pasta',               price: 199, categoryId: catMap['Pasta & Pulao'],      isVeg: true,  available: true, image: img('Pasta & Pulao','Alfredo veg Pasta.jpeg'),             imageUrl: img('Pasta & Pulao','Alfredo veg Pasta.jpeg') },
      { name: 'Alfredo Egg pasta',               price: 229, categoryId: catMap['Pasta & Pulao'],      isVeg: false, available: true, image: img('Pasta & Pulao','Alfredo Egg pasta.jpeg'),             imageUrl: img('Pasta & Pulao','Alfredo Egg pasta.jpeg') },
      { name: 'Alfredo Panner pasta',            price: 219, categoryId: catMap['Pasta & Pulao'],      isVeg: true,  available: true, image: img('Pasta & Pulao','Alfredo Panner pasta.jpeg'),          imageUrl: img('Pasta & Pulao','Alfredo Panner pasta.jpeg') },
      { name: 'Alfredo chicken pasta',           price: 219, categoryId: catMap['Pasta & Pulao'],      isVeg: false, available: true, image: img('Pasta & Pulao','Alfredo chicken pasta.jpeg'),         imageUrl: img('Pasta & Pulao','Alfredo chicken pasta.jpeg') },
      { name: 'Veg pulao',                       price: 199, categoryId: catMap['Pasta & Pulao'],      isVeg: true,  available: true, image: img('Pasta & Pulao','Veg pulao.jpeg'),                     imageUrl: img('Pasta & Pulao','Veg pulao.jpeg') },
      { name: 'Egg pulao',                       price: 229, categoryId: catMap['Pasta & Pulao'],      isVeg: false, available: true, image: img('Pasta & Pulao','Egg pulao.jpeg'),                     imageUrl: img('Pasta & Pulao','Egg pulao.jpeg') },
      { name: 'Panner pulao',                    price: 249, categoryId: catMap['Pasta & Pulao'],      isVeg: true,  available: true, image: img('Pasta & Pulao','Panner pulao.jpeg'),                  imageUrl: img('Pasta & Pulao','Panner pulao.jpeg') },
      { name: 'Chicken pulao',                   price: 249, categoryId: catMap['Pasta & Pulao'],      isVeg: false, available: true, image: img('Pasta & Pulao','Chicken pulao.jpeg'),                 imageUrl: img('Pasta & Pulao','Chicken pulao.jpeg') },
      // Mojito
      { name: 'Lime & mint',                     price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Lime & Mint.jpeg'),                          imageUrl: img('Mojito','Lime & Mint.jpeg') },
      { name: 'Watermelon mint',                 price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Watermelon mint.jpeg'),                      imageUrl: img('Mojito','Watermelon mint.jpeg') },
      { name: 'Kiwi mojito',                     price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Kiwi mojito.jpeg'),                          imageUrl: img('Mojito','Kiwi mojito.jpeg') },
      { name: 'Mango mojito',                    price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Mango mojito.jpeg'),                         imageUrl: img('Mojito','Mango mojito.jpeg') },
      { name: 'Black currant mojito',            price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Black currant mojito.jpeg'),                 imageUrl: img('Mojito','Black currant mojito.jpeg') },
      { name: 'Strawberry mojito',               price: 119, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Strawberry mojito.jpeg'),                    imageUrl: img('Mojito','Strawberry mojito.jpeg') },
      { name: 'Blue Ocan',                       price: 129, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Blue Ocan.jpeg'),                            imageUrl: img('Mojito','Blue Ocan.jpeg') },
      { name: 'Blueberry',                       price: 129, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Blueberry.jpeg'),                            imageUrl: img('Mojito','Blueberry.jpeg') },
      { name: 'Bubblegum',                       price: 129, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Bubblegum.jpeg'),                            imageUrl: img('Mojito','Bubblegum.jpeg') },
      { name: 'Cranberry',                       price: 129, categoryId: catMap['Mojito'],             isVeg: true,  available: true, image: img('Mojito','Cranberry.jpeg'),                            imageUrl: img('Mojito','Cranberry.jpeg') },
      // Milkshake
      { name: 'Lotus Biscoff',                   price: 199, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Lotus Biscoff.jpeg'),                     imageUrl: img('Milkshake','Lotus Biscoff.jpeg') },
      { name: 'Oreo Thick Shake',                price: 199, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Oreo Thick Shake.jpeg'),                  imageUrl: img('Milkshake','Oreo Thick Shake.jpeg') },
      { name: 'Kitkat Blast',                    price: 199, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Kitkat Blast.jpeg'),                      imageUrl: img('Milkshake','Kitkat Blast.jpeg') },
      { name: 'Belgian Chocolate',               price: 199, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Belgian Chocolate.jpeg'),                 imageUrl: img('Milkshake','Belgian Chocolate.jpeg') },
      { name: 'Mixed Berry',                     price: 229, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Mixed Berry.jpeg'),                       imageUrl: img('Milkshake','Mixed Berry.jpeg') },
      { name: 'Orange Citrus',                   price: 229, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Orange Citrus.jpeg'),                     imageUrl: img('Milkshake','Orange Citrus.jpeg') },
      { name: 'Strawberry',                      price: 229, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Starberry.jpeg'),                         imageUrl: img('Milkshake','Starberry.jpeg') },
      { name: 'Mango',                           price: 229, categoryId: catMap['Milkshake'],          isVeg: true,  available: true, image: img('Milkshake','Mango.jpeg'),                             imageUrl: img('Milkshake','Mango.jpeg') },
      // Desserts & Beverages
      { name: 'Ice scoop',                       price: 120, categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true, image: img('Desserts & Beverages','Ice scoop.jpeg'),            imageUrl: img('Desserts & Beverages','Ice scoop.jpeg') },
      { name: 'Choco Brownie',                   price: 129, categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true, image: img('Desserts & Beverages','Choco Brownie.jpeg'),        imageUrl: img('Desserts & Beverages','Choco Brownie.jpeg') },
      { name: 'Brownie with ice cream',          price: 199, categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true, image: img('Desserts & Beverages','Brownie with ice cream.jpeg'),imageUrl: img('Desserts & Beverages','Brownie with ice cream.jpeg') },
      { name: 'Hot Chocolate',                   price: 199, categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true, image: img('Desserts & Beverages','Hot Chocolate.jpeg'),        imageUrl: img('Desserts & Beverages','Hot Chocolate.jpeg') },
      { name: 'Cold coffee',                     price: 229, categoryId: catMap['Desserts & Beverages'], isVeg: true, available: true, image: img('Desserts & Beverages','Cold coffee.jpeg'),           imageUrl: img('Desserts & Beverages','Cold coffee.jpeg') },
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

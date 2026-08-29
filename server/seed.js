require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');

const categories = [
  { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟', displayOrder: 1 },
  { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀', displayOrder: 2 },
  { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗', displayOrder: 3 },
  { name: 'Sandwiches', slug: 'sandwiches', icon: '🥪', displayOrder: 4 },
  { name: 'Wraps', slug: 'wraps', icon: '🌯', displayOrder: 5 },
  { name: 'Pasta', slug: 'pasta', icon: '🍝', displayOrder: 6 },
  { name: 'Korean Ramen', slug: 'korean-ramen', icon: '🍜', displayOrder: 7 },
  { name: 'Mojitos', slug: 'mojitos', icon: '🍹', displayOrder: 8 },
  { name: 'Milkshakes', slug: 'milkshakes', icon: '🥤', displayOrder: 9 },
];

const getMenuItems = (catMap) => [
  // ── Quick Bites ──
  {
    name: 'French Fries',
    description: 'Crispy golden fries seasoned with classic salt',
    price: 99,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/French fries.jpeg',
    tags: ['crispy', 'snack', 'veg'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 8,
  },
  {
    name: 'Peri Peri Fries',
    description: 'Fries tossed in fiery peri peri spice blend',
    price: 120,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Peri peri fries.jpeg',
    tags: ['spicy', 'peri-peri', 'veg'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 8,
  },
  {
    name: 'Veg Nuggets',
    description: 'Crunchy veggie nuggets served with dipping sauce',
    price: 149,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Veg Nuggets.jpeg',
    tags: ['veg', 'nuggets', 'crunchy'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 10,
  },
  {
    name: 'Cheese Triangles',
    description: 'Crispy triangle pockets loaded with melted cheese',
    price: 160,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Cheese Triangles.jpeg',
    tags: ['cheese', 'snack', 'veg'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 10,
  },
  {
    name: 'Ring Onion',
    description: 'Classic battered & fried onion rings, golden and crispy',
    price: 149,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Ring Onion.jpeg',
    tags: ['onion', 'rings', 'veg'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 8,
  },
  {
    name: 'Chicken Nuggets',
    description: 'Juicy chicken bites with a crispy seasoned coating',
    price: 159,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Chicken nuggets.jpeg',
    tags: ['chicken', 'nuggets', 'crispy'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 12,
  },
  {
    name: 'Popcorn',
    description: 'Light and fluffy seasoned popcorn, perfect for snacking',
    price: 169,
    category: catMap['quick-bites'],
    imageUrl: '/quick-bites/Popcorn.jpeg',
    tags: ['snack', 'light', 'veg'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 5,
  },
  // ── Loaded Fries ──
  {
    name: 'Loaded corn cheese Fries',
    description: 'Golden fries generously smothered in melted cheese and sweet golden corn',
    price: 199,
    category: catMap['loaded-fries'],
    imageUrl: '/loaded-fries/Corn cheese Fries.jpeg',
    tags: ['loaded', 'cheese', 'corn'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 10,
  },
  {
    name: 'Chicken loaded fries',
    description: 'Crispy fries topped with seasoned shredded chicken, melted cheese and special sauce',
    price: 199,
    category: catMap['loaded-fries'],
    imageUrl: '/loaded-fries/Chicken loaded fries.jpeg',
    tags: ['loaded', 'chicken', 'crispy'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 12,
  },
  {
    name: 'Peri peri chicken Loaded fries',
    description: 'Fiery peri peri spiced fries loaded with spicy chicken chunks and rich cheese dressing',
    price: 229,
    category: catMap['loaded-fries'],
    imageUrl: '/loaded-fries/Peri peri chicken Loaded fries.jpeg',
    tags: ['spicy', 'peri-peri', 'chicken'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 12,
  },
  // ── Crispy chicken ──
  {
    name: 'Crispy chicken strips 4pcs',
    description: 'Tender chicken inner fillets in an ultra-crispy golden crust',
    price: 199,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Crispy chicken strips.jpeg',
    tags: ['crispy', 'strips', 'chicken'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 12,
  },
  {
    name: 'Peri peri chicken strips 4pcs',
    description: 'Crispy chicken tenders coated in fiery peri peri seasoning',
    price: 219,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Peri peri chicken strips.jpeg',
    tags: ['spicy', 'peri-peri', 'strips'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 12,
  },
  {
    name: 'Crispy chicken lollipop 4pcs',
    description: 'Crispy fried chicken drumettes served with tangy dip',
    price: 199,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Crispy chicken lollipop.jpeg',
    tags: ['crispy', 'lollipop', 'chicken'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 15,
  },
  {
    name: 'Peri peri chicken lollipop 4pcs',
    description: 'Juicy chicken lollipops dusted with hot peri peri spices',
    price: 219,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Peri peri chicken lollipop.jpeg',
    tags: ['spicy', 'peri-peri', 'lollipop'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 15,
  },
  {
    name: 'Crispy chicken wings 4pcs',
    description: 'Golden fried crunchy chicken wings seasoned to perfection',
    price: 199,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Crispy chicken wings.jpeg',
    tags: ['crispy', 'wings', 'chicken'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 15,
  },
  {
    name: 'Peri peri chicken wings 4pcs',
    description: 'Spicy peri peri glazed chicken wings packed with bold flavour',
    price: 219,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Peri peri chicken wings.jpeg',
    tags: ['spicy', 'peri-peri', 'wings'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 15,
  },
  {
    name: 'Dynamite chicken',
    description: 'Crispy bite-sized chicken tossed in creamy spicy dynamite sauce',
    price: 229,
    category: catMap['crispy-chicken'],
    imageUrl: '/crispy-chicken/Dynamite chicken.jpeg',
    tags: ['dynamite', 'spicy', 'chicken'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 12,
  },
  // ── Sandwiches ──
  {
    name: 'Grilled Club Sandwich',
    description: 'Triple-decker grilled sandwich with chicken, cheese & veggies',
    price: 229,
    category: catMap['sandwiches'],
    tags: ['grilled', 'chicken', 'club'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 10,
  },
  {
    name: 'Cheese & Corn Grilled Sandwich',
    description: 'Loaded with sweet corn and melted cheese on multigrain bread',
    price: 179,
    category: catMap['sandwiches'],
    tags: ['veg', 'cheese', 'corn'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 8,
  },
  {
    name: 'Peri-Peri Chicken Sandwich',
    description: 'Spicy peri-peri chicken with coleslaw in a toasted sub',
    price: 249,
    category: catMap['sandwiches'],
    tags: ['chicken', 'spicy', 'peri-peri'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 10,
  },
  // ── Wraps ──
  {
    name: 'Chicken Tikka Wrap',
    description: 'Spicy tender chicken tikka with mint chutney and onions in a soft tortilla',
    price: 229,
    category: catMap['wraps'],
    tags: ['chicken', 'spicy', 'desi'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 10,
  },
  {
    name: 'Paneer Kathi Wrap',
    description: 'Classic kathi roll with paneer masala, peppers & tangy chutney',
    price: 199,
    category: catMap['wraps'],
    tags: ['veg', 'paneer', 'kathi'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 10,
  },
  {
    name: 'BBQ Chicken Wrap',
    description: 'Smoky BBQ chicken strips with cheddar, lettuce and chipotle mayo',
    price: 249,
    category: catMap['wraps'],
    tags: ['chicken', 'bbq', 'smoky'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 12,
  },
  // ── Pasta ──
  {
    name: 'Creamy Alfredo Pasta',
    description: 'Classic Italian white sauce pasta, creamy, cheesy and comforting',
    price: 249,
    category: catMap['pasta'],
    tags: ['veg', 'creamy', 'italian'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 15,
  },
  {
    name: 'Chicken Arrabbiata',
    description: 'Spicy tomato-based pasta with tender chicken chunks',
    price: 279,
    category: catMap['pasta'],
    tags: ['chicken', 'spicy', 'tomato'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 15,
  },
  {
    name: 'Pesto Pasta',
    description: 'Fresh basil pesto tossed with penne, pine nuts and parmesan',
    price: 259,
    category: catMap['pasta'],
    tags: ['veg', 'pesto', 'basil'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 12,
  },
  // ── Korean Ramen ──
  {
    name: 'Spicy Chicken Ramen',
    description: 'Korean-style spicy ramen with soft egg, bok choy & chicken broth',
    price: 299,
    category: catMap['korean-ramen'],
    tags: ['chicken', 'spicy', 'korean'],
    isVeg: false,
    isBestseller: true,
    preparationTime: 18,
  },
  {
    name: 'Veggie Miso Ramen',
    description: 'Rich miso broth with tofu, mushrooms and spring onions',
    price: 269,
    category: catMap['korean-ramen'],
    tags: ['veg', 'miso', 'tofu'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 15,
  },
  {
    name: 'Tonkotsu Pork Ramen',
    description: 'Creamy pork bone broth with chashu pork, nori & marinated egg',
    price: 349,
    category: catMap['korean-ramen'],
    tags: ['pork', 'creamy', 'rich'],
    isVeg: false,
    isBestseller: false,
    preparationTime: 20,
  },
  // ── Mojitos ──
  {
    name: 'Blackcurrant Mojito',
    description: 'Cool, fizzy and refreshing blackcurrant mojito with fresh mint',
    price: 149,
    category: catMap['mojitos'],
    tags: ['cold', 'fizzy', 'blackcurrant'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 5,
  },
  {
    name: 'Classic Virgin Mojito',
    description: 'Fresh lime, mint and sparkling water — timeless and refreshing',
    price: 129,
    category: catMap['mojitos'],
    tags: ['cold', 'lime', 'mint'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 5,
  },
  {
    name: 'Watermelon Mojito',
    description: 'Summer-special watermelon crush with mint and lemon fizz',
    price: 159,
    category: catMap['mojitos'],
    tags: ['cold', 'watermelon', 'summer'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 5,
  },
  {
    name: 'Passion Fruit Mojito',
    description: 'Tropical passion fruit with basil and sparkling water',
    price: 169,
    category: catMap['mojitos'],
    tags: ['cold', 'tropical', 'passion fruit'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 5,
  },
  // ── Milkshakes ──
  {
    name: 'Buttercotch Milkshake',
    description: 'Rich, creamy and indulgent butterscotch milkshake topped with caramel drizzle',
    price: 179,
    category: catMap['milkshakes'],
    tags: ['cold', 'butterscotch', 'indulgent'],
    isVeg: true,
    isBestseller: true,
    preparationTime: 7,
  },
  {
    name: 'Classic Chocolate Milkshake',
    description: 'Thick and rich chocolate milkshake with Oreo crumble',
    price: 169,
    category: catMap['milkshakes'],
    tags: ['cold', 'chocolate', 'classic'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 7,
  },
  {
    name: 'Strawberry Cheesecake Shake',
    description: 'Creamy strawberry shake blended with cheesecake chunks',
    price: 199,
    category: catMap['milkshakes'],
    tags: ['cold', 'strawberry', 'cheesecake'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 8,
  },
  {
    name: 'Vanilla Bean Shake',
    description: 'Simple, elegant vanilla bean milkshake with whipped cream',
    price: 149,
    category: catMap['milkshakes'],
    tags: ['cold', 'vanilla', 'classic'],
    isVeg: true,
    isBestseller: false,
    preparationTime: 5,
  },
];

const Finance = require('./models/Finance');
const Inventory = require('./models/Inventory');

const seed = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      MenuItem.deleteMany({}),
      Finance.deleteMany({}),
      Inventory.deleteMany({}),
    ]);

    // ── Seed Admin User (Optional via environment variables) ──
    let adminUser = null;
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      console.log('👤 Creating initial admin user from env credentials...');
      adminUser = await User.create({
        name: 'Dood Admin',
        email: process.env.ADMIN_EMAIL,
        passwordHash: process.env.ADMIN_PASSWORD,
        role: 'admin',
      });
    }

    // ── Seed Categories ──
    console.log('📂 Seeding categories...');
    const createdCats = await Category.insertMany(categories);
    const catMap = {};
    createdCats.forEach((c) => { catMap[c.slug] = c._id; });

    // ── Seed Menu Items ──
    console.log('🍔 Seeding menu items...');
    const menuItems = getMenuItems(catMap);
    await MenuItem.insertMany(menuItems);

    // ── Seed Inventory Stock ──
    console.log('📦 Seeding inventory stock...');
    await Inventory.insertMany([
      { name: 'Fresh Dairy Milk 1L', sku: 'MILK-WHOLE-01', category: 'dairy', quantity: 45, unit: 'L', costPerUnit: 65, reorderLevel: 15, location: 'Main Refrigerator' },
      { name: 'Espresso Arabica Coffee Beans 1kg', sku: 'BEAN-ARABICA-01', category: 'beverages', quantity: 8, unit: 'kg', costPerUnit: 850, reorderLevel: 10, location: 'Dry Store' },
      { name: 'Cheddar Cheese Slices 1kg', sku: 'CHEESE-CHEDDAR-01', category: 'dairy', quantity: 4, unit: 'kg', costPerUnit: 480, reorderLevel: 5, location: 'Main Refrigerator' },
      { name: 'Fresh Chicken Drumettes 1kg', sku: 'CHK-DRUM-01', category: 'produce', quantity: 15, unit: 'kg', costPerUnit: 260, reorderLevel: 5, location: 'Main Refrigerator' },
      { name: 'Fresh Mint Leaves', sku: 'HERB-MINT-100', category: 'produce', quantity: 2, unit: 'kg', costPerUnit: 150, reorderLevel: 3, location: 'Cold Storage' },
    ]);

    // ── Seed Finances ──
    console.log('💰 Seeding initial financial transactions...');
    const recordedById = adminUser ? adminUser._id : new mongoose.Types.ObjectId();
    await Finance.insertMany([
      { type: 'income', category: 'order_revenue', amount: 14500, description: 'Daily Order Counter Sales', recordedBy: recordedById, transactionDate: new Date() },
      { type: 'income', category: 'catering', amount: 8500, description: 'Weekend Corporate Coffee Catering', recordedBy: recordedById, transactionDate: new Date(Date.now() - 86400000) },
      { type: 'expense', category: 'ingredients', amount: 6200, description: 'Coffee beans & Dairy restock batch #401', recordedBy: recordedById, transactionDate: new Date() },
      { type: 'expense', category: 'utilities', amount: 4500, description: 'Monthly Electricity & Water Bill', recordedBy: recordedById, transactionDate: new Date(Date.now() - 172800000) },
    ]);

    console.log(`✅ Seeded categories, menu items, inventory, and finances successfully.`);
    if (adminUser) {
      console.log(`🔑 Admin created: ${process.env.ADMIN_EMAIL}`);
    } else {
      console.log(`ℹ️  No ADMIN_EMAIL/ADMIN_PASSWORD provided in env. The very first user registering via /api/v1/auth/register will automatically become the Admin.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();

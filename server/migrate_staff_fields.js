const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('--- Migrating Database Schema for Staff & Order Requirements ---');
    // 1. Safe ENUM additions
    await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'staff';`);
    await sequelize.query(`ALTER TYPE "enum_orders_orderType" ADD VALUE IF NOT EXISTS 'dine-in';`);
    await sequelize.query(`ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'handed_over';`);
    
    // 2. Safe Column additions
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(100);`);
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerPhone" VARCHAR(20);`);
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20) DEFAULT 'pending';`);
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billNumber" VARCHAR(50);`);
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "handedOverAt" TIMESTAMP WITH TIME ZONE;`);
    await sequelize.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "handedOverBy" UUID;`);

    // 3. Indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS "orders_billNumber_idx" ON "orders" ("billNumber");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON "orders" ("paymentStatus");`);

    console.log('✅ Schema migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

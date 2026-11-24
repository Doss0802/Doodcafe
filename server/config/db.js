const sequelize = require('../src/config/db');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL Connected via Sequelize');

    // ── Step 1: Add any missing columns BEFORE sync() so Sequelize index
    //   creation (e.g. the unique partial index on "idempotencyKey") does not
    //   fail with "column does not exist" on an existing database.
    try {
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tableNumber" VARCHAR(20);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(64);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paytmOrderId" VARCHAR(100);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "transactionId" VARCHAR(100);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bankTxnId" VARCHAR(100);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gatewayName" VARCHAR(50);');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rawGatewayResponse" JSONB;');
    } catch (_) {
      // orders table may not exist yet on a fresh DB — sync() will create it below
    }

    // ── Step 2: Synchronize models (creates tables / columns that don't exist).
    //   alter:false is safe — it never drops columns or data.
    await sequelize.sync({ alter: false });

    // ── Step 3: Ensure indexes and tables exist (idempotent IF NOT EXISTS guards).
    try {
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_idx" ON "orders" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "orders_paytm_order_id_idx" ON "orders" ("paytmOrderId");');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "orders_transaction_id_idx" ON "orders" ("transactionId");');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "offer_images_offer_id_idx" ON "offer_images" ("offerId");');
    } catch {
      // Indexes may already exist
    }

    logger.info('✅ PostgreSQL tables synchronized');
    return sequelize;
  } catch (error) {
    logger.error(`❌ PostgreSQL connection failed: ${error.message}`);
    // Non-fatal so server port detection on cloud hosts can continue
    return null;
  }
};

module.exports = connectDB;

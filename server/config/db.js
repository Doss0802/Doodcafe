const sequelize = require('../src/config/db');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL Connected via Sequelize');
    // Synchronize models (create tables that don't exist yet).
    // alter:false is safe — it never drops columns or data.
    await sequelize.sync({ alter: false });
    logger.info('✅ PostgreSQL tables synchronized');
    return sequelize;
  } catch (error) {
    logger.error(`❌ PostgreSQL connection failed: ${error.message}`);
    // Non-fatal so server port detection on cloud hosts can continue
    return null;
  }
};

module.exports = connectDB;

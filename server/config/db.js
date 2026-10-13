const sequelize = require('../src/config/db');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL Connected via Sequelize');
    // Synchronize models in development or when requested
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
      logger.info('✅ PostgreSQL tables synchronized');
    }
    return sequelize;
  } catch (error) {
    logger.error(`❌ PostgreSQL connection failed: ${error.message}`);
    // Non-fatal so server port detection on cloud hosts can continue
    return null;
  }
};

module.exports = connectDB;

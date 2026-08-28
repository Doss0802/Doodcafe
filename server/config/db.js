const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

// Configure reliable DNS servers to prevent SRV/TXT EREFUSED resolution issues on Windows/ISP resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

/**
 * Connects to MongoDB database using Mongoose with exponential backoff retry loop.
 * 
 * Features:
 * - Max retries limit with exponential backoff and jitter
 * - Lifecycle event monitoring (error, disconnected, reconnected) without internal property mutation
 * - Fine-tuned connection pool and timeout settings
 */
const connectDB = async () => {
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  const MAX_RETRIES = 5;
  const INITIAL_DELAY_MS = 1000;

  // Bind connection runtime lifecycle listeners if not already attached
  if (mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB runtime connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB connection disconnected. Mongoose will attempt to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB connection successfully reconnected.');
    });
  }

  const primaryUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Doodcafe';
  const fallbackUri = 'mongodb://localhost:27017/Doodcafe';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(primaryUri, options);
      logger.info(`✅ MongoDB Connected: ${conn.connection.host} [DB: ${conn.connection.name}]`);
      return conn;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const backoffDelay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.floor(Math.random() * 500);
      const delay = backoffDelay + jitter;

      logger.error(
        `❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}. ${isLastAttempt ? 'Exhausted retries on primary URI.' : `Retrying in ${Math.round(delay)}ms...`}`
      );

      if (isLastAttempt) {
        // In development mode, fallback to local MongoDB so the dev server does not crash
        if (process.env.NODE_ENV !== 'production' && primaryUri !== fallbackUri) {
          logger.warn(`⚠️ Cloud MongoDB connection failed. Attempting fallback to local MongoDB (${fallbackUri})...`);
          try {
            const fallbackConn = await mongoose.connect(fallbackUri, options);
            logger.info(`✅ Fallback to Local MongoDB Connected: ${fallbackConn.connection.host} [DB: ${fallbackConn.connection.name}]`);
            return fallbackConn;
          } catch (localErr) {
            logger.error(`💥 Local MongoDB fallback also failed: ${localErr.message}`);
          }
        }

        logger.error('💥 Fatal: Could not establish MongoDB database connection after max retries.');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;

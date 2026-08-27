const mongoose = require('mongoose');
const logger = require('../utils/logger');

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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Doodcafe';
      const conn = await mongoose.connect(uri, options);

      logger.info(`✅ MongoDB Connected: ${conn.connection.host} [DB: ${conn.connection.name}]`);
      return conn;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const backoffDelay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.floor(Math.random() * 500);
      const delay = backoffDelay + jitter;

      logger.error(
        `❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}. ${isLastAttempt ? 'Exhausted all retries.' : `Retrying in ${Math.round(delay)}ms...`
        }`
      );

      if (isLastAttempt) {
        logger.error('💥 Fatal: Could not establish MongoDB database connection after max retries.');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;

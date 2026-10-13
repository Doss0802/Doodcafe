const express = require('express');
const sequelize = require('../src/config/db');
const ApiResponse = require('../utils/ApiResponse');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Production Healthcheck & Diagnostic Metrics
 * @access  Public
 */
router.get('/', async (req, res) => {
  let isDbConnected = false;
  try {
    await sequelize.authenticate();
    isDbConnected = true;
  } catch (e) {
    isDbConnected = false;
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const statusCode = 200; // Return 200 so cloud healthchecks stay UP

  return ApiResponse.success(res, {
    statusCode,
    message: isDbConnected ? '🍵 Dood Cafe Backend Service Healthy' : '⚠️ Service Operational (DB Connecting)',
    data: {
      status: isDbConnected ? 'UP' : 'INITIALIZING',
      database: {
        engine: 'PostgreSQL',
        connected: isDbConnected,
      },
      system: {
        uptimeSeconds,
        memoryUsageMB: {
          rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
    },
  });
});

module.exports = router;

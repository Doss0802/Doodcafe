const express = require('express');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/ApiResponse');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Production Healthcheck & Diagnostic Metrics
 * @access  Public
 */
router.get('/', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbState === 1;
  const statusCode = isHealthy ? 200 : 503;

  return ApiResponse.success(res, {
    statusCode,
    message: isHealthy ? '🍵 Dood Cafe Backend Service Healthy' : '⚠️ Service Degradation Detected',
    data: {
      status: isHealthy ? 'UP' : 'DOWN',
      database: {
        status: dbStatusMap[dbState] || 'Unknown',
        connected: dbState === 1,
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
// Basic health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Detailed health check
router.get('/health/detailed', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'unknown',
            redis: 'unknown'
        },
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.APP_VERSION || '1.0.0'
    };
    // Check MongoDB
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            health.services.database = 'healthy';
            health.database = {
                state: 'connected',
                host: mongoose_1.default.connection.host,
                name: mongoose_1.default.connection.name
            };
        }
        else {
            health.services.database = 'unhealthy';
            health.status = 'degraded';
            health.database = {
                state: getMongooseState(mongoose_1.default.connection.readyState)
            };
        }
    }
    catch (error) {
        health.services.database = 'unhealthy';
        health.status = 'unhealthy';
        logger_1.logger.error('Database health check failed', { error: error.message });
    }
    // Check Redis (if configured)
    try {
        // Import Redis client if available
        // const { redisClient } = require('../config/redis');
        // await redisClient.ping();
        // health.services.redis = 'healthy';
        health.services.redis = 'not_configured';
    }
    catch (error) {
        health.services.redis = 'unhealthy';
        health.status = 'degraded';
        logger_1.logger.error('Redis health check failed', { error: error.message });
    }
    res.json(health);
});
// Readiness check (Kubernetes readiness probe)
router.get('/ready', async (req, res) => {
    try {
        // Check if app is ready to serve traffic
        const dbReady = mongoose_1.default.connection.readyState === 1;
        // Add other readiness checks here
        // const redisReady = redisClient.status === 'ready';
        if (dbReady) {
            res.status(200).json({
                ready: true,
                checks: {
                    database: dbReady
                }
            });
        }
        else {
            res.status(503).json({
                ready: false,
                checks: {
                    database: dbReady
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed', { error: error.message });
        res.status(503).json({
            ready: false,
            error: error.message
        });
    }
});
// Liveness check (Kubernetes liveness probe)
router.get('/live', (req, res) => {
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString()
    });
});
// Startup check (Kubernetes startup probe)
router.get('/startup', async (req, res) => {
    try {
        // Check if application has started successfully
        const dbStarted = mongoose_1.default.connection.readyState === 1;
        if (dbStarted) {
            res.status(200).json({
                started: true,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(503).json({
                started: false,
                message: 'Application still starting'
            });
        }
    }
    catch (error) {
        res.status(503).json({
            started: false,
            error: error.message
        });
    }
});
// Helper to get readable MongoDB connection state
function getMongooseState(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
}
exports.default = router;

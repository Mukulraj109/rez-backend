"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prometheus_1 = require("../config/prometheus");
const MetricsService_1 = require("../services/MetricsService");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
// Prometheus metrics endpoint
router.get('/metrics', prometheus_1.metricsEndpoint);
// Custom application metrics
router.get('/metrics/app', (req, res) => {
    try {
        const appMetrics = MetricsService_1.metrics.getMetrics();
        res.json({
            success: true,
            metrics: appMetrics,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve metrics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});
// Metrics summary
router.get('/metrics/summary', (req, res) => {
    try {
        const summaries = {
            requests: MetricsService_1.metrics.getSummary('http_request_duration'),
            errors: MetricsService_1.metrics.getSummary('errors'),
            dbQueries: MetricsService_1.metrics.getSummary('db_query_duration'),
            cacheHits: MetricsService_1.metrics.getSummary('cache_hits'),
            cacheMisses: MetricsService_1.metrics.getSummary('cache_misses')
        };
        res.json({
            success: true,
            summaries,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve metric summaries', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metric summaries'
        });
    }
});
// Reset metrics (admin only)
router.post('/metrics/reset', (req, res) => {
    try {
        MetricsService_1.metrics.reset();
        logger_1.logger.info('Metrics reset by admin');
        res.json({
            success: true,
            message: 'Metrics reset successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to reset metrics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to reset metrics'
        });
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMetrics = exports.trackDbOperation = exports.metricsMiddleware = exports.metricsEndpoint = exports.bookingCounter = exports.revenueCounter = exports.orderCounter = exports.errorCounter = exports.queueSize = exports.activeUsers = exports.cacheCounter = exports.dbConnectionsActive = exports.dbQueryDuration = exports.httpRequestDuration = exports.httpRequestCounter = void 0;
const prom_client_1 = require("prom-client");
// Collect default metrics (CPU, memory, etc.)
(0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
// HTTP request counter
exports.httpRequestCounter = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});
// HTTP request duration
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});
// Database query duration
exports.dbQueryDuration = new prom_client_1.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});
// Database connection pool
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections'
});
// Cache hit/miss counter
exports.cacheCounter = new prom_client_1.Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'result']
});
// Active users gauge
exports.activeUsers = new prom_client_1.Gauge({
    name: 'active_users',
    help: 'Number of currently active users'
});
// Queue size gauge
exports.queueSize = new prom_client_1.Gauge({
    name: 'queue_size',
    help: 'Number of items in queue',
    labelNames: ['queue_name']
});
// Error counter
exports.errorCounter = new prom_client_1.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'code']
});
// Business metrics
exports.orderCounter = new prom_client_1.Counter({
    name: 'orders_total',
    help: 'Total number of orders',
    labelNames: ['status']
});
exports.revenueCounter = new prom_client_1.Counter({
    name: 'revenue_total',
    help: 'Total revenue',
    labelNames: ['currency']
});
exports.bookingCounter = new prom_client_1.Counter({
    name: 'bookings_total',
    help: 'Total number of bookings',
    labelNames: ['status', 'type']
});
// Export metrics endpoint
const metricsEndpoint = (req, res) => {
    res.set('Content-Type', prom_client_1.register.contentType);
    res.end(prom_client_1.register.metrics());
};
exports.metricsEndpoint = metricsEndpoint;
// Metrics middleware
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        // Increment request counter
        exports.httpRequestCounter.inc({
            method: req.method,
            route,
            status: res.statusCode.toString()
        });
        // Observe request duration
        exports.httpRequestDuration.observe({
            method: req.method,
            route,
            status: res.statusCode.toString()
        }, duration);
        // Track errors
        if (res.statusCode >= 400) {
            exports.errorCounter.inc({
                type: res.statusCode >= 500 ? 'server' : 'client',
                code: res.statusCode.toString()
            });
        }
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
// Helper to track database operations
const trackDbOperation = async (operation, collection, fn) => {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = (Date.now() - start) / 1000;
        exports.dbQueryDuration.observe({ operation, collection }, duration);
        return result;
    }
    catch (error) {
        const duration = (Date.now() - start) / 1000;
        exports.dbQueryDuration.observe({ operation, collection }, duration);
        throw error;
    }
};
exports.trackDbOperation = trackDbOperation;
// Reset all metrics (useful for testing)
const resetMetrics = () => {
    prom_client_1.register.resetMetrics();
};
exports.resetMetrics = resetMetrics;

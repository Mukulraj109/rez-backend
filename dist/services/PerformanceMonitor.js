"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfMonitor = void 0;
const logger_1 = require("../config/logger");
const MetricsService_1 = require("./MetricsService");
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
        this.thresholds = new Map();
    }
    // Start timing
    start(label, labels) {
        const key = this.getKey(label, labels);
        this.timers.set(key, {
            start: Date.now(),
            labels
        });
    }
    // End timing and return duration
    end(label, labels) {
        const key = this.getKey(label, labels);
        const timer = this.timers.get(key);
        if (!timer) {
            logger_1.logger.warn(`Performance timer not found: ${label}`);
            return 0;
        }
        const duration = Date.now() - timer.start;
        this.timers.delete(key);
        // Log if exceeds threshold
        const threshold = this.thresholds.get(label);
        if (threshold && duration > threshold) {
            logger_1.logger.warn(`Performance threshold exceeded: ${label}`, {
                duration: `${duration}ms`,
                threshold: `${threshold}ms`,
                labels
            });
        }
        // Record metric
        MetricsService_1.metrics.timing(label, duration, labels);
        logger_1.logger.debug(`Performance: ${label}`, {
            duration: `${duration}ms`,
            labels
        });
        return duration;
    }
    // Measure async function
    async measure(label, fn, labels) {
        this.start(label, labels);
        try {
            const result = await fn();
            this.end(label, labels);
            return result;
        }
        catch (error) {
            this.end(label, labels);
            throw error;
        }
    }
    // Measure sync function
    measureSync(label, fn, labels) {
        this.start(label, labels);
        try {
            const result = fn();
            this.end(label, labels);
            return result;
        }
        catch (error) {
            this.end(label, labels);
            throw error;
        }
    }
    // Set performance threshold for a label
    setThreshold(label, milliseconds) {
        this.thresholds.set(label, milliseconds);
    }
    // Get current timers
    getActiveTimers() {
        return Array.from(this.timers.keys());
    }
    // Clear all timers
    clear() {
        this.timers.clear();
    }
    // Get key with labels
    getKey(label, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return label;
        }
        return `${label}|${JSON.stringify(labels)}`;
    }
    // Mark a checkpoint
    mark(label) {
        logger_1.logger.debug(`Performance mark: ${label}`, {
            timestamp: Date.now()
        });
    }
    // Measure between two marks
    measureMarks(startMark, endMark) {
        // Simple implementation - in production use Performance API
        logger_1.logger.debug(`Performance measure: ${startMark} to ${endMark}`);
        return 0;
    }
}
exports.perfMonitor = new PerformanceMonitor();
// Set default thresholds (in milliseconds)
exports.perfMonitor.setThreshold('db.query', 100);
exports.perfMonitor.setThreshold('api.request', 500);
exports.perfMonitor.setThreshold('cache.get', 10);
exports.perfMonitor.setThreshold('file.upload', 5000);
exports.perfMonitor.setThreshold('image.process', 2000);

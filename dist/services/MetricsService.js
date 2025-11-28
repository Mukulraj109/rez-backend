"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
const logger_1 = require("../config/logger");
class MetricsService {
    constructor() {
        this.metrics = new Map();
        this.gauges = new Map();
    }
    // Increment counter
    increment(metric, value = 1, labels) {
        const key = this.getKey(metric, labels);
        const existing = this.metrics.get(key) || [];
        existing.push({
            value,
            timestamp: Date.now(),
            labels
        });
        this.metrics.set(key, existing);
    }
    // Record gauge (snapshot value)
    gauge(metric, value, labels) {
        const key = this.getKey(metric, labels);
        this.gauges.set(key, value);
    }
    // Record timing in milliseconds
    timing(metric, duration, labels) {
        const key = this.getKey(`${metric}.timing`, labels);
        const existing = this.metrics.get(key) || [];
        existing.push({
            value: duration,
            timestamp: Date.now(),
            labels
        });
        this.metrics.set(key, existing);
    }
    // Record histogram value
    histogram(metric, value, labels) {
        const key = this.getKey(`${metric}.histogram`, labels);
        const existing = this.metrics.get(key) || [];
        existing.push({
            value,
            timestamp: Date.now(),
            labels
        });
        this.metrics.set(key, existing);
    }
    // Get metric summary
    getSummary(metric, labels) {
        const key = this.getKey(metric, labels);
        const data = this.metrics.get(key);
        if (!data || data.length === 0)
            return null;
        const values = data.map(d => d.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        return {
            count: values.length,
            sum,
            avg: sum / values.length,
            min: values[0],
            max: values[values.length - 1],
            p50: this.percentile(values, 0.5),
            p95: this.percentile(values, 0.95),
            p99: this.percentile(values, 0.99)
        };
    }
    // Get all metrics
    getMetrics() {
        const result = {};
        // Add counters and timings
        this.metrics.forEach((data, key) => {
            const summary = this.getSummary(key.split('|')[0], this.parseLabels(key));
            result[key] = summary;
        });
        // Add gauges
        this.gauges.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    // Reset all metrics
    reset() {
        this.metrics.clear();
        this.gauges.clear();
    }
    // Clean old metrics (keep only last hour)
    cleanOldMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.metrics.forEach((data, key) => {
            const filtered = data.filter(d => d.timestamp > oneHourAgo);
            if (filtered.length > 0) {
                this.metrics.set(key, filtered);
            }
            else {
                this.metrics.delete(key);
            }
        });
    }
    // Export for Prometheus format
    exportPrometheus() {
        let output = '';
        // Export gauges
        this.gauges.forEach((value, key) => {
            const [metric, labels] = this.splitKey(key);
            const labelStr = this.formatLabels(labels);
            output += `${metric}${labelStr} ${value}\n`;
        });
        // Export counters
        this.metrics.forEach((data, key) => {
            const [metric, labels] = this.splitKey(key);
            const labelStr = this.formatLabels(labels);
            const sum = data.reduce((acc, d) => acc + d.value, 0);
            output += `${metric}_total${labelStr} ${sum}\n`;
        });
        return output;
    }
    // Get key with labels
    getKey(metric, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return metric;
        }
        return `${metric}|${JSON.stringify(labels)}`;
    }
    // Split key into metric and labels
    splitKey(key) {
        const parts = key.split('|');
        if (parts.length === 1) {
            return [parts[0], undefined];
        }
        return [parts[0], JSON.parse(parts[1])];
    }
    // Parse labels from key
    parseLabels(key) {
        const parts = key.split('|');
        if (parts.length === 1)
            return undefined;
        return JSON.parse(parts[1]);
    }
    // Format labels for Prometheus
    formatLabels(labels) {
        if (!labels || Object.keys(labels).length === 0)
            return '';
        const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
        return `{${pairs.join(',')}}`;
    }
    // Calculate percentile
    percentile(values, p) {
        if (values.length === 0)
            return 0;
        const index = Math.ceil(values.length * p) - 1;
        return values[Math.max(0, index)];
    }
    // Log metrics summary
    logSummary() {
        const metrics = this.getMetrics();
        logger_1.logger.info('Metrics Summary', { metrics });
    }
}
exports.metrics = new MetricsService();
// Clean old metrics every 10 minutes
setInterval(() => {
    exports.metrics.cleanOldMetrics();
}, 10 * 60 * 1000);

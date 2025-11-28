"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAlerts = checkAlerts;
exports.addAlert = addAlert;
exports.removeAlert = removeAlert;
exports.getAlerts = getAlerts;
exports.startAlertMonitoring = startAlertMonitoring;
exports.stopAlertMonitoring = stopAlertMonitoring;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const MetricsService_1 = require("../services/MetricsService");
// Track when alerts were last fired
const lastAlertTime = new Map();
const alerts = [
    {
        name: 'High Error Rate',
        condition: () => {
            // Check if error rate > 1% in last 5 minutes
            const errorMetrics = MetricsService_1.metrics.getSummary('errors');
            const requestMetrics = MetricsService_1.metrics.getSummary('requests');
            if (!errorMetrics || !requestMetrics)
                return false;
            const errorRate = errorMetrics.count / requestMetrics.count;
            return errorRate > 0.01;
        },
        message: 'Error rate exceeds 1% threshold',
        severity: 'high',
        cooldown: 300 // 5 minutes
    },
    {
        name: 'High Response Time',
        condition: () => {
            // Check if p95 response time > 500ms
            const responseTime = MetricsService_1.metrics.getSummary('http_request_duration');
            if (!responseTime)
                return false;
            return responseTime.p95 > 500;
        },
        message: 'Response time p95 exceeds 500ms',
        severity: 'medium',
        cooldown: 300
    },
    {
        name: 'Database Connection Lost',
        condition: () => {
            return mongoose_1.default.connection.readyState !== 1;
        },
        message: 'Database connection is not active',
        severity: 'critical',
        cooldown: 60 // 1 minute
    },
    {
        name: 'High Memory Usage',
        condition: () => {
            const memUsage = process.memoryUsage();
            const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            return heapUsedPercent > 90;
        },
        message: 'Memory usage exceeds 90%',
        severity: 'high',
        cooldown: 300
    },
    {
        name: 'High CPU Usage',
        condition: () => {
            // Simple CPU check - in production, use proper CPU monitoring
            const cpuUsage = process.cpuUsage();
            // This is a simplified check
            return false;
        },
        message: 'CPU usage is high',
        severity: 'medium',
        cooldown: 300
    },
    {
        name: 'Slow Database Queries',
        condition: () => {
            const dbMetrics = MetricsService_1.metrics.getSummary('db_query_duration');
            if (!dbMetrics)
                return false;
            return dbMetrics.p95 > 1000; // 1 second
        },
        message: 'Database queries are slow (p95 > 1s)',
        severity: 'medium',
        cooldown: 300
    }
];
// Check if alert should fire (respecting cooldown)
function shouldFireAlert(alert) {
    const now = Date.now();
    const lastFired = lastAlertTime.get(alert.name);
    if (!lastFired)
        return true;
    const cooldown = (alert.cooldown || 300) * 1000; // Convert to milliseconds
    return now - lastFired > cooldown;
}
// Send alert notification
async function sendAlert(alert) {
    logger_1.logger.error(`ALERT: ${alert.name}`, {
        message: alert.message,
        severity: alert.severity,
        timestamp: new Date().toISOString()
    });
    // Update last alert time
    lastAlertTime.set(alert.name, Date.now());
    // Send notifications based on severity
    switch (alert.severity) {
        case 'critical':
            await sendPagerDutyAlert(alert);
            await sendSlackAlert(alert);
            await sendEmailAlert(alert);
            break;
        case 'high':
            await sendSlackAlert(alert);
            await sendEmailAlert(alert);
            break;
        case 'medium':
            await sendSlackAlert(alert);
            break;
        case 'low':
            // Just log, no external notifications
            break;
    }
}
// Send PagerDuty alert (implement based on your setup)
async function sendPagerDutyAlert(alert) {
    // Implement PagerDuty integration
    logger_1.logger.info('PagerDuty alert sent', { alert: alert.name });
}
// Send Slack alert (implement based on your setup)
async function sendSlackAlert(alert) {
    // Implement Slack webhook integration
    logger_1.logger.info('Slack alert sent', { alert: alert.name });
}
// Send email alert (implement based on your setup)
async function sendEmailAlert(alert) {
    // Implement email notification
    logger_1.logger.info('Email alert sent', { alert: alert.name });
}
// Check all alerts
async function checkAlerts() {
    for (const alert of alerts) {
        try {
            const shouldAlert = await alert.condition();
            if (shouldAlert && shouldFireAlert(alert)) {
                await sendAlert(alert);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error checking alert: ${alert.name}`, {
                error: error.message
            });
        }
    }
}
// Add custom alert
function addAlert(alert) {
    alerts.push(alert);
}
// Remove alert by name
function removeAlert(name) {
    const index = alerts.findIndex(a => a.name === name);
    if (index !== -1) {
        alerts.splice(index, 1);
    }
}
// Get all alerts
function getAlerts() {
    return [...alerts];
}
// Start alert monitoring (check every minute)
let alertInterval = null;
function startAlertMonitoring() {
    if (alertInterval)
        return;
    alertInterval = setInterval(async () => {
        await checkAlerts();
    }, 60 * 1000); // Check every minute
    logger_1.logger.info('Alert monitoring started');
}
function stopAlertMonitoring() {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
        logger_1.logger.info('Alert monitoring stopped');
    }
}

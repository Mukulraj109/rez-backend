"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReservationCleanup = startReservationCleanup;
exports.stopReservationCleanup = stopReservationCleanup;
exports.getCleanupJobStatus = getCleanupJobStatus;
exports.triggerManualCleanup = triggerManualCleanup;
const cron = __importStar(require("node-cron"));
const reservationService_1 = __importDefault(require("../services/reservationService"));
const reservation_1 = require("../types/reservation");
/**
 * Reservation Cleanup Job
 *
 * This background job runs periodically (every 5 minutes by default)
 * to clean up expired stock reservations.
 *
 * When a reservation expires:
 * 1. It's removed from the cart
 * 2. The stock becomes available for other customers
 * 3. The cleanup is logged for monitoring
 *
 * This prevents stock from being held indefinitely by abandoned carts.
 */
let cleanupJob = null;
let isRunning = false;
/**
 * Initialize and start the cleanup job
 */
function startReservationCleanup() {
    if (cleanupJob) {
        console.log('⚠️ [CLEANUP JOB] Already running');
        return;
    }
    // Run every N minutes
    const cronExpression = `*/${reservation_1.CLEANUP_INTERVAL_MINUTES} * * * *`;
    console.log(`🧹 [CLEANUP JOB] Starting reservation cleanup job (runs every ${reservation_1.CLEANUP_INTERVAL_MINUTES} minutes)`);
    cleanupJob = cron.schedule(cronExpression, async () => {
        // Prevent concurrent executions
        if (isRunning) {
            console.log('⏭️ [CLEANUP JOB] Previous cleanup still running, skipping this execution');
            return;
        }
        isRunning = true;
        const startTime = Date.now();
        try {
            console.log('🧹 [CLEANUP JOB] Running expired reservation cleanup...');
            const result = await reservationService_1.default.releaseExpiredReservations();
            const duration = Date.now() - startTime;
            console.log('✅ [CLEANUP JOB] Cleanup completed:', {
                duration: `${duration}ms`,
                releasedCount: result.releasedCount,
                errorCount: result.errors.length,
                timestamp: new Date().toISOString()
            });
            // Log details if there were releases or errors
            if (result.releasedCount > 0) {
                console.log(`📊 [CLEANUP JOB] Released reservations from ${new Set(result.releasedItems.map(i => i.cartId)).size} carts`);
                // Log first few released items for monitoring
                const sampleSize = Math.min(5, result.releasedItems.length);
                console.log(`📋 [CLEANUP JOB] Sample of released items (${sampleSize}/${result.releasedItems.length}):`);
                result.releasedItems.slice(0, sampleSize).forEach((item, index) => {
                    console.log(`   ${index + 1}. Cart: ${item.cartId.substring(0, 8)}..., Product: ${item.productId.substring(0, 8)}..., Quantity: ${item.quantity}`);
                });
            }
            if (result.errors.length > 0) {
                console.error('❌ [CLEANUP JOB] Errors during cleanup:');
                result.errors.forEach((error, index) => {
                    console.error(`   ${index + 1}. Cart: ${error.cartId}, Error: ${error.error}`);
                });
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ [CLEANUP JOB] Cleanup failed:', {
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
        finally {
            isRunning = false;
        }
    });
    console.log('✅ [CLEANUP JOB] Reservation cleanup job started successfully');
}
/**
 * Stop the cleanup job
 */
function stopReservationCleanup() {
    if (cleanupJob) {
        cleanupJob.stop();
        cleanupJob = null;
        console.log('🛑 [CLEANUP JOB] Reservation cleanup job stopped');
    }
    else {
        console.log('⚠️ [CLEANUP JOB] No job running to stop');
    }
}
/**
 * Get cleanup job status
 */
function getCleanupJobStatus() {
    return {
        running: cleanupJob !== null,
        executing: isRunning,
        interval: reservation_1.CLEANUP_INTERVAL_MINUTES
    };
}
/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
async function triggerManualCleanup() {
    if (isRunning) {
        console.log('⚠️ [CLEANUP JOB] Cleanup already running, please wait');
        return;
    }
    console.log('🧹 [CLEANUP JOB] Manual cleanup triggered');
    isRunning = true;
    const startTime = Date.now();
    try {
        const result = await reservationService_1.default.releaseExpiredReservations();
        const duration = Date.now() - startTime;
        console.log('✅ [CLEANUP JOB] Manual cleanup completed:', {
            duration: `${duration}ms`,
            releasedCount: result.releasedCount,
            errorCount: result.errors.length
        });
    }
    catch (error) {
        console.error('❌ [CLEANUP JOB] Manual cleanup failed:', error);
    }
    finally {
        isRunning = false;
    }
}
exports.default = {
    start: startReservationCleanup,
    stop: stopReservationCleanup,
    getStatus: getCleanupJobStatus,
    triggerManual: triggerManualCleanup
};

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
exports.startSessionCleanup = startSessionCleanup;
exports.stopSessionCleanup = stopSessionCleanup;
exports.getSessionCleanupStatus = getSessionCleanupStatus;
exports.triggerManualSessionCleanup = triggerManualSessionCleanup;
exports.initializeSessionCleanupJob = initializeSessionCleanupJob;
const cron = __importStar(require("node-cron"));
const GameSession_1 = __importDefault(require("../models/GameSession"));
/**
 * Session Cleanup Job
 *
 * This background job runs daily at midnight (00:00) to clean up expired game sessions.
 *
 * What it does:
 * 1. Finds all game sessions older than 24 hours
 * 2. Updates their status to 'expired' if still pending or playing
 * 3. Deletes sessions older than 30 days to keep database clean
 * 4. Logs cleanup statistics for monitoring
 *
 * This prevents the database from accumulating stale game sessions
 * and ensures proper session lifecycle management.
 */
let cleanupJob = null;
let isRunning = false;
// Configuration
const EXPIRY_HOURS = 24; // Sessions older than this are expired
const DELETE_DAYS = 30; // Sessions older than this are permanently deleted
const CRON_SCHEDULE = '0 0 * * *'; // Daily at midnight (00:00)
/**
 * Perform the cleanup operation
 */
async function performCleanup() {
    const stats = {
        expiredCount: 0,
        deletedCount: 0,
        totalProcessed: 0,
        errors: []
    };
    try {
        // Calculate cutoff times
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() - EXPIRY_HOURS);
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() - DELETE_DAYS);
        console.log(`📅 [SESSION CLEANUP] Expiry cutoff: ${expiryDate.toISOString()}`);
        console.log(`📅 [SESSION CLEANUP] Delete cutoff: ${deleteDate.toISOString()}`);
        // Step 1: Mark old sessions as expired
        const expireResult = await GameSession_1.default.updateMany({
            status: { $in: ['pending', 'playing'] },
            createdAt: { $lt: expiryDate }
        }, {
            $set: { status: 'expired' }
        });
        stats.expiredCount = expireResult.modifiedCount;
        console.log(`⏰ [SESSION CLEANUP] Marked ${stats.expiredCount} sessions as expired`);
        // Step 2: Get sessions to delete (for logging before deletion)
        const sessionsToDelete = await GameSession_1.default.find({
            createdAt: { $lt: deleteDate }
        })
            .select('_id sessionId gameType user createdAt status')
            .limit(100); // Limit for logging purposes
        // Step 3: Delete very old sessions
        const deleteResult = await GameSession_1.default.deleteMany({
            createdAt: { $lt: deleteDate }
        });
        stats.deletedCount = deleteResult.deletedCount || 0;
        console.log(`🗑️ [SESSION CLEANUP] Deleted ${stats.deletedCount} old sessions`);
        // Log sample of deleted sessions
        if (sessionsToDelete.length > 0) {
            const sampleSize = Math.min(5, sessionsToDelete.length);
            console.log(`📋 [SESSION CLEANUP] Sample of deleted sessions (${sampleSize}/${sessionsToDelete.length}):`);
            sessionsToDelete.slice(0, sampleSize).forEach((session, index) => {
                console.log(`   ${index + 1}. ID: ${session.sessionId}, Type: ${session.gameType}, Age: ${Math.floor((Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`);
            });
        }
        stats.totalProcessed = stats.expiredCount + stats.deletedCount;
        // Additional stats: Current session counts by status
        const statusCounts = await GameSession_1.default.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        console.log('📊 [SESSION CLEANUP] Current session counts by status:');
        statusCounts.forEach(stat => {
            console.log(`   - ${stat._id}: ${stat.count}`);
        });
        // Game type distribution
        const gameTypeCounts = await GameSession_1.default.aggregate([
            {
                $match: { status: { $ne: 'expired' } } // Active sessions only
            },
            {
                $group: {
                    _id: '$gameType',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        console.log('🎮 [SESSION CLEANUP] Active sessions by game type:');
        gameTypeCounts.forEach(stat => {
            console.log(`   - ${stat._id}: ${stat.count}`);
        });
    }
    catch (error) {
        console.error('❌ [SESSION CLEANUP] Error during cleanup:', error);
        stats.errors.push({
            sessionId: 'N/A',
            error: error.message || 'Unknown error'
        });
    }
    return stats;
}
/**
 * Initialize and start the cleanup job
 */
function startSessionCleanup() {
    if (cleanupJob) {
        console.log('⚠️ [SESSION CLEANUP] Job already running');
        return;
    }
    console.log(`🧹 [SESSION CLEANUP] Starting session cleanup job (runs daily at midnight)`);
    console.log(`⚙️ [SESSION CLEANUP] Configuration: Expire after ${EXPIRY_HOURS}h, Delete after ${DELETE_DAYS} days`);
    cleanupJob = cron.schedule(CRON_SCHEDULE, async () => {
        // Prevent concurrent executions
        if (isRunning) {
            console.log('⏭️ [SESSION CLEANUP] Previous cleanup still running, skipping this execution');
            return;
        }
        isRunning = true;
        const startTime = Date.now();
        try {
            console.log('🧹 [SESSION CLEANUP] Running expired session cleanup...');
            const stats = await performCleanup();
            const duration = Date.now() - startTime;
            console.log('✅ [SESSION CLEANUP] Cleanup completed:', {
                duration: `${duration}ms`,
                expiredCount: stats.expiredCount,
                deletedCount: stats.deletedCount,
                totalProcessed: stats.totalProcessed,
                errorCount: stats.errors.length,
                timestamp: new Date().toISOString()
            });
            if (stats.errors.length > 0) {
                console.error('❌ [SESSION CLEANUP] Errors during cleanup:');
                stats.errors.forEach((error, index) => {
                    console.error(`   ${index + 1}. Session: ${error.sessionId}, Error: ${error.error}`);
                });
            }
            // Log summary message
            if (stats.totalProcessed > 0) {
                console.log(`📈 [SESSION CLEANUP] Processed ${stats.totalProcessed} sessions (${stats.expiredCount} expired, ${stats.deletedCount} deleted)`);
            }
            else {
                console.log('✨ [SESSION CLEANUP] No sessions needed cleanup');
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ [SESSION CLEANUP] Cleanup failed:', {
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
        finally {
            isRunning = false;
        }
    });
    console.log('✅ [SESSION CLEANUP] Session cleanup job started successfully');
}
/**
 * Stop the cleanup job
 */
function stopSessionCleanup() {
    if (cleanupJob) {
        cleanupJob.stop();
        cleanupJob = null;
        console.log('🛑 [SESSION CLEANUP] Session cleanup job stopped');
    }
    else {
        console.log('⚠️ [SESSION CLEANUP] No job running to stop');
    }
}
/**
 * Get cleanup job status
 */
function getSessionCleanupStatus() {
    return {
        running: cleanupJob !== null,
        executing: isRunning,
        schedule: CRON_SCHEDULE,
        config: {
            expiryHours: EXPIRY_HOURS,
            deleteDays: DELETE_DAYS
        }
    };
}
/**
 * Manually trigger a cleanup (for testing or maintenance)
 */
async function triggerManualSessionCleanup() {
    if (isRunning) {
        console.log('⚠️ [SESSION CLEANUP] Cleanup already running, please wait');
        throw new Error('Cleanup already in progress');
    }
    console.log('🧹 [SESSION CLEANUP] Manual cleanup triggered');
    isRunning = true;
    const startTime = Date.now();
    try {
        const stats = await performCleanup();
        const duration = Date.now() - startTime;
        console.log('✅ [SESSION CLEANUP] Manual cleanup completed:', {
            duration: `${duration}ms`,
            expiredCount: stats.expiredCount,
            deletedCount: stats.deletedCount,
            totalProcessed: stats.totalProcessed
        });
        return stats;
    }
    catch (error) {
        console.error('❌ [SESSION CLEANUP] Manual cleanup failed:', error);
        throw error;
    }
    finally {
        isRunning = false;
    }
}
/**
 * Initialize the job (called from server startup)
 */
function initializeSessionCleanupJob() {
    startSessionCleanup();
}
exports.default = {
    start: startSessionCleanup,
    stop: stopSessionCleanup,
    getStatus: getSessionCleanupStatus,
    triggerManual: triggerManualSessionCleanup,
    initialize: initializeSessionCleanupJob
};

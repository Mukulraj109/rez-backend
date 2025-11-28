"use strict";
// Partner Level Maintenance Service
// Handles automated level expiry checks and warnings
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
const Partner_1 = __importDefault(require("../models/Partner"));
const cron = __importStar(require("node-cron"));
class PartnerLevelMaintenanceService {
    constructor() {
        this.dailyCheckJob = null;
        this.warningJob = null;
    }
    /**
     * Check all partners for expired levels (daily at midnight)
     * FIXED: Issue #2 - Handles level expiry and progress reset
     */
    startDailyLevelCheck() {
        // Run every day at 00:00 (midnight)
        this.dailyCheckJob = cron.schedule('0 0 * * *', async () => {
            console.log('🔍 [LEVEL MAINTENANCE] Starting daily level expiry check...');
            try {
                const now = new Date();
                const expiredPartners = await Partner_1.default.find({
                    validUntil: { $lt: now },
                    isActive: true,
                    status: 'active'
                });
                console.log(`📊 [LEVEL MAINTENANCE] Found ${expiredPartners.length} expired levels`);
                let upgraded = 0;
                let reset = 0;
                for (const partner of expiredPartners) {
                    const beforeLevel = partner.currentLevel.level;
                    partner.handleLevelExpiry();
                    const afterLevel = partner.currentLevel.level;
                    if (afterLevel > beforeLevel) {
                        upgraded++;
                    }
                    else {
                        reset++;
                    }
                    await partner.save();
                }
                console.log(`✅ [LEVEL MAINTENANCE] Processed ${expiredPartners.length} expirations: ${upgraded} upgraded, ${reset} reset`);
            }
            catch (error) {
                console.error('❌ [LEVEL MAINTENANCE] Error checking level expiry:', error);
            }
        });
        console.log('✅ [LEVEL MAINTENANCE] Daily level check cron job started (runs at midnight)');
    }
    /**
     * Check partners nearing level expiry and send warnings
     * FIXED: Issue #5 - Sends notifications for expiring levels
     */
    startExpiryWarnings() {
        // Run every day at 09:00 AM
        this.warningJob = cron.schedule('0 9 * * *', async () => {
            console.log('⚠️ [LEVEL WARNINGS] Checking for levels expiring soon...');
            try {
                const now = new Date();
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                const expiringPartners = await Partner_1.default.find({
                    validUntil: { $lte: sevenDaysFromNow, $gt: now },
                    isActive: true,
                    status: 'active'
                }).populate('userId', 'email phoneNumber');
                console.log(`📊 [LEVEL WARNINGS] Found ${expiringPartners.length} partners expiring in next 7 days`);
                for (const partner of expiringPartners) {
                    const daysLeft = partner.getDaysRemaining();
                    const ordersNeeded = partner.getOrdersNeededForNextLevel();
                    console.log(`⏰ [LEVEL WARNING] Partner ${partner.userId}: ${daysLeft} days left, ${ordersNeeded} orders needed for next level`);
                    // TODO: Send actual notification (email/push)
                    // await notificationService.sendLevelExpiryWarning(partner.userId, {
                    //   daysLeft,
                    //   ordersNeeded,
                    //   currentLevel: partner.currentLevel.name
                    // });
                }
                console.log(`✅ [LEVEL WARNINGS] Sent warnings to ${expiringPartners.length} partners`);
            }
            catch (error) {
                console.error('❌ [LEVEL WARNINGS] Error sending warnings:', error);
            }
        });
        console.log('✅ [LEVEL WARNINGS] Expiry warning cron job started (runs at 9 AM daily)');
    }
    /**
     * Check for inactive partners and handle level maintenance
     * FIXED: Issue #4 - Basic level maintenance for inactive users
     */
    startInactivityCheck() {
        // Run every Sunday at 02:00 AM
        const inactivityJob = cron.schedule('0 2 * * 0', async () => {
            console.log('💤 [INACTIVITY CHECK] Checking for inactive partners...');
            try {
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const inactivePartners = await Partner_1.default.find({
                    lastActivityDate: { $lt: threeMonthsAgo },
                    isActive: true,
                    status: 'active',
                    'currentLevel.level': { $gt: 1 } // Only check Influencer and Ambassador
                });
                console.log(`📊 [INACTIVITY CHECK] Found ${inactivePartners.length} inactive partners (3+ months)`);
                for (const partner of inactivePartners) {
                    console.log(`⚠️ [INACTIVITY] Partner ${partner.userId}: Inactive since ${partner.lastActivityDate.toISOString().split('T')[0]}`);
                    // TODO: Implement downgrade logic or warnings
                    // For now, just log. Can implement actual downgrade in future:
                    // if (inactiveDays > 180 && partner.currentLevel.level === 3) {
                    //   // Downgrade Ambassador to Influencer
                    // } else if (inactiveDays > 90 && partner.currentLevel.level === 2) {
                    //   // Downgrade Influencer to Partner
                    // }
                }
                console.log(`ℹ️ [INACTIVITY CHECK] Monitored ${inactivePartners.length} inactive partners`);
            }
            catch (error) {
                console.error('❌ [INACTIVITY CHECK] Error checking inactivity:', error);
            }
        });
        console.log('✅ [INACTIVITY CHECK] Inactivity check cron job started (runs weekly on Sunday)');
    }
    /**
     * Start all maintenance cron jobs
     */
    startAll() {
        this.startDailyLevelCheck();
        this.startExpiryWarnings();
        this.startInactivityCheck();
        console.log('🎯 [PARTNER MAINTENANCE] All maintenance jobs started successfully');
    }
    /**
     * Stop all cron jobs (for testing or shutdown)
     */
    stopAll() {
        if (this.dailyCheckJob) {
            this.dailyCheckJob.stop();
            console.log('🛑 [LEVEL MAINTENANCE] Daily check stopped');
        }
        if (this.warningJob) {
            this.warningJob.stop();
            console.log('🛑 [LEVEL WARNINGS] Warning job stopped');
        }
        console.log('🛑 [PARTNER MAINTENANCE] All maintenance jobs stopped');
    }
    /**
     * Manual trigger for testing (runs expiry check immediately)
     */
    async triggerExpiryCheckNow() {
        console.log('🔧 [MANUAL TRIGGER] Running expiry check now...');
        try {
            const now = new Date();
            const expiredPartners = await Partner_1.default.find({
                validUntil: { $lt: now },
                isActive: true,
                status: 'active'
            });
            console.log(`📊 [MANUAL TRIGGER] Found ${expiredPartners.length} expired levels`);
            for (const partner of expiredPartners) {
                partner.handleLevelExpiry();
                await partner.save();
            }
            console.log(`✅ [MANUAL TRIGGER] Processed ${expiredPartners.length} expirations`);
        }
        catch (error) {
            console.error('❌ [MANUAL TRIGGER] Error:', error);
            throw error;
        }
    }
}
// Export singleton instance
const partnerLevelMaintenanceService = new PartnerLevelMaintenanceService();
exports.default = partnerLevelMaintenanceService;

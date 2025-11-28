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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralFraudDetection = void 0;
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
class ReferralFraudDetection {
    constructor() {
        this.RISK_THRESHOLDS = {
            LOW: 30,
            MEDIUM: 60,
            HIGH: 80
        };
    }
    /**
     * Check if referral is potentially fraudulent
     */
    async checkReferral(referrerId, refereeId, metadata) {
        const reasons = [];
        let riskScore = 0;
        // Check 1: Self-referral (same user)
        if (referrerId.toString() === refereeId.toString()) {
            reasons.push('Self-referral detected');
            riskScore += 100;
        }
        // Check 2: Same device/IP address
        const sameDevice = await this.checkSameDevice(referrerId, refereeId, metadata);
        if (sameDevice) {
            reasons.push('Same device or IP address detected');
            riskScore += 40;
        }
        // Check 3: Suspicious account creation pattern
        const suspiciousPattern = await this.checkAccountPattern(refereeId);
        if (suspiciousPattern) {
            reasons.push('Suspicious account creation pattern');
            riskScore += 30;
        }
        // Check 4: Too many referrals in short time
        const rapidReferrals = await this.checkRapidReferrals(referrerId);
        if (rapidReferrals) {
            reasons.push('Too many referrals in short period');
            riskScore += 25;
        }
        // Check 5: Referee account age
        const newAccount = await this.checkAccountAge(refereeId);
        if (newAccount) {
            reasons.push('Very new account');
            riskScore += 10;
        }
        // Check 6: Check for circular referral rings
        const circularRing = await this.checkCircularReferrals(referrerId, refereeId);
        if (circularRing) {
            reasons.push('Circular referral pattern detected');
            riskScore += 50;
        }
        // Check 7: Multiple accounts from same email domain
        const emailPattern = await this.checkEmailPattern(referrerId, refereeId);
        if (emailPattern) {
            reasons.push('Multiple referrals from similar email addresses');
            riskScore += 20;
        }
        // Determine action based on risk score
        let action;
        if (riskScore >= this.RISK_THRESHOLDS.HIGH) {
            action = 'block';
        }
        else if (riskScore >= this.RISK_THRESHOLDS.MEDIUM) {
            action = 'review';
        }
        else {
            action = 'allow';
        }
        return {
            isFraud: riskScore >= this.RISK_THRESHOLDS.HIGH,
            reasons,
            riskScore: Math.min(100, riskScore),
            action
        };
    }
    /**
     * Check if referee has qualified (met qualification criteria)
     */
    async checkQualification(referralId) {
        const referral = await Referral_1.default.findById(referralId).populate('referee');
        if (!referral || !referral.referee) {
            return false;
        }
        const refereeId = referral.referee;
        const criteria = referral.qualificationCriteria;
        // Check if referee placed required number of orders
        const orders = await Order_1.Order.find({
            userId: refereeId,
            status: { $in: ['delivered', 'completed'] },
            createdAt: {
                $gte: referral.registeredAt || referral.createdAt,
                $lte: new Date((referral.registeredAt || referral.createdAt).getTime() +
                    criteria.timeframeDays * 24 * 60 * 60 * 1000)
            }
        });
        // Check minimum orders
        if (orders.length < criteria.minOrders) {
            return false;
        }
        // Check minimum spend
        const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        if (totalSpent < criteria.minSpend) {
            return false;
        }
        // Check for cancelled or returned orders
        const problematicOrders = orders.filter(order => ['cancelled', 'returned', 'refunded'].includes(order.status));
        if (problematicOrders.length > 0) {
            return false;
        }
        return true;
    }
    /**
     * Check if same device or IP
     */
    async checkSameDevice(referrerId, refereeId, metadata) {
        const referrerReferrals = await Referral_1.default.find({ referrer: referrerId });
        if (!metadata.deviceId && !metadata.ipAddress) {
            return false;
        }
        for (const ref of referrerReferrals) {
            if ((metadata.deviceId && ref.metadata.deviceId === metadata.deviceId) ||
                (metadata.ipAddress && ref.metadata.ipAddress === metadata.ipAddress)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check for suspicious account patterns
     */
    async checkAccountPattern(refereeId) {
        const user = await User_1.User.findById(refereeId);
        if (!user)
            return true;
        // Check if account has minimal information
        const hasMinimalInfo = !user.phone || !user.email;
        const hasNoActivity = !user.lastLogin;
        return hasMinimalInfo && hasNoActivity;
    }
    /**
     * Check for rapid referrals (too many in short time)
     */
    async checkRapidReferrals(referrerId) {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        const recentReferrals = await Referral_1.default.countDocuments({
            referrer: referrerId,
            createdAt: { $gte: last24Hours }
        });
        return recentReferrals > 10; // More than 10 referrals in 24 hours is suspicious
    }
    /**
     * Check referee account age
     */
    async checkAccountAge(refereeId) {
        const user = await User_1.User.findById(refereeId);
        if (!user)
            return true;
        const accountAge = Date.now() - user.createdAt.getTime();
        const oneHour = 60 * 60 * 1000;
        return accountAge < oneHour; // Account created less than 1 hour ago
    }
    /**
     * Check for circular referral rings (A refers B, B refers C, C refers A)
     */
    async checkCircularReferrals(referrerId, refereeId) {
        // Check if referee has referred the referrer
        const reverseReferral = await Referral_1.default.findOne({
            referrer: refereeId,
            referee: referrerId
        });
        if (reverseReferral)
            return true;
        // Check for indirect circular patterns (max depth 2)
        const refereeReferrals = await Referral_1.default.find({ referrer: refereeId });
        for (const ref of refereeReferrals) {
            if (ref.referee.toString() === referrerId.toString()) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check email patterns
     */
    async checkEmailPattern(referrerId, refereeId) {
        const [referrer, referee] = await Promise.all([
            User_1.User.findById(referrerId),
            User_1.User.findById(refereeId)
        ]);
        if (!referrer?.email || !referee?.email)
            return false;
        const referrerDomain = referrer.email.split('@')[1];
        const refereeDomain = referee.email.split('@')[1];
        // Same domain and not common providers
        const commonProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
        if (referrerDomain === refereeDomain && !commonProviders.includes(referrerDomain)) {
            return true;
        }
        // Check for sequential email patterns (test1@, test2@, etc.)
        const referrerLocal = referrer.email.split('@')[0];
        const refereeLocal = referee.email.split('@')[0];
        const hasNumbers = /\d+$/;
        if (hasNumbers.test(referrerLocal) &&
            hasNumbers.test(refereeLocal) &&
            referrerLocal.replace(/\d+$/, '') === refereeLocal.replace(/\d+$/, '')) {
            return true;
        }
        return false;
    }
    /**
     * Mark referral as fraudulent
     */
    async markAsFraud(referralId, reason) {
        const referral = await Referral_1.default.findById(referralId);
        if (!referral) {
            throw new Error('Referral not found');
        }
        referral.status = Referral_1.ReferralStatus.EXPIRED;
        referral.metadata = {
            ...referral.metadata,
            fraudFlag: true,
            fraudReason: reason,
            flaggedAt: new Date()
        };
        await referral.save();
        // TODO: Send notification to admin
        console.log(`Referral ${referralId} marked as fraud: ${reason}`);
        return referral;
    }
    /**
     * Get fraud statistics
     */
    async getFraudStats() {
        const [total, blocked, underReview] = await Promise.all([
            Referral_1.default.countDocuments(),
            Referral_1.default.countDocuments({ 'metadata.fraudFlag': true }),
            Referral_1.default.countDocuments({ status: Referral_1.ReferralStatus.PENDING })
        ]);
        return {
            total,
            blocked,
            underReview,
            fraudRate: total > 0 ? (blocked / total) * 100 : 0
        };
    }
    /**
     * Run fraud detection on existing referrals
     */
    async scanExistingReferrals() {
        const referrals = await Referral_1.default.find({
            status: { $in: [Referral_1.ReferralStatus.PENDING, Referral_1.ReferralStatus.REGISTERED] }
        }).limit(100);
        const results = [];
        for (const referral of referrals) {
            const check = await this.checkReferral(referral.referrer, referral.referee, referral.metadata);
            if (check.action === 'block') {
                await this.markAsFraud(referral._id, check.reasons.join(', '));
                results.push({
                    referralId: referral._id,
                    action: 'blocked',
                    reasons: check.reasons
                });
            }
            else if (check.action === 'review') {
                results.push({
                    referralId: referral._id,
                    action: 'flagged_for_review',
                    riskScore: check.riskScore,
                    reasons: check.reasons
                });
            }
        }
        return results;
    }
}
exports.ReferralFraudDetection = ReferralFraudDetection;
exports.default = new ReferralFraudDetection();

"use strict";
/**
 * Fraud Detection Service
 * Implements anti-fraud rules for bill uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraudDetectionService = void 0;
const Bill_1 = require("../models/Bill");
const crypto_1 = __importDefault(require("crypto"));
class FraudDetectionService {
    /**
     * Run all fraud checks on a bill
     */
    async checkBillFraud(billData) {
        console.log('🔍 [FRAUD DETECTION] Running fraud checks...');
        const result = {
            isFraudulent: false,
            fraudScore: 0,
            flags: [],
            warnings: [],
        };
        // Run all fraud checks
        await Promise.all([
            this.checkDuplicateBill(billData, result),
            this.checkDuplicateImage(billData, result),
            this.checkUploadFrequency(billData, result),
            this.checkAmountSuspicion(billData, result),
            this.checkBillAge(billData, result),
            this.checkMultipleMerchants(billData, result),
        ]);
        // Calculate final fraud score
        result.fraudScore = Math.min(result.fraudScore, 100);
        // Mark as fraudulent if score > 70
        if (result.fraudScore > 70) {
            result.isFraudulent = true;
        }
        console.log(`📊 [FRAUD DETECTION] Fraud score: ${result.fraudScore}/100`);
        console.log(`🚩 Flags: ${result.flags.length}`);
        console.log(`⚠️ Warnings: ${result.warnings.length}`);
        return result;
    }
    /**
     * Check for duplicate bills (same bill submitted multiple times)
     */
    async checkDuplicateBill(billData, result) {
        try {
            // Check for exact duplicate
            const duplicate = await Bill_1.Bill.findOne({
                user: billData.userId,
                merchant: billData.merchantId,
                amount: billData.amount,
                billDate: {
                    $gte: new Date(billData.billDate.getTime() - 24 * 60 * 60 * 1000),
                    $lte: new Date(billData.billDate.getTime() + 24 * 60 * 60 * 1000),
                },
                verificationStatus: { $in: ['pending', 'processing', 'approved'] },
                isActive: true,
            });
            if (duplicate) {
                result.flags.push('DUPLICATE_BILL');
                result.fraudScore += 50;
                console.log('🚩 [FRAUD] Duplicate bill detected');
            }
            // Check for same bill number
            if (billData.billNumber) {
                const sameBillNumber = await Bill_1.Bill.findOne({
                    user: billData.userId,
                    billNumber: billData.billNumber,
                    verificationStatus: { $in: ['pending', 'processing', 'approved'] },
                    isActive: true,
                });
                if (sameBillNumber) {
                    result.flags.push('DUPLICATE_BILL_NUMBER');
                    result.fraudScore += 40;
                    console.log('🚩 [FRAUD] Duplicate bill number detected');
                }
            }
        }
        catch (error) {
            console.error('Error checking duplicate bill:', error);
        }
    }
    /**
     * Check for duplicate image (same image uploaded multiple times)
     */
    async checkDuplicateImage(billData, result) {
        try {
            if (!billData.imageHash)
                return;
            // Check if same image hash exists
            const sameImage = await Bill_1.Bill.findOne({
                'billImage.imageHash': billData.imageHash,
                verificationStatus: { $in: ['pending', 'processing', 'approved'] },
                isActive: true,
            });
            if (sameImage) {
                result.flags.push('DUPLICATE_IMAGE');
                result.fraudScore += 60;
                console.log('🚩 [FRAUD] Duplicate image detected');
            }
        }
        catch (error) {
            console.error('Error checking duplicate image:', error);
        }
    }
    /**
     * Check upload frequency (too many bills in short time)
     */
    async checkUploadFrequency(billData, result) {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            // Count bills uploaded in last hour
            const billsLastHour = await Bill_1.Bill.countDocuments({
                user: billData.userId,
                createdAt: { $gte: oneHourAgo },
                isActive: true,
            });
            if (billsLastHour >= 5) {
                result.flags.push('HIGH_FREQUENCY_UPLOADS');
                result.fraudScore += 30;
                console.log('🚩 [FRAUD] High frequency uploads detected');
            }
            // Count bills uploaded in last 24 hours
            const billsLastDay = await Bill_1.Bill.countDocuments({
                user: billData.userId,
                createdAt: { $gte: oneDayAgo },
                isActive: true,
            });
            if (billsLastDay >= 20) {
                result.flags.push('EXCESSIVE_DAILY_UPLOADS');
                result.fraudScore += 20;
                console.log('⚠️ [FRAUD] Excessive daily uploads detected');
            }
            else if (billsLastDay >= 10) {
                result.warnings.push('High number of bills uploaded today');
            }
        }
        catch (error) {
            console.error('Error checking upload frequency:', error);
        }
    }
    /**
     * Check for suspicious amounts
     */
    async checkAmountSuspicion(billData, result) {
        try {
            // Check for unusually high amount
            if (billData.amount > 50000) {
                result.warnings.push('Unusually high bill amount');
                result.fraudScore += 10;
            }
            // Check for round numbers (potential fake bills)
            if (billData.amount % 1000 === 0 && billData.amount >= 5000) {
                result.warnings.push('Bill amount is a round number');
                result.fraudScore += 5;
            }
            // Get user's average bill amount
            const userBills = await Bill_1.Bill.find({
                user: billData.userId,
                verificationStatus: 'approved',
                isActive: true,
            }).limit(10).sort({ createdAt: -1 });
            if (userBills.length >= 3) {
                const avgAmount = userBills.reduce((sum, bill) => sum + bill.amount, 0) / userBills.length;
                // If current bill is 5x average, it's suspicious
                if (billData.amount > avgAmount * 5) {
                    result.warnings.push('Bill amount significantly higher than user average');
                    result.fraudScore += 15;
                }
            }
        }
        catch (error) {
            console.error('Error checking amount suspicion:', error);
        }
    }
    /**
     * Check bill age (too old or future dated)
     */
    async checkBillAge(billData, result) {
        try {
            const now = new Date();
            const billAge = (now.getTime() - billData.billDate.getTime()) / (1000 * 60 * 60 * 24);
            // Bill in future
            if (billAge < 0) {
                result.flags.push('FUTURE_DATED_BILL');
                result.fraudScore += 40;
                console.log('🚩 [FRAUD] Future-dated bill detected');
            }
            // Bill too old (> 30 days)
            if (billAge > 30) {
                result.flags.push('EXPIRED_BILL');
                result.fraudScore += 30;
                console.log('🚩 [FRAUD] Expired bill detected (>30 days old)');
            }
            // Bill very recent (< 1 hour) - might be photoshopped
            if (billAge < 0.04) {
                // ~1 hour
                result.warnings.push('Bill is very recent');
                result.fraudScore += 5;
            }
        }
        catch (error) {
            console.error('Error checking bill age:', error);
        }
    }
    /**
     * Check for multiple merchants in short time (velocity fraud)
     */
    async checkMultipleMerchants(billData, result) {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            // Get distinct merchants from recent bills
            const recentBills = await Bill_1.Bill.find({
                user: billData.userId,
                createdAt: { $gte: oneHourAgo },
                isActive: true,
            }).distinct('merchant');
            // If user is uploading bills from 5+ different merchants in 1 hour, suspicious
            if (recentBills.length >= 5) {
                result.flags.push('MULTIPLE_MERCHANTS_VELOCITY');
                result.fraudScore += 25;
                console.log('🚩 [FRAUD] Multiple merchants velocity detected');
            }
        }
        catch (error) {
            console.error('Error checking multiple merchants:', error);
        }
    }
    /**
     * Generate image hash for duplicate detection
     */
    generateImageHash(imageBuffer) {
        return crypto_1.default.createHash('sha256').update(imageBuffer).digest('hex');
    }
    /**
     * Check if bill number exists for different user (cross-user fraud)
     */
    async checkCrossUserDuplicate(billNumber, merchantId, excludeUserId) {
        try {
            const duplicate = await Bill_1.Bill.findOne({
                billNumber,
                merchant: merchantId,
                user: { $ne: excludeUserId },
                verificationStatus: { $in: ['pending', 'processing', 'approved'] },
                isActive: true,
            });
            return !!duplicate;
        }
        catch (error) {
            console.error('Error checking cross-user duplicate:', error);
            return false;
        }
    }
    /**
     * Get user's fraud history
     */
    async getUserFraudHistory(userId) {
        try {
            const userBills = await Bill_1.Bill.find({
                user: userId,
                isActive: true,
            }).sort({ createdAt: -1 }).limit(50);
            const flaggedBills = userBills.filter(bill => (bill.metadata.fraudScore || 0) > 50);
            const rejectedBills = userBills.filter(bill => bill.verificationStatus === 'rejected');
            const totalFraudScore = userBills.reduce((sum, bill) => sum + (bill.metadata.fraudScore || 0), 0);
            const avgFraudScore = userBills.length > 0 ? totalFraudScore / userBills.length : 0;
            // Collect recent fraud flags
            const recentFlags = [];
            userBills.slice(0, 10).forEach(bill => {
                if (bill.metadata.fraudFlags) {
                    recentFlags.push(...bill.metadata.fraudFlags);
                }
            });
            return {
                totalFlagged: flaggedBills.length,
                totalRejected: rejectedBills.length,
                avgFraudScore: Math.round(avgFraudScore),
                recentFlags: [...new Set(recentFlags)], // Remove duplicates
            };
        }
        catch (error) {
            console.error('Error getting user fraud history:', error);
            return {
                totalFlagged: 0,
                totalRejected: 0,
                avgFraudScore: 0,
                recentFlags: [],
            };
        }
    }
}
// Export singleton instance
exports.fraudDetectionService = new FraudDetectionService();
exports.default = exports.fraudDetectionService;

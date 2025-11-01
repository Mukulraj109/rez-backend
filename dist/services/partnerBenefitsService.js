"use strict";
// Partner Benefits Service
// Handles application of partner level benefits to orders
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
const Partner_1 = __importStar(require("../models/Partner"));
const User_1 = require("../models/User");
const Wallet_1 = require("../models/Wallet");
const mongoose_1 = __importDefault(require("mongoose"));
class PartnerBenefitsService {
    /**
     * Get partner's current benefits configuration
     */
    async getPartnerBenefits(userId) {
        try {
            const partner = await Partner_1.default.findOne({ userId });
            if (!partner || !partner.isActive) {
                return null;
            }
            const levelConfig = Object.values(Partner_1.PARTNER_LEVELS).find((l) => l.level === partner.currentLevel.level);
            return levelConfig?.benefits || null;
        }
        catch (error) {
            console.error('❌ [PARTNER BENEFITS] Error getting benefits:', error);
            return null;
        }
    }
    /**
     * Check if current month is user's birthday month
     */
    async isUserBirthdayMonth(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user?.profile?.dateOfBirth) {
                return false;
            }
            const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
            const currentMonth = new Date().getMonth();
            return birthMonth === currentMonth;
        }
        catch (error) {
            console.error('❌ [PARTNER BENEFITS] Error checking birthday:', error);
            return false;
        }
    }
    /**
     * Apply partner benefits to order
     */
    async applyPartnerBenefits(orderData) {
        try {
            const benefits = await this.getPartnerBenefits(orderData.userId);
            // Default values (no partner benefits)
            const defaultResult = {
                cashbackRate: 2, // Base 2% cashback
                cashbackAmount: Math.round((orderData.subtotal * 2) / 100),
                deliveryFee: orderData.deliveryFee,
                deliverySavings: 0,
                birthdayDiscount: 0,
                totalSavings: 0,
                appliedBenefits: [],
                isBirthdayMonth: false
            };
            if (!benefits) {
                console.log('ℹ️ [PARTNER BENEFITS] No partner benefits found, using defaults');
                return defaultResult;
            }
            const appliedBenefits = [];
            let totalSavings = 0;
            let deliveryFee = orderData.deliveryFee;
            let deliverySavings = 0;
            let birthdayDiscount = 0;
            // Check if birthday month
            const isBirthdayMonth = await this.isUserBirthdayMonth(orderData.userId);
            // Apply partner cashback rate
            const cashbackRate = benefits.cashbackRate;
            const cashbackAmount = Math.round((orderData.subtotal * cashbackRate) / 100);
            totalSavings += cashbackAmount;
            appliedBenefits.push(`${cashbackRate}% Partner Cashback`);
            console.log(`✅ [PARTNER BENEFITS] Applied ${cashbackRate}% cashback: ₹${cashbackAmount}`);
            // Apply free delivery if eligible
            if (orderData.subtotal >= benefits.freeDeliveryThreshold && orderData.deliveryFee > 0) {
                deliverySavings = deliveryFee;
                totalSavings += deliverySavings;
                deliveryFee = 0;
                appliedBenefits.push('Free Delivery');
                console.log(`✅ [PARTNER BENEFITS] Applied free delivery: ₹${deliverySavings} saved`);
            }
            // Apply birthday discount if in birthday month
            if (isBirthdayMonth && benefits.birthdayDiscount > 0) {
                birthdayDiscount = Math.round((orderData.subtotal * benefits.birthdayDiscount) / 100);
                totalSavings += birthdayDiscount;
                appliedBenefits.push(`${benefits.birthdayDiscount}% Birthday Discount`);
                console.log(`🎂 [PARTNER BENEFITS] Applied birthday discount: ₹${birthdayDiscount}`);
            }
            console.log(`💰 [PARTNER BENEFITS] Total savings: ₹${totalSavings}`);
            return {
                cashbackRate,
                cashbackAmount,
                deliveryFee,
                deliverySavings,
                birthdayDiscount,
                totalSavings,
                appliedBenefits,
                isBirthdayMonth
            };
        }
        catch (error) {
            console.error('❌ [PARTNER BENEFITS] Error applying benefits:', error);
            return {
                cashbackRate: 2,
                cashbackAmount: Math.round((orderData.subtotal * 2) / 100),
                deliveryFee: orderData.deliveryFee,
                deliverySavings: 0,
                birthdayDiscount: 0,
                totalSavings: 0,
                appliedBenefits: [],
                isBirthdayMonth: false
            };
        }
    }
    /**
     * Check and reward transaction bonus (every 11 orders)
     */
    async checkTransactionBonus(userId) {
        try {
            const partner = await Partner_1.default.findOne({ userId });
            if (!partner || !partner.isActive) {
                return 0;
            }
            const benefits = await this.getPartnerBenefits(userId);
            if (!benefits || !benefits.transactionBonus) {
                return 0;
            }
            const { every, reward } = benefits.transactionBonus;
            // Check if current order count is a multiple of bonus threshold
            if (partner.totalOrders > 0 && partner.totalOrders % every === 0) {
                console.log(`🎁 [PARTNER BENEFITS] Transaction bonus triggered! ${partner.totalOrders} orders (every ${every})`);
                // Add bonus to wallet
                try {
                    let wallet = await Wallet_1.Wallet.findOne({ user: userId });
                    if (!wallet) {
                        console.log(`⚠️ [PARTNER BENEFITS] Wallet not found, creating for user ${userId}`);
                        wallet = await Wallet_1.Wallet.createForUser(new mongoose_1.default.Types.ObjectId(userId));
                    }
                    if (wallet) {
                        wallet.balance.total += reward;
                        wallet.balance.available += reward;
                        wallet.statistics.totalEarned += reward;
                        await wallet.save();
                        console.log(`✅ [PARTNER BENEFITS] Added ₹${reward} transaction bonus to wallet`);
                    }
                }
                catch (walletError) {
                    console.error('❌ [PARTNER BENEFITS] Error adding bonus to wallet:', walletError);
                }
                return reward;
            }
            return 0;
        }
        catch (error) {
            console.error('❌ [PARTNER BENEFITS] Error checking transaction bonus:', error);
            return 0;
        }
    }
    /**
     * Get all partner levels with their benefits
     */
    getAllLevelBenefits() {
        return Object.values(Partner_1.PARTNER_LEVELS).map((levelConfig) => ({
            level: levelConfig.level,
            name: levelConfig.name,
            requirements: levelConfig.requirements,
            benefits: levelConfig.benefits
        }));
    }
}
// Export singleton instance
const partnerBenefitsService = new PartnerBenefitsService();
exports.default = partnerBenefitsService;

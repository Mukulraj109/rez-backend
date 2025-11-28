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
exports.Subscription = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Subscription Schema
const SubscriptionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tier: {
        type: String,
        enum: ['free', 'premium', 'vip'],
        default: 'free',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'trial', 'grace_period', 'payment_failed'],
        default: 'active',
        required: true,
        index: true
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },
    trialEndDate: {
        type: Date
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    paymentMethod: {
        type: String
    },
    // Razorpay integration
    razorpaySubscriptionId: {
        type: String,
        unique: true,
        sparse: true
    },
    razorpayPlanId: {
        type: String
    },
    razorpayCustomerId: {
        type: String
    },
    // Benefits
    benefits: {
        cashbackMultiplier: {
            type: Number,
            default: 1,
            min: 1,
            max: 5
        },
        freeDelivery: {
            type: Boolean,
            default: false
        },
        prioritySupport: {
            type: Boolean,
            default: false
        },
        exclusiveDeals: {
            type: Boolean,
            default: false
        },
        unlimitedWishlists: {
            type: Boolean,
            default: false
        },
        earlyFlashSaleAccess: {
            type: Boolean,
            default: false
        },
        personalShopper: {
            type: Boolean,
            default: false
        },
        premiumEvents: {
            type: Boolean,
            default: false
        },
        conciergeService: {
            type: Boolean,
            default: false
        },
        birthdayOffer: {
            type: Boolean,
            default: false
        },
        anniversaryOffer: {
            type: Boolean,
            default: false
        }
    },
    // Usage tracking
    usage: {
        totalSavings: {
            type: Number,
            default: 0,
            min: 0
        },
        ordersThisMonth: {
            type: Number,
            default: 0,
            min: 0
        },
        ordersAllTime: {
            type: Number,
            default: 0,
            min: 0
        },
        cashbackEarned: {
            type: Number,
            default: 0,
            min: 0
        },
        deliveryFeesSaved: {
            type: Number,
            default: 0,
            min: 0
        },
        exclusiveDealsUsed: {
            type: Number,
            default: 0,
            min: 0
        },
        lastUsedAt: {
            type: Date
        }
    },
    // Cancellation
    cancellationDate: {
        type: Date
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    cancellationFeedback: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    reactivationEligibleUntil: {
        type: Date
    },
    // Grace period tracking
    gracePeriodStartDate: {
        type: Date
    },
    paymentRetryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastPaymentRetryDate: {
        type: Date
    },
    // Grandfathering
    isGrandfathered: {
        type: Boolean,
        default: false
    },
    grandfatheredPrice: {
        type: Number,
        min: 0
    },
    // Upgrade/downgrade tracking
    previousTier: {
        type: String,
        enum: ['free', 'premium', 'vip']
    },
    upgradeDate: {
        type: Date
    },
    downgradeScheduledFor: {
        type: Date
    },
    proratedCredit: {
        type: Number,
        default: 0,
        min: 0
    },
    // Metadata
    metadata: {
        source: {
            type: String,
            enum: ['web', 'app', 'referral', 'support']
        },
        campaign: String,
        promoCode: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
SubscriptionSchema.index({ user: 1, status: 1 });
SubscriptionSchema.index({ tier: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });
SubscriptionSchema.index({ razorpaySubscriptionId: 1 });
SubscriptionSchema.index({ 'metadata.campaign': 1 });
SubscriptionSchema.index({ createdAt: -1 });
// Virtual for days remaining
SubscriptionSchema.virtual('daysRemaining').get(function () {
    if (this.status === 'cancelled' || this.status === 'expired')
        return 0;
    const now = new Date();
    const end = new Date(this.endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});
// Instance method to check if subscription is active
SubscriptionSchema.methods.isActive = function () {
    const now = new Date();
    return (this.status === 'active' &&
        this.endDate > now &&
        (this.tier === 'premium' || this.tier === 'vip'));
};
// Instance method to check if in trial period
SubscriptionSchema.methods.isInTrial = function () {
    if (!this.trialEndDate)
        return false;
    const now = new Date();
    return this.status === 'trial' && this.trialEndDate > now;
};
// Instance method to check if in grace period
SubscriptionSchema.methods.isInGracePeriod = function () {
    if (!this.gracePeriodStartDate)
        return false;
    const now = new Date();
    const gracePeriodEnd = new Date(this.gracePeriodStartDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period
    return this.status === 'grace_period' && now <= gracePeriodEnd;
};
// Instance method to check if can upgrade
SubscriptionSchema.methods.canUpgrade = function () {
    if (!this.isActive())
        return false;
    return this.tier === 'free' || this.tier === 'premium';
};
// Instance method to check if can downgrade
SubscriptionSchema.methods.canDowngrade = function () {
    if (!this.isActive())
        return false;
    return this.tier === 'premium' || this.tier === 'vip';
};
// Instance method to calculate ROI
SubscriptionSchema.methods.calculateROI = function () {
    if (this.price === 0)
        return 0;
    const totalValue = this.usage.totalSavings + this.usage.cashbackEarned + this.usage.deliveryFeesSaved;
    return ((totalValue - this.price) / this.price) * 100;
};
// Instance method to get remaining days
SubscriptionSchema.methods.getRemainingDays = function () {
    const now = new Date();
    const end = new Date(this.endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
// Static method to get tier configuration
SubscriptionSchema.statics.getTierConfig = function (tier) {
    const configs = {
        free: {
            tier: 'free',
            name: 'Free',
            pricing: {
                monthly: 0,
                yearly: 0,
                yearlyDiscount: 0
            },
            benefits: {
                cashbackMultiplier: 1,
                freeDelivery: false,
                prioritySupport: false,
                exclusiveDeals: false,
                unlimitedWishlists: false,
                earlyFlashSaleAccess: false,
                personalShopper: false,
                premiumEvents: false,
                conciergeService: false,
                birthdayOffer: false,
                anniversaryOffer: false
            },
            description: 'Basic features with standard cashback',
            features: [
                '2-5% cashback on orders',
                'Basic features',
                'Standard support',
                '5 wishlists maximum',
                'Regular delivery'
            ]
        },
        premium: {
            tier: 'premium',
            name: 'Premium',
            pricing: {
                monthly: 99,
                yearly: 999,
                yearlyDiscount: 16
            },
            benefits: {
                cashbackMultiplier: 2,
                freeDelivery: true,
                prioritySupport: true,
                exclusiveDeals: true,
                unlimitedWishlists: true,
                earlyFlashSaleAccess: true,
                personalShopper: false,
                premiumEvents: false,
                conciergeService: false,
                birthdayOffer: true,
                anniversaryOffer: false
            },
            description: 'Enhanced benefits with 2x cashback',
            features: [
                '5-10% cashback on orders (2x rate)',
                'Exclusive deals and offers',
                'Priority customer support',
                'Unlimited wishlists',
                'Free delivery on select stores',
                'Early access to flash sales',
                'Birthday special offers',
                'Save up to ₹3000/month'
            ]
        },
        vip: {
            tier: 'vip',
            name: 'VIP',
            pricing: {
                monthly: 299,
                yearly: 2999,
                yearlyDiscount: 16
            },
            benefits: {
                cashbackMultiplier: 3,
                freeDelivery: true,
                prioritySupport: true,
                exclusiveDeals: true,
                unlimitedWishlists: true,
                earlyFlashSaleAccess: true,
                personalShopper: true,
                premiumEvents: true,
                conciergeService: true,
                birthdayOffer: true,
                anniversaryOffer: true
            },
            description: 'Ultimate experience with 3x cashback',
            features: [
                '10-15% cashback on orders (3x rate)',
                'All Premium benefits included',
                'Personal shopping assistant',
                'Premium-only exclusive events',
                'Anniversary special offers',
                'Dedicated concierge service',
                'First access to new features',
                'VIP customer support',
                'Save up to ₹10000/month'
            ]
        }
    };
    return configs[tier];
};
// Static method to calculate prorated amount
SubscriptionSchema.statics.calculateProratedAmount = function (currentTier, newTier, endDate, billingCycle) {
    const now = new Date();
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const totalDays = billingCycle === 'monthly' ? 30 : 365;
    const currentConfig = this.getTierConfig(currentTier);
    const newConfig = this.getTierConfig(newTier);
    const currentPrice = billingCycle === 'monthly' ? currentConfig.pricing.monthly : currentConfig.pricing.yearly;
    const newPrice = billingCycle === 'monthly' ? newConfig.pricing.monthly : newConfig.pricing.yearly;
    const remainingValue = (currentPrice * remainingDays) / totalDays;
    const newValue = (newPrice * remainingDays) / totalDays;
    return Math.max(0, newValue - remainingValue);
};
// Pre-save hook to set end date if not provided
SubscriptionSchema.pre('save', function (next) {
    if (this.isNew && !this.endDate) {
        const start = this.startDate || new Date();
        const end = new Date(start);
        if (this.billingCycle === 'monthly') {
            end.setMonth(end.getMonth() + 1);
        }
        else {
            end.setFullYear(end.getFullYear() + 1);
        }
        this.endDate = end;
    }
    // Set trial end date for new premium/vip subscriptions
    if (this.isNew && !this.trialEndDate && (this.tier === 'premium' || this.tier === 'vip')) {
        const trialEnd = new Date(this.startDate || Date.now());
        trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial
        this.trialEndDate = trialEnd;
        this.status = 'trial';
    }
    // Set reactivation eligibility when cancelling
    if (this.isModified('status') && this.status === 'cancelled' && !this.reactivationEligibleUntil) {
        const eligibleUntil = new Date();
        eligibleUntil.setDate(eligibleUntil.getDate() + 30); // 30-day reactivation window
        this.reactivationEligibleUntil = eligibleUntil;
    }
    next();
});
exports.Subscription = mongoose_1.default.model('Subscription', SubscriptionSchema);

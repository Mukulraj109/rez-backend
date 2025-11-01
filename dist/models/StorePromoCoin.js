"use strict";
// Store Promo Coin Model
// Tracks store-specific promotional coins earned by users
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
exports.StorePromoCoin = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StorePromoCoinSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    earned: {
        type: Number,
        default: 0,
        min: 0
    },
    used: {
        type: Number,
        default: 0,
        min: 0
    },
    pending: {
        type: Number,
        default: 0,
        min: 0
    },
    transactions: [{
            type: {
                type: String,
                enum: ['earned', 'used', 'expired', 'refunded'],
                required: true
            },
            amount: {
                type: Number,
                required: true,
                min: 0
            },
            orderId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Order'
            },
            description: {
                type: String,
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            }
        }],
    lastEarnedAt: Date,
    lastUsedAt: Date,
    expiryDate: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Compound indexes for efficient queries
StorePromoCoinSchema.index({ user: 1, store: 1 }, { unique: true });
StorePromoCoinSchema.index({ user: 1, isActive: 1 });
StorePromoCoinSchema.index({ user: 1, amount: -1 });
// Static method: Get user's promo coins (all stores or specific store)
StorePromoCoinSchema.statics.getUserStoreCoins = async function (userId, storeId) {
    const query = { user: userId, isActive: true };
    if (storeId) {
        query.store = storeId;
    }
    return this.find(query)
        .populate('store', 'name logo')
        .sort({ amount: -1, lastEarnedAt: -1 });
};
// Static method: Earn promo coins from an order
StorePromoCoinSchema.statics.earnCoins = async function (userId, storeId, amount, orderId) {
    console.log(`💰 [STORE PROMO COIN] User ${userId} earning ${amount} coins from store ${storeId}`);
    // Find or create store promo coin record
    let storePromoCoin = await this.findOne({ user: userId, store: storeId });
    if (!storePromoCoin) {
        storePromoCoin = await this.create({
            user: userId,
            store: storeId,
            amount: amount,
            earned: amount,
            used: 0,
            pending: 0,
            transactions: [{
                    type: 'earned',
                    amount,
                    orderId,
                    description: `Earned ${amount} promo coins from order`,
                    date: new Date()
                }],
            lastEarnedAt: new Date(),
            isActive: true
        });
    }
    else {
        storePromoCoin.amount += amount;
        storePromoCoin.earned += amount;
        storePromoCoin.lastEarnedAt = new Date();
        storePromoCoin.transactions.push({
            type: 'earned',
            amount,
            orderId,
            description: `Earned ${amount} promo coins from order`,
            date: new Date()
        });
        await storePromoCoin.save();
    }
    console.log(`✅ [STORE PROMO COIN] New balance for store ${storeId}: ${storePromoCoin.amount}`);
    return storePromoCoin;
};
// Static method: Use promo coins in an order
StorePromoCoinSchema.statics.useCoins = async function (userId, storeId, amount, orderId) {
    console.log(`💸 [STORE PROMO COIN] User ${userId} using ${amount} coins at store ${storeId}`);
    const storePromoCoin = await this.findOne({ user: userId, store: storeId });
    if (!storePromoCoin) {
        throw new Error('No promo coins available for this store');
    }
    if (storePromoCoin.amount < amount) {
        throw new Error(`Insufficient promo coins. Available: ${storePromoCoin.amount}, Required: ${amount}`);
    }
    storePromoCoin.amount -= amount;
    storePromoCoin.used += amount;
    storePromoCoin.lastUsedAt = new Date();
    storePromoCoin.transactions.push({
        type: 'used',
        amount,
        orderId,
        description: `Used ${amount} promo coins in order`,
        date: new Date()
    });
    await storePromoCoin.save();
    console.log(`✅ [STORE PROMO COIN] Remaining balance for store ${storeId}: ${storePromoCoin.amount}`);
    return storePromoCoin;
};
// Static method: Get available coins for a specific store
StorePromoCoinSchema.statics.getAvailableCoins = async function (userId, storeId) {
    const storePromoCoin = await this.findOne({ user: userId, store: storeId, isActive: true });
    return storePromoCoin?.amount || 0;
};
// Instance method: Check if coins are expired
StorePromoCoinSchema.methods.isExpired = function () {
    if (!this.expiryDate)
        return false;
    return new Date() > this.expiryDate;
};
exports.StorePromoCoin = mongoose_1.default.model('StorePromoCoin', StorePromoCoinSchema);

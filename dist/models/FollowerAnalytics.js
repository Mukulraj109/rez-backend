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
exports.FollowerAnalytics = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FollowerAnalyticsSchema = new mongoose_1.Schema({
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    followersCount: {
        type: Number,
        default: 0,
        min: 0
    },
    newFollowers: {
        type: Number,
        default: 0,
        min: 0
    },
    unfollows: {
        type: Number,
        default: 0,
        min: 0
    },
    clicksFromFollowers: {
        type: Number,
        default: 0,
        min: 0
    },
    ordersFromFollowers: {
        type: Number,
        default: 0,
        min: 0
    },
    revenueFromFollowers: {
        type: Number,
        default: 0,
        min: 0
    },
    exclusiveOffersViewed: {
        type: Number,
        default: 0,
        min: 0
    },
    exclusiveOffersRedeemed: {
        type: Number,
        default: 0,
        min: 0
    },
    avgEngagementRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    topFollowerLocation: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
// Compound index for efficient queries by store and date range
FollowerAnalyticsSchema.index({ store: 1, date: -1 });
// Unique constraint to prevent duplicate records
FollowerAnalyticsSchema.index({ store: 1, date: 1 }, { unique: true });
// Static method to get or create today's analytics
FollowerAnalyticsSchema.statics.getOrCreateToday = async function (storeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let analytics = await this.findOne({ store: storeId, date: today });
    if (!analytics) {
        analytics = await this.create({
            store: storeId,
            date: today,
            followersCount: 0,
            newFollowers: 0,
            unfollows: 0,
            clicksFromFollowers: 0,
            ordersFromFollowers: 0,
            revenueFromFollowers: 0,
            exclusiveOffersViewed: 0,
            exclusiveOffersRedeemed: 0,
            avgEngagementRate: 0
        });
    }
    return analytics;
};
exports.FollowerAnalytics = mongoose_1.default.model('FollowerAnalytics', FollowerAnalyticsSchema);

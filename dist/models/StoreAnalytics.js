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
exports.StoreAnalytics = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StoreAnalyticsSchema = new mongoose_1.Schema({
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    eventType: {
        type: String,
        required: true,
        enum: ['view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'],
        index: true
    },
    eventData: {
        searchQuery: String,
        category: String,
        source: String,
        referrer: String,
        userAgent: String,
        location: {
            coordinates: [Number],
            address: String
        },
        metadata: mongoose_1.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    sessionId: {
        type: String,
        index: true
    },
    ipAddress: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Compound indexes for efficient queries
StoreAnalyticsSchema.index({ store: 1, eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ user: 1, eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ eventType: 1, timestamp: -1 });
StoreAnalyticsSchema.index({ store: 1, timestamp: -1 });
// Static method to track an event
StoreAnalyticsSchema.statics.trackEvent = async function (data) {
    const analytics = new this({
        store: data.storeId,
        user: data.userId,
        eventType: data.eventType,
        eventData: data.eventData,
        sessionId: data.sessionId,
        ipAddress: data.ipAddress,
        timestamp: new Date()
    });
    return await analytics.save();
};
// Static method to get store analytics
StoreAnalyticsSchema.statics.getStoreAnalytics = async function (storeId, options = {}) {
    const { startDate, endDate, eventType, groupBy = 'day' } = options;
    const matchStage = { store: new mongoose_1.default.Types.ObjectId(storeId) };
    if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate)
            matchStage.timestamp.$gte = startDate;
        if (endDate)
            matchStage.timestamp.$lte = endDate;
    }
    if (eventType) {
        matchStage.eventType = eventType;
    }
    const groupFormat = {
        hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        week: { $dateToString: { format: '%Y-%U', date: '$timestamp' } },
        month: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }
    };
    const analytics = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    period: groupFormat[groupBy],
                    eventType: '$eventType'
                },
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
            }
        },
        {
            $group: {
                _id: '$_id.period',
                events: {
                    $push: {
                        eventType: '$_id.eventType',
                        count: '$count',
                        uniqueUsers: { $size: '$uniqueUsers' }
                    }
                },
                totalEvents: { $sum: '$count' },
                totalUniqueUsers: { $sum: { $size: '$uniqueUsers' } }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    return analytics;
};
// Static method to get popular stores
StoreAnalyticsSchema.statics.getPopularStores = async function (options = {}) {
    const { startDate, endDate, eventType, limit = 10 } = options;
    const matchStage = {};
    if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate)
            matchStage.timestamp.$gte = startDate;
        if (endDate)
            matchStage.timestamp.$lte = endDate;
    }
    if (eventType) {
        matchStage.eventType = eventType;
    }
    const popularStores = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$store',
                totalEvents: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' },
                eventTypes: { $addToSet: '$eventType' }
            }
        },
        {
            $lookup: {
                from: 'stores',
                localField: '_id',
                foreignField: '_id',
                as: 'storeInfo'
            }
        },
        { $unwind: '$storeInfo' },
        {
            $project: {
                store: '$_id',
                storeName: '$storeInfo.name',
                storeLogo: '$storeInfo.logo',
                totalEvents: 1,
                uniqueUsers: { $size: '$uniqueUsers' },
                eventTypes: 1
            }
        },
        { $sort: { totalEvents: -1 } },
        { $limit: limit }
    ]);
    return popularStores;
};
// Static method to get user analytics
StoreAnalyticsSchema.statics.getUserAnalytics = async function (userId, options = {}) {
    const { startDate, endDate, eventType } = options;
    const matchStage = { user: new mongoose_1.default.Types.ObjectId(userId) };
    if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate)
            matchStage.timestamp.$gte = startDate;
        if (endDate)
            matchStage.timestamp.$lte = endDate;
    }
    if (eventType) {
        matchStage.eventType = eventType;
    }
    const userAnalytics = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                stores: { $addToSet: '$store' }
            }
        },
        {
            $lookup: {
                from: 'stores',
                localField: 'stores',
                foreignField: '_id',
                as: 'storeInfo'
            }
        },
        {
            $project: {
                eventType: '$_id',
                count: 1,
                uniqueStores: { $size: '$stores' },
                stores: {
                    $map: {
                        input: '$storeInfo',
                        as: 'store',
                        in: {
                            _id: '$$store._id',
                            name: '$$store.name',
                            logo: '$$store.logo'
                        }
                    }
                }
            }
        }
    ]);
    return userAnalytics;
};
exports.StoreAnalytics = mongoose_1.default.model('StoreAnalytics', StoreAnalyticsSchema);
exports.default = exports.StoreAnalytics;

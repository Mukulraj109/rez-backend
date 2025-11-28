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
exports.SearchHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const searchHistorySchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    type: {
        type: String,
        enum: ['product', 'store', 'general'],
        default: 'general',
        required: true
    },
    resultCount: {
        type: Number,
        default: 0,
        min: 0
    },
    clicked: {
        type: Boolean,
        default: false
    },
    filters: {
        category: { type: String },
        minPrice: { type: Number },
        maxPrice: { type: Number },
        rating: { type: Number },
        location: { type: String },
        tags: [{ type: String }]
    },
    clickedItem: {
        id: { type: mongoose_1.Schema.Types.ObjectId },
        type: { type: String, enum: ['product', 'store'] }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000, // Auto-delete after 30 days (TTL index)
        index: true
    }
}, {
    timestamps: false, // We only need createdAt, not updatedAt
    collection: 'search_histories'
});
// Compound indexes for efficient queries
searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, query: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, type: 1, createdAt: -1 });
// Static method to clean up old entries beyond limit per user
searchHistorySchema.statics.maintainUserLimit = async function (userId, maxEntries = 50) {
    const count = await this.countDocuments({ user: userId });
    if (count > maxEntries) {
        // Get the oldest entries to delete
        const entriesToDelete = count - maxEntries;
        const oldestEntries = await this.find({ user: userId })
            .sort({ createdAt: 1 })
            .limit(entriesToDelete)
            .select('_id');
        const idsToDelete = oldestEntries.map((entry) => entry._id);
        await this.deleteMany({ _id: { $in: idsToDelete } });
        return entriesToDelete;
    }
    return 0;
};
// Static method to check for consecutive duplicate searches
searchHistorySchema.statics.isDuplicate = async function (userId, query, type, timeWindowMinutes = 5) {
    const timeAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentSearch = await this.findOne({
        user: userId,
        query: query.toLowerCase().trim(),
        type,
        createdAt: { $gte: timeAgo }
    }).sort({ createdAt: -1 });
    return !!recentSearch;
};
// Static method to get popular searches (for autocomplete)
searchHistorySchema.statics.getPopularSearches = async function (userId, limit = 10) {
    const popularSearches = await this.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: { query: '$query', type: '$type' },
                count: { $sum: 1 },
                lastSearched: { $max: '$createdAt' },
                avgResultCount: { $avg: '$resultCount' },
                clickRate: {
                    $avg: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
                }
            }
        },
        { $sort: { count: -1, lastSearched: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                query: '$_id.query',
                type: '$_id.type',
                count: 1,
                lastSearched: 1,
                avgResultCount: 1,
                clickRate: 1
            }
        }
    ]);
    return popularSearches;
};
// Static method to mark search as clicked
searchHistorySchema.statics.markAsClicked = async function (searchId, itemId, itemType) {
    return await this.findByIdAndUpdate(searchId, {
        clicked: true,
        clickedItem: { id: itemId, type: itemType }
    }, { new: true });
};
exports.SearchHistory = mongoose_1.default.model('SearchHistory', searchHistorySchema);

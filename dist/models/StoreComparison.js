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
exports.StoreComparison = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StoreComparisonSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    stores: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        }],
    name: {
        type: String,
        trim: true,
        maxlength: 100
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for efficient queries
StoreComparisonSchema.index({ user: 1, createdAt: -1 });
StoreComparisonSchema.index({ user: 1, stores: 1 });
// Virtual for store info (populated)
StoreComparisonSchema.virtual('storeInfo', {
    ref: 'Store',
    localField: 'stores',
    foreignField: '_id',
    options: {
        select: 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified'
    }
});
// Static method to get user's comparisons
StoreComparisonSchema.statics.getUserComparisons = async function (userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const comparisons = await this.find({ user: new mongoose_1.default.Types.ObjectId(userId) })
        .populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await this.countDocuments({ user: new mongoose_1.default.Types.ObjectId(userId) });
    return {
        comparisons,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalComparisons: total,
            hasNextPage: skip + comparisons.length < total,
            hasPrevPage: page > 1
        }
    };
};
// Static method to find comparison by stores
StoreComparisonSchema.statics.findComparisonByStores = async function (userId, storeIds) {
    const comparison = await this.findOne({
        user: new mongoose_1.default.Types.ObjectId(userId),
        stores: { $all: storeIds.map(id => new mongoose_1.default.Types.ObjectId(id)) }
    }).populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');
    return comparison;
};
// Static method to get comparison statistics
StoreComparisonSchema.statics.getComparisonStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { user: new mongoose_1.default.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalComparisons: { $sum: 1 },
                averageStoresPerComparison: { $avg: { $size: '$stores' } },
                mostComparedStore: { $first: '$stores' }
            }
        }
    ]);
    if (stats.length === 0) {
        return {
            totalComparisons: 0,
            averageStoresPerComparison: 0,
            mostComparedStore: null
        };
    }
    return stats[0];
};
exports.StoreComparison = mongoose_1.default.model('StoreComparison', StoreComparisonSchema);
exports.default = exports.StoreComparison;

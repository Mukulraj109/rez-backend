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
exports.Favorite = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FavoriteSchema = new mongoose_1.Schema({
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Compound index to ensure one favorite per user per store
FavoriteSchema.index({ user: 1, store: 1 }, { unique: true });
// Virtual for store info (populated)
FavoriteSchema.virtual('storeInfo', {
    ref: 'Store',
    localField: 'store',
    foreignField: '_id',
    justOne: true,
    options: {
        select: 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified'
    }
});
// Static method to check if store is favorited by user
FavoriteSchema.statics.isStoreFavorited = async function (userId, storeId) {
    const favorite = await this.findOne({
        user: new mongoose_1.default.Types.ObjectId(userId),
        store: new mongoose_1.default.Types.ObjectId(storeId)
    });
    return !!favorite;
};
// Static method to get user's favorite stores
FavoriteSchema.statics.getUserFavorites = async function (userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const favorites = await this.find({ user: new mongoose_1.default.Types.ObjectId(userId) })
        .populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await this.countDocuments({ user: new mongoose_1.default.Types.ObjectId(userId) });
    return {
        favorites,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalFavorites: total,
            hasNextPage: skip + favorites.length < total,
            hasPrevPage: page > 1
        }
    };
};
exports.Favorite = mongoose_1.default.model('Favorite', FavoriteSchema);
exports.default = exports.Favorite;

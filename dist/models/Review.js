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
exports.Review = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ReviewSchema = new mongoose_1.Schema({
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    images: [{
            type: String,
            validate: {
                validator: function (v) {
                    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
                },
                message: 'Invalid image URL format'
            }
        }],
    helpful: {
        type: Number,
        default: 0,
        min: 0
    },
    verified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for efficient queries
ReviewSchema.index({ store: 1, rating: 1 });
ReviewSchema.index({ store: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, store: 1 }, { unique: true }); // One review per user per store
ReviewSchema.index({ store: 1, isActive: 1 });
ReviewSchema.index({ rating: 1, isActive: 1 });
// Virtual for user info (populated)
ReviewSchema.virtual('userInfo', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true,
    options: { select: 'profile.name profile.avatar' }
});
// Static method to get store rating statistics
ReviewSchema.statics.getStoreRatingStats = async function (storeId) {
    const stats = await this.aggregate([
        { $match: { store: new mongoose_1.default.Types.ObjectId(storeId), isActive: true } },
        {
            $group: {
                _id: null,
                average: { $avg: '$rating' },
                count: { $sum: 1 },
                distribution: {
                    $push: '$rating'
                }
            }
        }
    ]);
    if (stats.length === 0) {
        return {
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }
    const result = stats[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.distribution.forEach((rating) => {
        distribution[rating]++;
    });
    return {
        average: Math.round(result.average * 10) / 10,
        count: result.count,
        distribution
    };
};
// Static method to check if user has reviewed store
ReviewSchema.statics.hasUserReviewed = async function (storeId, userId) {
    const review = await this.findOne({
        store: new mongoose_1.default.Types.ObjectId(storeId),
        user: new mongoose_1.default.Types.ObjectId(userId),
        isActive: true
    });
    return !!review;
};
exports.Review = mongoose_1.default.model('Review', ReviewSchema);
exports.default = exports.Review;

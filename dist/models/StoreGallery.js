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
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Store Gallery Schema
 */
const StoreGallerySchema = new mongoose_1.Schema({
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: true,
        index: true,
    },
    url: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
    },
    publicId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true,
    },
    category: {
        type: String,
        required: true,
        default: 'general',
        index: true,
        lowercase: true,
        trim: true,
    },
    title: {
        type: String,
        maxlength: 200,
        trim: true,
    },
    description: {
        type: String,
        maxlength: 1000,
        trim: true,
    },
    tags: [{
            type: String,
            maxlength: 50,
            trim: true,
            lowercase: true,
        }],
    order: {
        type: Number,
        default: 0,
    },
    isVisible: {
        type: Boolean,
        default: true,
        index: true,
    },
    isCover: {
        type: Boolean,
        default: false,
    },
    views: {
        type: Number,
        default: 0,
        min: 0,
    },
    likes: {
        type: Number,
        default: 0,
        min: 0,
    },
    shares: {
        type: Number,
        default: 0,
        min: 0,
    },
    viewedBy: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        }],
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    deletedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Compound indexes for performance
StoreGallerySchema.index({ storeId: 1, category: 1, order: 1 });
StoreGallerySchema.index({ storeId: 1, isVisible: 1, type: 1 });
StoreGallerySchema.index({ merchantId: 1, deletedAt: 1 });
StoreGallerySchema.index({ storeId: 1, isCover: 1, category: 1 });
// Virtual for checking if item is deleted
StoreGallerySchema.virtual('isDeleted').get(function () {
    return !!this.deletedAt;
});
// Pre-save middleware to ensure only one cover per category
StoreGallerySchema.pre('save', async function (next) {
    if (this.isCover && this.isModified('isCover')) {
        // Unset other cover images in the same category
        await mongoose_1.default.model('StoreGallery').updateMany({
            storeId: this.storeId,
            category: this.category,
            _id: { $ne: this._id },
            deletedAt: { $exists: false },
        }, { $set: { isCover: false } });
    }
    next();
});
// Method to soft delete
StoreGallerySchema.methods.softDelete = async function () {
    this.deletedAt = new Date();
    this.isVisible = false;
    await this.save();
};
// Static method to get gallery items for a store
StoreGallerySchema.statics.getStoreGallery = async function (storeId, options = {}) {
    const query = {
        storeId,
        ...(options.includeDeleted ? {} : { deletedAt: { $exists: false } }),
        ...(options.category ? { category: options.category.toLowerCase() } : {}),
        ...(options.type ? { type: options.type } : {}),
    };
    return this.find(query)
        .sort({ order: 1, uploadedAt: -1 })
        .limit(options.limit || 50)
        .skip(options.offset || 0);
};
// Static method to get categories for a store
StoreGallerySchema.statics.getStoreCategories = async function (storeId) {
    const categories = await this.aggregate([
        {
            $match: {
                storeId: new mongoose_1.default.Types.ObjectId(storeId),
                deletedAt: { $exists: false },
                isVisible: true,
            },
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                coverImage: {
                    $first: {
                        $cond: [
                            { $eq: ['$isCover', true] },
                            '$url',
                            null,
                        ],
                    },
                },
            },
        },
        {
            $project: {
                name: '$_id',
                count: 1,
                coverImage: {
                    $ifNull: [
                        '$coverImage',
                        {
                            $arrayElemAt: [
                                {
                                    $map: {
                                        input: { $slice: ['$url', 1] },
                                        as: 'url',
                                        in: '$$url',
                                    },
                                },
                                0,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: { name: 1 },
        },
    ]);
    return categories;
};
const StoreGallery = mongoose_1.default.model('StoreGallery', StoreGallerySchema);
exports.default = StoreGallery;

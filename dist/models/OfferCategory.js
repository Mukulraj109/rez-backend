"use strict";
// OfferCategory Model
// Manages offer categories for organizing and filtering offers
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
const OfferCategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
        unique: true,
        index: true
    },
    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^[a-z0-9-]+$/.test(v);
            },
            message: 'Slug can only contain lowercase letters, numbers, and hyphens'
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    icon: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return !v || /^[a-z0-9-]+$/.test(v) || /^https?:\/\/.+\.(svg|png|jpg|jpeg|gif)$/i.test(v);
            },
            message: 'Icon must be a valid icon name or URL'
        }
    },
    color: {
        type: String,
        required: [true, 'Category color is required'],
        validate: {
            validator: function (v) {
                return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Color must be a valid hex color code'
        }
    },
    backgroundColor: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Background color must be a valid hex color code'
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    priority: {
        type: Number,
        default: 0,
        index: true
    },
    offers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Offer'
        }],
    metadata: {
        displayOrder: {
            type: Number,
            default: 0,
            index: true
        },
        isFeatured: {
            type: Boolean,
            default: false,
            index: true
        },
        parentCategory: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'OfferCategory'
        },
        subcategories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'OfferCategory'
            }],
        tags: [{
                type: String,
                trim: true,
                lowercase: true
            }]
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user is required'],
        index: true
    }
}, {
    timestamps: true
});
// Indexes for efficient queries
OfferCategorySchema.index({ slug: 1, isActive: 1 });
OfferCategorySchema.index({ isActive: 1, priority: -1 });
OfferCategorySchema.index({ 'metadata.isFeatured': 1, isActive: 1 });
OfferCategorySchema.index({ 'metadata.parentCategory': 1, isActive: 1 });
OfferCategorySchema.index({ 'metadata.displayOrder': 1, isActive: 1 });
// Instance methods
OfferCategorySchema.methods.addOffer = async function (offerId) {
    if (!this.offers.includes(offerId)) {
        this.offers.push(offerId);
        await this.save();
    }
};
OfferCategorySchema.methods.removeOffer = async function (offerId) {
    this.offers = this.offers.filter((id) => !id.equals(offerId));
    await this.save();
};
OfferCategorySchema.methods.getActiveOffersCount = async function () {
    const Offer = mongoose_1.default.model('Offer');
    const now = new Date();
    const count = await Offer.countDocuments({
        _id: { $in: this.offers },
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
    });
    return count;
};
// Static methods
OfferCategorySchema.statics.findActiveCategories = function () {
    return this.find({ isActive: true })
        .sort({ 'metadata.displayOrder': 1, priority: -1, name: 1 });
};
OfferCategorySchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, isActive: true });
};
OfferCategorySchema.statics.findFeaturedCategories = function () {
    return this.find({
        isActive: true,
        'metadata.isFeatured': true
    })
        .sort({ 'metadata.displayOrder': 1, priority: -1 });
};
OfferCategorySchema.statics.findParentCategories = function () {
    return this.find({
        isActive: true,
        'metadata.parentCategory': { $exists: false }
    })
        .sort({ 'metadata.displayOrder': 1, priority: -1 });
};
OfferCategorySchema.statics.findSubcategories = function (parentId) {
    return this.find({
        isActive: true,
        'metadata.parentCategory': parentId
    })
        .sort({ 'metadata.displayOrder': 1, priority: -1 });
};
// Pre-save middleware
OfferCategorySchema.pre('save', function (next) {
    // Generate slug from name if not provided
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    // Set default background color if not provided
    if (!this.backgroundColor) {
        this.backgroundColor = this.color;
    }
    next();
});
// Pre-remove middleware
OfferCategorySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    // Remove this category from all offers
    const Offer = mongoose_1.default.model('Offer');
    await Offer.updateMany({ offers: this._id }, { $pull: { offers: this._id } });
    // Remove this category from parent categories
    await mongoose_1.default.model('OfferCategory').updateMany({ 'metadata.subcategories': this._id }, { $pull: { 'metadata.subcategories': this._id } });
    next();
});
// Create and export the model
const OfferCategory = mongoose_1.default.model('OfferCategory', OfferCategorySchema);
exports.default = OfferCategory;

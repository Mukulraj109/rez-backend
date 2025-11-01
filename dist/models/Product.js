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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Product Schema
const ProductSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 300
    },
    productType: {
        type: String,
        enum: ['product', 'service'],
        default: 'product',
        required: true
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category'
    },
    store: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    brand: {
        type: String,
        trim: true,
        maxlength: 100
    },
    model: {
        type: String,
        trim: true,
        maxlength: 100
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    barcode: {
        type: String,
        trim: true,
        sparse: true // Allows multiple null values
    },
    images: [{
            type: String,
            required: true
        }],
    videos: [String],
    pricing: {
        original: {
            type: Number,
            required: true,
            min: 0
        },
        selling: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: Number,
            min: 0,
            max: 100
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR']
        },
        bulk: [{
                minQuantity: { type: Number, min: 1 },
                price: { type: Number, min: 0 }
            }]
    },
    inventory: {
        stock: {
            type: Number,
            required: true,
            min: 0
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0
        },
        variants: [{
                type: {
                    type: String,
                    required: true,
                    trim: true
                },
                value: {
                    type: String,
                    required: true,
                    trim: true
                },
                price: {
                    type: Number,
                    min: 0
                },
                stock: {
                    type: Number,
                    required: true,
                    min: 0
                },
                sku: String,
                image: String
            }],
        unlimited: {
            type: Boolean,
            default: false
        }
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        distribution: {
            5: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            1: { type: Number, default: 0 }
        }
    },
    specifications: [{
            key: {
                type: String,
                required: true,
                trim: true
            },
            value: {
                type: String,
                required: true,
                trim: true
            },
            group: {
                type: String,
                trim: true
            }
        }],
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    seo: {
        title: {
            type: String,
            trim: true,
            maxlength: 60
        },
        description: {
            type: String,
            trim: true,
            maxlength: 160
        },
        keywords: [String],
        metaTags: {
            type: Map,
            of: String
        }
    },
    analytics: {
        views: {
            type: Number,
            default: 0,
            min: 0
        },
        purchases: {
            type: Number,
            default: 0,
            min: 0
        },
        conversions: {
            type: Number,
            default: 0,
            min: 0
        },
        wishlistAdds: {
            type: Number,
            default: 0,
            min: 0
        },
        shareCount: {
            type: Number,
            default: 0,
            min: 0
        },
        returnRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        avgRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        todayPurchases: {
            type: Number,
            default: 0,
            min: 0
        },
        todayViews: {
            type: Number,
            default: 0,
            min: 0
        },
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    cashback: {
        percentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 5
        },
        maxAmount: {
            type: Number,
            min: 0
        },
        minPurchase: {
            type: Number,
            min: 0,
            default: 0
        },
        validUntil: Date,
        terms: String
    },
    deliveryInfo: {
        estimatedDays: {
            type: String,
            default: '2-3 days'
        },
        freeShippingThreshold: {
            type: Number,
            default: 500
        },
        expressAvailable: {
            type: Boolean,
            default: false
        },
        standardDeliveryTime: {
            type: String,
            default: '2-3 days'
        },
        expressDeliveryTime: {
            type: String,
            default: 'Under 30min'
        },
        deliveryPartner: String
    },
    bundleProducts: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    frequentlyBoughtWith: [{
            productId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            },
            purchaseCount: {
                type: Number,
                default: 0,
                min: 0
            },
            lastUpdated: {
                type: Date,
                default: Date.now
            }
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isDigital: {
        type: Boolean,
        default: false
    },
    weight: {
        type: Number,
        min: 0 // in grams
    },
    dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        unit: {
            type: String,
            enum: ['cm', 'inch'],
            default: 'cm'
        }
    },
    shippingInfo: {
        weight: { type: Number, min: 0 },
        freeShipping: { type: Boolean, default: false },
        shippingCost: { type: Number, min: 0 },
        processingTime: String
    },
    relatedProducts: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product'
        }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ store: 1, isActive: 1 });
ProductSchema.index({ brand: 1, isActive: 1 });
ProductSchema.index({ 'pricing.selling': 1 });
ProductSchema.index({ 'ratings.average': -1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ tags: 1, isActive: 1 });
ProductSchema.index({ 'inventory.stock': 1, 'inventory.isAvailable': 1 });
ProductSchema.index({ createdAt: -1 });
// Text search index
ProductSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
    brand: 'text'
}, {
    weights: {
        name: 10,
        tags: 5,
        brand: 3,
        description: 1
    }
});
// Compound indexes
ProductSchema.index({ category: 1, 'pricing.selling': 1, isActive: 1 });
ProductSchema.index({ store: 1, 'ratings.average': -1 });
ProductSchema.index({ isFeatured: 1, 'ratings.average': -1, isActive: 1 });
// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function () {
    if (this.pricing.original <= this.pricing.selling)
        return 0;
    return Math.round(((this.pricing.original - this.pricing.selling) / this.pricing.original) * 100);
});
// Virtual for low stock status
ProductSchema.virtual('isLowStock').get(function () {
    if (this.inventory.unlimited)
        return false;
    return this.inventory.stock <= (this.inventory.lowStockThreshold || 5);
});
// Virtual for out of stock status
ProductSchema.virtual('isOutOfStock').get(function () {
    if (this.inventory.unlimited)
        return false;
    return this.inventory.stock === 0;
});
// Pre-save hook to generate slug and calculate discount
ProductSchema.pre('save', function (next) {
    // Generate slug if not provided
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
    // Calculate discount percentage
    if (this.pricing.original && this.pricing.selling) {
        if (this.pricing.original > this.pricing.selling) {
            this.pricing.discount = Math.round(((this.pricing.original - this.pricing.selling) / this.pricing.original) * 100);
        }
        else {
            this.pricing.discount = 0;
        }
    }
    // Update availability based on stock
    if (!this.inventory.unlimited) {
        this.inventory.isAvailable = this.inventory.stock > 0;
    }
    next();
});
// Method to check if product is in stock
ProductSchema.methods.isInStock = function () {
    if (this.inventory.unlimited)
        return true;
    return this.inventory.isAvailable && this.inventory.stock > 0;
};
// Method to get variant by type and value
ProductSchema.methods.getVariantByType = function (type, value) {
    if (!this.inventory.variants)
        return null;
    const variant = this.inventory.variants.find((v) => v.type.toLowerCase() === type.toLowerCase() &&
        v.value.toLowerCase() === value.toLowerCase());
    return variant || null;
};
// Method to calculate discounted price
ProductSchema.methods.calculateDiscountedPrice = function () {
    return this.pricing.selling;
};
// Method to update ratings
ProductSchema.methods.updateRatings = async function () {
    const Review = this.model('Review');
    const reviews = await Review.find({
        targetType: 'Product',
        targetId: this._id,
        isApproved: true
    });
    if (reviews.length === 0) {
        this.ratings = {
            average: 0,
            count: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
        return;
    }
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;
    reviews.forEach((review) => {
        const rating = Math.round(review.rating);
        distribution[rating]++;
        totalRating += review.rating;
    });
    this.ratings = {
        average: Math.round((totalRating / reviews.length) * 10) / 10,
        count: reviews.length,
        distribution
    };
    // Update analytics
    this.analytics.avgRating = this.ratings.average;
};
// Method to increment views
ProductSchema.methods.incrementViews = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(this.analytics.lastResetDate || Date.now());
    lastReset.setHours(0, 0, 0, 0);
    const updateData = {
        $inc: { 'analytics.views': 1 }
    };
    // Check if we need to reset daily analytics (if it's a new day)
    if (today.getTime() > lastReset.getTime()) {
        updateData.$set = {
            'analytics.todayViews': 1,
            'analytics.todayPurchases': 0,
            'analytics.lastResetDate': today
        };
    }
    else {
        updateData.$inc['analytics.todayViews'] = 1;
    }
    // Update directly without triggering full validation
    await this.constructor.findByIdAndUpdate(this._id, updateData);
    // Update the local instance
    this.analytics.views += 1;
    if (today.getTime() > lastReset.getTime()) {
        this.analytics.todayViews = 1;
        this.analytics.todayPurchases = 0;
        this.analytics.lastResetDate = today;
    }
    else {
        this.analytics.todayViews = (this.analytics.todayViews || 0) + 1;
    }
};
// Method to increment today's purchases
ProductSchema.methods.incrementTodayPurchases = async function () {
    this.analytics.purchases += 1;
    this.analytics.todayPurchases = (this.analytics.todayPurchases || 0) + 1;
    // Check if we need to reset daily analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(this.analytics.lastResetDate || Date.now());
    lastReset.setHours(0, 0, 0, 0);
    if (today.getTime() > lastReset.getTime()) {
        this.analytics.todayPurchases = 1;
        this.analytics.todayViews = 0;
        this.analytics.lastResetDate = today;
    }
    await this.save();
};
// Method to reset daily analytics
ProductSchema.methods.resetDailyAnalytics = async function () {
    this.analytics.todayPurchases = 0;
    this.analytics.todayViews = 0;
    this.analytics.lastResetDate = new Date();
    await this.save();
};
// Method to calculate cashback
ProductSchema.methods.calculateCashback = function (purchaseAmount) {
    // Handle both pricing and price field structures
    const amount = purchaseAmount ||
        this.pricing?.selling || this.pricing?.original ||
        this.price?.current || this.price?.original || 0;
    // If amount is 0 or invalid, return 0
    if (!amount || amount <= 0 || isNaN(amount)) {
        return 0;
    }
    // Check if purchase meets minimum requirement
    if (this.cashback?.minPurchase && amount < this.cashback.minPurchase) {
        return 0;
    }
    // Check if cashback is still valid
    if (this.cashback?.validUntil && new Date() > new Date(this.cashback.validUntil)) {
        return 0;
    }
    // Calculate cashback amount
    const percentage = this.cashback?.percentage || 5; // Default 5% if not specified
    let cashbackAmount = (amount * percentage) / 100;
    // Apply max amount limit if specified
    if (this.cashback?.maxAmount && cashbackAmount > this.cashback.maxAmount) {
        cashbackAmount = this.cashback.maxAmount;
    }
    return Math.round(cashbackAmount);
};
// Method to get estimated delivery time
ProductSchema.methods.getEstimatedDelivery = function (userLocation) {
    // If express is available and user is in same city
    if (this.deliveryInfo?.expressAvailable && userLocation?.city === this.store?.location?.city) {
        return this.deliveryInfo.expressDeliveryTime || 'Under 30min';
    }
    // Check stock levels for delivery estimation
    if (this.inventory.stock < 5 && !this.inventory.unlimited) {
        return '3-5 days'; // Longer for low stock
    }
    // Return standard delivery time
    return this.deliveryInfo?.standardDeliveryTime || this.deliveryInfo?.estimatedDays || '2-3 days';
};
// Static method to search products
ProductSchema.statics.searchProducts = function (searchText, filters = {}, options = {}) {
    const query = {
        $text: { $search: searchText },
        isActive: true
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.store) {
        query.store = filters.store;
    }
    if (filters.brand) {
        query.brand = new RegExp(filters.brand, 'i');
    }
    if (filters.priceRange) {
        query['pricing.selling'] = {
            $gte: filters.priceRange.min || 0,
            $lte: filters.priceRange.max || Number.MAX_VALUE
        };
    }
    if (filters.inStock) {
        query['inventory.isAvailable'] = true;
        query['inventory.stock'] = { $gt: 0 };
    }
    if (filters.rating) {
        query['ratings.average'] = { $gte: filters.rating };
    }
    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('category store')
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
// Static method to get featured products
ProductSchema.statics.getFeatured = function (limit = 10) {
    return this.find({
        isFeatured: true,
        isActive: true,
        'inventory.isAvailable': true
    })
        .populate('category store')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(limit);
};
// Static method to get products by category
ProductSchema.statics.getByCategory = function (categoryId, options = {}) {
    const query = {
        category: categoryId,
        isActive: true,
        'inventory.isAvailable': true
    };
    let sortOptions = {};
    switch (options.sortBy) {
        case 'price_low':
            sortOptions = { 'pricing.selling': 1 };
            break;
        case 'price_high':
            sortOptions = { 'pricing.selling': -1 };
            break;
        case 'rating':
            sortOptions = { 'ratings.average': -1 };
            break;
        case 'newest':
            sortOptions = { createdAt: -1 };
            break;
        default:
            sortOptions = { 'ratings.average': -1, createdAt: -1 };
    }
    return this.find(query)
        .populate('category store')
        .sort(sortOptions)
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};
exports.Product = mongoose_1.default.models.Product || mongoose_1.default.model('Product', ProductSchema);

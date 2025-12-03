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
exports.Wishlist = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Wishlist Schema
const WishlistSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    items: [{
            itemType: {
                type: String,
                required: true,
                enum: ['Product', 'Store', 'Video', 'Discount']
            },
            itemId: {
                type: mongoose_1.Schema.Types.ObjectId,
                required: true,
                refPath: 'items.itemType'
            },
            addedAt: {
                type: Date,
                default: Date.now,
                required: true
            },
            priority: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            },
            notes: {
                type: String,
                trim: true,
                maxlength: 300
            },
            priceWhenAdded: {
                type: Number,
                min: 0
            },
            notifyOnPriceChange: {
                type: Boolean,
                default: true
            },
            notifyOnAvailability: {
                type: Boolean,
                default: true
            },
            targetPrice: {
                type: Number,
                min: 0
            },
            tags: [{
                    type: String,
                    trim: true,
                    lowercase: true
                }],
            // Discount snapshot - stores deal info at save time
            discountSnapshot: {
                discountId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Discount' },
                name: { type: String },
                description: { type: String },
                type: { type: String, enum: ['percentage', 'fixed', 'flat'] },
                value: { type: Number },
                minOrderValue: { type: Number },
                maxDiscount: { type: Number },
                validFrom: { type: Date },
                validUntil: { type: Date },
                storeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Store' },
                storeName: { type: String },
                productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
                productName: { type: String },
                savedAt: { type: Date }
            }
        }],
    category: {
        type: String,
        enum: ['personal', 'gift', 'business', 'event', 'custom'],
        default: 'personal'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    sharing: {
        isPublic: {
            type: Boolean,
            default: false
        },
        shareCode: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true
        },
        sharedWith: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            }],
        allowCopying: {
            type: Boolean,
            default: true
        },
        allowComments: {
            type: Boolean,
            default: true
        },
        sharedAt: Date
    },
    analytics: {
        totalViews: {
            type: Number,
            default: 0,
            min: 0
        },
        totalShares: {
            type: Number,
            default: 0,
            min: 0
        },
        conversionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        avgTimeToConversion: {
            type: Number,
            default: 0,
            min: 0
        },
        popularCategories: {
            type: Map,
            of: Number,
            default: {}
        },
        priceRangeAnalysis: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 0 },
            avg: { type: Number, default: 0 },
            median: { type: Number, default: 0 }
        },
        monthlyStats: [{
                month: {
                    type: Number,
                    min: 1,
                    max: 12,
                    required: true
                },
                year: {
                    type: Number,
                    min: 2000,
                    required: true
                },
                itemsAdded: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                itemsPurchased: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                itemsRemoved: {
                    type: Number,
                    default: 0,
                    min: 0
                }
            }]
    },
    totalValue: {
        type: Number,
        default: 0,
        min: 0
    },
    availableItems: {
        type: Number,
        default: 0,
        min: 0
    },
    priceChangeAlerts: {
        type: Boolean,
        default: true
    },
    stockAlerts: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
WishlistSchema.index({ user: 1, createdAt: -1 });
WishlistSchema.index({ user: 1, isDefault: 1 });
WishlistSchema.index({ 'sharing.shareCode': 1 });
WishlistSchema.index({ 'sharing.isPublic': 1, createdAt: -1 });
WishlistSchema.index({ category: 1 });
WishlistSchema.index({ 'items.itemType': 1, 'items.itemId': 1 });
WishlistSchema.index({ 'items.priority': 1 });
// Text search index
WishlistSchema.index({
    name: 'text',
    description: 'text',
    'items.notes': 'text',
    'items.tags': 'text'
}, {
    weights: {
        name: 10,
        description: 5,
        'items.tags': 3,
        'items.notes': 1
    }
});
// Virtual for total items count
WishlistSchema.virtual('itemCount').get(function () {
    return this.items.length;
});
// Virtual for high priority items count
WishlistSchema.virtual('highPriorityCount').get(function () {
    return this.items.filter((item) => item.priority === 'high').length;
});
// Virtual for items with price drops
WishlistSchema.virtual('priceDropCount').get(function () {
    // This would be calculated by comparing current prices with priceWhenAdded
    return 0; // Placeholder
});
// Pre-save hooks
WishlistSchema.pre('save', async function (next) {
    // Ensure only one default wishlist per user
    if (this.isDefault && this.isModified('isDefault')) {
        await this.model('Wishlist').updateMany({ user: this.user, _id: { $ne: this._id } }, { $set: { isDefault: false } });
    }
    // Update counts
    this.availableItems = this.items.length; // Simplified - should check actual availability
    // Update monthly stats
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (this.isModified('items')) {
        let monthlyStats = this.analytics.monthlyStats.find(stat => stat.month === currentMonth && stat.year === currentYear);
        if (!monthlyStats) {
            monthlyStats = {
                month: currentMonth,
                year: currentYear,
                itemsAdded: 0,
                itemsPurchased: 0,
                itemsRemoved: 0
            };
            this.analytics.monthlyStats.push(monthlyStats);
        }
        // This is simplified - in reality, you'd track individual operations
        if (this.isNew) {
            monthlyStats.itemsAdded = this.items.length;
        }
    }
    next();
});
// Method to add item to wishlist
WishlistSchema.methods.addItem = async function (itemType, itemId, options = {}) {
    // Check if item already exists
    const existingItem = this.items.find((item) => item.itemType === itemType && item.itemId.toString() === itemId);
    if (existingItem) {
        throw new Error('Item already exists in wishlist');
    }
    // Get item details for price tracking
    let priceWhenAdded;
    if (itemType === 'Product') {
        const Product = this.model('Product');
        const product = await Product.findById(itemId);
        if (product) {
            priceWhenAdded = product.pricing.selling;
        }
    }
    // Add item
    const newItem = {
        itemType: itemType,
        itemId: new mongoose_1.default.Types.ObjectId(itemId),
        addedAt: new Date(),
        priority: options.priority || 'medium',
        notes: options.notes,
        priceWhenAdded,
        notifyOnPriceChange: options.notifyOnPriceChange !== false,
        notifyOnAvailability: options.notifyOnAvailability !== false,
        targetPrice: options.targetPrice,
        tags: options.tags || []
    };
    this.items.push(newItem);
    await this.save();
};
// Method to remove item from wishlist
WishlistSchema.methods.removeItem = async function (itemType, itemId) {
    this.items = this.items.filter((item) => !(item.itemType === itemType && item.itemId.toString() === itemId));
    await this.save();
};
// Method to update item in wishlist
WishlistSchema.methods.updateItem = async function (itemType, itemId, updates) {
    const item = this.items.find((item) => item.itemType === itemType && item.itemId.toString() === itemId);
    if (!item) {
        throw new Error('Item not found in wishlist');
    }
    // Update allowed fields
    if (updates.priority)
        item.priority = updates.priority;
    if (updates.notes !== undefined)
        item.notes = updates.notes;
    if (updates.targetPrice !== undefined)
        item.targetPrice = updates.targetPrice;
    if (updates.notifyOnPriceChange !== undefined)
        item.notifyOnPriceChange = updates.notifyOnPriceChange;
    if (updates.notifyOnAvailability !== undefined)
        item.notifyOnAvailability = updates.notifyOnAvailability;
    if (updates.tags)
        item.tags = updates.tags;
    await this.save();
};
// Method to calculate total value of wishlist
WishlistSchema.methods.calculateTotalValue = async function () {
    let totalValue = 0;
    // Get current prices for all products
    const productItems = this.items.filter((item) => item.itemType === 'Product');
    if (productItems.length > 0) {
        const Product = this.model('Product');
        const productIds = productItems.map((item) => item.itemId);
        const products = await Product.find({ _id: { $in: productIds } });
        products.forEach((product) => {
            totalValue += product.pricing.selling;
        });
    }
    this.totalValue = totalValue;
    await this.save();
    return totalValue;
};
// Method to generate share code
WishlistSchema.methods.generateShareCode = function () {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    this.sharing.shareCode = code;
    this.sharing.sharedAt = new Date();
    return code;
};
// Method to move item to another wishlist
WishlistSchema.methods.moveItem = async function (itemId, targetWishlistId) {
    const item = this.items.find((item) => item._id?.toString() === itemId);
    if (!item) {
        throw new Error('Item not found in wishlist');
    }
    const targetWishlist = await this.model('Wishlist').findById(targetWishlistId);
    if (!targetWishlist) {
        throw new Error('Target wishlist not found');
    }
    // Add to target wishlist
    targetWishlist.items.push(item);
    await targetWishlist.save();
    // Remove from current wishlist
    this.items = this.items.filter((item) => item._id?.toString() !== itemId);
    await this.save();
};
// Method to get items grouped by category
WishlistSchema.methods.getItemsByCategory = async function () {
    const productItems = this.items.filter((item) => item.itemType === 'Product');
    if (productItems.length === 0) {
        return {};
    }
    const Product = this.model('Product');
    const products = await Product.find({
        _id: { $in: productItems.map((item) => item.itemId) }
    }).populate('category');
    const categories = {};
    products.forEach((product) => {
        const categoryName = product.category?.name || 'Uncategorized';
        if (!categories[categoryName]) {
            categories[categoryName] = [];
        }
        categories[categoryName].push(product);
    });
    return categories;
};
// Method to check for price changes
WishlistSchema.methods.checkPriceChanges = async function () {
    const productItems = this.items.filter((item) => item.itemType === 'Product' && item.priceWhenAdded && item.notifyOnPriceChange);
    if (productItems.length === 0)
        return;
    const Product = this.model('Product');
    const products = await Product.find({
        _id: { $in: productItems.map((item) => item.itemId) }
    });
    const Notification = this.model('Notification');
    for (const product of products) {
        const wishlistItem = productItems.find((item) => item.itemId.toString() === product._id.toString());
        if (!wishlistItem)
            continue;
        const currentPrice = product.pricing.selling;
        const originalPrice = wishlistItem.priceWhenAdded;
        const priceChange = ((currentPrice - originalPrice) / originalPrice) * 100;
        // Notify on significant price drop (>10%) or if target price is met
        let shouldNotify = false;
        let notificationMessage = '';
        if (priceChange <= -10) {
            shouldNotify = true;
            notificationMessage = `Price dropped by ${Math.abs(Math.round(priceChange))}% for ${product.name}!`;
        }
        else if (wishlistItem.targetPrice && currentPrice <= wishlistItem.targetPrice) {
            shouldNotify = true;
            notificationMessage = `${product.name} is now available at your target price of ₹${wishlistItem.targetPrice}!`;
        }
        if (shouldNotify) {
            await Notification.create({
                user: this.user,
                title: 'Price Alert',
                message: notificationMessage,
                type: 'success',
                category: 'promotional',
                data: {
                    productId: product._id.toString(),
                    amount: currentPrice,
                    deepLink: `/product/${product.slug}`
                },
                deliveryChannels: ['push', 'in_app']
            });
        }
    }
};
// Method to get recommendations based on wishlist
WishlistSchema.methods.getRecommendations = async function () {
    // This would implement a recommendation algorithm
    // For now, return empty array
    return [];
};
// Static method to get user's default wishlist
WishlistSchema.statics.getDefaultWishlist = function (userId) {
    return this.findOne({ user: userId, isDefault: true });
};
// Static method to get user's wishlists
WishlistSchema.statics.getUserWishlists = function (userId) {
    return this.find({ user: userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .populate('items.itemId');
};
// Static method to get public wishlists
WishlistSchema.statics.getPublicWishlists = function (limit = 20) {
    return this.find({ 'sharing.isPublic': true })
        .populate('user', 'profile.firstName profile.lastName profile.avatar')
        .sort({ 'analytics.totalViews': -1, createdAt: -1 })
        .limit(limit);
};
// Static method to get wishlist by share code
WishlistSchema.statics.getByShareCode = function (shareCode) {
    return this.findOne({ 'sharing.shareCode': shareCode })
        .populate('user', 'profile.firstName profile.lastName profile.avatar')
        .populate('items.itemId');
};
exports.Wishlist = mongoose_1.default.model('Wishlist', WishlistSchema);

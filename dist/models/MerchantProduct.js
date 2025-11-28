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
exports.ProductModel = exports.MProduct = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProductSchema = new mongoose_1.Schema({
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: true
    },
    storeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store',
        required: false,
        index: true // Add index for faster queries
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 300
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
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    // Pricing
    price: {
        type: Number,
        required: true,
        min: 0
    },
    costPrice: {
        type: Number,
        min: 0
    },
    compareAtPrice: {
        type: Number,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']
    },
    // Inventory
    inventory: {
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0
        },
        trackInventory: {
            type: Boolean,
            default: true
        },
        allowBackorders: {
            type: Boolean,
            default: false
        },
        reservedStock: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    // Media
    images: [{
            url: {
                type: String,
                required: true
            },
            thumbnailUrl: String,
            altText: String,
            sortOrder: {
                type: Number,
                default: 0
            },
            isMain: {
                type: Boolean,
                default: false
            }
        }],
    videos: [{
            url: {
                type: String,
                required: true
            },
            thumbnailUrl: String,
            title: String,
            duration: Number,
            sortOrder: {
                type: Number,
                default: 0
            }
        }],
    // Physical properties
    weight: {
        type: Number,
        min: 0
    },
    dimensions: {
        length: {
            type: Number,
            min: 0
        },
        width: {
            type: Number,
            min: 0
        },
        height: {
            type: Number,
            min: 0
        },
        unit: {
            type: String,
            enum: ['cm', 'inch'],
            default: 'cm'
        }
    },
    // SEO & Search
    tags: [{
            type: String,
            trim: true
        }],
    metaTitle: {
        type: String,
        trim: true,
        maxlength: 60
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: 160
    },
    searchKeywords: [{
            type: String,
            trim: true
        }],
    // Status & Visibility
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'draft'
    },
    visibility: {
        type: String,
        enum: ['public', 'hidden', 'featured'],
        default: 'public'
    },
    // Cashback
    cashback: {
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        maxAmount: {
            type: Number,
            min: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        conditions: [String]
    },
    // Additional optional fields for SyncService
    shipping: {
        estimatedDelivery: String,
        type: mongoose_1.Schema.Types.Mixed
    },
    ratings: {
        average: { type: Number, min: 0, max: 5 },
        count: { type: Number, min: 0 }
    },
    variants: [{
            option: String,
            value: String
        }],
    attributes: mongoose_1.Schema.Types.Mixed,
    slug: String,
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    publishedAt: Date
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
// Indexes - OPTIMIZED FOR PERFORMANCE
ProductSchema.index({ merchantId: 1 });
// Note: sku index is automatically created due to unique: true in schema
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ 'inventory.stock': 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
// Compound indexes for common query patterns
ProductSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ merchantId: 1, category: 1, status: 1 });
ProductSchema.index({ merchantId: 1, 'inventory.stock': 1 });
ProductSchema.index({ merchantId: 1, price: 1 });
ProductSchema.index({ merchantId: 1, 'ratings.average': -1 });
ProductSchema.index({ merchantId: 1, isFeatured: 1, sortOrder: 1 });
ProductSchema.index({ merchantId: 1, visibility: 1, status: 1 });
// Indexes for analytics and reporting
ProductSchema.index({ merchantId: 1, createdAt: -1, status: 1 });
ProductSchema.index({ status: 1, 'cashback.isActive': 1 });
ProductSchema.index({ 'inventory.stock': 1, 'inventory.lowStockThreshold': 1 }, {
    partialFilterExpression: { 'inventory.trackInventory': true }
});
// Ensure only one main image per product
ProductSchema.pre('save', function (next) {
    if (this.images && this.images.length > 0) {
        let mainImageCount = 0;
        for (let img of this.images) {
            if (img.isMain)
                mainImageCount++;
        }
        // If no main image or multiple main images, set the first one as main
        if (mainImageCount !== 1) {
            this.images.forEach((img, index) => {
                img.isMain = index === 0;
            });
        }
    }
    next();
});
exports.MProduct = mongoose_1.default.models.MProduct || mongoose_1.default.model('MProduct', ProductSchema);
// Model class with additional methods for dashboard and analytics
class ProductModel {
    static async findByMerchantId(merchantId, storeId) {
        const merchantObjectId = typeof merchantId === 'string' ? new mongoose_1.Types.ObjectId(merchantId) : merchantId;
        const query = { merchantId: merchantObjectId };
        if (storeId) {
            const storeObjectId = typeof storeId === 'string' ? new mongoose_1.Types.ObjectId(storeId) : storeId;
            query.storeId = storeObjectId;
        }
        return await exports.MProduct.find(query).sort({ createdAt: -1 });
    }
    static async countByMerchant(merchantId) {
        const merchantObjectId = typeof merchantId === 'string' ? new mongoose_1.Types.ObjectId(merchantId) : merchantId;
        return await exports.MProduct.countDocuments({ merchantId: merchantObjectId });
    }
    static async findLowStock(merchantId) {
        const merchantObjectId = typeof merchantId === 'string' ? new mongoose_1.Types.ObjectId(merchantId) : merchantId;
        return await exports.MProduct.find({
            merchantId: merchantObjectId,
            'inventory.trackInventory': true,
            $expr: {
                $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
            }
        });
    }
    static async search(params) {
        const query = { merchantId: params.merchantId };
        // Apply filters
        if (params.category) {
            query.category = params.category;
        }
        if (params.status) {
            query.status = params.status;
        }
        if (params.searchTerm) {
            query.$text = { $search: params.searchTerm };
        }
        if (params.priceRange) {
            query.price = {
                $gte: params.priceRange.min,
                $lte: params.priceRange.max
            };
        }
        if (params.stockFilter) {
            switch (params.stockFilter) {
                case 'low':
                    query.$expr = {
                        $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
                    };
                    break;
                case 'out':
                    query['inventory.stock'] = 0;
                    break;
                case 'available':
                    query['inventory.stock'] = { $gt: 0 };
                    break;
            }
        }
        // Sort
        const sortBy = params.sortBy || 'created';
        const sortOrder = params.sortOrder || 'desc';
        let sortQuery = {};
        switch (sortBy) {
            case 'name':
                sortQuery.name = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'price':
                sortQuery.price = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'stock':
                sortQuery['inventory.stock'] = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'created':
            default:
                sortQuery.createdAt = sortOrder === 'asc' ? 1 : -1;
                break;
        }
        // Pagination
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const [products, totalCount] = await Promise.all([
            exports.MProduct.find(query).sort(sortQuery).skip(skip).limit(limit),
            exports.MProduct.countDocuments(query)
        ]);
        return {
            products,
            totalCount,
            page,
            limit,
            hasNext: skip + limit < totalCount,
            hasPrevious: page > 1
        };
    }
    static async createSampleProducts(merchantId) {
        const sampleProducts = [
            {
                merchantId,
                name: 'Premium Coffee Beans',
                description: 'High-quality Arabica coffee beans, ethically sourced',
                sku: 'COFFEE-001',
                category: 'Beverages',
                price: 24.99,
                costPrice: 15.00,
                inventory: {
                    stock: 50,
                    lowStockThreshold: 10,
                    trackInventory: true,
                    allowBackorders: false,
                    reservedStock: 0
                },
                cashback: {
                    percentage: 5,
                    maxAmount: 2.00,
                    isActive: true
                },
                status: 'active'
            },
            {
                merchantId,
                name: 'Artisan Bread',
                description: 'Freshly baked sourdough bread made daily',
                sku: 'BREAD-001',
                category: 'Bakery',
                price: 8.50,
                costPrice: 4.25,
                inventory: {
                    stock: 3,
                    lowStockThreshold: 5,
                    trackInventory: true,
                    allowBackorders: false,
                    reservedStock: 0
                },
                cashback: {
                    percentage: 3,
                    maxAmount: 0.50,
                    isActive: true
                },
                status: 'active'
            },
            {
                merchantId,
                name: 'Organic Honey',
                description: 'Pure organic honey from local beekeepers',
                sku: 'HONEY-001',
                category: 'Pantry',
                price: 15.99,
                costPrice: 9.60,
                inventory: {
                    stock: 25,
                    lowStockThreshold: 8,
                    trackInventory: true,
                    allowBackorders: true,
                    reservedStock: 2
                },
                cashback: {
                    percentage: 4,
                    maxAmount: 1.00,
                    isActive: true
                },
                status: 'active'
            },
            {
                merchantId,
                name: 'Craft Beer Selection',
                description: 'Local craft beer variety pack',
                sku: 'BEER-001',
                category: 'Beverages',
                price: 32.99,
                costPrice: 22.00,
                inventory: {
                    stock: 15,
                    lowStockThreshold: 5,
                    trackInventory: true,
                    allowBackorders: false,
                    reservedStock: 1
                },
                cashback: {
                    percentage: 6,
                    maxAmount: 3.00,
                    isActive: true
                },
                status: 'active'
            },
            {
                merchantId,
                name: 'Gourmet Cheese Platter',
                description: 'Selection of finest imported cheeses',
                sku: 'CHEESE-001',
                category: 'Dairy',
                price: 45.00,
                costPrice: 27.00,
                inventory: {
                    stock: 8,
                    lowStockThreshold: 3,
                    trackInventory: true,
                    allowBackorders: false,
                    reservedStock: 0
                },
                cashback: {
                    percentage: 8,
                    maxAmount: 5.00,
                    isActive: true
                },
                status: 'active'
            }
        ];
        for (const productData of sampleProducts) {
            const existingProduct = await exports.MProduct.findOne({
                merchantId,
                sku: productData.sku
            });
            if (!existingProduct) {
                await exports.MProduct.create(productData);
            }
        }
    }
}
exports.ProductModel = ProductModel;

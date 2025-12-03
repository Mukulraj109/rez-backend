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
exports.Cart = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Cart Schema
const CartSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    items: [{
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: false // Optional - for products
            },
            event: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Event',
                required: false // Optional - for events
            },
            store: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store',
                required: false // Allow null for products without store
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                max: 99
            },
            variant: {
                type: {
                    type: String,
                    trim: true
                },
                value: {
                    type: String,
                    trim: true
                }
            },
            price: {
                type: Number,
                required: true,
                min: 0
            },
            originalPrice: {
                type: Number,
                min: 0
            },
            discount: {
                type: Number,
                default: 0,
                min: 0
            },
            lockedQuantity: {
                type: Number,
                default: 0,
                min: 0
            },
            addedAt: {
                type: Date,
                default: Date.now
            },
            notes: {
                type: String,
                trim: true,
                maxlength: 500
            },
            metadata: {
                type: mongoose_1.Schema.Types.Mixed, // For storing event-specific metadata (slotId, etc.)
                required: false
            }
        }],
    reservedItems: [{
            productId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            variant: {
                type: {
                    type: String,
                    trim: true
                },
                value: {
                    type: String,
                    trim: true
                }
            },
            reservedAt: {
                type: Date,
                required: true,
                default: Date.now
            },
            expiresAt: {
                type: Date,
                required: true,
                index: true // Index for efficient cleanup queries
            }
        }],
    lockedItems: [{
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            store: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1
            },
            variant: {
                type: {
                    type: String,
                    trim: true
                },
                value: {
                    type: String,
                    trim: true
                }
            },
            lockedPrice: {
                type: Number,
                required: true,
                min: 0
            },
            originalPrice: {
                type: Number,
                min: 0
            },
            lockedAt: {
                type: Date,
                required: true,
                default: Date.now
            },
            expiresAt: {
                type: Date,
                required: true,
                index: true
            },
            notes: {
                type: String,
                trim: true,
                maxlength: 500
            },
            // Payment fields for paid lock feature (MakeMyTrip style)
            lockFee: {
                type: Number,
                min: 0,
                default: 0
            },
            lockFeePercentage: {
                type: Number,
                min: 0,
                max: 100
            },
            lockDuration: {
                type: Number,
                min: 1
            },
            paymentMethod: {
                type: String,
                enum: ['wallet', 'paybill', 'upi']
            },
            paymentTransactionId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Transaction'
            },
            lockPaymentStatus: {
                type: String,
                enum: ['pending', 'paid', 'refunded', 'forfeited', 'applied'],
                default: 'pending'
            },
            isPaidLock: {
                type: Boolean,
                default: false
            }
        }],
    totals: {
        subtotal: {
            type: Number,
            default: 0,
            min: 0
        },
        tax: {
            type: Number,
            default: 0,
            min: 0
        },
        delivery: {
            type: Number,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        cashback: {
            type: Number,
            default: 0,
            min: 0
        },
        total: {
            type: Number,
            default: 0,
            min: 0
        },
        savings: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    coupon: {
        code: {
            type: String,
            trim: true,
            uppercase: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed']
        },
        discountValue: {
            type: Number,
            min: 0
        },
        appliedAmount: {
            type: Number,
            min: 0
        },
        appliedAt: {
            type: Date
        }
    },
    deliveryAddress: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Address'
    },
    specialInstructions: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    estimatedDeliveryTime: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
        index: { expireAfterSeconds: 0 }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
CartSchema.index({ user: 1, isActive: 1 });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
CartSchema.index({ 'items.product': 1 });
CartSchema.index({ 'items.store': 1 });
CartSchema.index({ updatedAt: -1 });
// Virtual for total items count
CartSchema.virtual('itemCount').get(function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});
// Virtual for unique stores count
CartSchema.virtual('storeCount').get(function () {
    const uniqueStores = new Set(this.items
        .filter((item) => item.store != null)
        .map((item) => item.store.toString()));
    return uniqueStores.size;
});
// Virtual for expired status
CartSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date();
});
// Pre-save validation: ensure each item has either product or event
CartSchema.pre('save', function (next) {
    for (const item of this.items) {
        if (!item.product && !item.event) {
            return next(new Error('Cart item must have either a product or an event'));
        }
        if (item.product && item.event) {
            return next(new Error('Cart item cannot have both a product and an event'));
        }
    }
    next();
});
// Pre-save hook to calculate totals
CartSchema.pre('save', async function (next) {
    if (this.isModified('items') || this.isModified('coupon')) {
        await this.calculateTotals();
    }
    next();
});
// Method to add item to cart
CartSchema.methods.addItem = async function (productId, quantity = 1, variant) {
    const Product = this.model('Product');
    const product = await Product.findById(productId).populate('store').lean();
    console.log('🛒 [CART MODEL] Product lookup result:', {
        productId,
        productFound: !!product,
        productName: product?.name,
        productStore: product?.store,
        productIsActive: product?.isActive,
        productInventoryAvailable: product?.inventory?.isAvailable
    });
    if (!product || !product.isActive || !product.inventory.isAvailable) {
        throw new Error('Product not available');
    }
    // Check stock availability with detailed error messages
    let availableStock = product.inventory.stock;
    let variantInfo = '';
    if (variant && product.inventory.variants) {
        const variantObj = product.getVariantByType(variant.type, variant.value);
        if (!variantObj) {
            throw new Error(`Product variant "${variant.value}" is not available`);
        }
        availableStock = variantObj.stock;
        variantInfo = ` (${variant.type}: ${variant.value})`;
    }
    // Stock validation with user-friendly messages
    if (!product.inventory.unlimited) {
        if (availableStock === 0) {
            throw new Error(`${product.name}${variantInfo} is currently out of stock`);
        }
        if (availableStock < quantity) {
            const message = availableStock === 1
                ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
                : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
            throw new Error(message);
        }
    }
    // Check if item already exists in cart
    const existingItemIndex = this.items.findIndex((item) => {
        if (!item.product)
            return false;
        const productMatch = item.product.toString() === productId;
        const variantMatch = variant
            ? item.variant?.type === variant.type && item.variant?.value === variant.value
            : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
        return productMatch && variantMatch;
    });
    if (existingItemIndex > -1) {
        // Update existing item quantity
        const newQuantity = this.items[existingItemIndex].quantity + quantity;
        // Check if new total quantity exceeds available stock
        if (!product.inventory.unlimited) {
            if (availableStock === 0) {
                throw new Error(`${product.name}${variantInfo} is currently out of stock`);
            }
            if (availableStock < newQuantity) {
                const message = availableStock === 1
                    ? `Only 1 item of ${product.name}${variantInfo} is available. You already have ${this.items[existingItemIndex].quantity} in your cart`
                    : `Only ${availableStock} items of ${product.name}${variantInfo} are available. You already have ${this.items[existingItemIndex].quantity} in your cart`;
                throw new Error(message);
            }
        }
        this.items[existingItemIndex].quantity = newQuantity;
        this.items[existingItemIndex].addedAt = new Date();
    }
    else {
        // Add new item
        console.log('🛒 [CART MODEL] Adding new item to cart');
        console.log('🛒 [CART MODEL] Product price structure:', {
            price: product.price,
            pricing: product.pricing
        });
        const extractedPrice = product.price?.current || product.pricing?.selling || 0;
        const extractedOriginalPrice = product.price?.original || product.pricing?.original || 0;
        const extractedDiscount = product.price?.discount || product.pricing?.discount || 0;
        console.log('🛒 [CART MODEL] Extracted prices:', {
            price: extractedPrice,
            originalPrice: extractedOriginalPrice,
            discount: extractedDiscount
        });
        const cartItem = {
            product: product._id,
            store: product.store?._id || null, // Handle case where store is null
            quantity,
            variant,
            price: extractedPrice,
            originalPrice: extractedOriginalPrice,
            discount: extractedDiscount,
            addedAt: new Date()
        };
        console.log('🛒 [CART MODEL] Final cart item:', cartItem);
        this.items.push(cartItem);
    }
    // Extend cart expiry
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
// Method to remove item from cart
CartSchema.methods.removeItem = async function (productId, variant) {
    this.items = this.items.filter((item) => {
        // Skip items with null product (corrupted data)
        if (!item.product) {
            console.warn('⚠️ [CART] Removing item with null product during filter');
            return false; // Remove null product items
        }
        // Handle both populated and unpopulated product references
        const productRef = item.product;
        const itemProductId = productRef._id ? productRef._id.toString() : productRef.toString();
        const productMatch = itemProductId === productId;
        const variantMatch = variant
            ? item.variant?.type === variant.type && item.variant?.value === variant.value
            : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
        return !(productMatch && variantMatch);
    });
};
// Method to update item quantity
CartSchema.methods.updateItemQuantity = async function (productId, quantity, variant) {
    if (quantity <= 0) {
        return this.removeItem(productId, variant);
    }
    console.log('🛒 [UPDATE ITEM QTY] Searching for product:', productId);
    console.log('🛒 [UPDATE ITEM QTY] Cart has items:', this.items.map((item) => {
        // Skip null product items
        if (!item.product) {
            console.warn('⚠️ [CART] Found item with null product');
            return { productId: null, variant: item.variant };
        }
        const productRef = item.product;
        return {
            productId: productRef._id ? productRef._id.toString() : productRef.toString(),
            variant: item.variant
        };
    }));
    const itemIndex = this.items.findIndex((item) => {
        // Skip items with null product
        if (!item.product) {
            console.warn('⚠️ [CART] Skipping item with null product in findIndex');
            return false;
        }
        // Handle both populated and unpopulated product references
        const productRef = item.product;
        const itemProductId = productRef._id ? productRef._id.toString() : productRef.toString();
        const productMatch = itemProductId === productId;
        const variantMatch = variant
            ? item.variant?.type === variant.type && item.variant?.value === variant.value
            : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
        console.log(`🛒 [UPDATE ITEM QTY] Comparing item ${itemProductId} with ${productId}:`, {
            productMatch,
            variantMatch,
            itemVariant: item.variant,
            searchVariant: variant
        });
        return productMatch && variantMatch;
    });
    console.log('🛒 [UPDATE ITEM QTY] Found item index:', itemIndex);
    if (itemIndex === -1) {
        throw new Error('Item not found in cart');
    }
    // Check stock availability with detailed error messages
    const Product = this.model('Product');
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }
    if (!product.isActive || !product.inventory.isAvailable) {
        throw new Error('Product is no longer available');
    }
    let availableStock = product.inventory.stock;
    let variantInfo = '';
    if (variant && product.inventory.variants) {
        const variantObj = product.getVariantByType(variant.type, variant.value);
        if (!variantObj) {
            throw new Error(`Product variant "${variant.value}" is not available`);
        }
        availableStock = variantObj.stock;
        variantInfo = ` (${variant.type}: ${variant.value})`;
    }
    // Stock validation with user-friendly messages
    if (!product.inventory.unlimited) {
        if (availableStock === 0) {
            throw new Error(`${product.name}${variantInfo} is currently out of stock`);
        }
        if (availableStock < quantity) {
            const message = availableStock === 1
                ? `Only 1 item of ${product.name}${variantInfo} is remaining in stock`
                : `Only ${availableStock} items of ${product.name}${variantInfo} are remaining in stock`;
            throw new Error(message);
        }
    }
    this.items[itemIndex].quantity = quantity;
    this.items[itemIndex].addedAt = new Date();
};
// Method to calculate totals
CartSchema.methods.calculateTotals = async function () {
    let subtotal = 0;
    let savings = 0;
    let itemDiscounts = 0; // Total of lock fee discounts
    // Calculate subtotal and savings
    this.items.forEach((item) => {
        // Calculate item total based on locked quantity
        // lockedQuantity items get the lock fee discount, remaining items are at full price
        const lockedQty = item.lockedQuantity || 0;
        const regularQty = item.quantity - lockedQty;
        const lockFeeDiscount = item.discount || 0;
        // All items at original price, then subtract lock fee discount
        // This ensures: 2 items at ₹10,000 = ₹20,000, minus ₹500 lock fee = ₹19,500
        const itemTotal = (item.price * item.quantity) - lockFeeDiscount;
        subtotal += itemTotal;
        // Track lock fee discounts for display
        if (lockFeeDiscount > 0) {
            itemDiscounts += lockFeeDiscount;
            savings += lockFeeDiscount;
        }
        // Also track savings from original price differences (sale prices, etc.)
        if (item.originalPrice && item.originalPrice > item.price) {
            savings += (item.originalPrice - item.price) * item.quantity;
        }
    });
    // Calculate tax (assume 5% GST for now - this should be configurable)
    const taxRate = 0.05;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    // Calculate delivery fee (this should be based on store policies and distance)
    let delivery = 0;
    const uniqueStores = new Set(this.items
        .filter((item) => item.store != null)
        .map((item) => item.store.toString()));
    // Simple delivery calculation - ₹50 per store, free above ₹500
    if (subtotal < 500) {
        delivery = uniqueStores.size * 50;
    }
    // Apply coupon discount
    let couponDiscount = 0;
    if (this.coupon && this.coupon.discountValue) {
        console.log('💳 [CALCULATE TOTALS] Applying coupon:', {
            code: this.coupon.code,
            type: this.coupon.discountType,
            value: this.coupon.discountValue,
            subtotal
        });
        if (this.coupon.discountType === 'percentage') {
            couponDiscount = Math.round((subtotal * this.coupon.discountValue / 100) * 100) / 100;
        }
        else {
            couponDiscount = this.coupon.discountValue;
        }
        couponDiscount = Math.min(couponDiscount, subtotal); // Don't exceed subtotal
        couponDiscount = Math.max(0, couponDiscount); // Don't allow negative
        this.coupon.appliedAmount = couponDiscount || 0; // Ensure it's not NaN
        console.log('💳 [CALCULATE TOTALS] Coupon discount calculated:', couponDiscount);
    }
    else if (this.coupon) {
        console.warn('⚠️ [CALCULATE TOTALS] Coupon exists but has invalid discountValue:', this.coupon);
    }
    // Calculate cashback (simplified - this should be based on store offers)
    const cashbackRate = 0.02; // 2% cashback
    const cashback = Math.round((subtotal - couponDiscount) * cashbackRate * 100) / 100;
    // Calculate total with detailed logging
    const total = subtotal + tax + delivery - couponDiscount;
    console.log('💰 [CALCULATE TOTALS] Calculation breakdown:', {
        subtotal,
        tax,
        delivery,
        couponDiscount,
        total,
        formula: `${subtotal} + ${tax} + ${delivery} - ${couponDiscount} = ${total}`
    });
    // Ensure all values are valid numbers
    const finalSubtotal = Math.round((Number(subtotal) || 0) * 100) / 100;
    const finalTax = Math.round((Number(tax) || 0) * 100) / 100;
    const finalDelivery = Math.round((Number(delivery) || 0) * 100) / 100;
    const finalDiscount = Math.round((Number(couponDiscount) || 0) * 100) / 100;
    const finalCashback = Math.round((Number(cashback) || 0) * 100) / 100;
    const finalTotal = Math.max(0, Math.round((Number(total) || 0) * 100) / 100);
    const finalSavings = Math.round((Number(savings) || 0) * 100) / 100;
    this.totals = {
        subtotal: finalSubtotal,
        tax: finalTax,
        delivery: finalDelivery,
        discount: finalDiscount,
        cashback: finalCashback,
        total: finalTotal,
        savings: finalSavings
    };
    console.log('✅ [CALCULATE TOTALS] Final totals set:', this.totals);
};
// Method to apply coupon
CartSchema.methods.applyCoupon = async function (couponCode) {
    // This is a simplified implementation
    // In a real app, you'd validate the coupon against a Coupon model
    const validCoupons = {
        'WELCOME10': { type: 'percentage', value: 10, minAmount: 200 },
        'SAVE50': { type: 'fixed', value: 50, minAmount: 300 },
        'NEWUSER': { type: 'percentage', value: 15, minAmount: 500 }
    };
    const coupon = validCoupons[couponCode.toUpperCase()];
    if (!coupon) {
        return false;
    }
    if (this.totals.subtotal < coupon.minAmount) {
        throw new Error(`Minimum order amount of ₹${coupon.minAmount} required for this coupon`);
    }
    this.coupon = {
        code: couponCode.toUpperCase(),
        discountType: coupon.type,
        discountValue: coupon.value,
        appliedAmount: 0,
        appliedAt: new Date()
    };
    return true;
};
// Method to remove coupon
CartSchema.methods.removeCoupon = async function () {
    this.coupon = undefined;
};
// Method to clear cart
CartSchema.methods.clearCart = async function () {
    this.items = [];
    this.coupon = undefined;
    this.totals = {
        subtotal: 0,
        tax: 0,
        delivery: 0,
        discount: 0,
        cashback: 0,
        total: 0,
        savings: 0
    };
};
// Lock item at current price
CartSchema.methods.lockItem = async function (productId, quantity = 1, variant, lockDurationHours = 24) {
    const Product = mongoose_1.default.model('Product');
    const product = await Product.findById(productId).populate('store');
    if (!product) {
        throw new Error('Product not found');
    }
    // Debug: Log the full product structure to understand pricing fields
    console.log('🔒 [LOCK] Product structure:', {
        name: product.name,
        pricing: product.pricing,
        price: product.price,
        hasPrice: !!product.price,
        hasPricing: !!product.pricing,
        pricingKeys: product.pricing ? Object.keys(product.pricing) : [],
        priceKeys: product.price ? Object.keys(product.price) : []
    });
    // Debug: Log specific pricing values (access via _doc to bypass getters)
    const rawProduct = product._doc || product;
    console.log('🔒 [LOCK] Detailed pricing values:', {
        'pricing.selling': product.pricing?.selling,
        'pricing.original': product.pricing?.original,
        'pricing.discount': product.pricing?.discount,
        'price.current': rawProduct.price?.current,
        'price.original': rawProduct.price?.original,
        'raw price object': rawProduct.price
    });
    // First, remove any expired locked items
    const now = new Date();
    this.lockedItems = this.lockedItems.filter((item) => item.expiresAt > now);
    console.log('🔒 [LOCK] After removing expired items, locked items count:', this.lockedItems.length);
    // Check if item is already locked (non-expired)
    const existingLockIndex = this.lockedItems.findIndex((item) => item.product.toString() === productId &&
        (!variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value)));
    // Extract price with proper fallbacks to handle both old and new schema formats
    // Try new schema first (pricing.selling), then old schema (price.current)
    const lockedPrice = product.pricing?.selling ||
        rawProduct.price?.current || // Access raw data for old schema
        product.pricing?.original ||
        rawProduct.price?.original ||
        0;
    console.log('🔒 [LOCK] Extracted lockedPrice:', lockedPrice);
    if (!lockedPrice || lockedPrice === 0) {
        console.error('❌ [LOCK] Failed to extract price from product:', {
            pricing: product.pricing,
            price: rawProduct.price,
            rawProduct: rawProduct
        });
        throw new Error('Product price not available');
    }
    const expiresAt = new Date(Date.now() + lockDurationHours * 60 * 60 * 1000);
    if (existingLockIndex > -1) {
        // Update existing locked item (extend lock)
        console.log('🔒 [LOCK] Extending existing lock for product:', productId);
        this.lockedItems[existingLockIndex].quantity = quantity;
        this.lockedItems[existingLockIndex].lockedPrice = lockedPrice;
        this.lockedItems[existingLockIndex].expiresAt = expiresAt;
        this.lockedItems[existingLockIndex].lockedAt = new Date(); // Update lock time
    }
    else {
        // Add new locked item
        console.log('🔒 [LOCK] Creating new lock for product:', productId);
        // Ensure we only store the ObjectId, not the populated object
        const storeId = typeof product.store === 'object' && product.store?._id
            ? product.store._id
            : product.store || null;
        // Extract original price with proper fallbacks for both old and new schemas
        const originalPrice = product.pricing?.original ||
            rawProduct.price?.original || // Access raw data for old schema
            product.pricing?.mrp ||
            lockedPrice; // Use lockedPrice as fallback if no original price
        this.lockedItems.push({
            product: productId, // Use the productId parameter directly
            store: storeId,
            quantity,
            variant,
            lockedPrice,
            originalPrice,
            lockedAt: new Date(),
            expiresAt,
            notes: `Locked at ₹${lockedPrice}`
        });
    }
    console.log('🔒 [LOCK] Total locked items after operation:', this.lockedItems.length);
    await this.save();
};
// Unlock item
CartSchema.methods.unlockItem = async function (productId, variant) {
    console.log('🔓 [UNLOCK MODEL] Attempting to unlock product:', productId);
    console.log('🔓 [UNLOCK MODEL] Current locked items:', this.lockedItems.length);
    this.lockedItems = this.lockedItems.filter((item) => {
        // Handle both populated and unpopulated product references
        let itemProductId;
        if (typeof item.product === 'object' && item.product._id) {
            // Product is populated
            itemProductId = item.product._id.toString();
        }
        else if (typeof item.product === 'string' && item.product.includes('{')) {
            // Product is stringified object - extract ID
            const match = item.product.match(/id['"]\s*:\s*['"]([\w]+)['"]/);
            itemProductId = match ? match[1] : item.product;
        }
        else {
            // Product is just an ID
            itemProductId = item.product.toString();
        }
        console.log('🔓 [UNLOCK MODEL] Comparing:', { itemProductId, productId, match: itemProductId === productId });
        const productMatch = itemProductId === productId;
        const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
        // Return true to KEEP the item, false to REMOVE it
        return !(productMatch && variantMatch);
    });
    console.log('🔓 [UNLOCK MODEL] After filter, locked items:', this.lockedItems.length);
    await this.save();
};
// Move locked item to cart
CartSchema.methods.moveLockedToCart = async function (productId, variant) {
    console.log('➡️ [MOVE MODEL] Attempting to move locked item to cart:', productId);
    console.log('➡️ [MOVE MODEL] Current locked items:', this.lockedItems.length);
    const lockedItemIndex = this.lockedItems.findIndex((item) => {
        // Handle both populated and unpopulated product references
        let itemProductId;
        if (typeof item.product === 'object' && item.product._id) {
            // Product is populated
            itemProductId = item.product._id.toString();
        }
        else if (typeof item.product === 'string' && item.product.includes('{')) {
            // Product is stringified object - extract ID
            const match = item.product.match(/id['"]\s*:\s*['"]([\w]+)['"]/);
            itemProductId = match ? match[1] : item.product;
        }
        else {
            // Product is just an ID
            itemProductId = item.product.toString();
        }
        console.log('➡️ [MOVE MODEL] Comparing:', { itemProductId, productId, match: itemProductId === productId });
        const productMatch = itemProductId === productId;
        const variantMatch = !variant || (item.variant?.type === variant?.type && item.variant?.value === variant?.value);
        return productMatch && variantMatch;
    });
    console.log('➡️ [MOVE MODEL] Found locked item at index:', lockedItemIndex);
    if (lockedItemIndex === -1) {
        throw new Error('Locked item not found');
    }
    const lockedItem = this.lockedItems[lockedItemIndex];
    // For paid locks, we need to apply the lock fee as a discount
    if (lockedItem.isPaidLock && lockedItem.lockFee) {
        console.log('➡️ [MOVE MODEL] Moving paid locked item with lock fee applied:', {
            lockedPrice: lockedItem.lockedPrice,
            lockFee: lockedItem.lockFee,
            remainingPrice: lockedItem.lockedPrice - lockedItem.lockFee
        });
        // Get product and store info
        const Product = this.model('Product');
        const product = await Product.findById(productId).populate('store').lean();
        if (!product) {
            throw new Error('Product not found');
        }
        // Check if item already exists in cart
        const existingItemIndex = this.items.findIndex((item) => {
            if (!item.product)
                return false;
            const itemProductMatch = item.product.toString() === productId;
            const variantMatch = variant
                ? item.variant?.type === variant.type && item.variant?.value === variant.value
                : !item.variant || (typeof item.variant === 'object' && (!item.variant.type && !item.variant.value));
            return itemProductMatch && variantMatch;
        });
        if (existingItemIndex > -1) {
            // Update existing item - add quantities and track locked quantity
            this.items[existingItemIndex].quantity += lockedItem.quantity;
            // Track how many items have the lock fee discount
            this.items[existingItemIndex].lockedQuantity = (this.items[existingItemIndex].lockedQuantity || 0) + lockedItem.quantity;
            // Apply the lock fee discount
            this.items[existingItemIndex].discount = (this.items[existingItemIndex].discount || 0) + lockedItem.lockFee;
            this.items[existingItemIndex].addedAt = new Date();
        }
        else {
            // Add new item - keep original price and track lockedQuantity
            // The lock fee discount will be applied based on lockedQuantity in calculateTotals
            const cartItem = {
                product: product._id,
                store: product.store?._id || null,
                quantity: lockedItem.quantity,
                variant: lockedItem.variant,
                price: lockedItem.lockedPrice, // Original price (₹10,000)
                originalPrice: lockedItem.lockedPrice,
                discount: lockedItem.lockFee, // Lock fee (₹500) - only applies to lockedQuantity
                lockedQuantity: lockedItem.quantity, // How many items have the lock fee discount
                addedAt: new Date(),
                notes: `Lock fee of ₹${lockedItem.lockFee} already paid for ${lockedItem.quantity} item(s)`
            };
            console.log('➡️ [MOVE MODEL] Adding cart item with lock fee discount:', cartItem);
            this.items.push(cartItem);
        }
    }
    else {
        // Regular lock (not paid) - use normal addItem
        await this.addItem(productId, lockedItem.quantity, variant);
    }
    // Remove from locked items
    this.lockedItems.splice(lockedItemIndex, 1);
    // Extend cart expiry
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    console.log('➡️ [MOVE MODEL] Item moved successfully, remaining locked items:', this.lockedItems.length);
    await this.save();
};
// Static method to get active cart for user
CartSchema.statics.getActiveCart = function (userId) {
    return this.findOne({ user: userId, isActive: true })
        .populate('items.product', 'name images pricing inventory isActive')
        .populate('items.store', 'name location isActive')
        .populate('lockedItems.product', 'name images pricing inventory isActive')
        .populate('lockedItems.store', 'name location isActive')
        .populate('deliveryAddress');
};
// Static method to cleanup expired carts
CartSchema.statics.cleanupExpired = function () {
    return this.deleteMany({
        expiresAt: { $lt: new Date() },
        isActive: false
    });
};
exports.Cart = mongoose_1.default.model('Cart', CartSchema);

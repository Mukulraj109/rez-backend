"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillPaymentDiscounts = exports.getDiscountAnalytics = exports.getUserDiscountHistory = exports.applyDiscount = exports.validateDiscount = exports.getDiscountsForProduct = exports.getDiscountById = exports.getDiscounts = void 0;
const Discount_1 = __importDefault(require("../models/Discount"));
const DiscountUsage_1 = __importDefault(require("../models/DiscountUsage"));
const response_1 = require("../utils/response");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * GET /api/discounts
 * Get all discounts with filters
 */
const getDiscounts = async (req, res) => {
    try {
        const { page = 1, limit = 20, applicableOn, type, minValue, maxValue, sortBy = 'priority', order = 'desc', } = req.query;
        // Build filter
        const now = new Date();
        const filter = {
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            $or: [
                { usageLimit: { $exists: false } },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
        };
        if (applicableOn) {
            filter.applicableOn = applicableOn;
        }
        if (type) {
            filter.type = type;
        }
        if (minValue) {
            filter.value = { $gte: Number(minValue) };
        }
        if (maxValue) {
            filter.value = { ...filter.value, $lte: Number(maxValue) };
        }
        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [discounts, total] = await Promise.all([
            Discount_1.default.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Discount_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, discounts, pageNum, limitNum, total, 'Discounts fetched successfully');
    }
    catch (error) {
        console.error('Error fetching discounts:', error);
        (0, response_1.sendError)(res, 'Failed to fetch discounts', 500);
    }
};
exports.getDiscounts = getDiscounts;
/**
 * GET /api/discounts/:id
 * Get single discount by ID
 */
const getDiscountById = async (req, res) => {
    try {
        const { id } = req.params;
        const discount = await Discount_1.default.findById(id).lean();
        if (!discount) {
            return (0, response_1.sendError)(res, 'Discount not found', 404);
        }
        (0, response_1.sendSuccess)(res, discount, 'Discount fetched successfully');
    }
    catch (error) {
        console.error('Error fetching discount:', error);
        (0, response_1.sendError)(res, 'Failed to fetch discount', 500);
    }
};
exports.getDiscountById = getDiscountById;
/**
 * GET /api/discounts/product/:productId
 * Get available discounts for a specific product
 */
const getDiscountsForProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { orderValue = 0 } = req.query;
        const userId = req.user?.id;
        const now = new Date();
        const productObjId = new mongoose_1.default.Types.ObjectId(productId);
        const userObjId = userId ? new mongoose_1.default.Types.ObjectId(userId) : undefined;
        // Find discounts applicable to this product
        const filter = {
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            minOrderValue: { $lte: Number(orderValue) },
            $or: [
                { usageLimit: { $exists: false } },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ],
            $and: [
                {
                    $or: [
                        { applicableOn: 'all' },
                        { applicableOn: 'specific_products', applicableProducts: productObjId }
                    ]
                }
            ]
        };
        let discounts = await Discount_1.default.find(filter)
            .sort({ priority: -1, value: -1 })
            .lean();
        // If user is authenticated, filter by user-specific rules
        if (userObjId) {
            const availableDiscounts = [];
            for (const discount of discounts) {
                const discountDoc = await Discount_1.default.findById(discount._id);
                if (discountDoc) {
                    const canUse = await discountDoc.canUserUse(userObjId);
                    if (canUse.can) {
                        // Add calculated discount amount
                        const discountAmount = discountDoc.calculateDiscount(Number(orderValue));
                        availableDiscounts.push({
                            ...discount,
                            discountAmount,
                            canApply: discountAmount > 0
                        });
                    }
                }
            }
            discounts = availableDiscounts;
        }
        else {
            // For non-authenticated users, just add discount amount
            discounts = discounts.map((discount) => {
                let discountAmount = 0;
                if (discount.type === 'percentage') {
                    discountAmount = (Number(orderValue) * discount.value) / 100;
                }
                else {
                    discountAmount = discount.value;
                }
                if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
                    discountAmount = discount.maxDiscountAmount;
                }
                return {
                    ...discount,
                    discountAmount: Math.round(discountAmount),
                    canApply: discountAmount > 0
                };
            });
        }
        (0, response_1.sendSuccess)(res, discounts, 'Product discounts fetched successfully');
    }
    catch (error) {
        console.error('Error fetching product discounts:', error);
        (0, response_1.sendError)(res, 'Failed to fetch product discounts', 500);
    }
};
exports.getDiscountsForProduct = getDiscountsForProduct;
/**
 * POST /api/discounts/validate
 * Validate if a discount code can be applied
 */
const validateDiscount = async (req, res) => {
    try {
        const { code, orderValue, productIds, categoryIds } = req.body;
        const userId = req.user?.id;
        if (!code) {
            return (0, response_1.sendError)(res, 'Discount code is required', 400);
        }
        if (!orderValue || orderValue <= 0) {
            return (0, response_1.sendError)(res, 'Valid order value is required', 400);
        }
        // Find discount by code
        const discount = await Discount_1.default.findOne({
            code: code.toUpperCase(),
            isActive: true
        });
        if (!discount) {
            return (0, response_1.sendError)(res, 'Invalid discount code', 404);
        }
        // Check if currently valid
        const now = new Date();
        if (discount.validFrom > now) {
            return (0, response_1.sendError)(res, 'This discount is not yet active', 400);
        }
        if (discount.validUntil < now) {
            return (0, response_1.sendError)(res, 'This discount has expired', 400);
        }
        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return (0, response_1.sendError)(res, 'This discount has reached its usage limit', 400);
        }
        // Check minimum order value
        if (orderValue < discount.minOrderValue) {
            return (0, response_1.sendError)(res, `Minimum order value of ₹${discount.minOrderValue} required`, 400);
        }
        // Check product/category applicability
        if (discount.applicableOn === 'specific_products') {
            if (!productIds || productIds.length === 0) {
                return (0, response_1.sendError)(res, 'This discount is only valid for specific products', 400);
            }
            const applicableProductIds = discount.applicableProducts?.map(id => id.toString()) || [];
            const hasApplicableProduct = productIds.some((id) => applicableProductIds.includes(id));
            if (!hasApplicableProduct) {
                return (0, response_1.sendError)(res, 'This discount is not applicable to selected products', 400);
            }
        }
        if (discount.applicableOn === 'specific_categories') {
            if (!categoryIds || categoryIds.length === 0) {
                return (0, response_1.sendError)(res, 'This discount is only valid for specific categories', 400);
            }
            const applicableCategoryIds = discount.applicableCategories?.map(id => id.toString()) || [];
            const hasApplicableCategory = categoryIds.some((id) => applicableCategoryIds.includes(id));
            if (!hasApplicableCategory) {
                return (0, response_1.sendError)(res, 'This discount is not applicable to selected categories', 400);
            }
        }
        // Check user-specific restrictions
        if (userId) {
            const userObjId = new mongoose_1.default.Types.ObjectId(userId);
            const canUse = await discount.canUserUse(userObjId);
            if (!canUse.can) {
                return (0, response_1.sendError)(res, canUse.reason || 'You cannot use this discount', 400);
            }
        }
        // Calculate discount amount
        const discountAmount = discount.calculateDiscount(orderValue);
        (0, response_1.sendSuccess)(res, {
            valid: true,
            discount: {
                _id: discount._id,
                code: discount.code,
                name: discount.name,
                type: discount.type,
                value: discount.value,
                discountAmount,
                finalAmount: orderValue - discountAmount,
            },
        }, 'Discount is valid');
    }
    catch (error) {
        console.error('Error validating discount:', error);
        (0, response_1.sendError)(res, 'Failed to validate discount', 500);
    }
};
exports.validateDiscount = validateDiscount;
/**
 * POST /api/discounts/apply
 * Apply discount to an order (authenticated users only)
 */
const applyDiscount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { discountId, orderId, orderValue } = req.body;
        if (!discountId || !orderId || !orderValue) {
            return (0, response_1.sendError)(res, 'Discount ID, order ID, and order value are required', 400);
        }
        // Find discount
        const discount = await Discount_1.default.findById(discountId);
        if (!discount) {
            return (0, response_1.sendError)(res, 'Discount not found', 404);
        }
        if (!discount.isActive) {
            return (0, response_1.sendError)(res, 'This discount is not active', 400);
        }
        // Validate discount can be used
        const userObjId = new mongoose_1.default.Types.ObjectId(userId);
        const canUse = await discount.canUserUse(userObjId);
        if (!canUse.can) {
            return (0, response_1.sendError)(res, canUse.reason || 'You cannot use this discount', 400);
        }
        // Calculate discount amount
        const discountAmount = discount.calculateDiscount(orderValue);
        if (discountAmount === 0) {
            return (0, response_1.sendError)(res, `Minimum order value of ₹${discount.minOrderValue} required`, 400);
        }
        // Create discount usage record
        const discountUsage = new DiscountUsage_1.default({
            discount: discountId,
            user: userId,
            order: orderId,
            discountAmount,
            orderValue,
            metadata: {
                discountCode: discount.code,
                discountType: discount.type,
                originalDiscountValue: discount.value,
            },
        });
        await discountUsage.save();
        // Increment usage count
        discount.usedCount += 1;
        await discount.save();
        (0, response_1.sendSuccess)(res, {
            discountAmount,
            finalAmount: orderValue - discountAmount,
            usageId: discountUsage._id,
        }, 'Discount applied successfully', 201);
    }
    catch (error) {
        console.error('Error applying discount:', error);
        (0, response_1.sendError)(res, 'Failed to apply discount', 500);
    }
};
exports.applyDiscount = applyDiscount;
/**
 * GET /api/discounts/my-history
 * Get user's discount usage history (authenticated users only)
 */
const getUserDiscountHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [history, total] = await Promise.all([
            DiscountUsage_1.default.find({ user: userId })
                .populate('discount', 'name code type value')
                .populate('order', 'orderNumber status')
                .sort({ usedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            DiscountUsage_1.default.countDocuments({ user: userId }),
        ]);
        (0, response_1.sendPaginated)(res, history, pageNum, limitNum, total, 'Discount history fetched successfully');
    }
    catch (error) {
        console.error('Error fetching discount history:', error);
        (0, response_1.sendError)(res, 'Failed to fetch discount history', 500);
    }
};
exports.getUserDiscountHistory = getUserDiscountHistory;
/**
 * GET /api/discounts/:id/analytics
 * Get analytics for a specific discount (admin only)
 */
const getDiscountAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const discountObjId = new mongoose_1.default.Types.ObjectId(id);
        const analytics = await DiscountUsage_1.default.getDiscountAnalytics(discountObjId);
        const discount = await Discount_1.default.findById(id).lean();
        if (!discount) {
            return (0, response_1.sendError)(res, 'Discount not found', 404);
        }
        (0, response_1.sendSuccess)(res, {
            discount: {
                _id: discount._id,
                name: discount.name,
                code: discount.code,
                type: discount.type,
                value: discount.value,
            },
            analytics,
        }, 'Analytics fetched successfully');
    }
    catch (error) {
        console.error('Error fetching discount analytics:', error);
        (0, response_1.sendError)(res, 'Failed to fetch analytics', 500);
    }
};
exports.getDiscountAnalytics = getDiscountAnalytics;
/**
 * GET /api/discounts/bill-payment
 * Get available bill payment discounts
 */
const getBillPaymentDiscounts = async (req, res) => {
    try {
        const { orderValue = 0 } = req.query;
        const userId = req.user?.id;
        const now = new Date();
        const filter = {
            applicableOn: 'bill_payment',
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            minOrderValue: { $lte: Number(orderValue) },
            $or: [
                { usageLimit: { $exists: false } },
                { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
        };
        let discounts = await Discount_1.default.find(filter)
            .sort({ priority: -1, value: -1 })
            .lean();
        // Calculate discount amounts
        discounts = discounts.map((discount) => {
            let discountAmount = 0;
            if (discount.type === 'percentage') {
                discountAmount = (Number(orderValue) * discount.value) / 100;
            }
            else {
                discountAmount = discount.value;
            }
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
                discountAmount = discount.maxDiscountAmount;
            }
            return {
                ...discount,
                discountAmount: Math.round(discountAmount),
                canApply: discountAmount > 0 && Number(orderValue) >= discount.minOrderValue
            };
        });
        (0, response_1.sendSuccess)(res, discounts, 'Bill payment discounts fetched successfully');
    }
    catch (error) {
        console.error('Error fetching bill payment discounts:', error);
        (0, response_1.sendError)(res, 'Failed to fetch bill payment discounts', 500);
    }
};
exports.getBillPaymentDiscounts = getBillPaymentDiscounts;

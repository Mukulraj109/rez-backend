"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Store_1 = require("../models/Store");
const Discount_1 = __importDefault(require("../models/Discount"));
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createDiscountSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(3).max(100),
    description: joi_1.default.string().max(500).optional(),
    type: joi_1.default.string().valid('percentage', 'fixed').required(),
    value: joi_1.default.number().required().min(0),
    minOrderValue: joi_1.default.number().min(0).default(0),
    maxDiscountAmount: joi_1.default.number().min(0).optional(),
    storeId: joi_1.default.string().optional(), // If provided, scope = 'store', else scope = 'merchant'
    applicableOn: joi_1.default.string().valid('bill_payment', 'card_payment').required(),
    validFrom: joi_1.default.date().required(),
    validUntil: joi_1.default.date().required().min(joi_1.default.ref('validFrom')),
    usageLimit: joi_1.default.number().min(1).optional(),
    usageLimitPerUser: joi_1.default.number().min(1).default(1),
    priority: joi_1.default.number().min(0).max(100).default(0),
    restrictions: joi_1.default.object({
        isOfflineOnly: joi_1.default.boolean().default(false),
        notValidAboveStoreDiscount: joi_1.default.boolean().default(false),
        singleVoucherPerBill: joi_1.default.boolean().default(true),
    }).optional(),
    metadata: joi_1.default.object({
        displayText: joi_1.default.string().optional(),
        icon: joi_1.default.string().optional(),
        backgroundColor: joi_1.default.string().optional(),
    }).optional(),
    // Card Offer Specific Fields
    paymentMethod: joi_1.default.string().valid('upi', 'card', 'all').optional(),
    cardType: joi_1.default.string().valid('credit', 'debit', 'all').optional(),
    bankNames: joi_1.default.array().items(joi_1.default.string()).optional(),
    cardBins: joi_1.default.array().items(joi_1.default.string().regex(/^\d{6}$/)).optional(),
});
const updateDiscountSchema = createDiscountSchema.fork(['name', 'type', 'value', 'validFrom', 'validUntil'], (schema) => schema.optional());
/**
 * @route   GET /api/merchant/discounts
 * @desc    Get all discounts for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    storeId: joi_1.default.string().optional(),
    scope: joi_1.default.string().valid('merchant', 'store').optional(),
    isActive: joi_1.default.boolean().optional(),
    applicableOn: joi_1.default.string().valid('bill_payment', 'card_payment').optional(),
    paymentMethod: joi_1.default.string().valid('upi', 'card', 'all').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(50).default(20),
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Build query - only merchant's discounts
        const query = {
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId),
        };
        // Filter by applicableOn if provided
        if (req.query.applicableOn) {
            query.applicableOn = req.query.applicableOn;
        }
        // Filter by paymentMethod if provided (for card offers)
        if (req.query.paymentMethod) {
            query.paymentMethod = req.query.paymentMethod === 'all'
                ? { $in: ['all', 'card', 'upi'] }
                : req.query.paymentMethod;
        }
        // Filter by storeId if provided
        if (req.query.storeId) {
            const storeId = new mongoose_1.default.Types.ObjectId(req.query.storeId);
            // Verify store belongs to merchant
            const store = await Store_1.Store.findOne({
                _id: storeId,
                merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
            });
            if (!store) {
                return res.status(403).json({
                    success: false,
                    message: 'Store not found or access denied'
                });
            }
            query.storeId = storeId;
            query.scope = 'store';
        }
        else if (req.query.scope) {
            // Filter by scope (merchant or store)
            query.scope = req.query.scope;
            if (req.query.scope === 'merchant') {
                // Merchant-level discounts don't have storeId
                query.storeId = { $exists: false };
            }
        }
        // Filter by active status
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Execute query
        const [discounts, total] = await Promise.all([
            Discount_1.default.find(query)
                .populate('storeId', 'name slug')
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Discount_1.default.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        return res.json({
            success: true,
            data: {
                discounts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching merchant discounts:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch discounts',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/discounts/:id
 * @desc    Get single discount by ID
 * @access  Private (Merchant)
 */
router.get('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const discountId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find discount and verify ownership
        const discount = await Discount_1.default.findOne({
            _id: discountId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        })
            .populate('storeId', 'name slug')
            .lean();
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found or access denied'
            });
        }
        return res.json({
            success: true,
            data: discount
        });
    }
    catch (error) {
        console.error('Error fetching discount:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch discount',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/discounts
 * @desc    Create new discount
 * @access  Private (Merchant)
 */
router.post('/', (0, merchantvalidation_1.validateRequest)(createDiscountSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const discountData = { ...req.body };
        const merchantObjectId = new mongoose_1.default.Types.ObjectId(merchantId);
        // Determine scope and set IDs
        let scope = 'merchant';
        let storeId;
        if (discountData.storeId) {
            // Validate store belongs to merchant
            const store = await Store_1.Store.findOne({
                _id: discountData.storeId,
                merchantId: merchantObjectId
            });
            if (!store) {
                return res.status(400).json({
                    success: false,
                    message: 'Store not found or does not belong to this merchant'
                });
            }
            scope = 'store';
            storeId = new mongoose_1.default.Types.ObjectId(discountData.storeId);
        }
        // Create discount
        const discount = new Discount_1.default({
            name: discountData.name,
            description: discountData.description,
            type: discountData.type,
            value: discountData.value,
            minOrderValue: discountData.minOrderValue || 0,
            maxDiscountAmount: discountData.maxDiscountAmount,
            applicableOn: discountData.applicableOn || 'bill_payment', // Use provided applicableOn or default to bill_payment
            validFrom: new Date(discountData.validFrom),
            validUntil: new Date(discountData.validUntil),
            usageLimit: discountData.usageLimit,
            usageLimitPerUser: discountData.usageLimitPerUser || 1,
            priority: discountData.priority || 0,
            restrictions: {
                isOfflineOnly: discountData.restrictions?.isOfflineOnly || false,
                notValidAboveStoreDiscount: discountData.restrictions?.notValidAboveStoreDiscount || false,
                singleVoucherPerBill: discountData.restrictions?.singleVoucherPerBill !== false, // Default true
            },
            metadata: discountData.metadata || {},
            // Card Offer Specific Fields
            paymentMethod: discountData.paymentMethod,
            cardType: discountData.cardType,
            bankNames: discountData.bankNames,
            cardBins: discountData.cardBins,
            merchantId: merchantObjectId,
            storeId: storeId,
            scope: scope,
            createdBy: merchantObjectId,
            createdByType: 'merchant',
            isActive: true,
            usedCount: 0
        });
        await discount.save();
        // Populate store info for response
        if (storeId) {
            await discount.populate('storeId', 'name slug');
        }
        return res.status(201).json({
            success: true,
            data: discount,
            message: 'Discount created successfully'
        });
    }
    catch (error) {
        console.error('Error creating discount:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create discount',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/discounts/:id
 * @desc    Update existing discount
 * @access  Private (Merchant)
 */
router.put('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), (0, merchantvalidation_1.validateRequest)(updateDiscountSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const discountId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find discount and verify ownership
        const discount = await Discount_1.default.findOne({
            _id: discountId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found or access denied'
            });
        }
        // Prevent changing scope after creation
        const updateData = { ...req.body };
        delete updateData.scope;
        delete updateData.merchantId;
        delete updateData.createdBy;
        delete updateData.createdByType;
        // Handle storeId update (if changing from merchant-level to store-level)
        if (updateData.storeId && !discount.storeId) {
            // Validate store belongs to merchant
            const store = await Store_1.Store.findOne({
                _id: updateData.storeId,
                merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
            });
            if (!store) {
                return res.status(400).json({
                    success: false,
                    message: 'Store not found or does not belong to this merchant'
                });
            }
            updateData.storeId = new mongoose_1.default.Types.ObjectId(updateData.storeId);
            updateData.scope = 'store';
        }
        else if (updateData.storeId === null && discount.storeId) {
            // Changing from store-level to merchant-level
            updateData.storeId = undefined;
            updateData.scope = 'merchant';
        }
        // Convert date strings to Date objects
        if (updateData.validFrom) {
            updateData.validFrom = new Date(updateData.validFrom);
        }
        if (updateData.validUntil) {
            updateData.validUntil = new Date(updateData.validUntil);
        }
        // Update discount
        Object.assign(discount, updateData);
        await discount.save();
        // Populate store info for response
        if (discount.storeId) {
            await discount.populate('storeId', 'name slug');
        }
        return res.json({
            success: true,
            data: discount,
            message: 'Discount updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating discount:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update discount',
            error: error.message
        });
    }
});
/**
 * @route   DELETE /api/merchant/discounts/:id
 * @desc    Delete discount permanently (hard delete)
 * @access  Private (Merchant)
 */
router.delete('/:id', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const discountId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find discount and verify ownership
        const discount = await Discount_1.default.findOne({
            _id: discountId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found or access denied'
            });
        }
        // Hard delete - permanently remove the discount from database
        await Discount_1.default.deleteOne({
            _id: discountId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        return res.json({
            success: true,
            message: 'Discount deleted successfully',
            data: {
                _id: discount._id
            }
        });
    }
    catch (error) {
        console.error('Error deleting discount:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete discount',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/discounts/:id/analytics
 * @desc    Get discount analytics
 * @access  Private (Merchant)
 */
router.get('/:id/analytics', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required()
})), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const discountId = req.params.id;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Find discount and verify ownership
        const discount = await Discount_1.default.findOne({
            _id: discountId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        }).lean();
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found or access denied'
            });
        }
        // Get usage statistics (if DiscountUsage model exists)
        // For now, return basic stats from discount document
        const analytics = {
            discount: {
                _id: discount._id,
                name: discount.name,
                type: discount.type,
                value: discount.value,
                scope: discount.scope,
                storeId: discount.storeId
            },
            usage: {
                totalUses: discount.usedCount || 0,
                usageLimit: discount.usageLimit || null,
                usageLimitPerUser: discount.usageLimitPerUser || 1,
                remainingUses: discount.usageLimit
                    ? Math.max(0, discount.usageLimit - (discount.usedCount || 0))
                    : null
            },
            validity: {
                validFrom: discount.validFrom,
                validUntil: discount.validUntil,
                isCurrentlyValid: new Date() >= discount.validFrom && new Date() <= discount.validUntil && discount.isActive
            },
            status: {
                isActive: discount.isActive,
                priority: discount.priority
            }
        };
        return res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching discount analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch discount analytics',
            error: error.message
        });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const StoreVoucher_1 = __importDefault(require("../models/StoreVoucher"));
const UserStoreVoucher_1 = __importDefault(require("../models/UserStoreVoucher"));
const Store_1 = require("../models/Store");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// All routes require merchant authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createVoucherSchema = joi_1.default.object({
    storeId: joi_1.default.string().required().messages({
        'string.empty': 'Store ID is required',
        'any.required': 'Store ID is required'
    }),
    code: joi_1.default.string().uppercase().trim().max(20).optional(),
    name: joi_1.default.string().required().trim().min(3).max(100).messages({
        'string.empty': 'Voucher name is required',
        'string.min': 'Voucher name must be at least 3 characters',
        'string.max': 'Voucher name must be less than 100 characters'
    }),
    description: joi_1.default.string().trim().max(500).optional().allow(''),
    type: joi_1.default.string().valid('store_visit', 'promotional').required().messages({
        'any.only': 'Type must be either store_visit or promotional'
    }),
    discountType: joi_1.default.string().valid('percentage', 'fixed').required().messages({
        'any.only': 'Discount type must be either percentage or fixed'
    }),
    discountValue: joi_1.default.number().positive().required().messages({
        'number.positive': 'Discount value must be greater than 0'
    }),
    minBillAmount: joi_1.default.number().min(0).default(0),
    maxDiscountAmount: joi_1.default.number().min(0).optional().allow(null),
    validFrom: joi_1.default.date().required().messages({
        'date.base': 'Valid from date is required'
    }),
    validUntil: joi_1.default.date().greater(joi_1.default.ref('validFrom')).required().messages({
        'date.greater': 'Valid until must be after valid from date',
        'date.base': 'Valid until date is required'
    }),
    usageLimit: joi_1.default.number().integer().min(1).default(100).messages({
        'number.min': 'Usage limit must be at least 1'
    }),
    usageLimitPerUser: joi_1.default.number().integer().min(1).default(1).optional(),
    restrictions: joi_1.default.object({
        isOfflineOnly: joi_1.default.boolean().default(false),
        notValidAboveStoreDiscount: joi_1.default.boolean().default(false),
        singleVoucherPerBill: joi_1.default.boolean().default(true)
    }).optional(),
    isActive: joi_1.default.boolean().default(true),
    metadata: joi_1.default.object({
        displayText: joi_1.default.string().trim().max(50).optional(),
        badgeText: joi_1.default.string().trim().max(20).optional(),
        backgroundColor: joi_1.default.string().trim().optional()
    }).optional()
}).custom((value, helpers) => {
    // Validate percentage doesn't exceed 100
    if (value.discountType === 'percentage' && value.discountValue > 100) {
        return helpers.error('any.custom', { message: 'Percentage discount cannot exceed 100%' });
    }
    return value;
});
const updateVoucherSchema = createVoucherSchema.fork(['storeId', 'name', 'type', 'discountType', 'discountValue', 'validFrom', 'validUntil'], (schema) => schema.optional());
const voucherIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
const storeIdParamSchema = joi_1.default.object({
    storeId: joi_1.default.string().required()
});
const listVouchersQuerySchema = joi_1.default.object({
    storeId: joi_1.default.string().optional(),
    isActive: joi_1.default.boolean().optional(),
    type: joi_1.default.string().valid('store_visit', 'promotional').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(50).default(20)
});
/**
 * @route   GET /api/merchant/store-vouchers
 * @desc    Get all vouchers for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', (0, merchantvalidation_1.validateQuery)(listVouchersQuerySchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { storeId, isActive, type, page = 1, limit = 20 } = req.query;
        // Get all stores for this merchant
        const merchantStores = await Store_1.Store.find({ merchantId }).select('_id name');
        const storeIds = merchantStores.map(store => store._id);
        if (storeIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    vouchers: [],
                    pagination: {
                        page: 1,
                        limit: Number(limit),
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrevious: false
                    }
                }
            });
        }
        // Build query
        const query = {
            store: storeId ? new mongoose_1.default.Types.ObjectId(storeId) : { $in: storeIds }
        };
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        if (type) {
            query.type = type;
        }
        // Execute query with pagination
        const skip = (Number(page) - 1) * Number(limit);
        const [vouchers, total] = await Promise.all([
            StoreVoucher_1.default.find(query)
                .populate('store', 'name logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            StoreVoucher_1.default.countDocuments(query)
        ]);
        // Get claimed counts for each voucher
        const voucherIds = vouchers.map(v => v._id);
        const claimedCounts = await UserStoreVoucher_1.default.aggregate([
            { $match: { voucher: { $in: voucherIds } } },
            { $group: { _id: '$voucher', claimedCount: { $sum: 1 } } }
        ]);
        const claimedCountMap = new Map(claimedCounts.map(c => [c._id.toString(), c.claimedCount]));
        // Add claimed count to each voucher
        const vouchersWithClaimed = vouchers.map(voucher => ({
            ...voucher,
            claimedCount: claimedCountMap.get(voucher._id.toString()) || 0
        }));
        const totalPages = Math.ceil(total / Number(limit));
        res.json({
            success: true,
            data: {
                vouchers: vouchersWithClaimed,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                    hasNext: Number(page) < totalPages,
                    hasPrevious: Number(page) > 1
                }
            }
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error fetching vouchers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vouchers',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/store-vouchers/stats/:storeId
 * @desc    Get voucher statistics for a store
 * @access  Private (Merchant)
 */
router.get('/stats/:storeId', (0, merchantvalidation_1.validateParams)(storeIdParamSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { storeId } = req.params;
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        const now = new Date();
        // Get voucher stats
        const [totalVouchers, activeVouchers, voucherStats] = await Promise.all([
            StoreVoucher_1.default.countDocuments({ store: storeId }),
            StoreVoucher_1.default.countDocuments({
                store: storeId,
                isActive: true,
                validFrom: { $lte: now },
                validUntil: { $gte: now }
            }),
            StoreVoucher_1.default.aggregate([
                { $match: { store: new mongoose_1.default.Types.ObjectId(storeId) } },
                {
                    $group: {
                        _id: null,
                        totalUsed: { $sum: '$usedCount' }
                    }
                }
            ])
        ]);
        // Get claimed count from UserStoreVoucher
        const voucherIds = await StoreVoucher_1.default.find({ store: storeId }).select('_id');
        const totalClaimed = await UserStoreVoucher_1.default.countDocuments({
            voucher: { $in: voucherIds.map(v => v._id) }
        });
        const totalRedeemed = voucherStats[0]?.totalUsed || 0;
        const redemptionRate = totalClaimed > 0
            ? Math.round((totalRedeemed / totalClaimed) * 100)
            : 0;
        res.json({
            success: true,
            data: {
                totalVouchers,
                activeVouchers,
                totalClaimed,
                totalRedeemed,
                redemptionRate
            }
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voucher statistics',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/store-vouchers/:id
 * @desc    Get single voucher by ID
 * @access  Private (Merchant)
 */
router.get('/:id', (0, merchantvalidation_1.validateParams)(voucherIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id } = req.params;
        // Get merchant's stores
        const merchantStores = await Store_1.Store.find({ merchantId }).select('_id');
        const storeIds = merchantStores.map(store => store._id);
        const voucher = await StoreVoucher_1.default.findOne({
            _id: id,
            store: { $in: storeIds }
        }).populate('store', 'name logo');
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }
        // Get claimed count
        const claimedCount = await UserStoreVoucher_1.default.countDocuments({ voucher: voucher._id });
        res.json({
            success: true,
            data: {
                ...voucher.toObject(),
                claimedCount
            }
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error fetching voucher:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voucher',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/store-vouchers
 * @desc    Create a new store voucher
 * @access  Private (Merchant)
 */
router.post('/', (0, merchantvalidation_1.validateRequest)(createVoucherSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const voucherData = req.body;
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({
            _id: voucherData.storeId,
            merchantId
        });
        if (!store) {
            return res.status(400).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        // Generate unique code if not provided
        let code = voucherData.code;
        if (!code) {
            const prefix = voucherData.type === 'store_visit' ? 'VISIT' : 'PROMO';
            code = await StoreVoucher_1.default.generateUniqueCode(prefix);
        }
        else {
            // Check if code already exists
            const existingVoucher = await StoreVoucher_1.default.findOne({ code: code.toUpperCase() });
            if (existingVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code already exists'
                });
            }
        }
        // Create voucher
        const voucher = new StoreVoucher_1.default({
            ...voucherData,
            code: code.toUpperCase(),
            store: voucherData.storeId,
            createdBy: merchantId,
            restrictions: {
                isOfflineOnly: voucherData.restrictions?.isOfflineOnly ?? false,
                notValidAboveStoreDiscount: voucherData.restrictions?.notValidAboveStoreDiscount ?? false,
                singleVoucherPerBill: voucherData.restrictions?.singleVoucherPerBill ?? true
            },
            metadata: {
                displayText: voucherData.metadata?.displayText ||
                    (voucherData.discountType === 'percentage'
                        ? `Save ${voucherData.discountValue}%`
                        : `Save ₹${voucherData.discountValue}`),
                badgeText: voucherData.metadata?.badgeText,
                backgroundColor: voucherData.metadata?.backgroundColor
            }
        });
        await voucher.save();
        // Populate store for response
        await voucher.populate('store', 'name logo');
        res.status(201).json({
            success: true,
            message: 'Voucher created successfully',
            data: voucher
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error creating voucher:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Voucher code already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create voucher',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/store-vouchers/:id
 * @desc    Update an existing voucher
 * @access  Private (Merchant)
 */
router.put('/:id', (0, merchantvalidation_1.validateParams)(voucherIdSchema), (0, merchantvalidation_1.validateRequest)(updateVoucherSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id } = req.params;
        const updateData = req.body;
        // Get merchant's stores
        const merchantStores = await Store_1.Store.find({ merchantId }).select('_id');
        const storeIds = merchantStores.map(store => store._id);
        // Find voucher
        const voucher = await StoreVoucher_1.default.findOne({
            _id: id,
            store: { $in: storeIds }
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }
        // If storeId is being changed, verify new store belongs to merchant
        if (updateData.storeId && updateData.storeId !== voucher.store.toString()) {
            const newStore = await Store_1.Store.findOne({
                _id: updateData.storeId,
                merchantId
            });
            if (!newStore) {
                return res.status(400).json({
                    success: false,
                    message: 'New store not found or does not belong to this merchant'
                });
            }
            updateData.store = updateData.storeId;
        }
        // Don't allow changing code
        delete updateData.code;
        delete updateData.storeId;
        // Update restrictions properly
        if (updateData.restrictions) {
            updateData.restrictions = {
                ...voucher.restrictions,
                ...updateData.restrictions
            };
        }
        // Update metadata properly
        if (updateData.metadata) {
            updateData.metadata = {
                ...voucher.metadata,
                ...updateData.metadata
            };
        }
        // Update voucher
        Object.assign(voucher, updateData);
        await voucher.save();
        // Populate store for response
        await voucher.populate('store', 'name logo');
        // Get claimed count
        const claimedCount = await UserStoreVoucher_1.default.countDocuments({ voucher: voucher._id });
        res.json({
            success: true,
            message: 'Voucher updated successfully',
            data: {
                ...voucher.toObject(),
                claimedCount
            }
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error updating voucher:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update voucher',
            error: error.message
        });
    }
});
/**
 * @route   DELETE /api/merchant/store-vouchers/:id
 * @desc    Delete a voucher
 * @access  Private (Merchant)
 */
router.delete('/:id', (0, merchantvalidation_1.validateParams)(voucherIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id } = req.params;
        // Get merchant's stores
        const merchantStores = await Store_1.Store.find({ merchantId }).select('_id');
        const storeIds = merchantStores.map(store => store._id);
        // Find and delete voucher
        const voucher = await StoreVoucher_1.default.findOneAndDelete({
            _id: id,
            store: { $in: storeIds }
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }
        // Also delete all user voucher assignments for this voucher
        await UserStoreVoucher_1.default.deleteMany({ voucher: id });
        res.json({
            success: true,
            message: 'Voucher deleted successfully'
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error deleting voucher:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete voucher',
            error: error.message
        });
    }
});
/**
 * @route   PATCH /api/merchant/store-vouchers/:id/toggle-active
 * @desc    Toggle voucher active status
 * @access  Private (Merchant)
 */
router.patch('/:id/toggle-active', (0, merchantvalidation_1.validateParams)(voucherIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id } = req.params;
        // Get merchant's stores
        const merchantStores = await Store_1.Store.find({ merchantId }).select('_id');
        const storeIds = merchantStores.map(store => store._id);
        // Find voucher
        const voucher = await StoreVoucher_1.default.findOne({
            _id: id,
            store: { $in: storeIds }
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Voucher not found'
            });
        }
        // Toggle active status
        voucher.isActive = !voucher.isActive;
        await voucher.save();
        res.json({
            success: true,
            message: `Voucher ${voucher.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                _id: voucher._id,
                isActive: voucher.isActive
            }
        });
    }
    catch (error) {
        console.error('[MERCHANT STORE VOUCHERS] Error toggling voucher status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle voucher status',
            error: error.message
        });
    }
});
exports.default = router;

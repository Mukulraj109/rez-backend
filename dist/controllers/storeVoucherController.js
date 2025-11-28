"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeClaimedVoucher = exports.getMyStoreVoucherById = exports.getMyStoreVouchers = exports.validateStoreVoucher = exports.redeemStoreVoucher = exports.claimStoreVoucher = exports.getStoreVoucherById = exports.getStoreVouchers = void 0;
const StoreVoucher_1 = __importDefault(require("../models/StoreVoucher"));
const UserStoreVoucher_1 = __importDefault(require("../models/UserStoreVoucher"));
const response_1 = require("../utils/response");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * GET /api/store-vouchers/store/:storeId
 * Get available store vouchers for a specific store
 */
const getStoreVouchers = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user?.id;
        const storeObjId = new mongoose_1.default.Types.ObjectId(storeId);
        const userObjId = userId ? new mongoose_1.default.Types.ObjectId(userId) : undefined;
        const now = new Date();
        const filter = {
            store: storeObjId,
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            $expr: { $lt: ['$usedCount', '$usageLimit'] }
        };
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [vouchers, total] = await Promise.all([
            StoreVoucher_1.default.find(filter)
                .sort({ discountValue: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            StoreVoucher_1.default.countDocuments(filter),
        ]);
        // If user is authenticated, check which vouchers they can use
        if (userObjId) {
            const vouchersWithEligibility = [];
            for (const voucher of vouchers) {
                const voucherDoc = await StoreVoucher_1.default.findById(voucher._id);
                if (voucherDoc) {
                    const canRedeem = await voucherDoc.canUserRedeem(userObjId);
                    // Check if user already has this voucher assigned
                    const userVoucher = await UserStoreVoucher_1.default.findOne({
                        user: userObjId,
                        voucher: voucher._id,
                    });
                    vouchersWithEligibility.push({
                        ...voucher,
                        canRedeem: canRedeem.can,
                        redeemReason: canRedeem.reason,
                        isAssigned: !!userVoucher,
                        userVoucherStatus: userVoucher?.status,
                    });
                }
            }
            return (0, response_1.sendPaginated)(res, vouchersWithEligibility, pageNum, limitNum, total, 'Store vouchers fetched successfully');
        }
        (0, response_1.sendPaginated)(res, vouchers, pageNum, limitNum, total, 'Store vouchers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching store vouchers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch store vouchers', 500);
    }
};
exports.getStoreVouchers = getStoreVouchers;
/**
 * GET /api/store-vouchers/:id
 * Get single store voucher by ID
 */
const getStoreVoucherById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const voucher = await StoreVoucher_1.default.findById(id)
            .populate('store', 'name logo location contact')
            .lean();
        if (!voucher) {
            return (0, response_1.sendError)(res, 'Store voucher not found', 404);
        }
        // If user is authenticated, check eligibility
        if (userId) {
            const userObjId = new mongoose_1.default.Types.ObjectId(userId);
            const voucherDoc = await StoreVoucher_1.default.findById(id);
            if (voucherDoc) {
                const canRedeem = await voucherDoc.canUserRedeem(userObjId);
                const userVoucher = await UserStoreVoucher_1.default.findOne({
                    user: userObjId,
                    voucher: id,
                });
                return (0, response_1.sendSuccess)(res, {
                    ...voucher,
                    canRedeem: canRedeem.can,
                    redeemReason: canRedeem.reason,
                    isAssigned: !!userVoucher,
                    userVoucherStatus: userVoucher?.status,
                }, 'Store voucher fetched successfully');
            }
        }
        (0, response_1.sendSuccess)(res, voucher, 'Store voucher fetched successfully');
    }
    catch (error) {
        console.error('Error fetching store voucher:', error);
        (0, response_1.sendError)(res, 'Failed to fetch store voucher', 500);
    }
};
exports.getStoreVoucherById = getStoreVoucherById;
/**
 * POST /api/store-vouchers/:id/claim
 * Claim a store voucher (assign to user) - authenticated users only
 */
const claimStoreVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Find voucher
        const voucher = await StoreVoucher_1.default.findById(id);
        if (!voucher) {
            return (0, response_1.sendError)(res, 'Store voucher not found', 404);
        }
        // Check if user can redeem
        const userObjId = new mongoose_1.default.Types.ObjectId(userId);
        const canRedeem = await voucher.canUserRedeem(userObjId);
        if (!canRedeem.can) {
            return (0, response_1.sendError)(res, canRedeem.reason || 'Cannot claim this voucher', 400);
        }
        // Check if user already has this voucher
        const existingUserVoucher = await UserStoreVoucher_1.default.findOne({
            user: userId,
            voucher: id,
        });
        if (existingUserVoucher) {
            return (0, response_1.sendError)(res, 'You have already claimed this voucher', 400);
        }
        // Create user voucher assignment
        const userVoucher = new UserStoreVoucher_1.default({
            user: userId,
            voucher: id,
            status: 'assigned',
        });
        await userVoucher.save();
        // Populate voucher details
        await userVoucher.populate('voucher', 'code name discountType discountValue minBillAmount validUntil');
        (0, response_1.sendSuccess)(res, userVoucher, 'Voucher claimed successfully', 201);
    }
    catch (error) {
        console.error('Error claiming store voucher:', error);
        // Handle duplicate key error
        if (error.code === 11000) {
            return (0, response_1.sendError)(res, 'You have already claimed this voucher', 400);
        }
        (0, response_1.sendError)(res, 'Failed to claim voucher', 500);
    }
};
exports.claimStoreVoucher = claimStoreVoucher;
/**
 * POST /api/store-vouchers/:id/redeem
 * Redeem a store voucher (mark as used) - authenticated users only
 */
const redeemStoreVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { orderId, billAmount } = req.body;
        if (!orderId || !billAmount) {
            return (0, response_1.sendError)(res, 'Order ID and bill amount are required', 400);
        }
        // Find user's voucher
        const userVoucher = await UserStoreVoucher_1.default.findOne({
            _id: id,
            user: userId,
        }).populate('voucher');
        if (!userVoucher) {
            return (0, response_1.sendError)(res, 'Voucher not found or not assigned to you', 404);
        }
        if (userVoucher.status !== 'assigned') {
            return (0, response_1.sendError)(res, 'This voucher has already been used or expired', 400);
        }
        const voucher = await StoreVoucher_1.default.findById(userVoucher.voucher);
        if (!voucher) {
            return (0, response_1.sendError)(res, 'Voucher details not found', 404);
        }
        // Check if bill amount meets minimum requirement
        if (billAmount < voucher.minBillAmount) {
            return (0, response_1.sendError)(res, `Minimum bill amount of ₹${voucher.minBillAmount} required`, 400);
        }
        // Calculate discount amount
        const discountAmount = voucher.calculateDiscount(billAmount);
        if (discountAmount === 0) {
            return (0, response_1.sendError)(res, 'Discount cannot be applied', 400);
        }
        // Mark user voucher as used
        userVoucher.status = 'used';
        userVoucher.usedAt = new Date();
        userVoucher.order = new mongoose_1.default.Types.ObjectId(orderId);
        await userVoucher.save();
        // Increment voucher usage count
        voucher.usedCount += 1;
        await voucher.save();
        (0, response_1.sendSuccess)(res, {
            discountAmount,
            finalAmount: billAmount - discountAmount,
            voucher: {
                code: voucher.code,
                name: voucher.name,
                discountType: voucher.discountType,
                discountValue: voucher.discountValue,
            },
        }, 'Voucher redeemed successfully');
    }
    catch (error) {
        console.error('Error redeeming store voucher:', error);
        (0, response_1.sendError)(res, 'Failed to redeem voucher', 500);
    }
};
exports.redeemStoreVoucher = redeemStoreVoucher;
/**
 * POST /api/store-vouchers/validate
 * Validate a store voucher code
 */
const validateStoreVoucher = async (req, res) => {
    try {
        const { code, storeId, billAmount } = req.body;
        const userId = req.user?.id;
        if (!code || !storeId || !billAmount) {
            return (0, response_1.sendError)(res, 'Code, store ID, and bill amount are required', 400);
        }
        // Find voucher
        const voucher = await StoreVoucher_1.default.findOne({
            code: code.toUpperCase(),
            store: storeId,
            isActive: true,
        });
        if (!voucher) {
            return (0, response_1.sendError)(res, 'Invalid voucher code', 404);
        }
        // Check if currently valid
        const now = new Date();
        if (voucher.validFrom > now) {
            return (0, response_1.sendError)(res, 'This voucher is not yet valid', 400);
        }
        if (voucher.validUntil < now) {
            return (0, response_1.sendError)(res, 'This voucher has expired', 400);
        }
        // Check usage limit
        if (voucher.usedCount >= voucher.usageLimit) {
            return (0, response_1.sendError)(res, 'This voucher has reached its usage limit', 400);
        }
        // Check minimum bill amount
        if (billAmount < voucher.minBillAmount) {
            return (0, response_1.sendError)(res, `Minimum bill amount of ₹${voucher.minBillAmount} required`, 400);
        }
        // Check user-specific restrictions if authenticated
        if (userId) {
            const userObjId = new mongoose_1.default.Types.ObjectId(userId);
            const canRedeem = await voucher.canUserRedeem(userObjId);
            if (!canRedeem.can) {
                return (0, response_1.sendError)(res, canRedeem.reason || 'You cannot use this voucher', 400);
            }
        }
        // Calculate discount amount
        const discountAmount = voucher.calculateDiscount(billAmount);
        (0, response_1.sendSuccess)(res, {
            valid: true,
            voucher: {
                _id: voucher._id,
                code: voucher.code,
                name: voucher.name,
                discountType: voucher.discountType,
                discountValue: voucher.discountValue,
                minBillAmount: voucher.minBillAmount,
                restrictions: voucher.restrictions,
            },
            discountAmount,
            finalAmount: billAmount - discountAmount,
        }, 'Voucher is valid');
    }
    catch (error) {
        console.error('Error validating store voucher:', error);
        (0, response_1.sendError)(res, 'Failed to validate voucher', 500);
    }
};
exports.validateStoreVoucher = validateStoreVoucher;
/**
 * GET /api/store-vouchers/my-vouchers
 * Get user's claimed store vouchers (authenticated users only)
 */
const getMyStoreVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const filter = { user: userId };
        if (status) {
            filter.status = status;
        }
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [vouchers, total] = await Promise.all([
            UserStoreVoucher_1.default.find(filter)
                .populate({
                path: 'voucher',
                select: 'code name discountType discountValue minBillAmount validUntil restrictions metadata store',
                populate: {
                    path: 'store',
                    select: 'name logo'
                }
            })
                .populate('order', 'orderNumber status')
                .sort({ assignedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            UserStoreVoucher_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, vouchers, pageNum, limitNum, total, 'My vouchers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching my store vouchers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch vouchers', 500);
    }
};
exports.getMyStoreVouchers = getMyStoreVouchers;
/**
 * GET /api/store-vouchers/my-vouchers/:id
 * Get single user voucher details (authenticated users only)
 */
const getMyStoreVoucherById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const voucher = await UserStoreVoucher_1.default.findOne({
            _id: id,
            user: userId,
        })
            .populate({
            path: 'voucher',
            populate: {
                path: 'store',
                select: 'name logo location contact'
            }
        })
            .populate('order', 'orderNumber status totalAmount')
            .lean();
        if (!voucher) {
            return (0, response_1.sendError)(res, 'Voucher not found', 404);
        }
        (0, response_1.sendSuccess)(res, voucher, 'Voucher details fetched successfully');
    }
    catch (error) {
        console.error('Error fetching voucher details:', error);
        (0, response_1.sendError)(res, 'Failed to fetch voucher details', 500);
    }
};
exports.getMyStoreVoucherById = getMyStoreVoucherById;
/**
 * DELETE /api/store-vouchers/my-vouchers/:id
 * Remove a claimed voucher (only if not used) - authenticated users only
 */
const removeClaimedVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const userVoucher = await UserStoreVoucher_1.default.findOne({
            _id: id,
            user: userId,
        });
        if (!userVoucher) {
            return (0, response_1.sendError)(res, 'Voucher not found', 404);
        }
        if (userVoucher.status === 'used') {
            return (0, response_1.sendError)(res, 'Cannot remove used vouchers', 400);
        }
        await userVoucher.deleteOne();
        (0, response_1.sendSuccess)(res, { success: true }, 'Voucher removed successfully');
    }
    catch (error) {
        console.error('Error removing voucher:', error);
        (0, response_1.sendError)(res, 'Failed to remove voucher', 500);
    }
};
exports.removeClaimedVoucher = removeClaimedVoucher;

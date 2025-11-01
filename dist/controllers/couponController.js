"use strict";
// Coupon Controller
// Handles coupon-related API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCouponDetails = exports.searchCoupons = exports.removeCoupon = exports.getBestOffer = exports.validateCoupon = exports.claimCoupon = exports.getMyCoupons = exports.getFeaturedCoupons = exports.getAvailableCoupons = void 0;
const mongoose_1 = require("mongoose");
const Coupon_1 = require("../models/Coupon");
const UserCoupon_1 = require("../models/UserCoupon");
const couponService_1 = __importDefault(require("../services/couponService"));
/**
 * Get all available coupons (public)
 * GET /api/user/coupons
 */
const getAvailableCoupons = async (req, res) => {
    try {
        const { category, tag, featured } = req.query;
        const filters = {};
        if (category) {
            filters['applicableTo.categories'] = category;
        }
        if (tag) {
            filters.tags = tag;
        }
        if (featured === 'true') {
            filters.isFeatured = true;
        }
        const coupons = await Coupon_1.Coupon.getActiveCoupons(filters);
        res.status(200).json({
            success: true,
            data: {
                coupons,
                total: coupons.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error getting coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get coupons',
            error: error.message,
        });
    }
};
exports.getAvailableCoupons = getAvailableCoupons;
/**
 * Get featured/trending coupons
 * GET /api/user/coupons/featured
 */
const getFeaturedCoupons = async (req, res) => {
    try {
        const coupons = await Coupon_1.Coupon.getActiveCoupons({ isFeatured: true });
        res.status(200).json({
            success: true,
            data: {
                coupons,
                total: coupons.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error getting featured coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get featured coupons',
            error: error.message,
        });
    }
};
exports.getFeaturedCoupons = getFeaturedCoupons;
/**
 * Get user's claimed coupons
 * GET /api/user/coupons/my-coupons
 */
const getMyCoupons = async (req, res) => {
    try {
        const userId = req.userId;
        const { status } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filters = { user: new mongoose_1.Types.ObjectId(userId) };
        if (status) {
            filters.status = status;
        }
        const userCoupons = await UserCoupon_1.UserCoupon.find(filters)
            .populate('coupon')
            .sort({ status: 1, expiryDate: 1 })
            .lean();
        // Categorize coupons
        const available = userCoupons.filter(uc => uc.status === 'available');
        const used = userCoupons.filter(uc => uc.status === 'used');
        const expired = userCoupons.filter(uc => uc.status === 'expired');
        res.status(200).json({
            success: true,
            data: {
                coupons: userCoupons,
                summary: {
                    total: userCoupons.length,
                    available: available.length,
                    used: used.length,
                    expired: expired.length,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error getting user coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your coupons',
            error: error.message,
        });
    }
};
exports.getMyCoupons = getMyCoupons;
/**
 * Claim a coupon
 * POST /api/user/coupons/:id/claim
 */
const claimCoupon = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const result = await couponService_1.default.claimCoupon(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(id));
        if (!result.success) {
            res.status(400).json({
                success: false,
                message: result.message,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.userCoupon,
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error claiming coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to claim coupon',
            error: error.message,
        });
    }
};
exports.claimCoupon = claimCoupon;
/**
 * Validate coupon for cart
 * POST /api/user/coupons/validate
 * Body: { couponCode: string, cartData: CartData }
 */
const validateCoupon = async (req, res) => {
    try {
        const userId = req.userId;
        const { couponCode, cartData } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!couponCode || !cartData) {
            res.status(400).json({
                success: false,
                message: 'Coupon code and cart data are required',
            });
            return;
        }
        // Add userId to cartData
        const fullCartData = {
            ...cartData,
            userId: new mongoose_1.Types.ObjectId(userId),
        };
        const validation = await couponService_1.default.validateCoupon(couponCode, fullCartData);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: validation.message,
                error: validation.error,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: validation.message,
            data: {
                discount: validation.discount,
                coupon: {
                    code: validation.coupon.couponCode,
                    type: validation.coupon.discountType,
                    value: validation.coupon.discountValue,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error validating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon',
            error: error.message,
        });
    }
};
exports.validateCoupon = validateCoupon;
/**
 * Get best coupon for cart
 * POST /api/user/coupons/best-offer
 * Body: { cartData: CartData }
 */
const getBestOffer = async (req, res) => {
    try {
        const userId = req.userId;
        const { cartData } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!cartData) {
            res.status(400).json({
                success: false,
                message: 'Cart data is required',
            });
            return;
        }
        // Add userId to cartData
        const fullCartData = {
            ...cartData,
            userId: new mongoose_1.Types.ObjectId(userId),
        };
        const bestCoupon = await couponService_1.default.getBestCouponForCart(fullCartData);
        if (!bestCoupon) {
            res.status(200).json({
                success: true,
                message: 'No applicable coupons found',
                data: null,
            });
            return;
        }
        // Calculate discount
        const validation = await couponService_1.default.validateCoupon(bestCoupon.couponCode, fullCartData);
        res.status(200).json({
            success: true,
            message: 'Best coupon found',
            data: {
                coupon: bestCoupon,
                discount: validation.discount,
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error getting best offer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get best offer',
            error: error.message,
        });
    }
};
exports.getBestOffer = getBestOffer;
/**
 * Remove claimed coupon (only if not used)
 * DELETE /api/user/coupons/:id
 */
const removeCoupon = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const userCoupon = await UserCoupon_1.UserCoupon.findOne({
            _id: id,
            user: userId,
        });
        if (!userCoupon) {
            res.status(404).json({
                success: false,
                message: 'Coupon not found',
            });
            return;
        }
        if (userCoupon.status === 'used') {
            res.status(400).json({
                success: false,
                message: 'Cannot remove used coupon',
            });
            return;
        }
        await UserCoupon_1.UserCoupon.deleteOne({ _id: id });
        res.status(200).json({
            success: true,
            message: 'Coupon removed successfully',
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error removing coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon',
            error: error.message,
        });
    }
};
exports.removeCoupon = removeCoupon;
/**
 * Search coupons
 * GET /api/user/coupons/search?q=query
 */
const searchCoupons = async (req, res) => {
    try {
        const { q, category, tag } = req.query;
        if (!q) {
            res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
            return;
        }
        const filters = {};
        if (category) {
            filters['applicableTo.categories'] = category;
        }
        if (tag) {
            filters.tags = tag;
        }
        const coupons = await couponService_1.default.searchCoupons(q, filters);
        res.status(200).json({
            success: true,
            data: {
                coupons,
                total: coupons.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error searching coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search coupons',
            error: error.message,
        });
    }
};
exports.searchCoupons = searchCoupons;
/**
 * Get coupon details
 * GET /api/user/coupons/:id
 */
const getCouponDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.Coupon.findById(id);
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: 'Coupon not found',
            });
            return;
        }
        // Increment view count
        await coupon.incrementViewCount();
        res.status(200).json({
            success: true,
            data: coupon,
        });
    }
    catch (error) {
        console.error('❌ [COUPON CONTROLLER] Error getting coupon details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get coupon details',
            error: error.message,
        });
    }
};
exports.getCouponDetails = getCouponDetails;

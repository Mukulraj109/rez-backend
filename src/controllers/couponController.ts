// Coupon Controller
// Handles coupon-related API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Coupon } from '../models/Coupon';
import { UserCoupon } from '../models/UserCoupon';
import couponService from '../services/couponService';

/**
 * Get all available coupons (public)
 * GET /api/user/coupons
 */
export const getAvailableCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, tag, featured } = req.query;

    const filters: any = {};

    if (category) {
      filters['applicableTo.categories'] = category;
    }

    if (tag) {
      filters.tags = tag;
    }

    if (featured === 'true') {
      filters.isFeatured = true;
    }

    const coupons = await (Coupon as any).getActiveCoupons(filters);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        total: coupons.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error getting coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get coupons',
      error: error.message,
    });
  }
};

/**
 * Get featured/trending coupons
 * GET /api/user/coupons/featured
 */
export const getFeaturedCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await (Coupon as any).getActiveCoupons({ isFeatured: true });

    res.status(200).json({
      success: true,
      data: {
        coupons,
        total: coupons.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error getting featured coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured coupons',
      error: error.message,
    });
  }
};

/**
 * Get user's claimed coupons
 * GET /api/user/coupons/my-coupons
 */
export const getMyCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = { user: new Types.ObjectId(userId) };

    if (status) {
      filters.status = status;
    }

    const userCoupons = await UserCoupon.find(filters)
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
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error getting user coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your coupons',
      error: error.message,
    });
  }
};

/**
 * Claim a coupon
 * POST /api/user/coupons/:id/claim
 */
export const claimCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const result = await couponService.claimCoupon(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

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
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error claiming coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim coupon',
      error: error.message,
    });
  }
};

/**
 * Validate coupon for cart
 * POST /api/user/coupons/validate
 * Body: { couponCode: string, cartData: CartData }
 */
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
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
      userId: new Types.ObjectId(userId),
    };

    const validation = await couponService.validateCoupon(couponCode, fullCartData);

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
          code: validation.coupon!.couponCode,
          type: validation.coupon!.discountType,
          value: validation.coupon!.discountValue,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error validating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error: error.message,
    });
  }
};

/**
 * Get best coupon for cart
 * POST /api/user/coupons/best-offer
 * Body: { cartData: CartData }
 */
export const getBestOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
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
      userId: new Types.ObjectId(userId),
    };

    const bestCoupon = await couponService.getBestCouponForCart(fullCartData);

    if (!bestCoupon) {
      res.status(200).json({
        success: true,
        message: 'No applicable coupons found',
        data: null,
      });
      return;
    }

    // Calculate discount
    const validation = await couponService.validateCoupon(bestCoupon.couponCode, fullCartData);

    res.status(200).json({
      success: true,
      message: 'Best coupon found',
      data: {
        coupon: bestCoupon,
        discount: validation.discount,
      },
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error getting best offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get best offer',
      error: error.message,
    });
  }
};

/**
 * Remove claimed coupon (only if not used)
 * DELETE /api/user/coupons/:id
 */
export const removeCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const userCoupon = await UserCoupon.findOne({
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

    await UserCoupon.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error removing coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon',
      error: error.message,
    });
  }
};

/**
 * Search coupons
 * GET /api/user/coupons/search?q=query
 */
export const searchCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, tag } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    const filters: any = {};

    if (category) {
      filters['applicableTo.categories'] = category;
    }

    if (tag) {
      filters.tags = tag;
    }

    const coupons = await couponService.searchCoupons(q as string, filters);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        total: coupons.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error searching coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search coupons',
      error: error.message,
    });
  }
};

/**
 * Get coupon details
 * GET /api/user/coupons/:id
 */
export const getCouponDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
      return;
    }

    // Increment view count
    await (coupon as any).incrementViewCount();

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error: any) {
    console.error('❌ [COUPON CONTROLLER] Error getting coupon details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get coupon details',
      error: error.message,
    });
  }
};

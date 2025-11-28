import { Request, Response } from 'express';
import HeroBanner from '../models/HeroBanner';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/hero-banners
 * Get active hero banners
 */
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const { page = 'offers', position = 'top', limit = 5 } = req.query;

    const banners = await HeroBanner.findActiveBanners(page as string, position as string);
    const limitedBanners = banners.slice(0, Number(limit));

    sendSuccess(res, limitedBanners, 'Active hero banners fetched successfully');
  } catch (error) {
    console.error('Error fetching active hero banners:', error);
    sendError(res, 'Failed to fetch hero banners', 500);
  }
};

/**
 * GET /api/hero-banners/user
 * Get banners for specific user (with targeting)
 */
export const getBannersForUser = async (req: Request, res: Response) => {
  try {
    const { page = 'offers', limit = 5 } = req.query;
    
    const userData = req.user ? {
      userType: req.user.userType,
      age: req.user.age,
      location: req.user.location,
      interests: req.user.interests
    } : undefined;

    const banners = await HeroBanner.findBannersForUser(userData, page as string);
    const limitedBanners = banners.slice(0, Number(limit));

    sendSuccess(res, limitedBanners, 'User-targeted hero banners fetched successfully');
  } catch (error) {
    console.error('Error fetching user-targeted hero banners:', error);
    sendError(res, 'Failed to fetch hero banners', 500);
  }
};

/**
 * GET /api/hero-banners/:id
 * Get single banner by ID
 */
export const getHeroBannerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Check if banner is currently active
    const isActive = banner.isCurrentlyActive();

    const bannerData = {
      ...banner.toObject(),
      isCurrentlyActive: isActive
    };

    sendSuccess(res, bannerData, 'Hero banner fetched successfully');
  } catch (error) {
    console.error('Error fetching hero banner by ID:', error);
    sendError(res, 'Failed to fetch hero banner', 500);
  }
};

/**
 * POST /api/hero-banners/:id/view
 * Track banner view (analytics)
 */
export const trackBannerView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { source, device, location } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment view count
    await banner.incrementView();

    // Track additional analytics if needed
    // This could be extended to store detailed view analytics

    sendSuccess(res, { success: true }, 'Banner view tracked');
  } catch (error) {
    console.error('Error tracking banner view:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/hero-banners/:id/click
 * Track banner click (analytics)
 */
export const trackBannerClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { source, device, location } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment click count
    await banner.incrementClick();

    // Track additional analytics if needed
    // This could be extended to store detailed click analytics

    sendSuccess(res, { success: true }, 'Banner click tracked');
  } catch (error) {
    console.error('Error tracking banner click:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/hero-banners/:id/conversion
 * Track banner conversion (analytics)
 */
export const trackBannerConversion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { conversionType, value, source, device } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment conversion count
    await banner.incrementConversion();

    // Track additional conversion analytics if needed
    // This could be extended to store detailed conversion analytics

    sendSuccess(res, { success: true }, 'Banner conversion tracked');
  } catch (error) {
    console.error('Error tracking banner conversion:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

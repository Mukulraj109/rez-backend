"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackBannerConversion = exports.trackBannerClick = exports.trackBannerView = exports.getHeroBannerById = exports.getBannersForUser = exports.getActiveBanners = void 0;
const HeroBanner_1 = __importDefault(require("../models/HeroBanner"));
const response_1 = require("../utils/response");
/**
 * GET /api/hero-banners
 * Get active hero banners
 */
const getActiveBanners = async (req, res) => {
    try {
        const { page = 'offers', position = 'top', limit = 5 } = req.query;
        const banners = await HeroBanner_1.default.findActiveBanners(page, position);
        const limitedBanners = banners.slice(0, Number(limit));
        (0, response_1.sendSuccess)(res, limitedBanners, 'Active hero banners fetched successfully');
    }
    catch (error) {
        console.error('Error fetching active hero banners:', error);
        (0, response_1.sendError)(res, 'Failed to fetch hero banners', 500);
    }
};
exports.getActiveBanners = getActiveBanners;
/**
 * GET /api/hero-banners/user
 * Get banners for specific user (with targeting)
 */
const getBannersForUser = async (req, res) => {
    try {
        const { page = 'offers', limit = 5 } = req.query;
        const userData = req.user ? {
            userType: req.user.userType,
            age: req.user.age,
            location: req.user.location,
            interests: req.user.interests
        } : undefined;
        const banners = await HeroBanner_1.default.findBannersForUser(userData, page);
        const limitedBanners = banners.slice(0, Number(limit));
        (0, response_1.sendSuccess)(res, limitedBanners, 'User-targeted hero banners fetched successfully');
    }
    catch (error) {
        console.error('Error fetching user-targeted hero banners:', error);
        (0, response_1.sendError)(res, 'Failed to fetch hero banners', 500);
    }
};
exports.getBannersForUser = getBannersForUser;
/**
 * GET /api/hero-banners/:id
 * Get single banner by ID
 */
const getHeroBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await HeroBanner_1.default.findById(id);
        if (!banner) {
            return (0, response_1.sendError)(res, 'Hero banner not found', 404);
        }
        // Check if banner is currently active
        const isActive = banner.isCurrentlyActive();
        const bannerData = {
            ...banner.toObject(),
            isCurrentlyActive: isActive
        };
        (0, response_1.sendSuccess)(res, bannerData, 'Hero banner fetched successfully');
    }
    catch (error) {
        console.error('Error fetching hero banner by ID:', error);
        (0, response_1.sendError)(res, 'Failed to fetch hero banner', 500);
    }
};
exports.getHeroBannerById = getHeroBannerById;
/**
 * POST /api/hero-banners/:id/view
 * Track banner view (analytics)
 */
const trackBannerView = async (req, res) => {
    try {
        const { id } = req.params;
        const { source, device, location } = req.body;
        const banner = await HeroBanner_1.default.findById(id);
        if (!banner) {
            return (0, response_1.sendError)(res, 'Hero banner not found', 404);
        }
        // Increment view count
        await banner.incrementView();
        // Track additional analytics if needed
        // This could be extended to store detailed view analytics
        (0, response_1.sendSuccess)(res, { success: true }, 'Banner view tracked');
    }
    catch (error) {
        console.error('Error tracking banner view:', error);
        // Don't return error for analytics endpoints
        res.status(200).json({ success: true });
    }
};
exports.trackBannerView = trackBannerView;
/**
 * POST /api/hero-banners/:id/click
 * Track banner click (analytics)
 */
const trackBannerClick = async (req, res) => {
    try {
        const { id } = req.params;
        const { source, device, location } = req.body;
        const banner = await HeroBanner_1.default.findById(id);
        if (!banner) {
            return (0, response_1.sendError)(res, 'Hero banner not found', 404);
        }
        // Increment click count
        await banner.incrementClick();
        // Track additional analytics if needed
        // This could be extended to store detailed click analytics
        (0, response_1.sendSuccess)(res, { success: true }, 'Banner click tracked');
    }
    catch (error) {
        console.error('Error tracking banner click:', error);
        // Don't return error for analytics endpoints
        res.status(200).json({ success: true });
    }
};
exports.trackBannerClick = trackBannerClick;
/**
 * POST /api/hero-banners/:id/conversion
 * Track banner conversion (analytics)
 */
const trackBannerConversion = async (req, res) => {
    try {
        const { id } = req.params;
        const { conversionType, value, source, device } = req.body;
        const banner = await HeroBanner_1.default.findById(id);
        if (!banner) {
            return (0, response_1.sendError)(res, 'Hero banner not found', 404);
        }
        // Increment conversion count
        await banner.incrementConversion();
        // Track additional conversion analytics if needed
        // This could be extended to store detailed conversion analytics
        (0, response_1.sendSuccess)(res, { success: true }, 'Banner conversion tracked');
    }
    catch (error) {
        console.error('Error tracking banner conversion:', error);
        // Don't return error for analytics endpoints
        res.status(200).json({ success: true });
    }
};
exports.trackBannerConversion = trackBannerConversion;

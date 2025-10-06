"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendedOffers = exports.trackOfferClick = exports.trackOfferView = exports.getUserFavoriteOffers = exports.removeOfferFromFavorites = exports.addOfferToFavorites = exports.getUserRedemptions = exports.redeemOffer = exports.getOfferById = exports.getOffersByStore = exports.getOffersByCategory = exports.searchOffers = exports.getTrendingOffers = exports.getFeaturedOffers = exports.getOffers = void 0;
const Offer_1 = __importDefault(require("../models/Offer"));
const OfferRedemption_1 = __importDefault(require("../models/OfferRedemption"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const response_1 = require("../utils/response");
/**
 * GET /api/offers
 * Get offers with filters, sorting, and pagination
 */
const getOffers = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, store, featured, trending, new: isNew, minCashback, sortBy = 'createdAt', order = 'desc', } = req.query;
        // Build filter query
        const filter = {
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        };
        if (category) {
            filter.category = category;
        }
        if (store) {
            filter.store = store;
        }
        if (featured === 'true') {
            filter.isFeatured = true;
        }
        if (trending === 'true') {
            filter.isTrending = true;
        }
        if (isNew === 'true') {
            filter.isNew = true;
        }
        if (minCashback) {
            filter.cashBackPercentage = { $gte: Number(minCashback) };
        }
        // Sort options
        const sortOptions = {};
        const sortField = sortBy;
        sortOptions[sortField] = order === 'asc' ? 1 : -1;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        // Execute query
        const [offers, total] = await Promise.all([
            Offer_1.default.find(filter)
                .populate('category', 'name slug')
                .populate('store', 'name logo location ratings')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Offer_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offers', 500);
    }
};
exports.getOffers = getOffers;
/**
 * GET /api/offers/featured
 * Get featured offers
 */
const getFeaturedOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const offers = await Offer_1.default.getFeatured(Number(limit));
        (0, response_1.sendSuccess)(res, offers, 'Featured offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching featured offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch featured offers', 500);
    }
};
exports.getFeaturedOffers = getFeaturedOffers;
/**
 * GET /api/offers/trending
 * Get trending offers
 */
const getTrendingOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const offers = await Offer_1.default.getTrending(Number(limit));
        (0, response_1.sendSuccess)(res, offers, 'Trending offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching trending offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch trending offers', 500);
    }
};
exports.getTrendingOffers = getTrendingOffers;
/**
 * GET /api/offers/search
 * Search offers by query
 */
const searchOffers = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        if (!q || typeof q !== 'string') {
            return (0, response_1.sendError)(res, 'Search query is required', 400);
        }
        // Text search
        const filter = {
            $text: { $search: q },
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        };
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [offers, total] = await Promise.all([
            Offer_1.default.find(filter, { score: { $meta: 'textScore' } })
                .populate('category', 'name slug')
                .populate('store', 'name logo location ratings')
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Offer_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
    }
    catch (error) {
        console.error('Error searching offers:', error);
        (0, response_1.sendError)(res, 'Failed to search offers', 500);
    }
};
exports.searchOffers = searchOffers;
/**
 * GET /api/offers/category/:categoryId
 * Get offers by category
 */
const getOffersByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;
        const filter = {
            category: categoryId,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        };
        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [offers, total] = await Promise.all([
            Offer_1.default.find(filter)
                .populate('category', 'name slug')
                .populate('store', 'name logo location ratings')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Offer_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offers by category:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offers by category', 500);
    }
};
exports.getOffersByCategory = getOffersByCategory;
/**
 * GET /api/offers/store/:storeId
 * Get offers for a specific store
 */
const getOffersByStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const filter = {
            $or: [
                { store: storeId },
                { applicableStores: storeId },
            ],
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        };
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [offers, total] = await Promise.all([
            Offer_1.default.find(filter)
                .populate('category', 'name slug')
                .populate('store', 'name logo location ratings')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Offer_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching store offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch store offers', 500);
    }
};
exports.getOffersByStore = getOffersByStore;
/**
 * GET /api/offers/:id
 * Get single offer by ID
 */
const getOfferById = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer_1.default.findById(id)
            .populate('category', 'name slug')
            .populate('store', 'name logo location ratings contact')
            .lean();
        if (!offer) {
            return (0, response_1.sendError)(res, 'Offer not found', 404);
        }
        // Check if user has favorited (if authenticated)
        let isFavorite = false;
        if (req.user) {
            const favorite = await Favorite_1.default.findOne({
                user: req.user.id,
                itemType: 'offer',
                item: id,
            });
            isFavorite = !!favorite;
        }
        (0, response_1.sendSuccess)(res, { ...offer, isFavorite }, 'Offer fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offer:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offer', 500);
    }
};
exports.getOfferById = getOfferById;
/**
 * POST /api/offers/:id/redeem
 * Redeem an offer (authenticated users only)
 */
const redeemOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { redemptionType = 'online' } = req.body;
        // Find offer
        const offer = await Offer_1.default.findById(id);
        if (!offer) {
            return (0, response_1.sendError)(res, 'Offer not found', 404);
        }
        // Check if offer is valid
        if (!offer.isValid()) {
            return (0, response_1.sendError)(res, 'Offer is no longer valid', 400);
        }
        // Check user redemption limit
        const userRedemptionCount = await OfferRedemption_1.default.countUserOfferRedemptions(userId, id);
        if (!offer.canUserRedeem(userRedemptionCount)) {
            return (0, response_1.sendError)(res, 'You have already reached the redemption limit for this offer', 400);
        }
        // Check global redemption limit
        if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
            return (0, response_1.sendError)(res, 'Offer redemption limit reached', 400);
        }
        // Create redemption
        const redemption = new OfferRedemption_1.default({
            user: userId,
            offer: id,
            redemptionType,
            redemptionDate: new Date(),
            validityDays: 30, // Can be customized
            status: 'active',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        await redemption.save();
        // Update offer redemption count
        offer.currentRedemptions += 1;
        offer.redemptionCount += 1;
        await offer.save();
        // Populate for response
        await redemption.populate('offer', 'title image cashBackPercentage validUntil');
        (0, response_1.sendSuccess)(res, redemption, 'Offer redeemed successfully', 201);
    }
    catch (error) {
        console.error('Error redeeming offer:', error);
        (0, response_1.sendError)(res, 'Failed to redeem offer', 500);
    }
};
exports.redeemOffer = redeemOffer;
/**
 * GET /api/offers/my-redemptions
 * Get user's offer redemptions
 */
const getUserRedemptions = async (req, res) => {
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
        const [redemptions, total] = await Promise.all([
            OfferRedemption_1.default.find(filter)
                .populate('offer', 'title image cashBackPercentage category validUntil')
                .populate('order', 'orderNumber totalAmount status')
                .sort({ redemptionDate: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            OfferRedemption_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, redemptions, pageNum, limitNum, total, 'Redemptions fetched successfully');
    }
    catch (error) {
        console.error('Error fetching user redemptions:', error);
        (0, response_1.sendError)(res, 'Failed to fetch redemptions', 500);
    }
};
exports.getUserRedemptions = getUserRedemptions;
/**
 * POST /api/offers/:id/favorite
 * Add offer to favorites
 */
const addOfferToFavorites = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Check if offer exists
        const offer = await Offer_1.default.findById(id);
        if (!offer) {
            return (0, response_1.sendError)(res, 'Offer not found', 404);
        }
        // Check if already favorited
        const existing = await Favorite_1.default.findOne({
            user: userId,
            itemType: 'offer',
            item: id,
        });
        if (existing) {
            return (0, response_1.sendError)(res, 'Offer already in favorites', 400);
        }
        // Create favorite
        const favorite = new Favorite_1.default({
            user: userId,
            itemType: 'offer',
            item: id,
        });
        await favorite.save();
        // Update offer favorite count
        offer.favoriteCount += 1;
        await offer.save();
        (0, response_1.sendSuccess)(res, { success: true }, 'Offer added to favorites', 201);
    }
    catch (error) {
        console.error('Error adding to favorites:', error);
        (0, response_1.sendError)(res, 'Failed to add to favorites', 500);
    }
};
exports.addOfferToFavorites = addOfferToFavorites;
/**
 * DELETE /api/offers/:id/favorite
 * Remove offer from favorites
 */
const removeOfferFromFavorites = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Remove favorite
        const result = await Favorite_1.default.findOneAndDelete({
            user: userId,
            itemType: 'offer',
            item: id,
        });
        if (!result) {
            return (0, response_1.sendError)(res, 'Favorite not found', 404);
        }
        // Update offer favorite count
        await Offer_1.default.findByIdAndUpdate(id, { $inc: { favoriteCount: -1 } });
        (0, response_1.sendSuccess)(res, { success: true }, 'Offer removed from favorites');
    }
    catch (error) {
        console.error('Error removing from favorites:', error);
        (0, response_1.sendError)(res, 'Failed to remove from favorites', 500);
    }
};
exports.removeOfferFromFavorites = removeOfferFromFavorites;
/**
 * GET /api/offers/favorites
 * Get user's favorite offers
 */
const getUserFavoriteOffers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        // Get favorites
        const [favorites, total] = await Promise.all([
            Favorite_1.default.find({
                user: userId,
                itemType: 'offer',
            })
                .populate({
                path: 'item',
                model: 'Offer',
                populate: [
                    { path: 'category', select: 'name slug' },
                    { path: 'store', select: 'name logo location ratings' },
                ],
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Favorite_1.default.countDocuments({
                user: userId,
                itemType: 'offer',
            }),
        ]);
        // Extract offers
        const offers = favorites.map((fav) => ({
            ...fav.item,
            isFavorite: true,
        }));
        (0, response_1.sendPaginated)(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching favorite offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch favorite offers', 500);
    }
};
exports.getUserFavoriteOffers = getUserFavoriteOffers;
/**
 * POST /api/offers/:id/view
 * Track offer view (analytics)
 */
const trackOfferView = async (req, res) => {
    try {
        const { id } = req.params;
        // Increment view count
        await Offer_1.default.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        (0, response_1.sendSuccess)(res, { success: true }, 'View tracked');
    }
    catch (error) {
        console.error('Error tracking view:', error);
        // Don't return error for analytics endpoints
        res.status(200).json({ success: true });
    }
};
exports.trackOfferView = trackOfferView;
/**
 * POST /api/offers/:id/click
 * Track offer click (analytics)
 */
const trackOfferClick = async (req, res) => {
    try {
        const { id } = req.params;
        // Increment click count
        await Offer_1.default.findByIdAndUpdate(id, { $inc: { clickCount: 1 } });
        (0, response_1.sendSuccess)(res, { success: true }, 'Click tracked');
    }
    catch (error) {
        console.error('Error tracking click:', error);
        // Don't return error for analytics endpoints
        res.status(200).json({ success: true });
    }
};
exports.trackOfferClick = trackOfferClick;
/**
 * GET /api/offers/recommendations
 * Get personalized offer recommendations (optional auth)
 */
const getRecommendedOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        // For now, return trending offers as recommendations
        // Can be enhanced with ML-based recommendations later
        const offers = await Offer_1.default.find({
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        })
            .sort({ viewCount: -1, redemptionCount: -1, favoriteCount: -1 })
            .limit(Number(limit))
            .populate('category', 'name slug')
            .populate('store', 'name logo location ratings')
            .lean();
        (0, response_1.sendSuccess)(res, offers, 'Recommended offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching recommendations:', error);
        (0, response_1.sendError)(res, 'Failed to fetch recommendations', 500);
    }
};
exports.getRecommendedOffers = getRecommendedOffers;

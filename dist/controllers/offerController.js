"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeroBanners = exports.getOfferCategories = exports.shareOffer = exports.toggleOfferLike = exports.getOffersPageData = exports.getNearbyOffers = exports.getNewArrivalOffers = exports.getStudentOffers = exports.getMegaOffers = exports.getRecommendedOffers = exports.trackOfferClick = exports.trackOfferView = exports.getUserFavoriteOffers = exports.removeOfferFromFavorites = exports.addOfferToFavorites = exports.getUserRedemptions = exports.redeemOffer = exports.getOfferById = exports.getOffersByStore = exports.getOffersByCategory = exports.searchOffers = exports.getTrendingOffers = exports.getFeaturedOffers = exports.getOffers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Offer_1 = __importDefault(require("../models/Offer"));
const OfferCategory_1 = __importDefault(require("../models/OfferCategory"));
const HeroBanner_1 = __importDefault(require("../models/HeroBanner"));
const UserOfferInteraction_1 = __importDefault(require("../models/UserOfferInteraction"));
const OfferRedemption_1 = __importDefault(require("../models/OfferRedemption"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const User_1 = require("../models/User");
const Wallet_1 = require("../models/Wallet");
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
            'validity.isActive': true,
            'validity.startDate': { $lte: new Date() },
            'validity.endDate': { $gte: new Date() },
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
        const offers = await Offer_1.default.find({
            'metadata.featured': true,
            'validity.isActive': true,
            'validity.startDate': { $lte: new Date() },
            'validity.endDate': { $gte: new Date() }
        })
            .sort({ 'metadata.priority': -1, createdAt: -1 })
            .limit(Number(limit))
            .populate('store.id', 'name logo rating')
            .lean();
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
        const offers = await Offer_1.default.findTrendingOffers(Number(limit));
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
        const now = new Date();
        if (now > offer.validity.endDate || now < offer.validity.startDate || !offer.validity.isActive) {
            return (0, response_1.sendError)(res, 'Offer is no longer valid', 400);
        }
        // Check if user already has an active redemption for this offer
        const existingActiveRedemption = await OfferRedemption_1.default.findOne({
            user: userId,
            offer: id,
            status: { $in: ['active', 'pending'] }
        });
        if (existingActiveRedemption) {
            return (0, response_1.sendError)(res, 'You have already redeemed this offer. Please check "My Vouchers" to view your voucher.', 400);
        }
        // Check user redemption limit (count all redemptions including used ones)
        const userRedemptionCount = await OfferRedemption_1.default.countDocuments({
            user: userId,
            offer: id
        });
        if (offer.restrictions.usageLimitPerUser && userRedemptionCount >= offer.restrictions.usageLimitPerUser) {
            return (0, response_1.sendError)(res, 'You have already reached the redemption limit for this offer', 400);
        }
        // Check global redemption limit (count actual redemptions, not views)
        if (offer.restrictions.usageLimit) {
            const totalRedemptions = await OfferRedemption_1.default.countDocuments({ offer: id });
            if (totalRedemptions >= offer.restrictions.usageLimit) {
                return (0, response_1.sendError)(res, 'Offer redemption limit reached', 400);
            }
        }
        // Create redemption with cashback details
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
        // Update offer engagement
        await Offer_1.default.findByIdAndUpdate(id, {
            $inc: { 'engagement.viewsCount': 1 }
        });
        // Populate for response with cashback info and restrictions
        await redemption.populate('offer', 'title image cashbackPercentage validUntil type category restrictions');
        // Return response with cashback details and terms
        const responseData = {
            ...redemption.toObject(),
            cashbackPercentage: offer.cashbackPercentage,
            offerType: offer.type,
            restrictions: {
                minOrderValue: offer.restrictions.minOrderValue,
                maxDiscountAmount: offer.restrictions.maxDiscountAmount,
                usageLimitPerUser: offer.restrictions.usageLimitPerUser,
            },
        };
        (0, response_1.sendSuccess)(res, responseData, 'Offer redeemed successfully', 201);
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
                .populate('offer', 'title image cashbackPercentage category validUntil type restrictions')
                .populate('order', 'orderNumber totalAmount status')
                .sort({ redemptionDate: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            OfferRedemption_1.default.countDocuments(filter),
        ]);
        // Enhance redemptions with cashback info and restrictions
        const enhancedRedemptions = redemptions.map((redemption) => ({
            ...redemption,
            cashbackPercentage: redemption.offer?.cashbackPercentage || 0,
            restrictions: {
                minOrderValue: redemption.offer?.restrictions?.minOrderValue,
                maxDiscountAmount: redemption.offer?.restrictions?.maxDiscountAmount,
                usageLimitPerUser: redemption.offer?.restrictions?.usageLimitPerUser,
            },
        }));
        (0, response_1.sendPaginated)(res, enhancedRedemptions, pageNum, limitNum, total, 'Redemptions fetched successfully');
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
        // Update offer engagement
        await Offer_1.default.findByIdAndUpdate(id, {
            $inc: { 'engagement.favoriteCount': 1 }
        });
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
        // Update offer engagement
        await Offer_1.default.findByIdAndUpdate(id, {
            $inc: { 'engagement.favoriteCount': -1 }
        });
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
            'validity.isActive': true,
            'validity.startDate': { $lte: new Date() },
            'validity.endDate': { $gte: new Date() },
        })
            .sort({ 'engagement.viewsCount': -1, 'engagement.likesCount': -1 })
            .limit(Number(limit))
            .populate('store.id', 'name logo rating')
            .lean();
        (0, response_1.sendSuccess)(res, offers, 'Recommended offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching recommendations:', error);
        (0, response_1.sendError)(res, 'Failed to fetch recommendations', 500);
    }
};
exports.getRecommendedOffers = getRecommendedOffers;
/**
 * GET /api/offers/mega
 * Get mega offers
 */
const getMegaOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const offers = await Offer_1.default.findMegaOffers();
        const limitedOffers = offers.slice(0, Number(limit));
        (0, response_1.sendSuccess)(res, limitedOffers, 'Mega offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching mega offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch mega offers', 500);
    }
};
exports.getMegaOffers = getMegaOffers;
/**
 * GET /api/offers/students
 * Get student offers
 */
const getStudentOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const offers = await Offer_1.default.findStudentOffers();
        const limitedOffers = offers.slice(0, Number(limit));
        (0, response_1.sendSuccess)(res, limitedOffers, 'Student offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching student offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch student offers', 500);
    }
};
exports.getStudentOffers = getStudentOffers;
/**
 * GET /api/offers/new-arrivals
 * Get new arrival offers
 */
const getNewArrivalOffers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const offers = await Offer_1.default.findNewArrivals(Number(limit));
        (0, response_1.sendSuccess)(res, offers, 'New arrival offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching new arrival offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch new arrival offers', 500);
    }
};
exports.getNewArrivalOffers = getNewArrivalOffers;
/**
 * GET /api/offers/nearby
 * Get nearby offers based on user location
 */
const getNearbyOffers = async (req, res) => {
    try {
        const { lat, lng, maxDistance = 10, limit = 20 } = req.query;
        if (!lat || !lng) {
            return (0, response_1.sendError)(res, 'Latitude and longitude are required', 400);
        }
        const userLocation = [Number(lng), Number(lat)];
        const offers = await Offer_1.default.findNearbyOffers(userLocation, Number(maxDistance));
        const limitedOffers = offers.slice(0, Number(limit));
        // Calculate distances for each offer
        const offersWithDistance = limitedOffers.map(offer => ({
            ...offer.toObject(),
            distance: offer.calculateDistance(userLocation)
        }));
        (0, response_1.sendSuccess)(res, offersWithDistance, 'Nearby offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching nearby offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch nearby offers', 500);
    }
};
exports.getNearbyOffers = getNearbyOffers;
/**
 * GET /api/offers/page-data
 * Get complete offers page data (hero banner, sections, etc.)
 */
const getOffersPageData = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { lat, lng } = req.query;
        // Get hero banner
        const heroBanner = await HeroBanner_1.default.findActiveBanners('offers', 'top');
        const activeHeroBanner = heroBanner.length > 0 ? heroBanner[0] : null;
        // Get mega offers
        const megaOffers = await Offer_1.default.findMegaOffers();
        const limitedMegaOffers = megaOffers.slice(0, 5);
        // Get student offers
        const studentOffers = await Offer_1.default.findStudentOffers();
        const limitedStudentOffers = studentOffers.slice(0, 4);
        // Get new arrival offers
        const newArrivalOffers = await Offer_1.default.findNewArrivals(4);
        // Get trending offers
        const trendingOffers = await Offer_1.default.findTrendingOffers(5);
        // Get user's liked offers if authenticated
        let userLikedOffers = [];
        if (userId) {
            const likedInteractions = await UserOfferInteraction_1.default.find({
                user: userId,
                action: 'like'
            }).select('offer');
            userLikedOffers = likedInteractions.map(interaction => interaction.offer.toString());
        }
        // Calculate distances if location provided
        let offersWithDistance = {
            mega: limitedMegaOffers,
            students: limitedStudentOffers,
            newArrivals: newArrivalOffers,
            trending: trendingOffers
        };
        if (lat && lng) {
            const userLocation = [Number(lng), Number(lat)];
            // Helper function to calculate distance
            const calculateDistance = (offer) => {
                if (!offer.location?.coordinates)
                    return 0;
                const [lng, lat] = offer.location.coordinates;
                const R = 6371; // Earth's radius in kilometers
                const dLat = (lat - userLocation[1]) * Math.PI / 180;
                const dLng = (lng - userLocation[0]) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLocation[1] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return Math.round(R * c * 10) / 10; // Round to 1 decimal place
            };
            offersWithDistance = {
                mega: limitedMegaOffers.map(offer => ({
                    ...offer,
                    distance: calculateDistance(offer)
                })),
                students: limitedStudentOffers.map(offer => ({
                    ...offer,
                    distance: calculateDistance(offer)
                })),
                newArrivals: newArrivalOffers.map(offer => ({
                    ...offer,
                    distance: calculateDistance(offer)
                })),
                trending: trendingOffers.map(offer => ({
                    ...offer,
                    distance: calculateDistance(offer)
                }))
            };
        }
        // Add user engagement data
        const offersWithEngagement = {
            mega: offersWithDistance.mega.map((offer) => ({
                ...offer,
                engagement: {
                    ...offer.engagement,
                    isLikedByUser: userLikedOffers.includes(offer._id.toString())
                }
            })),
            students: offersWithDistance.students.map((offer) => ({
                ...offer,
                engagement: {
                    ...offer.engagement,
                    isLikedByUser: userLikedOffers.includes(offer._id.toString())
                }
            })),
            newArrivals: offersWithDistance.newArrivals.map((offer) => ({
                ...offer,
                engagement: {
                    ...offer.engagement,
                    isLikedByUser: userLikedOffers.includes(offer._id.toString())
                }
            })),
            trending: offersWithDistance.trending.map((offer) => ({
                ...offer,
                engagement: {
                    ...offer.engagement,
                    isLikedByUser: userLikedOffers.includes(offer._id.toString())
                }
            }))
        };
        // Get user's wallet balance - check Wallet model first, then User.wallet
        let userWalletBalance = 0;
        if (userId) {
            // Check Wallet model first (more accurate)
            const wallet = await Wallet_1.Wallet.findOne({ user: userId });
            if (wallet) {
                userWalletBalance = wallet.balance.available || wallet.balance.total || 0;
                console.log('💰 [OFFERS] Using Wallet model balance:', {
                    userId,
                    available: wallet.balance.available,
                    total: wallet.balance.total,
                    final: userWalletBalance
                });
            }
            else {
                // Fallback to User.wallet
                const user = await User_1.User.findById(userId).select('wallet walletBalance phoneNumber');
                userWalletBalance = user?.wallet?.balance || user?.walletBalance || req.user?.wallet?.balance || 0;
                console.log('💰 [OFFERS] Using User.wallet balance:', {
                    userId,
                    phoneNumber: user?.phoneNumber,
                    walletBalance: user?.walletBalance,
                    userWalletBalance: user?.wallet?.balance,
                    final: userWalletBalance
                });
            }
        }
        const pageData = {
            heroBanner: activeHeroBanner,
            sections: {
                mega: {
                    title: 'MEGA OFFERS',
                    offers: offersWithEngagement.mega
                },
                students: {
                    title: 'Offer for the students',
                    offers: offersWithEngagement.students
                },
                newArrivals: {
                    title: 'New arrival',
                    offers: offersWithEngagement.newArrivals
                },
                trending: {
                    title: 'Trending Now',
                    offers: offersWithEngagement.trending
                }
            },
            userEngagement: {
                likedOffers: userLikedOffers,
                userPoints: userWalletBalance
            }
        };
        (0, response_1.sendSuccess)(res, pageData, 'Offers page data fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offers page data:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offers page data', 500);
    }
};
exports.getOffersPageData = getOffersPageData;
/**
 * POST /api/offers/:id/like
 * Like/unlike an offer
 */
const toggleOfferLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_1.sendError)(res, 'Authentication required', 401);
        }
        const offer = await Offer_1.default.findById(id);
        if (!offer) {
            return (0, response_1.sendError)(res, 'Offer not found', 404);
        }
        // Check if user already liked this offer
        const existingInteraction = await UserOfferInteraction_1.default.findOne({
            user: userId,
            offer: id,
            action: 'like'
        });
        let isLiked = false;
        let likesCount = offer.engagement.likesCount;
        if (existingInteraction) {
            // Unlike the offer
            await UserOfferInteraction_1.default.findByIdAndDelete(existingInteraction._id);
            likesCount = Math.max(0, likesCount - 1);
        }
        else {
            // Like the offer
            await UserOfferInteraction_1.default.trackInteraction(userId, new mongoose_1.default.Types.ObjectId(id), 'like', {
                source: 'offers_page',
                device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
                ipAddress: req.ip
            });
            likesCount += 1;
            isLiked = true;
        }
        // Update offer engagement count
        await Offer_1.default.findByIdAndUpdate(id, {
            'engagement.likesCount': likesCount
        });
        (0, response_1.sendSuccess)(res, {
            isLiked,
            likesCount
        }, isLiked ? 'Offer liked successfully' : 'Offer unliked successfully');
    }
    catch (error) {
        console.error('Error toggling offer like:', error);
        (0, response_1.sendError)(res, 'Failed to toggle offer like', 500);
    }
};
exports.toggleOfferLike = toggleOfferLike;
/**
 * POST /api/offers/:id/share
 * Share an offer
 */
const shareOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { platform, message } = req.body;
        const offer = await Offer_1.default.findById(id);
        if (!offer) {
            return (0, response_1.sendError)(res, 'Offer not found', 404);
        }
        // Track share interaction
        if (userId) {
            await UserOfferInteraction_1.default.trackInteraction(userId, new mongoose_1.default.Types.ObjectId(id), 'share', {
                source: 'offers_page',
                platform,
                message,
                device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
                ipAddress: req.ip
            });
        }
        // Update offer share count
        await Offer_1.default.findByIdAndUpdate(id, {
            $inc: { 'engagement.sharesCount': 1 }
        });
        (0, response_1.sendSuccess)(res, { success: true }, 'Offer shared successfully');
    }
    catch (error) {
        console.error('Error sharing offer:', error);
        (0, response_1.sendError)(res, 'Failed to share offer', 500);
    }
};
exports.shareOffer = shareOffer;
/**
 * GET /api/offer-categories
 * Get all offer categories
 */
const getOfferCategories = async (req, res) => {
    try {
        const categories = await OfferCategory_1.default.findActiveCategories();
        (0, response_1.sendSuccess)(res, categories, 'Offer categories fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offer categories:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offer categories', 500);
    }
};
exports.getOfferCategories = getOfferCategories;
/**
 * GET /api/hero-banners
 * Get active hero banners
 */
const getHeroBanners = async (req, res) => {
    try {
        const { page = 'offers', position = 'top' } = req.query;
        const userData = req.user ? {
            userType: req.user.userType,
            age: req.user.age,
            location: req.user.location,
            interests: req.user.interests
        } : undefined;
        const banners = await HeroBanner_1.default.findBannersForUser(userData, page);
        (0, response_1.sendSuccess)(res, banners, 'Hero banners fetched successfully');
    }
    catch (error) {
        console.error('Error fetching hero banners:', error);
        (0, response_1.sendError)(res, 'Failed to fetch hero banners', 500);
    }
};
exports.getHeroBanners = getHeroBanners;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOffersByCategorySlug = exports.getSubcategories = exports.getOfferCategoryBySlug = exports.getParentCategories = exports.getFeaturedCategories = exports.getOfferCategories = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const OfferCategory_1 = __importDefault(require("../models/OfferCategory"));
const Offer_1 = __importDefault(require("../models/Offer"));
const response_1 = require("../utils/response");
/**
 * GET /api/offer-categories
 * Get all active offer categories
 */
const getOfferCategories = async (req, res) => {
    try {
        const { featured, parent } = req.query;
        let categories;
        if (featured === 'true') {
            categories = await OfferCategory_1.default.findFeaturedCategories();
        }
        else if (parent === 'true') {
            categories = await OfferCategory_1.default.findParentCategories();
        }
        else {
            categories = await OfferCategory_1.default.findActiveCategories();
        }
        (0, response_1.sendSuccess)(res, categories, 'Offer categories fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offer categories:', error);
        (0, response_1.sendError)(res, 'Failed to fetch offer categories', 500);
    }
};
exports.getOfferCategories = getOfferCategories;
/**
 * GET /api/offer-categories/featured
 * Get featured categories
 */
const getFeaturedCategories = async (req, res) => {
    try {
        const categories = await OfferCategory_1.default.findFeaturedCategories();
        (0, response_1.sendSuccess)(res, categories, 'Featured categories fetched successfully');
    }
    catch (error) {
        console.error('Error fetching featured categories:', error);
        (0, response_1.sendError)(res, 'Failed to fetch featured categories', 500);
    }
};
exports.getFeaturedCategories = getFeaturedCategories;
/**
 * GET /api/offer-categories/parents
 * Get parent categories only
 */
const getParentCategories = async (req, res) => {
    try {
        const categories = await OfferCategory_1.default.findParentCategories();
        (0, response_1.sendSuccess)(res, categories, 'Parent categories fetched successfully');
    }
    catch (error) {
        console.error('Error fetching parent categories:', error);
        (0, response_1.sendError)(res, 'Failed to fetch parent categories', 500);
    }
};
exports.getParentCategories = getParentCategories;
/**
 * GET /api/offer-categories/:slug
 * Get category by slug
 */
const getOfferCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const category = await OfferCategory_1.default.findBySlug(slug);
        if (!category) {
            return (0, response_1.sendError)(res, 'Category not found', 404);
        }
        // Get active offers count for this category
        const activeOffersCount = await category.getActiveOffersCount();
        const categoryWithCount = {
            ...category.toObject(),
            activeOffersCount
        };
        (0, response_1.sendSuccess)(res, categoryWithCount, 'Category fetched successfully');
    }
    catch (error) {
        console.error('Error fetching category by slug:', error);
        (0, response_1.sendError)(res, 'Failed to fetch category', 500);
    }
};
exports.getOfferCategoryBySlug = getOfferCategoryBySlug;
/**
 * GET /api/offer-categories/:parentId/subcategories
 * Get subcategories of a parent category
 */
const getSubcategories = async (req, res) => {
    try {
        const { parentId } = req.params;
        const subcategories = await OfferCategory_1.default.findSubcategories(new mongoose_1.default.Types.ObjectId(parentId));
        (0, response_1.sendSuccess)(res, subcategories, 'Subcategories fetched successfully');
    }
    catch (error) {
        console.error('Error fetching subcategories:', error);
        (0, response_1.sendError)(res, 'Failed to fetch subcategories', 500);
    }
};
exports.getSubcategories = getSubcategories;
/**
 * GET /api/offer-categories/:slug/offers
 * Get offers by category slug
 */
const getOffersByCategorySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', lat, lng } = req.query;
        // Find category by slug
        const category = await OfferCategory_1.default.findBySlug(slug);
        if (!category) {
            return (0, response_1.sendError)(res, 'Category not found', 404);
        }
        // Build filter query
        const filter = {
            category: category.name.toLowerCase(),
            'validity.isActive': true,
            'validity.startDate': { $lte: new Date() },
            'validity.endDate': { $gte: new Date() }
        };
        // Sort options
        const sortOptions = {};
        if (sortBy === 'distance' && lat && lng) {
            // For distance sorting, we'll sort after calculating distances
            sortOptions['metadata.priority'] = -1;
        }
        else {
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        }
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        // Execute query
        const [offers, total] = await Promise.all([
            Offer_1.default.find(filter)
                .populate('store.id', 'name logo rating')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Offer_1.default.countDocuments(filter)
        ]);
        // Calculate distances if location provided
        let offersWithDistance = offers;
        if (lat && lng) {
            const userLocation = [Number(lng), Number(lat)];
            offersWithDistance = offers.map(offer => {
                const offerDoc = new Offer_1.default(offer);
                return {
                    ...offer,
                    distance: offerDoc.calculateDistance(userLocation)
                };
            });
            // Sort by distance if requested
            if (sortBy === 'distance') {
                offersWithDistance.sort((a, b) => {
                    const distanceA = a.distance || Infinity;
                    const distanceB = b.distance || Infinity;
                    return order === 'asc' ? distanceA - distanceB : distanceB - distanceA;
                });
            }
        }
        (0, response_1.sendPaginated)(res, offersWithDistance, pageNum, limitNum, total, 'Category offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching offers by category slug:', error);
        (0, response_1.sendError)(res, 'Failed to fetch category offers', 500);
    }
};
exports.getOffersByCategorySlug = getOffersByCategorySlug;

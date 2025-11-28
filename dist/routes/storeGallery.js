"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StoreGallery_1 = __importDefault(require("../models/StoreGallery"));
const Store_1 = require("../models/Store");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const response_1 = require("../utils/response");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/stores/:storeId/gallery
 * @desc    Get store gallery items (public)
 * @access  Public
 */
router.get('/:storeId/gallery', (0, validation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), (0, validation_1.validateQuery)(joi_1.default.object({
    category: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('image', 'video').optional(),
    limit: joi_1.default.number().integer().min(1).max(100).optional(),
    offset: joi_1.default.number().integer().min(0).optional(),
    sortBy: joi_1.default.string().valid('order', 'uploadedAt', 'views').optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').optional(),
})), async (req, res) => {
    try {
        const { storeId } = req.params;
        const { category, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;
        // Verify store exists and is active
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (!store.isActive) {
            return (0, response_1.sendBadRequest)(res, 'Store is not active');
        }
        // Build query - only visible items
        const query = {
            storeId,
            isVisible: true,
            deletedAt: { $exists: false },
        };
        if (category) {
            query.category = category.toLowerCase();
        }
        if (type) {
            query.type = type;
        }
        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get gallery items
        const items = await StoreGallery_1.default.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        // Get total count
        const total = await StoreGallery_1.default.countDocuments(query);
        // Get categories (only for visible items)
        const categories = await StoreGallery_1.default.aggregate([
            {
                $match: {
                    storeId: new mongoose_1.default.Types.ObjectId(storeId),
                    isVisible: true,
                    deletedAt: { $exists: false },
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    coverImage: {
                        $first: {
                            $cond: [
                                { $eq: ['$isCover', true] },
                                '$url',
                                null,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
                    coverImage: {
                        $ifNull: [
                            '$coverImage',
                            {
                                $arrayElemAt: [
                                    {
                                        $map: {
                                            input: { $slice: ['$url', 1] },
                                            as: 'url',
                                            in: '$$url',
                                        },
                                    },
                                    0,
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $sort: { name: 1 },
            },
        ]);
        return (0, response_1.sendSuccess)(res, {
            items: items.map(item => ({
                id: item._id,
                url: item.url,
                thumbnail: item.thumbnail,
                type: item.type,
                category: item.category,
                title: item.title,
                description: item.description,
                tags: item.tags,
                order: item.order,
                isCover: item.isCover,
                views: item.views,
                likes: item.likes,
                shares: item.shares,
                uploadedAt: item.uploadedAt,
            })),
            categories: categories.map(cat => ({
                name: cat.name,
                count: cat.count,
                coverImage: cat.coverImage,
            })),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    }
    catch (error) {
        console.error('❌ Get public gallery error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to get gallery items', 500);
    }
});
/**
 * @route   GET /api/stores/:storeId/gallery/categories
 * @desc    Get gallery categories for a store (public)
 * @access  Public
 */
router.get('/:storeId/gallery/categories', (0, validation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), async (req, res) => {
    try {
        const { storeId } = req.params;
        // Verify store exists and is active
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (!store.isActive) {
            return (0, response_1.sendBadRequest)(res, 'Store is not active');
        }
        const categories = await StoreGallery_1.default.aggregate([
            {
                $match: {
                    storeId: new mongoose_1.default.Types.ObjectId(storeId),
                    isVisible: true,
                    deletedAt: { $exists: false },
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    coverImage: {
                        $first: {
                            $cond: [
                                { $eq: ['$isCover', true] },
                                '$url',
                                null,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
                    coverImage: {
                        $ifNull: [
                            '$coverImage',
                            {
                                $arrayElemAt: [
                                    {
                                        $map: {
                                            input: { $slice: ['$url', 1] },
                                            as: 'url',
                                            in: '$$url',
                                        },
                                    },
                                    0,
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $sort: { name: 1 },
            },
        ]);
        return (0, response_1.sendSuccess)(res, {
            categories: categories.map(cat => ({
                name: cat.name,
                count: cat.count,
                coverImage: cat.coverImage,
            })),
        });
    }
    catch (error) {
        console.error('❌ Get public gallery categories error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to get gallery categories', 500);
    }
});
/**
 * @route   POST /api/stores/:storeId/gallery/:itemId/view
 * @desc    Track a gallery item view (optional analytics)
 * @access  Public
 */
router.post('/:storeId/gallery/:itemId/view', (0, validation_1.validateParams)(joi_1.default.object({
    storeId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { storeId, itemId } = req.params;
        // Verify store exists and is active
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (!store.isActive) {
            return (0, response_1.sendBadRequest)(res, 'Store is not active');
        }
        // Get user identifier for tracking unique views
        // Use IP address + User-Agent as identifier for anonymous users
        // For authenticated users, we'd use userId (but that requires optional auth middleware)
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const viewerIdentifier = `${ip}_${userAgent}`;
        // Check if this viewer has already viewed this item recently (within 24 hours)
        // We'll use a simple approach: check if the same IP+UserAgent viewed in the last 24 hours
        // In production, you'd want a separate ViewTracking collection
        const item = await StoreGallery_1.default.findOne({
            _id: itemId,
            storeId,
            isVisible: true,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // For per-user tracking, we need to check if this specific viewer has already viewed
        // Since we don't have a separate collection, we'll use a time-based approach:
        // Track views in a separate collection or use session-based tracking
        // For now, implement a simple solution: use MongoDB's $addToSet with a viewer identifier
        // But since viewedBy is ObjectId[], we'll need a different approach
        // Simple solution: Use a ViewTracking collection (create it on the fly)
        // OR: Use a Map/Set in memory (not persistent)
        // OR: Check against a separate collection
        // For MVP: We'll implement session-based tracking on frontend
        // Backend will still increment, but frontend will prevent duplicate calls
        // This is the simplest and most reliable approach
        // Increment view count (frontend will handle preventing duplicate views)
        const updateResult = await StoreGallery_1.default.findOneAndUpdate({
            _id: itemId,
            storeId,
            isVisible: true,
            deletedAt: { $exists: false },
        }, {
            $inc: { views: 1 },
        }, {
            new: true,
        });
        return (0, response_1.sendSuccess)(res, {
            views: updateResult?.views || item.views,
        }, 'View tracked successfully');
    }
    catch (error) {
        console.error('❌ Track gallery view error:', error);
        // Don't fail the request if tracking fails
        return (0, response_1.sendSuccess)(res, { views: 0 }, 'View tracking attempted');
    }
});
exports.default = router;

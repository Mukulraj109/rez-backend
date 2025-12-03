"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductGallery_1 = __importDefault(require("../models/ProductGallery"));
const Product_1 = require("../models/Product");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const response_1 = require("../utils/response");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/products/:productId/gallery
 * @desc    Get product gallery items (public)
 * @access  Public
 */
router.get('/:productId/gallery', (0, validation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), (0, validation_1.validateQuery)(joi_1.default.object({
    category: joi_1.default.string().optional(),
    variantId: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('image', 'video').optional(),
    limit: joi_1.default.number().integer().min(1).max(100).optional(),
    offset: joi_1.default.number().integer().min(0).optional(),
    sortBy: joi_1.default.string().valid('order', 'uploadedAt', 'views').optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').optional(),
})), async (req, res) => {
    try {
        const { productId } = req.params;
        const { category, variantId, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;
        // Verify product exists (allow viewing gallery even if product is unavailable)
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.isDeleted) {
            return (0, response_1.sendBadRequest)(res, 'Product has been deleted');
        }
        // Build query - only visible items
        const query = {
            productId: new mongoose_1.default.Types.ObjectId(productId),
            isVisible: true,
            deletedAt: { $exists: false },
        };
        if (category) {
            query.category = category.toLowerCase();
        }
        if (variantId) {
            query.variantId = variantId;
        }
        if (type) {
            query.type = type;
        }
        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get gallery items
        const items = await ProductGallery_1.default.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        // Get total count
        const total = await ProductGallery_1.default.countDocuments(query);
        // Get categories (only for visible items)
        const categories = await ProductGallery_1.default.aggregate([
            {
                $match: {
                    productId: new mongoose_1.default.Types.ObjectId(productId),
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
                            { $arrayElemAt: ['$url', 0] },
                        ],
                    },
                    _id: 0,
                },
            },
        ]);
        return (0, response_1.sendSuccess)(res, {
            items: items.map(item => ({
                id: item._id,
                url: item.url,
                type: item.type,
                category: item.category,
                title: item.title,
                description: item.description,
                variantId: item.variantId,
                tags: item.tags,
                order: item.order,
                isCover: item.isCover,
                isVisible: item.isVisible,
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
        console.error('Error fetching product gallery:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch product gallery', 500);
    }
});
/**
 * @route   GET /api/products/:productId/gallery/categories
 * @desc    Get product gallery categories with counts (public)
 * @access  Public
 */
router.get('/:productId/gallery/categories', (0, validation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), async (req, res) => {
    try {
        const { productId } = req.params;
        // Verify product exists
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.isDeleted) {
            return (0, response_1.sendBadRequest)(res, 'Product has been deleted');
        }
        // Get categories with aggregation
        const categories = await ProductGallery_1.default.aggregate([
            {
                $match: {
                    productId: new mongoose_1.default.Types.ObjectId(productId),
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
                        $ifNull: ['$coverImage', null],
                    },
                    _id: 0,
                },
            },
            {
                $sort: { count: -1 },
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
        console.error('Error fetching product gallery categories:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch gallery categories', 500);
    }
});
/**
 * @route   GET /api/products/:productId/gallery/:itemId
 * @desc    Get single product gallery item (public)
 * @access  Public
 */
router.get('/:productId/gallery/:itemId', (0, validation_1.validateParams)(joi_1.default.object({
    productId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { productId, itemId } = req.params;
        // Verify product exists
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.isDeleted) {
            return (0, response_1.sendBadRequest)(res, 'Product has been deleted');
        }
        // Get gallery item
        const item = await ProductGallery_1.default.findOne({
            _id: itemId,
            productId,
            isVisible: true,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Increment view count (async, don't wait)
        ProductGallery_1.default.updateOne({ _id: itemId }, { $inc: { views: 1 } }).catch(err => console.error('Failed to increment view count:', err));
        return (0, response_1.sendSuccess)(res, {
            item: {
                id: item._id,
                url: item.url,
                type: item.type,
                category: item.category,
                title: item.title,
                description: item.description,
                variantId: item.variantId,
                tags: item.tags,
                order: item.order,
                isCover: item.isCover,
                isVisible: item.isVisible,
                views: item.views + 1,
                likes: item.likes,
                shares: item.shares,
                uploadedAt: item.uploadedAt,
            },
        });
    }
    catch (error) {
        console.error('Error fetching product gallery item:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch gallery item', 500);
    }
});
exports.default = router;

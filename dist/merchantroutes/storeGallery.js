"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const StoreGallery_1 = __importDefault(require("../models/StoreGallery"));
const Store_1 = require("../models/Store");
const CloudinaryService_1 = __importDefault(require("../services/CloudinaryService"));
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Configure multer for temporary storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `gallery-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});
// File filter for images and videos
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedVideoTypes = /mp4|mov|avi|wmv|webm/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
    const isVideo = allowedVideoTypes.test(extname) && mimetype.startsWith('video/');
    if (isImage || isVideo) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image and video files are allowed'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});
// Validation schemas
const uploadGalleryItemSchema = joi_1.default.object({
    category: joi_1.default.string().required().min(1).max(50),
    title: joi_1.default.string().max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    tags: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(50)), joi_1.default.string().max(500) // Allow string (will be parsed later)
    ).optional(),
    order: joi_1.default.number().integer().min(0).optional(),
    isVisible: joi_1.default.boolean().optional(),
    isCover: joi_1.default.boolean().optional(),
});
const updateGalleryItemSchema = joi_1.default.object({
    title: joi_1.default.string().max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    category: joi_1.default.string().min(1).max(50).optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).optional(),
    order: joi_1.default.number().integer().min(0).optional(),
    isVisible: joi_1.default.boolean().optional(),
    isCover: joi_1.default.boolean().optional(),
});
const reorderGalleryItemsSchema = joi_1.default.object({
    items: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        order: joi_1.default.number().integer().min(0).required(),
    })).min(1).required(),
});
const bulkDeleteSchema = joi_1.default.object({
    itemIds: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
});
/**
 * @route   POST /api/merchant/stores/:storeId/gallery
 * @desc    Upload a single gallery item (image or video)
 * @access  Private (Merchant)
 */
router.post('/:storeId/gallery', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), upload.single('file'), (0, merchantvalidation_1.validateRequest)(uploadGalleryItemSchema), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        const { category, title, description, tags: tagsRaw, order, isVisible, isCover } = req.body;
        // Parse tags - handle both array and JSON string
        let tags;
        if (tagsRaw) {
            if (Array.isArray(tagsRaw)) {
                tags = tagsRaw;
            }
            else if (typeof tagsRaw === 'string') {
                try {
                    // Try parsing as JSON first
                    if (tagsRaw.startsWith('[') || tagsRaw.startsWith('{')) {
                        tags = JSON.parse(tagsRaw);
                    }
                    else {
                        // If not JSON, treat as comma-separated string
                        tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    }
                }
                catch (e) {
                    // If JSON parse fails, treat as comma-separated string
                    tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
                }
            }
        }
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        if (!req.file) {
            return (0, response_1.sendBadRequest)(res, 'No file uploaded');
        }
        // Determine file type
        const isVideo = req.file.mimetype.startsWith('video/');
        const fileType = isVideo ? 'video' : 'image';
        // Upload to Cloudinary
        let result;
        let thumbnail;
        if (isVideo) {
            result = await CloudinaryService_1.default.uploadStoreGalleryVideo(req.file.path, merchantId, storeId);
            // Generate thumbnail for video
            thumbnail = CloudinaryService_1.default.generateVideoThumbnail(result.public_id);
        }
        else {
            result = await CloudinaryService_1.default.uploadStoreGalleryImage(req.file.path, merchantId, storeId);
        }
        // Get current max order for this category
        const maxOrderItem = await StoreGallery_1.default.findOne({
            storeId,
            category: category.toLowerCase(),
            deletedAt: { $exists: false },
        }).sort({ order: -1 });
        const itemOrder = order !== undefined ? parseInt(order) : (maxOrderItem?.order || 0) + 1;
        // If setting as cover, unset other covers in the same category
        if (isCover === 'true' || isCover === true) {
            await StoreGallery_1.default.updateMany({
                storeId,
                category: category.toLowerCase(),
                _id: { $ne: new mongoose_1.default.Types.ObjectId() }, // Will be set after creation
                deletedAt: { $exists: false },
            }, { $set: { isCover: false } });
        }
        // Create gallery item
        const galleryItem = new StoreGallery_1.default({
            storeId,
            merchantId,
            url: result.secure_url,
            thumbnail,
            publicId: result.public_id,
            type: fileType,
            category: category.toLowerCase(),
            title: title || undefined,
            description: description || undefined,
            tags: tags,
            order: itemOrder,
            isVisible: isVisible !== 'false' && isVisible !== false,
            isCover: isCover === 'true' || isCover === true,
            uploadedAt: new Date(),
        });
        await galleryItem.save();
        return (0, response_1.sendSuccess)(res, {
            id: galleryItem._id,
            url: galleryItem.url,
            thumbnail: galleryItem.thumbnail,
            type: galleryItem.type,
            category: galleryItem.category,
            title: galleryItem.title,
            description: galleryItem.description,
            tags: galleryItem.tags,
            order: galleryItem.order,
            isVisible: galleryItem.isVisible,
            isCover: galleryItem.isCover,
            views: galleryItem.views,
            likes: galleryItem.likes,
            shares: galleryItem.shares,
            uploadedAt: galleryItem.uploadedAt,
        }, 'Gallery item uploaded successfully');
    }
    catch (error) {
        // Clean up temp file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('❌ Gallery upload error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to upload gallery item', 500);
    }
});
/**
 * @route   POST /api/merchant/stores/:storeId/gallery/bulk
 * @desc    Upload multiple gallery items at once
 * @access  Private (Merchant)
 */
router.post('/:storeId/gallery/bulk', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), upload.array('files', 20), // Max 20 files
(0, merchantvalidation_1.validateRequest)(joi_1.default.object({
    category: joi_1.default.string().required().min(1).max(50),
    title: joi_1.default.string().max(200).optional(), // Single title for all items
    titles: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(200)), joi_1.default.string()).optional(), // Per-item titles (overrides title)
    description: joi_1.default.string().max(1000).optional(),
    tags: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(50)), joi_1.default.string()).optional(),
    isVisible: joi_1.default.boolean().optional(),
    isCover: joi_1.default.boolean().optional(),
})), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        const { category, title: singleTitle, titles: titlesRaw, description, tags: tagsRaw, isVisible, isCover } = req.body;
        // Parse titles - prioritize per-item titles array, fallback to single title
        let titles;
        if (titlesRaw) {
            // If per-item titles array is provided, use that
            if (Array.isArray(titlesRaw)) {
                titles = titlesRaw;
            }
            else if (typeof titlesRaw === 'string') {
                try {
                    titles = JSON.parse(titlesRaw);
                }
                catch {
                    // If JSON parse fails, treat as single title
                    titles = [titlesRaw];
                }
            }
        }
        else if (singleTitle) {
            // If no per-item titles but single title is provided, use it for all items
            titles = undefined; // Will use singleTitle directly in the loop
        }
        // Parse tags - handle both array and JSON string
        let tags;
        if (tagsRaw) {
            if (Array.isArray(tagsRaw)) {
                tags = tagsRaw;
            }
            else if (typeof tagsRaw === 'string') {
                try {
                    tags = JSON.parse(tagsRaw);
                }
                catch {
                    // If JSON parse fails, treat as comma-separated string
                    tags = tagsRaw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
                }
            }
        }
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return (0, response_1.sendBadRequest)(res, 'No files uploaded');
        }
        const files = req.files;
        const uploadedItems = [];
        const failedItems = [];
        // Get current max order for this category
        const maxOrderItem = await StoreGallery_1.default.findOne({
            storeId,
            category: category.toLowerCase(),
            deletedAt: { $exists: false },
        }).sort({ order: -1 });
        let currentOrder = maxOrderItem?.order || 0;
        // Upload files sequentially
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const isVideo = file.mimetype.startsWith('video/');
                const fileType = isVideo ? 'video' : 'image';
                // Upload to Cloudinary
                let result;
                let thumbnail;
                if (isVideo) {
                    result = await CloudinaryService_1.default.uploadStoreGalleryVideo(file.path, merchantId, storeId);
                    thumbnail = CloudinaryService_1.default.generateVideoThumbnail(result.public_id);
                }
                else {
                    result = await CloudinaryService_1.default.uploadStoreGalleryImage(file.path, merchantId, storeId);
                }
                currentOrder += 1;
                // Determine title: use per-item title if available, otherwise use single title for all
                let itemTitle;
                if (titles && Array.isArray(titles) && titles[i]) {
                    itemTitle = titles[i];
                }
                else if (singleTitle) {
                    itemTitle = singleTitle;
                }
                // Create gallery item
                const galleryItem = new StoreGallery_1.default({
                    storeId,
                    merchantId,
                    url: result.secure_url,
                    thumbnail,
                    publicId: result.public_id,
                    type: fileType,
                    category: category.toLowerCase(),
                    title: itemTitle,
                    description: description || undefined,
                    tags: tags || undefined,
                    order: currentOrder,
                    isVisible: isVisible !== 'false' && isVisible !== false && isVisible !== undefined ? isVisible : true,
                    isCover: isCover === 'true' || isCover === true ? (i === 0) : false, // Only first item can be cover
                    uploadedAt: new Date(),
                });
                console.log(`✅ [Backend] Created gallery item ${i + 1}/${files.length}:`, {
                    title: itemTitle,
                    category: category.toLowerCase(),
                    hasDescription: !!description,
                    hasTags: !!tags,
                });
                await galleryItem.save();
                uploadedItems.push({
                    id: galleryItem._id,
                    url: galleryItem.url,
                    thumbnail: galleryItem.thumbnail,
                    type: galleryItem.type,
                    title: galleryItem.title,
                });
            }
            catch (error) {
                console.error(`❌ Failed to upload file ${i + 1}:`, error);
                failedItems.push({
                    filename: file.originalname,
                    error: error.message,
                });
            }
            finally {
                // Clean up temp file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
        return (0, response_1.sendSuccess)(res, {
            items: uploadedItems,
            uploaded: uploadedItems.length,
            failed: failedItems.length,
            failedItems,
        }, `${uploadedItems.length} items uploaded successfully`);
    }
    catch (error) {
        // Clean up temp files on error
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach((file) => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        console.error('❌ Bulk gallery upload error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to upload gallery items', 500);
    }
});
/**
 * @route   GET /api/merchant/stores/:storeId/gallery
 * @desc    Get store gallery items
 * @access  Private (Merchant)
 */
router.get('/:storeId/gallery', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    category: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('image', 'video').optional(),
    limit: joi_1.default.number().integer().min(1).max(100).optional(),
    offset: joi_1.default.number().integer().min(0).optional(),
    sortBy: joi_1.default.string().valid('order', 'uploadedAt', 'views').optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').optional(),
})), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        const { category, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this store');
        }
        // Build query
        const query = {
            storeId,
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
        // Get categories
        const categories = await StoreGallery_1.default.aggregate([
            {
                $match: {
                    storeId: new mongoose_1.default.Types.ObjectId(storeId),
                    deletedAt: { $exists: false },
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
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
                isVisible: item.isVisible,
                isCover: item.isCover,
                views: item.views,
                likes: item.likes,
                shares: item.shares,
                uploadedAt: item.uploadedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            categories: categories.map(cat => ({
                name: cat.name,
                count: cat.count,
            })),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    }
    catch (error) {
        console.error('❌ Get gallery error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to get gallery items', 500);
    }
});
/**
 * @route   GET /api/merchant/stores/:storeId/gallery/categories
 * @desc    Get gallery categories for a store
 * @access  Private (Merchant)
 */
router.get('/:storeId/gallery/categories', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this store');
        }
        const categories = await StoreGallery_1.default.aggregate([
            {
                $match: {
                    storeId: new mongoose_1.default.Types.ObjectId(storeId),
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
        console.error('❌ Get gallery categories error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to get gallery categories', 500);
    }
});
/**
 * @route   GET /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Get a single gallery item
 * @access  Private (Merchant)
 */
router.get('/:storeId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    storeId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { storeId, itemId } = req.params;
        const merchantId = req.merchantId;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this store');
        }
        const item = await StoreGallery_1.default.findOne({
            _id: itemId,
            storeId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            url: item.url,
            thumbnail: item.thumbnail,
            type: item.type,
            category: item.category,
            title: item.title,
            description: item.description,
            tags: item.tags,
            order: item.order,
            isVisible: item.isVisible,
            isCover: item.isCover,
            views: item.views,
            likes: item.likes,
            shares: item.shares,
            uploadedAt: item.uploadedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        });
    }
    catch (error) {
        console.error('❌ Get gallery item error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to get gallery item', 500);
    }
});
/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Update a gallery item
 * @access  Private (Merchant)
 */
router.put('/:storeId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    storeId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), (0, merchantvalidation_1.validateRequest)(updateGalleryItemSchema), async (req, res) => {
    try {
        const { storeId, itemId } = req.params;
        const merchantId = req.merchantId;
        const { title, description, category, tags, order, isVisible, isCover } = req.body;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        const item = await StoreGallery_1.default.findOne({
            _id: itemId,
            storeId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Update fields
        if (title !== undefined)
            item.title = title || undefined;
        if (description !== undefined)
            item.description = description || undefined;
        if (category !== undefined)
            item.category = category.toLowerCase();
        if (tags !== undefined)
            item.tags = tags || undefined;
        if (order !== undefined)
            item.order = parseInt(order);
        if (isVisible !== undefined)
            item.isVisible = isVisible;
        if (isCover !== undefined) {
            item.isCover = isCover;
            // If setting as cover, unset other covers in the same category
            if (isCover) {
                await StoreGallery_1.default.updateMany({
                    storeId,
                    category: item.category,
                    _id: { $ne: item._id },
                    deletedAt: { $exists: false },
                }, { $set: { isCover: false } });
            }
        }
        await item.save();
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            url: item.url,
            thumbnail: item.thumbnail,
            type: item.type,
            category: item.category,
            title: item.title,
            description: item.description,
            tags: item.tags,
            order: item.order,
            isVisible: item.isVisible,
            isCover: item.isCover,
            views: item.views,
            likes: item.likes,
            shares: item.shares,
            uploadedAt: item.uploadedAt,
            updatedAt: item.updatedAt,
        }, 'Gallery item updated successfully');
    }
    catch (error) {
        console.error('❌ Update gallery item error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to update gallery item', 500);
    }
});
/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/reorder
 * @desc    Reorder gallery items
 * @access  Private (Merchant)
 */
router.put('/:storeId/gallery/reorder', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateRequest)(reorderGalleryItemsSchema), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        const { items } = req.body;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        // Update orders
        const updatePromises = items.map((item) => StoreGallery_1.default.updateOne({
            _id: item.id,
            storeId,
            deletedAt: { $exists: false },
        }, { $set: { order: item.order } }));
        await Promise.all(updatePromises);
        return (0, response_1.sendSuccess)(res, null, 'Gallery items reordered successfully');
    }
    catch (error) {
        console.error('❌ Reorder gallery items error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to reorder gallery items', 500);
    }
});
/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/:itemId/set-cover
 * @desc    Set a gallery item as cover image for its category
 * @access  Private (Merchant)
 */
router.put('/:storeId/gallery/:itemId/set-cover', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    storeId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), (0, merchantvalidation_1.validateRequest)(joi_1.default.object({
    category: joi_1.default.string().optional(),
})), async (req, res) => {
    try {
        const { storeId, itemId } = req.params;
        const merchantId = req.merchantId;
        const { category } = req.body;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        const item = await StoreGallery_1.default.findOne({
            _id: itemId,
            storeId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        const targetCategory = category ? category.toLowerCase() : item.category;
        // Unset other covers in the same category
        await StoreGallery_1.default.updateMany({
            storeId,
            category: targetCategory,
            _id: { $ne: item._id },
            deletedAt: { $exists: false },
        }, { $set: { isCover: false } });
        // Set this item as cover
        item.isCover = true;
        if (category) {
            item.category = targetCategory;
        }
        await item.save();
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            isCover: item.isCover,
            category: item.category,
        }, 'Cover image set successfully');
    }
    catch (error) {
        console.error('❌ Set cover error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to set cover image', 500);
    }
});
/**
 * @route   DELETE /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Delete a gallery item (soft delete)
 * @access  Private (Merchant)
 */
router.delete('/:storeId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    storeId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { storeId, itemId } = req.params;
        const merchantId = req.merchantId;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        const item = await StoreGallery_1.default.findOne({
            _id: itemId,
            storeId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Delete from Cloudinary first
        try {
            if (item.type === 'video') {
                await CloudinaryService_1.default.deleteVideo(item.publicId);
                // Also delete thumbnail if it exists
                if (item.thumbnail) {
                    try {
                        const thumbnailPublicId = CloudinaryService_1.default.getPublicIdFromUrl(item.thumbnail);
                        if (thumbnailPublicId) {
                            await CloudinaryService_1.default.deleteFile(thumbnailPublicId);
                        }
                    }
                    catch (thumbError) {
                        // Continue even if thumbnail deletion fails
                    }
                }
            }
            else {
                await CloudinaryService_1.default.deleteFile(item.publicId);
            }
        }
        catch (cloudinaryError) {
            // Continue with soft delete even if Cloudinary deletion fails
            // This ensures the database is updated even if Cloudinary is temporarily unavailable
        }
        // Soft delete from database
        item.deletedAt = new Date();
        item.isVisible = false;
        await item.save();
        return (0, response_1.sendSuccess)(res, null, 'Gallery item deleted successfully');
    }
    catch (error) {
        console.error('❌ Delete gallery item error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to delete gallery item', 500);
    }
});
/**
 * @route   DELETE /api/merchant/stores/:storeId/gallery/bulk
 * @desc    Delete multiple gallery items
 * @access  Private (Merchant)
 */
router.delete('/:storeId/gallery/bulk', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ storeId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateRequest)(bulkDeleteSchema), async (req, res) => {
    try {
        const { storeId } = req.params;
        const merchantId = req.merchantId;
        const { itemIds } = req.body;
        // Verify store ownership
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        if (store.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this store');
        }
        // Get items before deleting to get their publicIds for Cloudinary deletion
        const itemsToDelete = await StoreGallery_1.default.find({
            _id: { $in: itemIds },
            storeId,
            deletedAt: { $exists: false },
        });
        // Delete from Cloudinary
        const cloudinaryDeletePromises = itemsToDelete.map(async (item) => {
            try {
                if (item.type === 'video') {
                    await CloudinaryService_1.default.deleteVideo(item.publicId);
                    // Also delete thumbnail if it exists
                    if (item.thumbnail) {
                        try {
                            const thumbnailPublicId = CloudinaryService_1.default.getPublicIdFromUrl(item.thumbnail);
                            if (thumbnailPublicId) {
                                await CloudinaryService_1.default.deleteFile(thumbnailPublicId);
                            }
                        }
                        catch (thumbError) {
                            // Continue even if thumbnail deletion fails
                        }
                    }
                }
                else {
                    await CloudinaryService_1.default.deleteFile(item.publicId);
                }
            }
            catch (cloudinaryError) {
                // Continue with other deletions even if one fails
            }
        });
        await Promise.allSettled(cloudinaryDeletePromises);
        // Soft delete items from database
        const result = await StoreGallery_1.default.updateMany({
            _id: { $in: itemIds },
            storeId,
            deletedAt: { $exists: false },
        }, {
            $set: {
                deletedAt: new Date(),
                isVisible: false,
            },
        });
        return (0, response_1.sendSuccess)(res, {
            deleted: result.modifiedCount,
        }, `${result.modifiedCount} items deleted successfully`);
    }
    catch (error) {
        console.error('❌ Bulk delete gallery items error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to delete gallery items', 500);
    }
});
exports.default = router;

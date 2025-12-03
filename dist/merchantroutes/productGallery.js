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
const ProductGallery_1 = __importDefault(require("../models/ProductGallery"));
const Product_1 = require("../models/Product");
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
        cb(null, `product-gallery-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});
// File filter for images only (no videos per requirements)
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
    if (isImage) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for images
    },
});
// Validation schemas
const uploadGalleryItemSchema = joi_1.default.object({
    category: joi_1.default.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').required(),
    title: joi_1.default.string().max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    variantId: joi_1.default.string().max(100).optional(),
    tags: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(50)), joi_1.default.string().max(500) // Allow string (will be parsed later)
    ).optional(),
    order: joi_1.default.number().integer().min(0).optional(),
    isVisible: joi_1.default.boolean().optional(),
    isCover: joi_1.default.boolean().optional(),
});
const updateGalleryItemSchema = joi_1.default.object({
    title: joi_1.default.string().max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    category: joi_1.default.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').optional(),
    variantId: joi_1.default.string().max(100).optional(),
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
 * @route   POST /api/merchant/products/:productId/gallery
 * @desc    Upload a single product image
 * @access  Private (Merchant)
 */
router.post('/:productId/gallery', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), upload.single('file'), (0, merchantvalidation_1.validateRequest)(uploadGalleryItemSchema), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        const { category, title, description, variantId, tags: tagsRaw, order, isVisible, isCover } = req.body;
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
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        if (!req.file) {
            return (0, response_1.sendBadRequest)(res, 'No file uploaded');
        }
        // Upload to Cloudinary (using product image upload method)
        const result = await CloudinaryService_1.default.uploadProductImage(req.file.path, merchantId, productId);
        // Get current max order for this category
        const maxOrderItem = await ProductGallery_1.default.findOne({
            productId,
            category: category.toLowerCase(),
            deletedAt: { $exists: false },
        }).sort({ order: -1 });
        const itemOrder = order !== undefined ? parseInt(order) : (maxOrderItem?.order || 0) + 1;
        // If setting as cover, unset other covers
        if (isCover === 'true' || isCover === true) {
            await ProductGallery_1.default.updateMany({
                productId,
                _id: { $ne: new mongoose_1.default.Types.ObjectId() },
                deletedAt: { $exists: false },
            }, { $set: { isCover: false } });
        }
        // Create gallery item
        const galleryItem = new ProductGallery_1.default({
            productId,
            merchantId,
            url: result.secure_url,
            publicId: result.public_id,
            type: 'image',
            category: category.toLowerCase(),
            title: title || undefined,
            description: description || undefined,
            variantId: variantId || undefined,
            tags: tags,
            order: itemOrder,
            isVisible: isVisible !== 'false' && isVisible !== false,
            isCover: isCover === 'true' || isCover === true,
            uploadedAt: new Date(),
        });
        await galleryItem.save();
        // Clean up temp file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return (0, response_1.sendSuccess)(res, {
            id: galleryItem._id,
            url: galleryItem.url,
            type: galleryItem.type,
            category: galleryItem.category,
            title: galleryItem.title,
            description: galleryItem.description,
            variantId: galleryItem.variantId,
            tags: galleryItem.tags,
            order: galleryItem.order,
            isVisible: galleryItem.isVisible,
            isCover: galleryItem.isCover,
            views: galleryItem.views,
            likes: galleryItem.likes,
            shares: galleryItem.shares,
            uploadedAt: galleryItem.uploadedAt,
        }, 'Product image uploaded successfully');
    }
    catch (error) {
        // Clean up temp file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('❌ Product gallery upload error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to upload product image', 500);
    }
});
/**
 * @route   POST /api/merchant/products/:productId/gallery/bulk
 * @desc    Upload multiple product images at once
 * @access  Private (Merchant)
 */
router.post('/:productId/gallery/bulk', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), upload.array('files', 20), // Max 20 files
(0, merchantvalidation_1.validateRequest)(joi_1.default.object({
    category: joi_1.default.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').required(),
    title: joi_1.default.string().max(200).optional(),
    titles: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(200)), joi_1.default.string()).optional(),
    description: joi_1.default.string().max(1000).optional(),
    variantId: joi_1.default.string().max(100).optional(),
    tags: joi_1.default.alternatives().try(joi_1.default.array().items(joi_1.default.string().max(50)), joi_1.default.string()).optional(),
    isVisible: joi_1.default.boolean().optional(),
    isCover: joi_1.default.boolean().optional(),
})), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        const { category, title: singleTitle, titles: titlesRaw, description, variantId, tags: tagsRaw, isVisible, isCover } = req.body;
        // Parse titles
        let titles;
        if (titlesRaw) {
            if (Array.isArray(titlesRaw)) {
                titles = titlesRaw;
            }
            else if (typeof titlesRaw === 'string') {
                try {
                    titles = JSON.parse(titlesRaw);
                }
                catch {
                    titles = [titlesRaw];
                }
            }
        }
        // Parse tags
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
                    tags = tagsRaw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
                }
            }
        }
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return (0, response_1.sendBadRequest)(res, 'No files uploaded');
        }
        const files = req.files;
        const uploadedItems = [];
        const failedItems = [];
        // Get current max order for this category
        const maxOrderItem = await ProductGallery_1.default.findOne({
            productId,
            category: category.toLowerCase(),
            deletedAt: { $exists: false },
        }).sort({ order: -1 });
        let currentOrder = maxOrderItem?.order || 0;
        // Upload files sequentially
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Upload to Cloudinary
                const result = await CloudinaryService_1.default.uploadProductImage(file.path, merchantId, productId);
                currentOrder += 1;
                // Determine title
                let itemTitle;
                if (titles && Array.isArray(titles) && titles[i]) {
                    itemTitle = titles[i];
                }
                else if (singleTitle) {
                    itemTitle = singleTitle;
                }
                // Create gallery item
                const galleryItem = new ProductGallery_1.default({
                    productId,
                    merchantId,
                    url: result.secure_url,
                    publicId: result.public_id,
                    type: 'image',
                    category: category.toLowerCase(),
                    title: itemTitle,
                    description: description || undefined,
                    variantId: variantId || undefined,
                    tags: tags || undefined,
                    order: currentOrder,
                    isVisible: isVisible !== 'false' && isVisible !== false && isVisible !== undefined ? isVisible : true,
                    isCover: isCover === 'true' || isCover === true ? (i === 0) : false,
                    uploadedAt: new Date(),
                });
                await galleryItem.save();
                uploadedItems.push({
                    id: galleryItem._id,
                    url: galleryItem.url,
                    type: galleryItem.type,
                    title: galleryItem.title,
                });
                // Clean up temp file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
            catch (error) {
                console.error(`❌ Failed to upload file ${i + 1}:`, error);
                failedItems.push({
                    fileName: file.originalname,
                    error: error.message,
                });
                // Clean up temp file on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }
        return (0, response_1.sendSuccess)(res, {
            uploaded: uploadedItems,
            failed: failedItems,
            totalUploaded: uploadedItems.length,
            totalFailed: failedItems.length,
        }, `Successfully uploaded ${uploadedItems.length} of ${files.length} images`);
    }
    catch (error) {
        console.error('❌ Bulk upload error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to upload images', 500);
    }
});
/**
 * @route   GET /api/merchant/products/:productId/gallery
 * @desc    Get all gallery items for a product
 * @access  Private (Merchant)
 */
router.get('/:productId/gallery', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateQuery)(joi_1.default.object({
    category: joi_1.default.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general', 'all').optional(),
    variantId: joi_1.default.string().optional(),
    limit: joi_1.default.number().integer().min(1).max(100).optional(),
    offset: joi_1.default.number().integer().min(0).optional(),
    includeDeleted: joi_1.default.boolean().optional(),
})), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        const { category, variantId, limit = 50, offset = 0, includeDeleted } = req.query;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this product');
        }
        // Build query
        const query = { productId: new mongoose_1.default.Types.ObjectId(productId) };
        if (!includeDeleted) {
            query.deletedAt = { $exists: false };
        }
        if (category && category !== 'all') {
            query.category = category.toString().toLowerCase();
        }
        if (variantId) {
            query.variantId = variantId;
        }
        // Get items
        const items = await ProductGallery_1.default.find(query)
            .sort({ order: 1, uploadedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        // Get total count
        const totalCount = await ProductGallery_1.default.countDocuments(query);
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
                isVisible: item.isVisible,
                isCover: item.isCover,
                views: item.views,
                likes: item.likes,
                shares: item.shares,
                uploadedAt: item.uploadedAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })),
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        }, 'Gallery items retrieved successfully');
    }
    catch (error) {
        console.error('❌ Get gallery error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to retrieve gallery items', 500);
    }
});
/**
 * @route   GET /api/merchant/products/:productId/gallery/categories
 * @desc    Get category statistics for product gallery
 * @access  Private (Merchant)
 */
router.get('/:productId/gallery/categories', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this product');
        }
        const categories = await ProductGallery_1.default.aggregate([
            {
                $match: {
                    productId: new mongoose_1.default.Types.ObjectId(productId),
                    deletedAt: { $exists: false },
                    isVisible: true,
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    coverImage: {
                        $first: {
                            $cond: [{ $eq: ['$isCover', true] }, '$url', null],
                        },
                    },
                },
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
                    coverImage: 1,
                    _id: 0,
                },
            },
            {
                $sort: { name: 1 },
            },
        ]);
        return (0, response_1.sendSuccess)(res, categories, 'Categories retrieved successfully');
    }
    catch (error) {
        console.error('❌ Get categories error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to retrieve categories', 500);
    }
});
/**
 * @route   GET /api/merchant/products/:productId/gallery/:itemId
 * @desc    Get a single gallery item
 * @access  Private (Merchant)
 */
router.get('/:productId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    productId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { productId, itemId } = req.params;
        const merchantId = req.merchantId;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to view this product');
        }
        const item = await ProductGallery_1.default.findOne({
            _id: itemId,
            productId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            url: item.url,
            type: item.type,
            category: item.category,
            title: item.title,
            description: item.description,
            variantId: item.variantId,
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
        }, 'Gallery item retrieved successfully');
    }
    catch (error) {
        console.error('❌ Get gallery item error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to retrieve gallery item', 500);
    }
});
/**
 * @route   PUT /api/merchant/products/:productId/gallery/:itemId
 * @desc    Update gallery item metadata
 * @access  Private (Merchant)
 */
router.put('/:productId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    productId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), (0, merchantvalidation_1.validateRequest)(updateGalleryItemSchema), async (req, res) => {
    try {
        const { productId, itemId } = req.params;
        const merchantId = req.merchantId;
        const updates = req.body;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        const item = await ProductGallery_1.default.findOne({
            _id: itemId,
            productId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Update fields
        if (updates.title !== undefined)
            item.title = updates.title;
        if (updates.description !== undefined)
            item.description = updates.description;
        if (updates.category !== undefined)
            item.category = updates.category.toLowerCase();
        if (updates.variantId !== undefined)
            item.variantId = updates.variantId;
        if (updates.tags !== undefined)
            item.tags = updates.tags;
        if (updates.order !== undefined)
            item.order = updates.order;
        if (updates.isVisible !== undefined)
            item.isVisible = updates.isVisible;
        // Handle cover image
        if (updates.isCover !== undefined && updates.isCover && !item.isCover) {
            // Unset other covers
            await ProductGallery_1.default.updateMany({
                productId,
                _id: { $ne: itemId },
                deletedAt: { $exists: false },
            }, { $set: { isCover: false } });
            item.isCover = true;
        }
        else if (updates.isCover !== undefined) {
            item.isCover = updates.isCover;
        }
        await item.save();
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            url: item.url,
            type: item.type,
            category: item.category,
            title: item.title,
            description: item.description,
            variantId: item.variantId,
            tags: item.tags,
            order: item.order,
            isVisible: item.isVisible,
            isCover: item.isCover,
        }, 'Gallery item updated successfully');
    }
    catch (error) {
        console.error('❌ Update gallery item error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to update gallery item', 500);
    }
});
/**
 * @route   PUT /api/merchant/products/:productId/gallery/:itemId/set-cover
 * @desc    Set an image as the cover/main product image
 * @access  Private (Merchant)
 */
router.put('/:productId/gallery/:itemId/set-cover', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    productId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { productId, itemId } = req.params;
        const merchantId = req.merchantId;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        const item = await ProductGallery_1.default.findOne({
            _id: itemId,
            productId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Unset all other covers
        await ProductGallery_1.default.updateMany({
            productId,
            _id: { $ne: itemId },
            deletedAt: { $exists: false },
        }, { $set: { isCover: false } });
        // Set this as cover
        item.isCover = true;
        await item.save();
        return (0, response_1.sendSuccess)(res, {
            id: item._id,
            isCover: item.isCover,
        }, 'Cover image set successfully');
    }
    catch (error) {
        console.error('❌ Set cover error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to set cover image', 500);
    }
});
/**
 * @route   PUT /api/merchant/products/:productId/gallery/reorder
 * @desc    Reorder gallery items
 * @access  Private (Merchant)
 */
router.put('/:productId/gallery/reorder', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateRequest)(reorderGalleryItemsSchema), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        const { items } = req.body;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        // Update order for each item
        const updatePromises = items.map(({ id, order }) => ProductGallery_1.default.findOneAndUpdate({
            _id: id,
            productId,
            deletedAt: { $exists: false },
        }, { order }, { new: true }));
        await Promise.all(updatePromises);
        return (0, response_1.sendSuccess)(res, null, 'Gallery items reordered successfully');
    }
    catch (error) {
        console.error('❌ Reorder error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to reorder gallery items', 500);
    }
});
/**
 * @route   DELETE /api/merchant/products/:productId/gallery/:itemId
 * @desc    Delete a single gallery item
 * @access  Private (Merchant)
 */
router.delete('/:productId/gallery/:itemId', (0, merchantvalidation_1.validateParams)(joi_1.default.object({
    productId: joi_1.default.string().required(),
    itemId: joi_1.default.string().required(),
})), async (req, res) => {
    try {
        const { productId, itemId } = req.params;
        const merchantId = req.merchantId;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        const item = await ProductGallery_1.default.findOne({
            _id: itemId,
            productId,
            deletedAt: { $exists: false },
        });
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Gallery item not found');
        }
        // Delete from Cloudinary
        try {
            await CloudinaryService_1.default.deleteFile(item.publicId);
        }
        catch (error) {
            console.warn('⚠️ Failed to delete from Cloudinary:', error);
            // Continue with database deletion even if Cloudinary fails
        }
        // Soft delete
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
 * @route   DELETE /api/merchant/products/:productId/gallery/bulk
 * @desc    Delete multiple gallery items
 * @access  Private (Merchant)
 */
router.delete('/:productId/gallery/bulk', (0, merchantvalidation_1.validateParams)(joi_1.default.object({ productId: joi_1.default.string().required() })), (0, merchantvalidation_1.validateRequest)(bulkDeleteSchema), async (req, res) => {
    try {
        const { productId } = req.params;
        const merchantId = req.merchantId;
        const { itemIds } = req.body;
        // Verify product ownership
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        if (product.merchantId?.toString() !== merchantId.toString()) {
            return (0, response_1.sendBadRequest)(res, 'You do not have permission to manage this product');
        }
        // Find items
        const items = await ProductGallery_1.default.find({
            _id: { $in: itemIds },
            productId,
            deletedAt: { $exists: false },
        });
        if (items.length === 0) {
            return (0, response_1.sendNotFound)(res, 'No gallery items found');
        }
        // Delete from Cloudinary
        const deletePromises = items.map(item => CloudinaryService_1.default.deleteFile(item.publicId).catch((error) => {
            console.warn(`⚠️ Failed to delete ${item.publicId} from Cloudinary:`, error);
        }));
        await Promise.all(deletePromises);
        // Soft delete
        await ProductGallery_1.default.updateMany({ _id: { $in: itemIds }, productId }, {
            $set: {
                deletedAt: new Date(),
                isVisible: false,
            },
        });
        return (0, response_1.sendSuccess)(res, {
            deletedCount: items.length,
        }, `Successfully deleted ${items.length} gallery item(s)`);
    }
    catch (error) {
        console.error('❌ Bulk delete error:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to delete gallery items', 500);
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const MerchantProduct_1 = require("../models/MerchantProduct");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const Category_1 = require("../models/Category");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createProductSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(200),
    description: joi_1.default.string().required().min(10),
    shortDescription: joi_1.default.string().max(300),
    sku: joi_1.default.string().optional(),
    barcode: joi_1.default.string().optional(),
    category: joi_1.default.string().required(),
    subcategory: joi_1.default.string().optional(),
    brand: joi_1.default.string().optional(),
    price: joi_1.default.number().required().min(0),
    costPrice: joi_1.default.number().min(0),
    compareAtPrice: joi_1.default.number().min(0),
    currency: joi_1.default.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR').default('USD'),
    inventory: joi_1.default.object({
        stock: joi_1.default.number().required().min(0),
        lowStockThreshold: joi_1.default.number().min(0).default(5),
        trackInventory: joi_1.default.boolean().default(true),
        allowBackorders: joi_1.default.boolean().default(false)
    }).required(),
    images: joi_1.default.array().items(joi_1.default.object({
        url: joi_1.default.string().required(),
        thumbnailUrl: joi_1.default.string(),
        altText: joi_1.default.string(),
        sortOrder: joi_1.default.number().default(0),
        isMain: joi_1.default.boolean().default(false)
    })),
    weight: joi_1.default.number().min(0),
    dimensions: joi_1.default.object({
        length: joi_1.default.number().min(0),
        width: joi_1.default.number().min(0),
        height: joi_1.default.number().min(0),
        unit: joi_1.default.string().valid('cm', 'inch').default('cm')
    }),
    tags: joi_1.default.array().items(joi_1.default.string()),
    metaTitle: joi_1.default.string().max(60),
    metaDescription: joi_1.default.string().max(160),
    searchKeywords: joi_1.default.array().items(joi_1.default.string()),
    status: joi_1.default.string().valid('active', 'inactive', 'draft', 'archived').default('draft'),
    visibility: joi_1.default.string().valid('public', 'hidden', 'featured').default('public'),
    cashback: joi_1.default.object({
        percentage: joi_1.default.number().min(0).max(100).default(0),
        maxAmount: joi_1.default.number().min(0),
        isActive: joi_1.default.boolean().default(true)
    }).required()
});
const updateProductSchema = createProductSchema.fork(['name', 'description', 'price', 'inventory'], (schema) => schema.optional());
const searchProductsSchema = joi_1.default.object({
    query: joi_1.default.string(),
    category: joi_1.default.string(),
    status: joi_1.default.string().valid('active', 'inactive', 'draft', 'archived'),
    visibility: joi_1.default.string().valid('public', 'hidden', 'featured'),
    stockLevel: joi_1.default.string().valid('all', 'in_stock', 'low_stock', 'out_of_stock'),
    sortBy: joi_1.default.string().valid('name', 'price', 'stock', 'created', 'updated').default('created'),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
    page: joi_1.default.number().min(1).default(1),
    limit: joi_1.default.number().min(1).max(100).default(20)
});
const productIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
// Generate unique SKU
const generateSKU = async (merchantId, productName) => {
    const prefix = productName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    let sku = `${prefix}${timestamp}`;
    // Ensure uniqueness
    let counter = 1;
    while (await MerchantProduct_1.MProduct.findOne({ sku })) {
        sku = `${prefix}${timestamp}${counter}`;
        counter++;
    }
    return sku;
};
// @route   GET /api/products
// @desc    Get merchant products with search and filtering
// @access  Private
router.get('/', (0, merchantvalidation_1.validateQuery)(searchProductsSchema), async (req, res) => {
    try {
        const { query, category, status, visibility, stockLevel, sortBy, sortOrder, page, limit } = req.validatedQuery;
        // Build search criteria
        const searchCriteria = { merchantId: req.merchantId };
        if (category)
            searchCriteria.category = category;
        if (status)
            searchCriteria.status = status;
        if (visibility)
            searchCriteria.visibility = visibility;
        // Text search
        if (query) {
            searchCriteria.$text = { $search: query };
        }
        // Stock level filtering
        if (stockLevel && stockLevel !== 'all') {
            switch (stockLevel) {
                case 'in_stock':
                    searchCriteria['inventory.stock'] = { $gt: 0 };
                    break;
                case 'low_stock':
                    searchCriteria.$expr = {
                        $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
                    };
                    break;
                case 'out_of_stock':
                    searchCriteria['inventory.stock'] = 0;
                    break;
            }
        }
        // Build sort criteria
        const sortCriteria = {};
        switch (sortBy) {
            case 'name':
                sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'price':
                sortCriteria.price = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'stock':
                sortCriteria['inventory.stock'] = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'updated':
                sortCriteria.updatedAt = sortOrder === 'asc' ? 1 : -1;
                break;
            case 'created':
            default:
                sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
                break;
        }
        // Calculate pagination
        const skip = (page - 1) * limit;
        // Execute query
        const [products, totalCount] = await Promise.all([
            MerchantProduct_1.MProduct.find(searchCriteria)
                .sort(sortCriteria)
                .skip(skip)
                .limit(limit),
            MerchantProduct_1.MProduct.countDocuments(searchCriteria)
        ]);
        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrevious = page > 1;
        return res.json({
            success: true,
            data: {
                products,
                pagination: {
                    totalCount,
                    page,
                    limit,
                    totalPages,
                    hasNext,
                    hasPrevious
                }
            }
        });
    }
    catch (error) {
        console.error('Get products error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});
// @route   GET /api/products/categories
// @desc    Get product categories for this merchant
// @access  Private
router.get('/categories', async (req, res) => {
    try {
        const categories = await MerchantProduct_1.MProduct.distinct('category', { merchantId: req.merchantId });
        return res.json({
            success: true,
            data: { categories }
        });
    }
    catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});
// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const product = await MerchantProduct_1.MProduct.findOne({
            _id: req.params.id,
            merchantId: req.merchantId
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        return res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        console.error('Get product error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
});
// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', (0, merchantvalidation_1.validateRequest)(createProductSchema), async (req, res) => {
    try {
        const productData = req.body;
        productData.merchantId = req.merchantId;
        // Generate SKU if not provided
        if (!productData.sku) {
            productData.sku = await generateSKU(req.merchantId, productData.name);
        }
        else {
            // Check if SKU already exists
            const existingProduct = await MerchantProduct_1.MProduct.findOne({ sku: productData.sku });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'SKU already exists'
                });
            }
        }
        // Ensure only one main image
        if (productData.images && productData.images.length > 0) {
            let hasMainImage = false;
            productData.images.forEach((img, index) => {
                if (img.isMain && !hasMainImage) {
                    hasMainImage = true;
                }
                else {
                    img.isMain = false;
                }
                img.sortOrder = index;
            });
            // If no main image set, make first one main
            if (!hasMainImage) {
                productData.images[0].isMain = true;
            }
        }
        const product = new MerchantProduct_1.MProduct(productData);
        await product.save();
        // Automatically create product on user side
        await createUserSideProduct(product, req.merchantId);
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${req.merchantId}`).emit('product_created', {
                productId: product._id,
                productName: product.name
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { product }
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'SKU already exists'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
});
// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', (0, merchantvalidation_1.validateParams)(productIdSchema), (0, merchantvalidation_1.validateRequest)(updateProductSchema), async (req, res) => {
    try {
        const productData = req.body;
        // Find product
        const product = await MerchantProduct_1.MProduct.findOne({
            _id: req.params.id,
            merchantId: req.merchantId
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Check SKU uniqueness if being updated
        if (productData.sku && productData.sku !== product.sku) {
            const existingProduct = await MerchantProduct_1.MProduct.findOne({ sku: productData.sku });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'SKU already exists'
                });
            }
        }
        // Handle image updates
        if (productData.images) {
            let hasMainImage = false;
            productData.images.forEach((img, index) => {
                if (img.isMain && !hasMainImage) {
                    hasMainImage = true;
                }
                else {
                    img.isMain = false;
                }
                img.sortOrder = index;
            });
            if (!hasMainImage && productData.images.length > 0) {
                productData.images[0].isMain = true;
            }
        }
        // Update product
        Object.assign(product, productData);
        product.updatedAt = new Date();
        await product.save();
        // Update corresponding product on user side
        await updateUserSideProduct(product, req.merchantId);
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${req.merchantId}`).emit('product_updated', {
                productId: product._id,
                productName: product.name
            });
        }
        return res.json({
            success: true,
            message: 'Product updated successfully',
            data: { product }
        });
    }
    catch (error) {
        console.error('Update product error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
});
// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const product = await MerchantProduct_1.MProduct.findOneAndDelete({
            _id: req.params.id,
            merchantId: req.merchantId
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Delete corresponding product on user side
        await deleteUserSideProduct(product._id.toString());
        // Send real-time notification
        if (global.io) {
            global.io.to(`merchant-${req.merchantId}`).emit('product_deleted', {
                productId: product._id,
                productName: product.name
            });
        }
        return res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
});
// @route   POST /api/products/bulk
// @desc    Bulk operations on products
// @access  Private
router.post('/bulk', async (req, res) => {
    try {
        const { productIds, action, data } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs are required'
            });
        }
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action is required'
            });
        }
        const updateQuery = { updatedAt: new Date() };
        switch (action) {
            case 'activate':
                updateQuery.status = 'active';
                break;
            case 'deactivate':
                updateQuery.status = 'inactive';
                break;
            case 'update_category':
                if (!data?.category) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category is required for category update'
                    });
                }
                updateQuery.category = data.category;
                break;
            case 'update_pricing':
                if (!data?.priceAdjustment) {
                    return res.status(400).json({
                        success: false,
                        message: 'Price adjustment data is required'
                    });
                }
                // Add logic for price adjustments as needed
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }
        // Perform bulk action
        let affectedCount;
        if (action === 'delete') {
            const result = await MerchantProduct_1.MProduct.deleteMany({
                _id: { $in: productIds },
                merchantId: req.merchantId
            });
            affectedCount = result.deletedCount || 0;
        }
        else {
            const result = await MerchantProduct_1.MProduct.updateMany({ _id: { $in: productIds }, merchantId: req.merchantId }, { $set: updateQuery });
            affectedCount = result.modifiedCount || 0;
        }
        return res.json({
            success: true,
            message: `Bulk ${action} completed successfully`,
            data: { affectedCount }
        });
    }
    catch (error) {
        console.error('Bulk operation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Bulk operation failed',
            error: error.message
        });
    }
});
// Helper function to create user-side product when merchant creates a product
async function createUserSideProduct(merchantProduct, merchantId) {
    try {
        // Find the store associated with this merchant
        const store = await Store_1.Store.findOne({ merchantId: merchantId });
        if (!store) {
            console.error('No store found for merchant:', merchantId);
            return;
        }
        // Find or create the category
        let category = await Category_1.Category.findOne({ name: merchantProduct.category });
        if (!category) {
            category = await Category_1.Category.create({
                name: merchantProduct.category,
                slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
                type: 'product',
                isActive: true
            });
        }
        // Create unique slug for the product
        let productSlug = merchantProduct.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        let counter = 1;
        while (await Product_1.Product.findOne({ slug: productSlug })) {
            productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
            counter++;
        }
        // Create the user-side product
        const userProduct = new Product_1.Product({
            name: merchantProduct.name,
            slug: productSlug,
            description: merchantProduct.description,
            shortDescription: merchantProduct.shortDescription,
            category: category._id,
            store: store._id,
            brand: merchantProduct.brand,
            sku: merchantProduct.sku,
            barcode: merchantProduct.barcode,
            images: merchantProduct.images?.map((img) => img.url) || [],
            pricing: {
                original: merchantProduct.compareAtPrice || merchantProduct.price,
                selling: merchantProduct.price,
                currency: merchantProduct.currency || 'INR',
                discount: merchantProduct.compareAtPrice ?
                    Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100) : 0
            },
            inventory: {
                stock: merchantProduct.inventory.stock,
                isAvailable: merchantProduct.inventory.stock > 0,
                lowStockThreshold: merchantProduct.inventory.lowStockThreshold || 5,
                unlimited: false
            },
            ratings: {
                average: 0,
                count: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            },
            specifications: [],
            tags: merchantProduct.tags || [],
            seo: {
                title: merchantProduct.metaTitle || merchantProduct.name,
                description: merchantProduct.metaDescription || merchantProduct.shortDescription,
                keywords: merchantProduct.searchKeywords || []
            },
            analytics: {
                views: 0,
                purchases: 0,
                conversions: 0,
                wishlistAdds: 0,
                shareCount: 0,
                returnRate: 0,
                avgRating: 0
            },
            isActive: merchantProduct.status === 'active',
            isFeatured: merchantProduct.visibility === 'featured',
            isDigital: false,
            weight: merchantProduct.weight,
            dimensions: merchantProduct.dimensions ? {
                length: merchantProduct.dimensions.length,
                width: merchantProduct.dimensions.width,
                height: merchantProduct.dimensions.height,
                unit: merchantProduct.dimensions.unit
            } : undefined
        });
        await userProduct.save();
        console.log(`📦 Automatically created user-side product "${merchantProduct.name}" for merchant ${merchantId}`);
    }
    catch (error) {
        console.error('Error creating user-side product:', error);
        // Don't throw error to avoid breaking merchant product creation
    }
}
// Helper function to update user-side product when merchant updates a product
async function updateUserSideProduct(merchantProduct, merchantId) {
    try {
        // Find the corresponding user-side product by SKU
        const userProduct = await Product_1.Product.findOne({ sku: merchantProduct.sku });
        if (!userProduct) {
            console.log('No corresponding user-side product found, creating new one');
            await createUserSideProduct(merchantProduct, merchantId);
            return;
        }
        // Update the user-side product with new data
        const updates = {
            name: merchantProduct.name,
            description: merchantProduct.description,
            shortDescription: merchantProduct.shortDescription,
            brand: merchantProduct.brand,
            'pricing.original': merchantProduct.compareAtPrice || merchantProduct.price,
            'pricing.selling': merchantProduct.price,
            'pricing.currency': merchantProduct.currency || 'INR',
            'inventory.stock': merchantProduct.inventory.stock,
            'inventory.isAvailable': merchantProduct.inventory.stock > 0,
            'inventory.lowStockThreshold': merchantProduct.inventory.lowStockThreshold || 5,
            tags: merchantProduct.tags || [],
            isActive: merchantProduct.status === 'active',
            isFeatured: merchantProduct.visibility === 'featured',
            weight: merchantProduct.weight,
            updatedAt: new Date()
        };
        // Update discount percentage
        if (merchantProduct.compareAtPrice) {
            updates['pricing.discount'] = Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100);
        }
        // Update images if provided
        if (merchantProduct.images && merchantProduct.images.length > 0) {
            updates.images = merchantProduct.images.map((img) => img.url);
        }
        // Update dimensions if provided
        if (merchantProduct.dimensions) {
            updates.dimensions = {
                length: merchantProduct.dimensions.length,
                width: merchantProduct.dimensions.width,
                height: merchantProduct.dimensions.height,
                unit: merchantProduct.dimensions.unit
            };
        }
        await Product_1.Product.updateOne({ _id: userProduct._id }, updates);
        console.log(`📦 Updated user-side product "${merchantProduct.name}" for merchant ${merchantId}`);
    }
    catch (error) {
        console.error('Error updating user-side product:', error);
    }
}
// Helper function to delete user-side product when merchant deletes a product
async function deleteUserSideProduct(merchantProductId) {
    try {
        // Find the merchant product to get its SKU
        const merchantProduct = await MerchantProduct_1.MProduct.findById(merchantProductId);
        if (!merchantProduct)
            return;
        // Find and delete the corresponding user-side product
        const result = await Product_1.Product.deleteOne({ sku: merchantProduct.sku });
        if (result.deletedCount > 0) {
            console.log(`📦 Deleted user-side product with SKU "${merchantProduct.sku}"`);
        }
    }
    catch (error) {
        console.error('Error deleting user-side product:', error);
    }
}
exports.default = router;

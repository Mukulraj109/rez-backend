"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const MerchantProduct_1 = require("../models/MerchantProduct");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(100),
    parentId: joi_1.default.string().optional(),
    description: joi_1.default.string().max(500),
    icon: joi_1.default.string().optional(),
    sortOrder: joi_1.default.number().min(0).default(0),
    isActive: joi_1.default.boolean().default(true),
    metaTitle: joi_1.default.string().max(60),
    metaDescription: joi_1.default.string().max(160),
    seoSlug: joi_1.default.string().pattern(/^[a-z0-9-]+$/),
});
const updateCategorySchema = createCategorySchema.fork(['name'], (schema) => schema.optional());
const categoryIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
const searchCategoriesSchema = joi_1.default.object({
    query: joi_1.default.string().optional(),
    parentId: joi_1.default.string().optional(),
    isActive: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('true', 'false').custom((value) => value === 'true')).optional(),
    sortBy: joi_1.default.string()
        .valid('name', 'sortOrder', 'created', 'productCount')
        .default('sortOrder'),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('asc'),
    includeEmpty: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('true', 'false').custom((value) => value === 'true')).default(false),
});
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};
const buildCategoryTree = (categories) => {
    const categoryMap = new Map();
    const rootCategories = [];
    // First pass: create map of all categories
    categories.forEach(cat => {
        categoryMap.set(cat.id || cat._id.toString(), {
            ...cat,
            id: cat.id || cat._id.toString(),
            subcategories: [],
        });
    });
    // Second pass: build tree structure
    categories.forEach(cat => {
        const category = categoryMap.get(cat.id || cat._id.toString());
        if (cat.parentId) {
            const parent = categoryMap.get(cat.parentId);
            if (parent) {
                parent.subcategories.push(category);
            }
            else {
                // Parent not found, treat as root
                rootCategories.push(category);
            }
        }
        else {
            rootCategories.push(category);
        }
    });
    // Sort categories and subcategories
    const sortCategories = (cats) => {
        cats.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            return a.name.localeCompare(b.name);
        });
        cats.forEach(cat => {
            if (cat.subcategories.length > 0) {
                sortCategories(cat.subcategories);
            }
        });
    };
    sortCategories(rootCategories);
    return rootCategories;
};
// @route   GET /api/categories/stats
// @desc    Get category statistics
// @access  Private
router.get('/stats', async (req, res) => {
    try {
        const stats = await MerchantProduct_1.MProduct.aggregate([
            { $match: { merchantId: req.merchantId } },
            {
                $group: {
                    _id: null,
                    totalCategories: { $addToSet: '$category' },
                    totalSubcategories: { $addToSet: '$subcategory' },
                    totalProducts: { $sum: 1 },
                    categoriesWithProducts: {
                        $push: {
                            category: '$category',
                            subcategory: '$subcategory',
                            status: '$status'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalCategories: { $size: '$totalCategories' },
                    totalSubcategories: {
                        $size: {
                            $filter: {
                                input: '$totalSubcategories',
                                cond: {
                                    $and: [
                                        { $ne: ['$$this', null] },
                                        { $ne: ['$$this', ''] }
                                    ]
                                }
                            }
                        }
                    },
                    totalProducts: 1,
                    categoriesWithProducts: 1
                }
            }
        ]);
        const categoryStats = stats[0] || {
            totalCategories: 0,
            totalSubcategories: 0,
            totalProducts: 0,
            categoriesWithProducts: []
        };
        // Get top categories by product count
        const topCategories = await MerchantProduct_1.MProduct.aggregate([
            { $match: { merchantId: req.merchantId, status: 'active' } },
            {
                $group: {
                    _id: '$category',
                    productCount: { $sum: 1 },
                    averagePrice: { $avg: '$price' },
                    totalValue: { $sum: '$price' }
                }
            },
            { $sort: { productCount: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    productCount: 1,
                    averagePrice: { $round: ['$averagePrice', 2] },
                    totalValue: { $round: ['$totalValue', 2] }
                }
            }
        ]);
        return res.json({
            success: true,
            data: {
                overview: categoryStats,
                topCategories,
                insights: {
                    averageProductsPerCategory: categoryStats.totalCategories > 0
                        ? Math.round(categoryStats.totalProducts / categoryStats.totalCategories)
                        : 0,
                    categoriesNeedingAttention: topCategories.filter(cat => cat.productCount < 5).length,
                }
            }
        });
    }
    catch (error) {
        console.error('Get category stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch category statistics',
            error: error.message
        });
    }
});
// @route   GET /api/categories
// @desc    Get categories with product counts and tree structure
// @access  Private
// @route   GET /api/categories
// @desc    Get categories with product counts and tree structure
// @access  Private
router.get('/', (0, merchantvalidation_1.validateQuery)(searchCategoriesSchema), async (req, res) => {
    try {
        const { query, parentId, isActive, sortBy, sortOrder, includeEmpty } = req.query;
        // Get all categories for this merchant
        const categoriesFromProducts = await MerchantProduct_1.MProduct.aggregate([
            { $match: { merchantId: req.merchantId } },
            {
                $group: {
                    _id: '$category',
                    productCount: { $sum: 1 },
                    subcategories: { $addToSet: '$subcategory' },
                    isActive: { $first: true }, // Assume all products in category are active
                    sortOrder: { $first: 0 },
                }
            },
            {
                $project: {
                    id: '$_id',
                    name: '$_id',
                    productCount: 1,
                    subcategories: {
                        $filter: {
                            input: '$subcategories',
                            as: 'sub',
                            cond: {
                                $and: [
                                    { $ne: ['$$sub', null] },
                                    { $ne: ['$$sub', ''] }
                                ]
                            }
                        }
                    },
                    isActive: 1,
                    sortOrder: { $literal: 0 },
                    createdAt: { $literal: new Date() },
                    updatedAt: { $literal: new Date() }
                }
            },
            {
                $unset: '_id'
            }
        ]);
        // Get subcategories
        const subcategoriesFromProducts = await MerchantProduct_1.MProduct.aggregate([
            {
                $match: {
                    merchantId: req.merchantId,
                    subcategory: { $nin: [null, ''] }
                }
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        subcategory: '$subcategory'
                    },
                    productCount: { $sum: 1 },
                }
            },
            {
                $project: {
                    id: { $concat: ['$_id.category', '-', '$_id.subcategory'] },
                    name: '$_id.subcategory',
                    parentId: '$_id.category',
                    productCount: 1,
                    subcategories: { $literal: [] },
                    isActive: { $literal: true },
                    sortOrder: { $literal: 0 },
                    createdAt: { $literal: new Date() },
                    updatedAt: { $literal: new Date() }
                }
            },
            {
                $unset: '_id'
            }
        ]);
        let allCategories = [...categoriesFromProducts, ...subcategoriesFromProducts];
        // Apply filters
        if (query) {
            const q = query;
            const searchRegex = new RegExp(q, 'i');
            allCategories = allCategories.filter(cat => searchRegex.test(cat.name));
        }
        if (parentId !== undefined) {
            allCategories = allCategories.filter(cat => cat.parentId === parentId);
        }
        if (isActive !== undefined) {
            allCategories = allCategories.filter(cat => cat.isActive === isActive);
        }
        if (!includeEmpty) {
            allCategories = allCategories.filter(cat => cat.productCount > 0);
        }
        // Sort categories
        allCategories.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'productCount':
                    comparison = a.productCount - b.productCount;
                    break;
                case 'sortOrder':
                    comparison = a.sortOrder - b.sortOrder;
                    break;
                case 'created':
                    comparison = a.createdAt.getTime() - b.createdAt.getTime();
                    break;
                default:
                    comparison = a.sortOrder - b.sortOrder;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        // Build tree structure for root categories only
        const categoryTree = parentId === undefined ? buildCategoryTree(allCategories) : allCategories;
        return res.json({
            success: true,
            data: {
                categories: categoryTree,
                totalCount: allCategories.length,
            }
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
// @route   POST /api/categories/bulk-update
// @desc    Bulk update product categories
// @access  Private
router.post('/bulk-update', async (req, res) => {
    try {
        const { operations } = req.body;
        if (!operations || !Array.isArray(operations)) {
            return res.status(400).json({
                success: false,
                message: 'Operations array is required'
            });
        }
        const results = [];
        for (const operation of operations) {
            const { type, oldCategory, newCategory, subcategory } = operation;
            let updateResult;
            switch (type) {
                case 'rename_category':
                    updateResult = await MerchantProduct_1.MProduct.updateMany({
                        merchantId: req.merchantId,
                        category: oldCategory
                    }, {
                        $set: { category: newCategory, updatedAt: new Date() }
                    });
                    break;
                case 'merge_categories':
                    updateResult = await MerchantProduct_1.MProduct.updateMany({
                        merchantId: req.merchantId,
                        category: { $in: operation.sourceCategories }
                    }, {
                        $set: { category: newCategory, updatedAt: new Date() }
                    });
                    break;
                case 'move_to_subcategory':
                    updateResult = await MerchantProduct_1.MProduct.updateMany({
                        merchantId: req.merchantId,
                        category: oldCategory,
                        subcategory: { $in: [null, ''] }
                    }, {
                        $set: {
                            subcategory: subcategory,
                            updatedAt: new Date()
                        }
                    });
                    break;
                case 'delete_category':
                    // Move products to 'Uncategorized' instead of deleting
                    updateResult = await MerchantProduct_1.MProduct.updateMany({
                        merchantId: req.merchantId,
                        category: oldCategory
                    }, {
                        $set: {
                            category: 'Uncategorized',
                            subcategory: null,
                            updatedAt: new Date()
                        }
                    });
                    break;
                default:
                    results.push({
                        operation,
                        success: false,
                        error: 'Unknown operation type'
                    });
                    continue;
            }
            results.push({
                operation,
                success: true,
                modifiedCount: updateResult.modifiedCount
            });
        }
        return res.json({
            success: true,
            message: 'Bulk category update completed',
            data: { results }
        });
    }
    catch (error) {
        console.error('Bulk category update error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to perform bulk category update',
            error: error.message
        });
    }
});
// @route   PUT /api/categories/organize
// @desc    Reorganize category structure
// @access  Private
router.put('/organize', async (req, res) => {
    try {
        const { categoryMappings } = req.body;
        if (!categoryMappings || !Array.isArray(categoryMappings)) {
            return res.status(400).json({
                success: false,
                message: 'Category mappings array is required'
            });
        }
        const updatePromises = categoryMappings.map(async (mapping) => {
            const { oldCategory, oldSubcategory, newCategory, newSubcategory } = mapping;
            const query = {
                merchantId: req.merchantId,
                category: oldCategory
            };
            if (oldSubcategory) {
                query.subcategory = oldSubcategory;
            }
            const updateData = {
                category: newCategory,
                updatedAt: new Date()
            };
            if (newSubcategory !== undefined) {
                updateData.subcategory = newSubcategory || null;
            }
            return await MerchantProduct_1.MProduct.updateMany(query, { $set: updateData });
        });
        const results = await Promise.all(updatePromises);
        const totalModified = results.reduce((sum, result) => sum + result.modifiedCount, 0);
        return res.json({
            success: true,
            message: `Successfully reorganized ${totalModified} products`,
            data: {
                totalModified,
                operationsCompleted: results.length
            }
        });
    }
    catch (error) {
        console.error('Category reorganization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reorganize categories',
            error: error.message
        });
    }
});
// @route   GET /api/categories/suggestions
// @desc    Get category suggestions based on product data
// @access  Private
router.get('/suggestions', async (req, res) => {
    try {
        const { query } = req.query;
        // Get existing categories for suggestions
        const existingCategories = await MerchantProduct_1.MProduct.distinct('category', {
            merchantId: req.merchantId
        });
        const existingSubcategories = await MerchantProduct_1.MProduct.aggregate([
            { $match: { merchantId: req.merchantId, subcategory: { $nin: [null, ''] } } },
            {
                $group: {
                    _id: '$category',
                    subcategories: { $addToSet: '$subcategory' }
                }
            }
        ]);
        let suggestions = {
            categories: existingCategories,
            subcategories: existingSubcategories,
            recommended: [
                'Electronics', 'Clothing & Apparel', 'Home & Garden', 'Sports & Outdoors',
                'Books & Media', 'Health & Beauty', 'Food & Beverages', 'Automotive',
                'Toys & Games', 'Office Supplies', 'Pet Supplies', 'Jewelry & Accessories'
            ]
        };
        // Filter suggestions if query provided
        if (query) {
            const searchRegex = new RegExp(query, 'i');
            suggestions.categories = suggestions.categories.filter(cat => searchRegex.test(cat));
            suggestions.recommended = suggestions.recommended.filter(cat => searchRegex.test(cat));
        }
        return res.json({
            success: true,
            data: suggestions
        });
    }
    catch (error) {
        console.error('Get category suggestions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch category suggestions',
            error: error.message
        });
    }
});
// @route   POST /api/categories/auto-categorize
// @desc    Auto-categorize products based on AI/ML suggestions
// @access  Private
router.post('/auto-categorize', async (req, res) => {
    try {
        const { productIds, force = false } = req.body;
        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs array is required'
            });
        }
        // Get products to categorize
        const products = await MerchantProduct_1.MProduct.find({
            _id: { $in: productIds },
            merchantId: req.merchantId
        });
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }
        const categorizedResults = [];
        for (const product of products) {
            // Skip if already categorized and not forcing
            if (product.category && product.category !== 'Uncategorized' && !force) {
                categorizedResults.push({
                    productId: product._id,
                    productName: product.name,
                    skipped: true,
                    reason: 'Already categorized'
                });
                continue;
            }
            // Simple keyword-based categorization (in production, use ML service)
            let suggestedCategory = 'General';
            let suggestedSubcategory = null;
            const productText = `${product.name} ${product.description} ${product.tags?.join(' ') || ''}`.toLowerCase();
            // Electronics
            if (/\b(phone|laptop|computer|tablet|headphone|speaker|tv|monitor|camera|gaming|electronic|tech|digital|smart|wireless|bluetooth|usb|charger|cable|battery)\b/.test(productText)) {
                suggestedCategory = 'Electronics';
                if (/\b(phone|smartphone|mobile)\b/.test(productText))
                    suggestedSubcategory = 'Mobile Phones';
                else if (/\b(laptop|computer|pc|desktop)\b/.test(productText))
                    suggestedSubcategory = 'Computers';
                else if (/\b(headphone|speaker|audio|sound)\b/.test(productText))
                    suggestedSubcategory = 'Audio';
                else if (/\b(tv|television|monitor|display)\b/.test(productText))
                    suggestedSubcategory = 'Displays';
            }
            // Clothing
            else if (/\b(shirt|pants|dress|shoes|clothing|apparel|fashion|wear|jacket|coat|jeans|sweater|t-shirt|blouse|skirt|shorts|socks|underwear|hat|cap|belt|scarf)\b/.test(productText)) {
                suggestedCategory = 'Clothing & Apparel';
                if (/\b(shirt|t-shirt|blouse|top)\b/.test(productText))
                    suggestedSubcategory = 'Shirts & Tops';
                else if (/\b(pants|jeans|trousers|shorts)\b/.test(productText))
                    suggestedSubcategory = 'Bottoms';
                else if (/\b(shoes|sneakers|boots|sandals)\b/.test(productText))
                    suggestedSubcategory = 'Footwear';
                else if (/\b(dress|skirt|gown)\b/.test(productText))
                    suggestedSubcategory = 'Dresses & Skirts';
            }
            // Home & Garden
            else if (/\b(furniture|home|kitchen|garden|decor|decoration|lamp|chair|table|bed|sofa|plant|outdoor|indoor|living|bedroom|bathroom|dining)\b/.test(productText)) {
                suggestedCategory = 'Home & Garden';
                if (/\b(kitchen|cooking|cookware|utensil)\b/.test(productText))
                    suggestedSubcategory = 'Kitchen';
                else if (/\b(furniture|chair|table|bed|sofa|desk)\b/.test(productText))
                    suggestedSubcategory = 'Furniture';
                else if (/\b(garden|plant|outdoor|lawn|flower|soil)\b/.test(productText))
                    suggestedSubcategory = 'Garden';
                else if (/\b(decor|decoration|lamp|light|art|frame)\b/.test(productText))
                    suggestedSubcategory = 'Decor';
            }
            // Books & Media
            else if (/\b(book|magazine|cd|dvd|blu-ray|media|novel|textbook|guide|manual|literature|reading|author)\b/.test(productText)) {
                suggestedCategory = 'Books & Media';
                if (/\b(novel|fiction|literature|story)\b/.test(productText))
                    suggestedSubcategory = 'Fiction';
                else if (/\b(textbook|educational|learning|study|academic)\b/.test(productText))
                    suggestedSubcategory = 'Educational';
                else if (/\b(cd|music|album|soundtrack)\b/.test(productText))
                    suggestedSubcategory = 'Music';
                else if (/\b(dvd|blu-ray|movie|film)\b/.test(productText))
                    suggestedSubcategory = 'Movies';
            }
            // Sports & Outdoors
            else if (/\b(sport|sports|fitness|exercise|outdoor|camping|hiking|fishing|cycling|running|gym|workout|athletic|recreation)\b/.test(productText)) {
                suggestedCategory = 'Sports & Outdoors';
                if (/\b(fitness|gym|workout|exercise|weight|dumbbell)\b/.test(productText))
                    suggestedSubcategory = 'Fitness';
                else if (/\b(camping|hiking|outdoor|tent|backpack)\b/.test(productText))
                    suggestedSubcategory = 'Outdoor Recreation';
                else if (/\b(cycling|bike|bicycle)\b/.test(productText))
                    suggestedSubcategory = 'Cycling';
                else if (/\b(running|jogging|athletic|sport)\b/.test(productText))
                    suggestedSubcategory = 'Athletic';
            }
            // Update product with suggested category
            await MerchantProduct_1.MProduct.findByIdAndUpdate(product._id, {
                category: suggestedCategory,
                subcategory: suggestedSubcategory,
                updatedAt: new Date()
            });
            categorizedResults.push({
                productId: product._id,
                productName: product.name,
                suggestedCategory,
                suggestedSubcategory,
                success: true
            });
        }
        return res.json({
            success: true,
            message: `Auto-categorized ${categorizedResults.filter(r => r.success).length} products`,
            data: {
                results: categorizedResults,
                totalProcessed: categorizedResults.length,
                successCount: categorizedResults.filter(r => r.success).length,
                skippedCount: categorizedResults.filter(r => r.skipped).length
            }
        });
    }
    catch (error) {
        console.error('Auto-categorize error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to auto-categorize products',
            error: error.message
        });
    }
});
// @route   GET /api/categories/export
// @desc    Export category data
// @access  Private
router.get('/export', async (req, res) => {
    try {
        const { format = 'json' } = req.query;
        const categories = await MerchantProduct_1.MProduct.aggregate([
            { $match: { merchantId: req.merchantId } },
            {
                $group: {
                    _id: {
                        category: '$category',
                        subcategory: '$subcategory'
                    },
                    productCount: { $sum: 1 },
                    products: {
                        $push: {
                            id: '$_id',
                            name: '$name',
                            sku: '$sku',
                            price: '$price',
                            status: '$status'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id.category',
                    subcategory: '$_id.subcategory',
                    productCount: 1,
                    products: 1
                }
            },
            { $sort: { category: 1, subcategory: 1 } }
        ]);
        if (format === 'csv') {
            // Convert to CSV format
            let csv = 'Category,Subcategory,Product Count,Product Names\n';
            categories.forEach(cat => {
                const productNames = cat.products.map((p) => p.name).join('; ');
                csv += `"${cat.category}","${cat.subcategory || ''}",${cat.productCount},"${productNames}"\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="categories.csv"');
            return res.send(csv);
        }
        else {
            // JSON format
            return res.json({
                success: true,
                data: {
                    categories,
                    exportedAt: new Date(),
                    totalCategories: categories.length
                }
            });
        }
    }
    catch (error) {
        console.error('Export categories error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export categories',
            error: error.message
        });
    }
});
exports.default = router;

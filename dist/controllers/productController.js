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
exports.getProductsByCategorySlugHomepage = exports.getHotDeals = exports.getNearbyProducts = exports.getPopularProducts = exports.checkAvailability = exports.getRelatedProducts = exports.getTrendingProducts = exports.getPopularSearches = exports.getSearchSuggestions = exports.getBundleProducts = exports.getFrequentlyBoughtTogether = exports.getProductAnalytics = exports.trackProductView = exports.getRecommendations = exports.searchProducts = exports.getNewArrivals = exports.getFeaturedProducts = exports.getProductsByStore = exports.getProductsByCategory = exports.getProductById = exports.getProducts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
const redis_1 = require("../config/redis");
const cacheHelper_1 = require("../utils/cacheHelper");
const searchHistoryService_1 = require("../services/searchHistoryService");
// Get all products with filtering and pagination
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy = 'createdAt', page = 1, limit = 20, excludeProducts, diversityMode = 'none' } = req.query;
    console.log('🔍 [GET PRODUCTS] Query params:', {
        category, store, excludeProducts, diversityMode
    });
    // Try to get from cache first (skip if excludeProducts or diversityMode is used)
    if (!excludeProducts && diversityMode === 'none') {
        const filterHash = (0, cacheHelper_1.generateQueryCacheKey)({
            category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit
        });
        const cacheKey = cacheHelper_1.CacheKeys.productList(filterHash);
        const cachedData = await redisService_1.default.get(cacheKey);
        if (cachedData) {
            console.log('✅ [GET PRODUCTS] Returning from cache');
            return (0, response_1.sendPaginated)(res, cachedData.products, Number(page), Number(limit), cachedData.total);
        }
    }
    // Build query
    const query = {
        isActive: true,
        'inventory.isAvailable': true
    };
    // Apply filters
    if (category)
        query.category = category;
    if (store)
        query.store = store;
    if (featured !== undefined)
        query.isFeatured = featured === 'true';
    if (inStock === 'true')
        query['inventory.stock'] = { $gt: 0 };
    // Price range filter
    if (minPrice || maxPrice) {
        query['pricing.selling'] = {};
        if (minPrice)
            query['pricing.selling'].$gte = Number(minPrice);
        if (maxPrice)
            query['pricing.selling'].$lte = Number(maxPrice);
    }
    // Rating filter
    if (rating) {
        query['ratings.average'] = { $gte: Number(rating) };
    }
    // Exclude products filter - parse comma-separated string to ObjectId array
    if (excludeProducts && typeof excludeProducts === 'string') {
        const excludedIds = excludeProducts.split(',').map(id => {
            try {
                return new mongoose_1.default.Types.ObjectId(id.trim());
            }
            catch (error) {
                console.warn('⚠️ [GET PRODUCTS] Invalid product ID in excludeProducts:', id);
                return null;
            }
        }).filter(id => id !== null);
        if (excludedIds.length > 0) {
            query._id = { $nin: excludedIds };
            console.log('🚫 [GET PRODUCTS] Excluding', excludedIds.length, 'products');
        }
    }
    try {
        let productsQuery = Product_1.Product.find(query)
            .populate('category', 'name slug')
            .populate('store', 'name logo location.city');
        // Apply search if provided
        if (search) {
            productsQuery = Product_1.Product.find({
                ...query,
                $text: { $search: search }
            })
                .select({ score: { $meta: 'textScore' } })
                .populate('category', 'name slug')
                .populate('store', 'name logo location.city')
                .sort({ score: { $meta: 'textScore' } });
        }
        else {
            // Apply sorting
            let sortOptions = {};
            switch (sortBy) {
                case 'price_low':
                    sortOptions = { 'pricing.selling': 1 };
                    break;
                case 'price_high':
                    sortOptions = { 'pricing.selling': -1 };
                    break;
                case 'rating':
                    sortOptions = { 'ratings.average': -1, 'ratings.count': -1 };
                    break;
                case 'newest':
                    sortOptions = { createdAt: -1 };
                    break;
                case 'popular':
                    sortOptions = { 'analytics.views': -1, 'analytics.purchases': -1 };
                    break;
                default:
                    sortOptions = { createdAt: -1 };
            }
            productsQuery = productsQuery.sort(sortOptions);
        }
        // Get total count for pagination
        const totalProducts = await Product_1.Product.countDocuments(query);
        // Apply pagination
        const skip = (Number(page) - 1) * Number(limit);
        const products = await productsQuery
            .skip(skip)
            .limit(Number(limit))
            .lean();
        // Track views for authenticated users
        if (req.user && products.length > 0) {
            // Increment view count for products (async, don't wait)
            Product_1.Product.updateMany({ _id: { $in: products.map(p => p._id) } }, { $inc: { 'analytics.views': 1 } }).catch(console.error);
        }
        // Log search history for authenticated users (async, don't block)
        if (req.user && search) {
            (0, searchHistoryService_1.logProductSearch)(req.user._id, search, totalProducts, {
                category: category,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                rating: rating ? Number(rating) : undefined
            }).catch(err => console.error('Failed to log product search:', err));
        }
        // Apply diversity mode if specified
        let finalProducts = products;
        if (diversityMode && diversityMode !== 'none') {
            console.log('🎨 [GET PRODUCTS] Applying diversity mode:', diversityMode);
            // Import diversityService dynamically to avoid circular dependencies
            const { diversityService } = await Promise.resolve().then(() => __importStar(require('../services/diversityService')));
            // Cast products to any to avoid type mismatch (Mongoose lean() types vs DiversityProduct)
            const diverseProducts = await diversityService.applyDiversityMode(products, diversityMode, {
                maxPerCategory: 2,
                maxPerBrand: 2,
                priceRanges: 3,
                minRating: 3.0
            });
            // Cast back to original type
            finalProducts = diverseProducts;
            console.log('✨ [GET PRODUCTS] Diversity applied. Products:', products.length, '→', finalProducts.length);
        }
        // Cache the results (only if no excludeProducts or diversityMode)
        if (!excludeProducts && diversityMode === 'none') {
            const filterHash = (0, cacheHelper_1.generateQueryCacheKey)({
                category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit
            });
            const cacheKey = cacheHelper_1.CacheKeys.productList(filterHash);
            await redisService_1.default.set(cacheKey, { products: finalProducts, total: totalProducts }, redis_1.CacheTTL.PRODUCT_LIST);
        }
        (0, response_1.sendPaginated)(res, finalProducts, Number(page), Number(limit), totalProducts);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch products', 500);
    }
});
// Get single product by ID
exports.getProductById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        console.log('🔍 [GET PRODUCT BY ID] Starting query for ID:', id);
        // Try to get from cache first
        const cacheKey = cacheHelper_1.CacheKeys.product(id);
        const cachedProduct = await redisService_1.default.get(cacheKey);
        if (cachedProduct) {
            console.log('✅ [GET PRODUCT BY ID] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedProduct, 'Product retrieved successfully');
        }
        const product = await Product_1.Product.findOne({
            _id: id,
            isActive: true
        })
            .populate('category', 'name slug type')
            .populate('store', 'name logo slug location contact ratings operationalInfo');
        console.log('📦 [GET PRODUCT BY ID] Product found:', product ? 'Yes' : 'No');
        if (!product) {
            console.log('❌ [GET PRODUCT BY ID] Product not found or not active');
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        // Debug: Log product data structure
        console.log('🔍 [GET PRODUCT BY ID] Product Data:', {
            name: product.name,
            description: product.description?.substring(0, 50) + '...',
            pricing: product.pricing,
            ratings: product.ratings,
            inventory: product.inventory,
            deliveryInfo: product.deliveryInfo,
            cashback: product.cashback,
            analytics: product.analytics,
            productType: product.productType,
            store: {
                name: product.store?.name,
                location: product.store?.location,
                operationalInfo: product.store?.operationalInfo,
            }
        });
        console.log('🔍 [GET PRODUCT BY ID] Getting similar products...');
        // Get similar products
        const similarProducts = await Product_1.Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true,
            'inventory.isAvailable': true
        })
            .select('name title image price rating')
            .limit(6)
            .lean();
        console.log('📦 [GET PRODUCT BY ID] Found', similarProducts.length, 'similar products');
        // Calculate cashback and delivery for this product
        const cashbackAmount = product.calculateCashback();
        const estimatedDelivery = product.getEstimatedDelivery();
        const response = {
            ...product.toObject(),
            similarProducts,
            // Add computed fields for immediate use
            computedCashback: {
                amount: cashbackAmount,
                percentage: product.cashback?.percentage || 5
            },
            computedDelivery: estimatedDelivery,
            todayPurchases: product.analytics?.todayPurchases || 0,
            todayViews: product.analytics?.todayViews || 0
        };
        // Cache the product data
        await redisService_1.default.set(cacheKey, response, redis_1.CacheTTL.PRODUCT_DETAIL);
        console.log('✅ [GET PRODUCT BY ID] Returning product successfully');
        (0, response_1.sendSuccess)(res, response, 'Product retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET PRODUCT BY ID] Error occurred:', error);
        console.error('❌ [GET PRODUCT BY ID] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [GET PRODUCT BY ID] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to fetch product', 500);
    }
});
// Get products by category
exports.getProductsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { categorySlug } = req.params;
    const { minPrice, maxPrice, rating, sortBy = 'createdAt', page = 1, limit = 20 } = req.query;
    try {
        // Try to get from cache first
        const categoryFilterHash = (0, cacheHelper_1.generateQueryCacheKey)({ minPrice, maxPrice, rating, sortBy, page, limit });
        const categoryCacheKey = cacheHelper_1.CacheKeys.productsByCategory(categorySlug, categoryFilterHash);
        const cachedData = await redisService_1.default.get(categoryCacheKey);
        if (cachedData) {
            console.log('✅ [GET PRODUCTS BY CATEGORY] Returning from cache');
            return (0, response_1.sendPaginated)(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
        }
        // Find category
        const category = await Category_1.Category.findOne({
            slug: categorySlug,
            isActive: true
        });
        if (!category) {
            return (0, response_1.sendNotFound)(res, 'Category not found');
        }
        // Build query
        const query = {
            category: category._id,
            isActive: true,
            'inventory.isAvailable': true
        };
        // Apply filters
        if (minPrice || maxPrice) {
            query['pricing.selling'] = {};
            if (minPrice)
                query['pricing.selling'].$gte = Number(minPrice);
            if (maxPrice)
                query['pricing.selling'].$lte = Number(maxPrice);
        }
        if (rating) {
            query['ratings.average'] = { $gte: Number(rating) };
        }
        // Get total count
        const totalProducts = await Product_1.Product.countDocuments(query);
        // Apply sorting
        let sortOptions = {};
        switch (sortBy) {
            case 'price_low':
                sortOptions = { 'pricing.selling': 1 };
                break;
            case 'price_high':
                sortOptions = { 'pricing.selling': -1 };
                break;
            case 'rating':
                sortOptions = { 'ratings.average': -1 };
                break;
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }
        // Get products
        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product_1.Product.find(query)
            .populate('store', 'name logo location.city')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const response = {
            category: {
                id: category._id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                image: category.image
            },
            products
        };
        // Cache the results
        await redisService_1.default.set(categoryCacheKey, { response, total: totalProducts }, redis_1.CacheTTL.PRODUCT_LIST);
        (0, response_1.sendPaginated)(res, [response], Number(page), Number(limit), totalProducts);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch products by category', 500);
    }
});
// Get products by store
exports.getProductsByStore = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { category, minPrice, maxPrice, sortBy = 'createdAt', page = 1, limit = 20 } = req.query;
    try {
        // Check if storeId is a valid ObjectId format (24 hex characters)
        // If not, return empty results immediately since store field only accepts ObjectIds
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
            console.log(`ℹ️ [PRODUCTS] Store ID "${storeId}" is not a valid ObjectId format, returning empty array`);
            return (0, response_1.sendPaginated)(res, [], Number(page), Number(limit), 0);
        }
        // Try to get from cache first
        const storeFilterHash = (0, cacheHelper_1.generateQueryCacheKey)({ category, minPrice, maxPrice, sortBy, page, limit });
        const storeCacheKey = cacheHelper_1.CacheKeys.productsByStore(storeId, storeFilterHash);
        const cachedData = await redisService_1.default.get(storeCacheKey);
        if (cachedData) {
            console.log('✅ [GET PRODUCTS BY STORE] Returning from cache');
            return (0, response_1.sendPaginated)(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
        }
        // Verify store exists
        const store = await Store_1.Store.findOne({
            _id: new mongoose_1.default.Types.ObjectId(storeId),
            isActive: true
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Build query
        const query = {
            store: new mongoose_1.default.Types.ObjectId(storeId),
            isActive: true,
            'inventory.isAvailable': true
        };
        // Apply filters
        if (category)
            query.category = category;
        if (minPrice || maxPrice) {
            query['pricing.selling'] = {};
            if (minPrice)
                query['pricing.selling'].$gte = Number(minPrice);
            if (maxPrice)
                query['pricing.selling'].$lte = Number(maxPrice);
        }
        // Get total count
        const totalProducts = await Product_1.Product.countDocuments(query);
        // Apply sorting
        let sortOptions = {};
        switch (sortBy) {
            case 'price_low':
                sortOptions = { 'pricing.selling': 1 };
                break;
            case 'price_high':
                sortOptions = { 'pricing.selling': -1 };
                break;
            case 'rating':
                sortOptions = { 'ratings.average': -1 };
                break;
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }
        // Get products
        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product_1.Product.find(query)
            .populate('category', 'name slug')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const response = {
            store: {
                id: store._id,
                name: store.name,
                logo: store.logo,
                ratings: store.ratings
            },
            products
        };
        // Cache the results
        await redisService_1.default.set(storeCacheKey, { response, total: totalProducts }, redis_1.CacheTTL.STORE_PRODUCTS);
        (0, response_1.sendPaginated)(res, [response], Number(page), Number(limit), totalProducts);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch store products', 500);
    }
});
// Get featured products - FOR FRONTEND "Just for You" SECTION
exports.getFeaturedProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        console.log('🔍 [FEATURED PRODUCTS] Starting query with limit:', limit);
        // Try to get from cache first
        const cacheKey = cacheHelper_1.CacheKeys.productFeatured(Number(limit));
        const cachedProducts = await redisService_1.default.get(cacheKey);
        if (cachedProducts) {
            console.log('✅ [FEATURED PRODUCTS] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedProducts, 'Featured products retrieved successfully');
        }
        // First, let's check what products exist
        const totalProducts = await Product_1.Product.countDocuments();
        console.log('📊 [FEATURED PRODUCTS] Total products in database:', totalProducts);
        const featuredCount = await Product_1.Product.countDocuments({ isFeatured: true });
        console.log('📊 [FEATURED PRODUCTS] Products with isFeatured=true:', featuredCount);
        const activeCount = await Product_1.Product.countDocuments({ isActive: true });
        console.log('📊 [FEATURED PRODUCTS] Products with isActive=true:', activeCount);
        const inventoryCount = await Product_1.Product.countDocuments({ 'inventory.isAvailable': true });
        console.log('📊 [FEATURED PRODUCTS] Products with inventory.isAvailable=true:', inventoryCount);
        // Try the full query
        console.log('🔍 [FEATURED PRODUCTS] Executing main query...');
        const products = await Product_1.Product.find({
            isActive: true,
            isFeatured: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .populate('store', 'name slug logo location')
            .sort({ 'rating.value': -1, createdAt: -1 })
            .limit(Number(limit))
            .lean();
        console.log('✅ [FEATURED PRODUCTS] Query successful! Found products:', products.length);
        console.log('📦 [FEATURED PRODUCTS] Sample product:', products[0] ? {
            id: products[0]._id,
            title: products[0].title,
            isFeatured: products[0].isFeatured,
            isActive: products[0].isActive,
            inventory: products[0].inventory
        } : 'No products found');
        // Transform data to match frontend ProductItem interface
        console.log('🔄 [FEATURED PRODUCTS] Transforming products...');
        const transformedProducts = products.map(product => {
            console.log('🔄 [FEATURED PRODUCTS] Processing product:', product.title);
            return {
                id: product._id,
                type: 'product',
                title: product.title || product.name,
                name: product.name,
                brand: product.brand || 'Generic',
                image: product.image || product.images?.[0] || '',
                description: product.description || '',
                price: {
                    current: product.price?.current || product.pricing?.selling || 0,
                    original: product.price?.original || product.pricing?.original || 0,
                    currency: product.price?.currency || product.pricing?.currency || '₹',
                    discount: product.price?.discount || product.pricing?.discount || 0
                },
                category: product.category?.name || product.category || 'General',
                rating: {
                    value: product.rating?.value || product.ratings?.average || 0,
                    count: product.rating?.count || product.ratings?.count || 0
                },
                availabilityStatus: product.availabilityStatus || (product.inventory?.stock > 0 ? 'in_stock' : 'out_of_stock'),
                tags: product.tags || [],
                isRecommended: true,
                store: product.store
            };
        });
        console.log('✅ [FEATURED PRODUCTS] Transformation complete. Returning', transformedProducts.length, 'products');
        // Cache the results
        await redisService_1.default.set(cacheKey, transformedProducts, redis_1.CacheTTL.PRODUCT_FEATURED);
        (0, response_1.sendSuccess)(res, transformedProducts, 'Featured products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [FEATURED PRODUCTS] Error occurred:', error);
        console.error('❌ [FEATURED PRODUCTS] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [FEATURED PRODUCTS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to fetch featured products', 500);
    }
});
// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
exports.getNewArrivals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        console.log('🔍 [NEW ARRIVALS] Starting query with limit:', limit);
        // Try to get from cache first
        const cacheKey = cacheHelper_1.CacheKeys.productNewArrivals(Number(limit));
        const cachedProducts = await redisService_1.default.get(cacheKey);
        if (cachedProducts) {
            console.log('✅ [NEW ARRIVALS] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedProducts, 'New arrival products retrieved successfully');
        }
        // First, let's check what products exist
        const totalProducts = await Product_1.Product.countDocuments();
        console.log('📊 [NEW ARRIVALS] Total products in database:', totalProducts);
        const activeCount = await Product_1.Product.countDocuments({ isActive: true });
        console.log('📊 [NEW ARRIVALS] Products with isActive=true:', activeCount);
        const inventoryCount = await Product_1.Product.countDocuments({ 'inventory.isAvailable': true });
        console.log('📊 [NEW ARRIVALS] Products with inventory.isAvailable=true:', inventoryCount);
        // Try the query
        console.log('🔍 [NEW ARRIVALS] Executing main query...');
        const products = await Product_1.Product.find({
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .populate('store', 'name slug logo location')
            .sort({ createdAt: -1 }) // Most recent first
            .limit(Number(limit))
            .lean();
        console.log('✅ [NEW ARRIVALS] Query successful! Found products:', products.length);
        console.log('📦 [NEW ARRIVALS] Sample product:', products[0] ? {
            id: products[0]._id,
            title: products[0].title,
            isActive: products[0].isActive,
            inventory: products[0].inventory
        } : 'No products found');
        // Transform data to match frontend ProductItem interface
        console.log('🔄 [NEW ARRIVALS] Transforming products...');
        const transformedProducts = products.map(product => {
            console.log('🔄 [NEW ARRIVALS] Processing product:', product.title);
            return {
                id: product._id,
                type: 'product',
                title: product.title || product.name,
                name: product.name,
                brand: product.brand || 'Generic',
                image: product.image || product.images?.[0] || '',
                description: product.description || '',
                price: {
                    current: product.price?.current || product.pricing?.selling || 0,
                    original: product.price?.original || product.pricing?.original || 0,
                    currency: product.price?.currency || product.pricing?.currency || '₹',
                    discount: product.price?.discount || product.pricing?.discount || 0
                },
                category: product.category?.name || product.category || 'General',
                rating: {
                    value: product.rating?.value || product.ratings?.average || 0,
                    count: product.rating?.count || product.ratings?.count || 0
                },
                availabilityStatus: product.availabilityStatus || (product.inventory?.stock > 0 ? 'in_stock' : 'out_of_stock'),
                tags: product.tags || [],
                isNewArrival: true,
                arrivalDate: product.arrivalDate || product.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
                store: product.store
            };
        });
        console.log('✅ [NEW ARRIVALS] Transformation complete. Returning', transformedProducts.length, 'products');
        // Cache the results
        await redisService_1.default.set(cacheKey, transformedProducts, redis_1.CacheTTL.PRODUCT_NEW_ARRIVALS);
        (0, response_1.sendSuccess)(res, transformedProducts, 'New arrival products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [NEW ARRIVALS] Error occurred:', error);
        console.error('❌ [NEW ARRIVALS] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ [NEW ARRIVALS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to fetch new arrival products', 500);
    }
});
// Search products
exports.searchProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q: searchText, category, store, brand, minPrice, maxPrice, rating, inStock, page = 1, limit = 20 } = req.query;
    if (!searchText) {
        return (0, response_1.sendError)(res, 'Search query is required', 400);
    }
    try {
        // Try to get from cache first
        const searchFilterHash = (0, cacheHelper_1.generateQueryCacheKey)({
            category, store, brand, minPrice, maxPrice, rating, inStock, page, limit
        });
        const searchCacheKey = cacheHelper_1.CacheKeys.productSearch(searchText, searchFilterHash);
        const cachedData = await redisService_1.default.get(searchCacheKey);
        if (cachedData) {
            console.log('✅ [SEARCH PRODUCTS] Returning from cache');
            return (0, response_1.sendPaginated)(res, cachedData.products, Number(page), Number(limit), cachedData.total);
        }
        // Build filters
        const filters = {};
        if (category)
            filters.category = category;
        if (store)
            filters.store = store;
        if (brand)
            filters.brand = brand;
        if (minPrice || maxPrice) {
            filters.priceRange = {};
            if (minPrice)
                filters.priceRange.min = Number(minPrice);
            if (maxPrice)
                filters.priceRange.max = Number(maxPrice);
        }
        if (rating)
            filters.rating = Number(rating);
        if (inStock === 'true')
            filters.inStock = true;
        // Pagination options
        const options = {
            limit: Number(limit),
            skip: (Number(page) - 1) * Number(limit)
        };
        // Search products using text search and filters
        const searchQuery = {
            isActive: true,
            $text: { $search: searchText }
        };
        // Apply filters to the query
        if (filters.category)
            searchQuery.category = filters.category;
        if (filters.store)
            searchQuery.store = filters.store;
        if (filters.priceRange) {
            searchQuery.basePrice = {};
            if (filters.priceRange.min)
                searchQuery.basePrice.$gte = filters.priceRange.min;
            if (filters.priceRange.max)
                searchQuery.basePrice.$lte = filters.priceRange.max;
        }
        if (filters.rating)
            searchQuery.averageRating = { $gte: filters.rating };
        if (filters.inStock)
            searchQuery.inventory = { $gt: 0 };
        const products = await Product_1.Product.find(searchQuery)
            .populate('category', 'name slug')
            .populate('store', 'name slug')
            .skip(options.skip)
            .limit(options.limit)
            .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
            .lean();
        // Get total count for the same search
        const totalQuery = Product_1.Product.find({
            $text: { $search: searchText },
            isActive: true,
            ...filters
        });
        const total = await totalQuery.countDocuments();
        // Cache the results
        await redisService_1.default.set(searchCacheKey, { products, total }, redis_1.CacheTTL.PRODUCT_SEARCH);
        (0, response_1.sendPaginated)(res, products, Number(page), Number(limit), total);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Search failed', 500);
    }
});
// Get product recommendations
exports.getRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const { limit = 6 } = req.query;
    try {
        console.log('🔍 [RECOMMENDATIONS] Getting recommendations for product:', productId);
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        console.log('📦 [RECOMMENDATIONS] Source product:', {
            id: product._id,
            name: product.name,
            category: product.category,
            price: product.pricing?.selling
        });
        // Get recommendations based on category and price range
        const priceRange = {
            min: product.pricing.selling * 0.5,
            max: product.pricing.selling * 1.5
        };
        const recommendations = await Product_1.Product.find({
            category: product.category,
            _id: { $ne: productId },
            isActive: true,
            'inventory.isAvailable': true,
            'pricing.selling': {
                $gte: priceRange.min,
                $lte: priceRange.max
            }
        })
            .populate('category', 'name slug') // ✅ Populate category
            .populate('store', 'name logo')
            .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
            .limit(Number(limit))
            .lean();
        console.log('✅ [RECOMMENDATIONS] Found', recommendations.length, 'recommendations');
        // ✅ CRITICAL FIX: Transform data for frontend
        const transformedRecommendations = recommendations.map((product) => {
            // Safely extract pricing
            const sellingPrice = product.pricing?.selling || product.price || 0;
            const originalPrice = product.pricing?.original || product.originalPrice || sellingPrice;
            const discount = product.pricing?.discount ||
                (originalPrice > sellingPrice ?
                    Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);
            // Safely extract image
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || 'Unnamed Product',
                image: productImage,
                price: sellingPrice, // ✅ FIXED: Now properly extracts price
                originalPrice: originalPrice,
                discount: discount,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                brand: product.brand || '',
                cashback: (product.cashback?.percentage || 0) > 0,
                cashbackPercentage: product.cashback?.percentage || 0,
                category: product.category?.name || (typeof product.category === 'string' ? product.category : ''), // ✅ FIXED: Properly extract category
                store: product.store,
            };
        });
        console.log('✅ [RECOMMENDATIONS] Transformed sample:', transformedRecommendations[0]);
        (0, response_1.sendSuccess)(res, transformedRecommendations, 'Product recommendations retrieved successfully');
    }
    catch (error) {
        console.error('❌ [RECOMMENDATIONS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get recommendations', 500);
    }
});
// Track product view and increment analytics
exports.trackProductView = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        console.log('👁️ [TRACK VIEW] Tracking view for product:', id);
        const product = await Product_1.Product.findById(id);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        // Increment views with daily analytics
        await product.incrementViews();
        // Track user-specific view if authenticated
        if (req.user) {
            // You could also track in user activity here
            console.log('👤 [TRACK VIEW] User', req.user.id, 'viewed product', id);
        }
        (0, response_1.sendSuccess)(res, {
            views: product.analytics.views,
            todayViews: product.analytics.todayViews
        }, 'Product view tracked successfully');
    }
    catch (error) {
        console.error('❌ [TRACK VIEW] Error:', error);
        throw new errorHandler_1.AppError('Failed to track product view', 500);
    }
});
// Get product analytics including "people bought today"
exports.getProductAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        console.log('📊 [PRODUCT ANALYTICS] Getting analytics for product:', id);
        const product = await Product_1.Product.findById(id)
            .select('analytics cashback deliveryInfo pricing');
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        // Calculate cashback for display
        const cashbackAmount = product.calculateCashback();
        // Get estimated delivery based on user location (if available)
        const userLocation = req.query.location ? JSON.parse(req.query.location) : null;
        const estimatedDelivery = product.getEstimatedDelivery(userLocation);
        const analytics = {
            totalViews: product.analytics.views,
            totalPurchases: product.analytics.purchases,
            todayViews: product.analytics.todayViews || 0,
            todayPurchases: product.analytics.todayPurchases || 0,
            peopleBoughtToday: product.analytics.todayPurchases || Math.floor(Math.random() * 50) + 100, // Fallback for demo
            cashback: {
                percentage: product.cashback?.percentage || 5,
                amount: cashbackAmount,
                maxAmount: product.cashback?.maxAmount,
                terms: product.cashback?.terms
            },
            delivery: {
                estimated: estimatedDelivery,
                freeShippingThreshold: product.deliveryInfo?.freeShippingThreshold || 500,
                expressAvailable: product.deliveryInfo?.expressAvailable || false
            },
            rating: {
                average: product.analytics.avgRating,
                conversions: product.analytics.conversions
            }
        };
        console.log('✅ [PRODUCT ANALYTICS] Returning analytics:', analytics);
        (0, response_1.sendSuccess)(res, analytics, 'Product analytics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [PRODUCT ANALYTICS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get product analytics', 500);
    }
});
// Get frequently bought together products
exports.getFrequentlyBoughtTogether = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { limit = 4 } = req.query;
    try {
        console.log('🛍️ [FREQUENTLY BOUGHT] Getting frequently bought products for:', id);
        const product = await Product_1.Product.findById(id)
            .populate({
            path: 'frequentlyBoughtWith.productId',
            select: 'name title price pricing image images rating ratings inventory'
        });
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        // Sort by purchase count and get top items
        const frequentProducts = product.frequentlyBoughtWith
            ?.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
            .slice(0, Number(limit))
            .map((item) => item.productId)
            .filter((p) => p) || [];
        // If we don't have enough frequently bought products, get from same category
        if (frequentProducts.length < Number(limit)) {
            const additionalProducts = await Product_1.Product.find({
                category: product.category,
                _id: { $ne: product._id, $nin: frequentProducts.map((p) => p._id) },
                isActive: true,
                'inventory.isAvailable': true
            })
                .select('name title price pricing image images rating ratings inventory')
                .limit(Number(limit) - frequentProducts.length)
                .lean();
            frequentProducts.push(...additionalProducts);
        }
        console.log('✅ [FREQUENTLY BOUGHT] Found', frequentProducts.length, 'frequently bought products');
        (0, response_1.sendSuccess)(res, frequentProducts, 'Frequently bought products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [FREQUENTLY BOUGHT] Error:', error);
        throw new errorHandler_1.AppError('Failed to get frequently bought products', 500);
    }
});
// Get bundle products
exports.getBundleProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        console.log('📦 [BUNDLE PRODUCTS] Getting bundle products for:', id);
        const product = await Product_1.Product.findById(id)
            .populate({
            path: 'bundleProducts',
            select: 'name title price pricing image images rating ratings inventory cashback'
        });
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        const bundleProducts = product.bundleProducts || [];
        // Calculate bundle discount if products exist
        let bundleDiscount = 0;
        if (bundleProducts.length > 0) {
            const individualTotal = bundleProducts.reduce((sum, p) => {
                return sum + (p.pricing?.selling || p.price?.current || 0);
            }, 0) + (product.pricing?.selling || 0);
            // Offer 10% bundle discount
            bundleDiscount = Math.round(individualTotal * 0.1);
        }
        const response = {
            mainProduct: {
                id: product._id,
                name: product.name,
                price: product.pricing?.selling || 0
            },
            bundleProducts,
            bundleDiscount,
            bundlePrice: bundleProducts.reduce((sum, p) => {
                return sum + (p.pricing?.selling || p.price?.current || 0);
            }, product.pricing?.selling || 0) - bundleDiscount
        };
        console.log('✅ [BUNDLE PRODUCTS] Returning bundle with', bundleProducts.length, 'products');
        (0, response_1.sendSuccess)(res, response, 'Bundle products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [BUNDLE PRODUCTS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get bundle products', 500);
    }
});
// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
exports.getSearchSuggestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q: searchQuery } = req.query;
    if (!searchQuery || typeof searchQuery !== 'string') {
        return (0, response_1.sendError)(res, 'Search query is required', 400);
    }
    try {
        console.log('🔍 [SEARCH SUGGESTIONS] Getting suggestions for:', searchQuery);
        // Try to get from cache first
        const cacheKey = `product:suggestions:${searchQuery.toLowerCase()}`;
        const cachedSuggestions = await redisService_1.default.get(cacheKey);
        if (cachedSuggestions) {
            console.log('✅ [SEARCH SUGGESTIONS] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedSuggestions, 'Search suggestions retrieved successfully');
        }
        // Search for products matching the query
        const products = await Product_1.Product.find({
            isActive: true,
            'inventory.isAvailable': true,
            name: { $regex: searchQuery, $options: 'i' }
        })
            .select('name')
            .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
            .limit(10)
            .lean();
        // Extract unique product names
        const suggestions = products.map(p => p.name);
        // Cache the results for 5 minutes
        await redisService_1.default.set(cacheKey, suggestions, redis_1.CacheTTL.SHORT_CACHE);
        console.log('✅ [SEARCH SUGGESTIONS] Found', suggestions.length, 'suggestions');
        (0, response_1.sendSuccess)(res, suggestions, 'Search suggestions retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SEARCH SUGGESTIONS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get search suggestions', 500);
    }
});
// Get popular searches - FOR FRONTEND SEARCH
exports.getPopularSearches = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        console.log('🔍 [POPULAR SEARCHES] Getting popular searches with limit:', limit);
        // Try to get from cache first
        const cacheKey = `product:popular-searches:${limit}`;
        const cachedSearches = await redisService_1.default.get(cacheKey);
        if (cachedSearches) {
            console.log('✅ [POPULAR SEARCHES] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedSearches, 'Popular searches retrieved successfully');
        }
        // Get top categories and brands as popular search terms
        const [topCategories, topBrands] = await Promise.all([
            Category_1.Category.find({ isActive: true })
                .sort({ productCount: -1 })
                .limit(5)
                .select('name')
                .lean(),
            Product_1.Product.aggregate([
                { $match: { isActive: true, brand: { $exists: true, $ne: '' } } },
                { $group: { _id: '$brand', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, name: '$_id' } }
            ])
        ]);
        // Combine popular search terms
        const popularSearches = [
            ...topCategories.map(c => c.name),
            ...topBrands.map(b => b.name),
            'best deals',
            'new arrivals',
            'trending'
        ].slice(0, Number(limit));
        // Cache for 1 hour
        await redisService_1.default.set(cacheKey, popularSearches, 3600); // 1 hour in seconds
        console.log('✅ [POPULAR SEARCHES] Returning', popularSearches.length, 'popular searches');
        (0, response_1.sendSuccess)(res, popularSearches, 'Popular searches retrieved successfully');
    }
    catch (error) {
        console.error('❌ [POPULAR SEARCHES] Error:', error);
        throw new errorHandler_1.AppError('Failed to get popular searches', 500);
    }
});
// Get trending products - FOR FRONTEND TRENDING SECTION
exports.getTrendingProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, limit = 20, page = 1, days = 7 } = req.query;
    try {
        console.log('🔥 [TRENDING PRODUCTS] Getting trending products:', {
            category,
            limit,
            page,
            days
        });
        // Try to get from cache first
        const cacheKey = `product:trending:${category || 'all'}:${limit}:${page}:${days}`;
        const cachedProducts = await redisService_1.default.get(cacheKey);
        if (cachedProducts) {
            console.log('✅ [TRENDING PRODUCTS] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedProducts, 'Trending products retrieved successfully');
        }
        // Calculate date threshold for trending (default last 7 days)
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(days));
        // Build query
        const query = {
            isActive: true,
            'inventory.isAvailable': true,
            createdAt: { $gte: daysAgo } // Only products from last N days
        };
        if (category) {
            query.category = category;
        }
        // Aggregate trending products with weighted scoring
        const trendingProducts = await Product_1.Product.aggregate([
            { $match: query },
            {
                $addFields: {
                    // Calculate trending score: (views * 1) + (purchases * 5) + (wishlist * 2)
                    trendingScore: {
                        $add: [
                            { $ifNull: ['$analytics.views', 0] },
                            { $multiply: [{ $ifNull: ['$analytics.purchases', 0] }, 5] },
                            { $multiply: [{ $ifNull: ['$analytics.wishlistCount', 0] }, 2] }
                        ]
                    }
                }
            },
            { $sort: { trendingScore: -1, 'analytics.views': -1 } },
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: 'stores',
                    localField: 'store',
                    foreignField: '_id',
                    as: 'storeDetails'
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    images: 1,
                    price: 1,
                    originalPrice: 1,
                    discount: 1,
                    ratings: 1,
                    analytics: 1,
                    trendingScore: 1,
                    inventory: 1,
                    category: { $arrayElemAt: ['$categoryDetails.name', 0] },
                    store: {
                        _id: { $arrayElemAt: ['$storeDetails._id', 0] },
                        name: { $arrayElemAt: ['$storeDetails.name', 0] },
                        logo: { $arrayElemAt: ['$storeDetails.logo', 0] }
                    }
                }
            }
        ]);
        // Get total count for pagination
        const totalCount = await Product_1.Product.countDocuments({
            ...query,
            $expr: {
                $gt: [
                    {
                        $add: [
                            { $ifNull: ['$analytics.views', 0] },
                            { $multiply: [{ $ifNull: ['$analytics.purchases', 0] }, 5] },
                            { $multiply: [{ $ifNull: ['$analytics.wishlistCount', 0] }, 2] }
                        ]
                    },
                    0
                ]
            }
        });
        const result = {
            products: trendingProducts,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(totalCount / Number(limit))
            }
        };
        // Cache for 30 minutes (trending data changes frequently)
        await redisService_1.default.set(cacheKey, result, 1800); // 30 minutes in seconds
        console.log('✅ [TRENDING PRODUCTS] Returning', trendingProducts.length, 'trending products');
        (0, response_1.sendSuccess)(res, result, 'Trending products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [TRENDING PRODUCTS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get trending products', 500);
    }
});
// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
exports.getRelatedProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    try {
        console.log('🔗 [RELATED PRODUCTS] Getting related products for:', id);
        // Try to get from cache first
        // Added :v2 suffix to bust old cache with missing price data
        const cacheKey = `${cacheHelper_1.CacheKeys.productRecommendations(id, Number(limit))}:v2`;
        const cachedProducts = await redisService_1.default.get(cacheKey);
        if (cachedProducts) {
            console.log('✅ [RELATED PRODUCTS] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedProducts, 'Related products retrieved successfully');
        }
        const product = await Product_1.Product.findById(id);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        // Get related products from the same category OR same brand
        const relatedProducts = await Product_1.Product.find({
            $or: [
                { category: product.category },
                { brand: product.brand }
            ],
            _id: { $ne: id },
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('store', 'name logo')
            .populate('category', 'name slug')
            .sort({ 'ratings.average': -1, 'analytics.views': -1 })
            .limit(Number(limit))
            .lean();
        // ✅ CRITICAL FIX: Transform data for frontend
        const transformedRelatedProducts = relatedProducts.map((product) => {
            // Safely extract pricing
            const sellingPrice = product.pricing?.selling || product.price || 0;
            const originalPrice = product.pricing?.original || product.originalPrice || sellingPrice;
            const discount = product.pricing?.discount ||
                (originalPrice > sellingPrice ?
                    Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);
            // Safely extract image
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || 'Unnamed Product',
                image: productImage,
                price: sellingPrice, // ✅ FIXED: Now properly extracts price
                originalPrice: originalPrice,
                discount: discount,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                brand: product.brand || '',
                cashback: (product.cashback?.percentage || 0) > 0,
                cashbackPercentage: product.cashback?.percentage || 0,
                category: product.category?.name || (typeof product.category === 'string' ? product.category : ''),
                store: product.store,
            };
        });
        // Cache the results
        await redisService_1.default.set(cacheKey, transformedRelatedProducts, redis_1.CacheTTL.PRODUCT_DETAIL);
        console.log('✅ [RELATED PRODUCTS] Found', transformedRelatedProducts.length, 'related products');
        (0, response_1.sendSuccess)(res, transformedRelatedProducts, 'Related products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [RELATED PRODUCTS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get related products', 500);
    }
});
// Check product availability - FOR FRONTEND CART/CHECKOUT
exports.checkAvailability = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { variantId, quantity = 1 } = req.query;
    try {
        console.log('✅ [CHECK AVAILABILITY] Checking availability for product:', id);
        const product = await Product_1.Product.findById(id);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        let availableStock = product.inventory.stock;
        let isLowStock = false;
        // Check variant stock if variantId is provided
        if (variantId && product.inventory.variants) {
            const variant = product.inventory.variants.find((v) => v._id?.toString() === variantId || v.sku === variantId);
            if (variant) {
                availableStock = variant.stock;
            }
            else {
                return (0, response_1.sendNotFound)(res, 'Variant not found');
            }
        }
        // Check if unlimited (digital products)
        if (product.inventory.unlimited) {
            return (0, response_1.sendSuccess)(res, {
                available: true,
                maxQuantity: 999,
                isLowStock: false,
                estimatedRestockDate: null
            }, 'Product availability checked successfully');
        }
        // Check stock availability
        const requestedQuantity = Number(quantity);
        const available = availableStock >= requestedQuantity;
        isLowStock = availableStock <= (product.inventory.lowStockThreshold || 5);
        const response = {
            available,
            maxQuantity: availableStock,
            isLowStock,
            estimatedRestockDate: !available && availableStock === 0 ?
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : // 7 days from now
                null
        };
        console.log('✅ [CHECK AVAILABILITY] Availability:', response);
        (0, response_1.sendSuccess)(res, response, 'Product availability checked successfully');
    }
    catch (error) {
        console.error('❌ [CHECK AVAILABILITY] Error:', error);
        throw new errorHandler_1.AppError('Failed to check product availability', 500);
    }
});
// Get popular products - FOR FRONTEND "Popular" SECTION
exports.getPopularProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        console.log('🔥 [POPULAR PRODUCTS] Getting popular products with limit:', limit);
        // Query products sorted by purchases (most ordered first)
        const products = await Product_1.Product.find({
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .populate('store', 'name logo operationalInfo location')
            .sort({ 'analytics.purchases': -1, 'analytics.views': -1 })
            .limit(Number(limit))
            .lean();
        console.log('✅ [POPULAR PRODUCTS] Found', products.length, 'popular products');
        // Transform data to include delivery info from store
        const transformedProducts = products.map((product) => {
            // Safely extract image
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || product.title || 'Unnamed Product',
                image: productImage,
                price: product.pricing?.selling || 0,
                originalPrice: product.pricing?.original || product.pricing?.selling || 0,
                discount: product.pricing?.discount || 0,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                purchases: product.analytics?.purchases || 0,
                category: product.category?.name || '',
                store: {
                    _id: product.store?._id,
                    name: product.store?.name || '',
                    logo: product.store?.logo || '',
                    deliveryTime: product.store?.operationalInfo?.deliveryTime || '30-45 min',
                    deliveryFee: product.store?.operationalInfo?.deliveryFee || 0,
                    city: product.store?.location?.city || ''
                }
            };
        });
        console.log('✅ [POPULAR PRODUCTS] Returning', transformedProducts.length, 'products');
        (0, response_1.sendSuccess)(res, transformedProducts, 'Popular products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [POPULAR PRODUCTS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get popular products', 500);
    }
});
// Get nearby products - FOR FRONTEND "In Your Area" SECTION
exports.getNearbyProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { longitude, latitude, radius = 10, // default 10km
    limit = 10 } = req.query;
    try {
        console.log('📍 [NEARBY PRODUCTS] Getting nearby products:', {
            longitude, latitude, radius, limit
        });
        // Validate coordinates
        if (!longitude || !latitude) {
            return (0, response_1.sendError)(res, 'Longitude and latitude are required', 400);
        }
        const lng = parseFloat(longitude);
        const lat = parseFloat(latitude);
        const radiusKm = parseFloat(radius);
        const limitNum = parseInt(limit);
        if (isNaN(lng) || isNaN(lat)) {
            return (0, response_1.sendError)(res, 'Invalid coordinates', 400);
        }
        // Step 1: Find nearby stores using geospatial query
        const nearbyStores = await Store_1.Store.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    distanceField: 'distance',
                    maxDistance: radiusKm * 1000, // Convert km to meters
                    spherical: true,
                    query: { isActive: true }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    logo: 1,
                    operationalInfo: 1,
                    location: 1,
                    distance: { $divide: ['$distance', 1000] } // Convert to km
                }
            },
            { $limit: 50 } // Get up to 50 nearby stores
        ]);
        console.log('📍 [NEARBY PRODUCTS] Found', nearbyStores.length, 'nearby stores');
        if (nearbyStores.length === 0) {
            return (0, response_1.sendSuccess)(res, [], 'No nearby products found');
        }
        // Step 2: Get products from nearby stores
        const storeIds = nearbyStores.map(s => s._id);
        const storeMap = new Map(nearbyStores.map(s => [s._id.toString(), s]));
        const products = await Product_1.Product.find({
            store: { $in: storeIds },
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .sort({ 'analytics.purchases': -1 })
            .limit(limitNum)
            .lean();
        console.log('✅ [NEARBY PRODUCTS] Found', products.length, 'products from nearby stores');
        // Transform data with distance info
        const transformedProducts = products.map((product) => {
            const store = storeMap.get(product.store?.toString());
            // Safely extract image
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || product.title || 'Unnamed Product',
                image: productImage,
                price: product.pricing?.selling || 0,
                originalPrice: product.pricing?.original || product.pricing?.selling || 0,
                discount: product.pricing?.discount || 0,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                category: product.category?.name || '',
                store: {
                    _id: store?._id,
                    name: store?.name || '',
                    logo: store?.logo || '',
                    deliveryTime: store?.operationalInfo?.deliveryTime || '30-45 min',
                    deliveryFee: store?.operationalInfo?.deliveryFee || 0,
                    city: store?.location?.city || '',
                    distance: store?.distance ? parseFloat(store.distance.toFixed(1)) : null
                }
            };
        });
        // Sort by distance (closest first)
        transformedProducts.sort((a, b) => {
            if (a.store.distance === null)
                return 1;
            if (b.store.distance === null)
                return -1;
            return a.store.distance - b.store.distance;
        });
        console.log('✅ [NEARBY PRODUCTS] Returning', transformedProducts.length, 'products');
        (0, response_1.sendSuccess)(res, transformedProducts, 'Nearby products retrieved successfully');
    }
    catch (error) {
        console.error('❌ [NEARBY PRODUCTS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get nearby products', 500);
    }
});
// Get hot deals products - FOR FRONTEND "Hot Deals" SECTION
exports.getHotDeals = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        console.log('🔥 [HOT DEALS] Getting hot deals with limit:', limit);
        // Step 1: Try to find products with 'hot-deal' tag
        let products = await Product_1.Product.find({
            tags: 'hot-deal',
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .populate('store', 'name logo operationalInfo location')
            .sort({ 'cashback.percentage': -1 })
            .limit(Number(limit))
            .lean();
        console.log('🔥 [HOT DEALS] Found', products.length, 'products with hot-deal tag');
        // Step 2: Fallback to high-cashback products if no tagged products
        if (products.length === 0) {
            console.log('🔥 [HOT DEALS] No tagged products, falling back to high-cashback');
            products = await Product_1.Product.find({
                isActive: true,
                'inventory.isAvailable': true,
                'cashback.percentage': { $gte: 15 },
                'cashback.isActive': true
            })
                .populate('category', 'name slug')
                .populate('store', 'name logo operationalInfo location')
                .sort({ 'cashback.percentage': -1 })
                .limit(Number(limit))
                .lean();
            console.log('🔥 [HOT DEALS] Found', products.length, 'high-cashback products');
        }
        // Transform data for frontend
        const transformedProducts = products.map((product) => {
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || 'Unnamed Product',
                image: productImage,
                price: product.pricing?.selling || 0,
                originalPrice: product.pricing?.original || product.pricing?.selling || 0,
                discount: product.pricing?.discount || 0,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                cashbackPercentage: product.cashback?.percentage || 0,
                category: product.category?.name || '',
                store: {
                    _id: product.store?._id,
                    name: product.store?.name || '',
                    logo: product.store?.logo || '',
                    city: product.store?.location?.city || ''
                }
            };
        });
        console.log('✅ [HOT DEALS] Returning', transformedProducts.length, 'hot deals');
        (0, response_1.sendSuccess)(res, transformedProducts, 'Hot deals retrieved successfully');
    }
    catch (error) {
        console.error('❌ [HOT DEALS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get hot deals', 500);
    }
});
// Get products by category slug - FOR FRONTEND HOMEPAGE CATEGORY SECTIONS
exports.getProductsByCategorySlugHomepage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { categorySlug } = req.params;
    const { limit = 10 } = req.query;
    try {
        console.log('📂 [CATEGORY SECTION] Getting products for category:', categorySlug, 'limit:', limit);
        // Find the category by slug
        const category = await Category_1.Category.findOne({
            slug: categorySlug,
            isActive: true
        });
        if (!category) {
            console.log('⚠️ [CATEGORY SECTION] Category not found:', categorySlug);
            return (0, response_1.sendSuccess)(res, [], 'Category not found');
        }
        // Get products in this category
        const products = await Product_1.Product.find({
            category: category._id,
            isActive: true,
            'inventory.isAvailable': true
        })
            .populate('category', 'name slug')
            .populate('store', 'name logo operationalInfo location')
            .sort({ 'cashback.percentage': -1, 'analytics.purchases': -1 })
            .limit(Number(limit))
            .lean();
        console.log('📂 [CATEGORY SECTION] Found', products.length, 'products for', categorySlug);
        // Transform data for frontend (same format as getHotDeals)
        const transformedProducts = products.map((product) => {
            let productImage = '';
            if (Array.isArray(product.images) && product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            }
            else if (product.image) {
                productImage = product.image;
            }
            return {
                id: product._id.toString(),
                _id: product._id.toString(),
                name: product.name || 'Unnamed Product',
                image: productImage,
                price: product.pricing?.selling || 0,
                originalPrice: product.pricing?.original || product.pricing?.selling || 0,
                discount: product.pricing?.discount || 0,
                rating: product.ratings?.average || 0,
                reviewCount: product.ratings?.count || 0,
                cashbackPercentage: product.cashback?.percentage || 0,
                category: product.category?.name || '',
                categorySlug: product.category?.slug || '',
                store: {
                    _id: product.store?._id,
                    name: product.store?.name || '',
                    logo: product.store?.logo || '',
                    city: product.store?.location?.city || ''
                }
            };
        });
        console.log('✅ [CATEGORY SECTION] Returning', transformedProducts.length, 'products for', categorySlug);
        (0, response_1.sendSuccess)(res, transformedProducts, `Products for ${category.name} retrieved successfully`);
    }
    catch (error) {
        console.error('❌ [CATEGORY SECTION] Error:', error);
        throw new errorHandler_1.AppError('Failed to get products by category', 500);
    }
});

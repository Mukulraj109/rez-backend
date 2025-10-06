"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = exports.searchProducts = exports.getNewArrivals = exports.getFeaturedProducts = exports.getProductsByStore = exports.getProductsByCategory = exports.getProductById = exports.getProducts = void 0;
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
const redis_1 = require("../config/redis");
const cacheHelper_1 = require("../utils/cacheHelper");
// Get all products with filtering and pagination
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy = 'createdAt', page = 1, limit = 20 } = req.query;
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
    try {
        let productsQuery = Product_1.Product.find(query)
            .populate('category', 'name slug')
            .populate('store', 'name logo location.city');
        // Apply search if provided
        if (search) {
            productsQuery = Product_1.Product.find({
                ...query,
                $text: { $search: search }
            }, { score: { $meta: 'textScore' } })
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
        (0, response_1.sendPaginated)(res, products, Number(page), Number(limit), totalProducts);
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
            .populate('store', 'name logo location contact ratings operationalInfo');
        console.log('📦 [GET PRODUCT BY ID] Product found:', product ? 'Yes' : 'No');
        if (!product) {
            console.log('❌ [GET PRODUCT BY ID] Product not found or not active');
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
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
        const response = {
            ...product.toObject(),
            similarProducts
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
        // Verify store exists
        const store = await Store_1.Store.findOne({
            _id: storeId,
            isActive: true
        });
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Build query
        const query = {
            store: storeId,
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
            .populate('store', 'name slug logo')
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
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
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
            .populate('store', 'name logo')
            .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
            .limit(Number(limit))
            .lean();
        (0, response_1.sendSuccess)(res, recommendations, 'Product recommendations retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get recommendations', 500);
    }
});

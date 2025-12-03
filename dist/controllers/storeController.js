"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyNewProduct = exports.notifyNewOffer = exports.sendFollowerNotification = exports.getStoreFollowers = exports.getStoreFollowerCount = exports.getTrendingStores = exports.getStoreCategories = exports.advancedStoreSearch = exports.searchStoresByDeliveryTime = exports.searchStoresByCategory = exports.getStoreOperatingStatus = exports.getStoresByCategory = exports.searchStores = exports.getFeaturedStores = exports.getNearbyStores = exports.getStoreProducts = exports.getStoreById = exports.getStores = void 0;
const Store_1 = require("../models/Store");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const redisService_1 = __importDefault(require("../services/redisService"));
const searchHistoryService_1 = require("../services/searchHistoryService");
// Get all stores with filtering and pagination
exports.getStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, location, radius = 10, rating, isOpen, search, tags, isFeatured, sortBy = 'rating', page = 1, limit = 20 } = req.query;
    try {
        const query = { isActive: true };
        // Apply filters
        if (category)
            query.category = category;
        if (rating)
            query['ratings.average'] = { $gte: Number(rating) };
        // Filter by tags
        if (tags) {
            // tags can be a string or array - handle both
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query.tags = { $in: tagArray.map(tag => new RegExp(tag, 'i')) };
        }
        // Filter by featured status
        if (isFeatured !== undefined) {
            // Convert query parameter to boolean
            const isFeaturedValue = typeof isFeatured === 'string'
                ? isFeatured.toLowerCase() === 'true'
                : Boolean(isFeatured);
            query.isFeatured = isFeaturedValue;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        // Location-based filtering
        if (location) {
            const [lng, lat] = location.toString().split(',').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
                query['location.coordinates'] = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: Number(radius) * 1000 // Convert km to meters
                    }
                };
            }
        }
        // Sorting
        const sortOptions = {};
        switch (sortBy) {
            case 'rating':
                sortOptions['ratings.average'] = -1;
                break;
            case 'distance':
                // Distance sorting is handled by $near in location query
                break;
            case 'name':
                sortOptions.name = 1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            default:
                sortOptions['ratings.average'] = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        console.log('🔍 [GET STORES] Query:', JSON.stringify(query));
        console.log('🔍 [GET STORES] Sort options:', sortOptions);
        const stores = await Store_1.Store.find(query)
            .populate({
            path: 'category',
            select: 'name slug',
            options: { strictPopulate: false }
        })
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        console.log(`✅ [GET STORES] Found ${stores.length} stores`);
        // Filter by open status if requested
        let filteredStores = stores;
        if (isOpen === 'true') {
            filteredStores = stores.filter((store) => {
                // Simple open check - in a real app, you'd implement the isOpen method
                return store.isActive;
            });
        }
        const total = await Store_1.Store.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        // Log search history for authenticated users (async, don't block)
        if (req.user && search) {
            (0, searchHistoryService_1.logStoreSearch)(req.user._id, search, total, {
                category: category,
                location: location,
                rating: rating ? Number(rating) : undefined,
                tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined
            }).catch(err => console.error('Failed to log store search:', err));
        }
        (0, response_1.sendSuccess)(res, {
            stores: filteredStores,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Stores retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET STORES] Error fetching stores:', error);
        throw new errorHandler_1.AppError('Failed to fetch stores', 500);
    }
});
// Get single store by ID or slug
exports.getStoreById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    try {
        console.log('🔍 [GET STORE] Fetching store:', storeId);
        const query = storeId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: storeId }
            : { slug: storeId };
        console.log('🔍 [GET STORE] Query:', query);
        const store = await Store_1.Store.findOne({ ...query, isActive: true })
            .populate('category', 'name slug')
            .lean();
        console.log('🔍 [GET STORE] Store found:', !!store);
        if (!store) {
            console.error('❌ [GET STORE] Store not found or not active');
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Debug: Log what fields are available in the store
        console.log('✅ [GET STORE] Store retrieved:', store.name);
        console.log('📋 [GET STORE] Store fields check:', {
            hasDescription: !!store.description,
            hasContact: !!store.contact,
            hasOperationalInfo: !!store.operationalInfo,
            contact: store.contact,
            operationalInfo: store.operationalInfo,
            description: store.description,
        });
        // Get store products
        console.log('🔍 [GET STORE] Fetching products for store...');
        const products = await Product_1.Product.find({
            store: store._id,
            isActive: true
        })
            .populate('category', 'name slug')
            .limit(20)
            .sort({ createdAt: -1 })
            .lean();
        console.log('✅ [GET STORE] Found', products.length, 'products');
        // Increment view count (simplified)
        await Store_1.Store.updateOne({ _id: store._id }, { $inc: { 'analytics.views': 1 } });
        (0, response_1.sendSuccess)(res, {
            store,
            products,
            productsCount: await Product_1.Product.countDocuments({ store: store._id, isActive: true })
        }, 'Store retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET STORE] Error:', error.message);
        console.error('❌ [GET STORE] Stack:', error.stack);
        throw new errorHandler_1.AppError(`Failed to fetch store: ${error.message}`, 500);
    }
});
// Get store products
exports.getStoreProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { category, search, sortBy = 'newest', page = 1, limit = 20 } = req.query;
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        const query = { store: storeId, isActive: true };
        if (category)
            query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const sortOptions = {};
        switch (sortBy) {
            case 'price_low':
                sortOptions['pricing.selling'] = 1;
                break;
            case 'price_high':
                sortOptions['pricing.selling'] = -1;
                break;
            case 'rating':
                sortOptions['ratings.average'] = -1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            case 'popular':
                sortOptions['analytics.views'] = -1;
                break;
            default:
                sortOptions.createdAt = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product_1.Product.find(query)
            .populate('category', 'name slug')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Product_1.Product.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            products,
            store: {
                _id: store._id,
                name: store.name,
                slug: store.slug
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Store products retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch store products', 500);
    }
});
// Get nearby stores
exports.getNearbyStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { lng, lat, radius = 5, limit = 10 } = req.query;
    if (!lng || !lat) {
        return (0, response_1.sendBadRequest)(res, 'Longitude and latitude are required');
    }
    try {
        const stores = await Store_1.Store.find({
            isActive: true,
            'contactInfo.location.coordinates': {
                $near: {
                    $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
                    $maxDistance: Number(radius) * 1000 // Convert km to meters
                }
            }
        })
            .populate('categories', 'name slug')
            .limit(Number(limit))
            .lean();
        (0, response_1.sendSuccess)(res, stores, 'Nearby stores retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch nearby stores', 500);
    }
});
// Get featured stores
exports.getFeaturedStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        // First, try to get featured stores
        let stores = await Store_1.Store.find({
            isActive: true,
            isFeatured: true
        })
            .sort({ 'ratings.average': -1, createdAt: -1 })
            .limit(Number(limit))
            .lean();
        // If no featured stores, get all active stores sorted by rating
        if (stores.length === 0) {
            stores = await Store_1.Store.find({
                isActive: true
            })
                .sort({ 'ratings.average': -1, createdAt: -1 })
                .limit(Number(limit))
                .lean();
        }
        // If featured stores exist but less than limit, fill with other active stores
        else if (stores.length < Number(limit)) {
            const featuredIds = stores.map(s => s._id);
            const additionalStores = await Store_1.Store.find({
                isActive: true,
                _id: { $nin: featuredIds }
            })
                .sort({ 'ratings.average': -1, createdAt: -1 })
                .limit(Number(limit) - stores.length)
                .lean();
            stores = [...stores, ...additionalStores];
        }
        (0, response_1.sendSuccess)(res, stores, 'Featured stores retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch featured stores', 500);
    }
});
// Search stores
exports.searchStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q: searchText, page = 1, limit = 20 } = req.query;
    if (!searchText) {
        return (0, response_1.sendBadRequest)(res, 'Search query is required');
    }
    try {
        const query = {
            isActive: true,
            $or: [
                { name: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
                { 'location.address': { $regex: searchText, $options: 'i' } },
                { 'location.city': { $regex: searchText, $options: 'i' } },
                { tags: { $regex: searchText, $options: 'i' } }
            ]
        };
        const skip = (Number(page) - 1) * Number(limit);
        const stores = await Store_1.Store.find(query)
            .populate('category', 'name slug')
            .sort({ 'ratings.average': -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Store_1.Store.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            stores,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Store search completed successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to search stores', 500);
    }
});
// Get store categories
exports.getStoresByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sortBy = 'rating' } = req.query;
    try {
        const query = {
            isActive: true,
            categories: categoryId
        };
        const sortOptions = {};
        switch (sortBy) {
            case 'rating':
                sortOptions['ratings.average'] = -1;
                break;
            case 'name':
                sortOptions.name = 1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            default:
                sortOptions['ratings.average'] = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const stores = await Store_1.Store.find(query)
            .populate('category', 'name slug')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Store_1.Store.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            stores,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Stores by category retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch stores by category', 500);
    }
});
// Get store operating hours and status
exports.getStoreOperatingStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    try {
        const store = await Store_1.Store.findById(storeId).select('operationalInfo name').lean();
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Simple implementation - in a real app, you'd use the isOpen method
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const currentTime = now.toTimeString().slice(0, 5);
        const todayHours = store.operationalInfo?.hours?.[currentDay];
        const isOpen = todayHours && !todayHours.closed &&
            currentTime >= todayHours.open &&
            currentTime <= todayHours.close;
        (0, response_1.sendSuccess)(res, {
            storeId: store._id,
            storeName: store.name,
            isOpen,
            hours: store.operationalInfo?.hours,
            currentTime,
            currentDay
        }, 'Store operating status retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch store operating status', 500);
    }
});
// Search stores by delivery category
exports.searchStoresByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const { location, radius = 10, page = 1, limit = 20, sortBy = 'rating' } = req.query;
    try {
        const query = {
            isActive: true
        };
        console.log('🔍 [SEARCH BY CATEGORY] Requested category:', category);
        // Only add delivery category filter if category is not 'all'
        if (category && category !== 'all') {
            query[`deliveryCategories.${category}`] = true;
        }
        console.log('🔍 [SEARCH BY CATEGORY] Final query:', JSON.stringify(query));
        // Add location filtering - use a simpler approach for now
        // Note: We'll calculate distances after fetching stores to avoid $nearSphere pagination issues
        // Sorting options
        const sortOptions = {};
        switch (sortBy) {
            case 'rating':
                sortOptions['ratings.average'] = -1;
                break;
            case 'distance':
                // Distance sorting is handled by $near in location query
                break;
            case 'name':
                sortOptions.name = 1;
                break;
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            default:
                sortOptions['ratings.average'] = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        // First check if there are any stores matching the query
        const total = await Store_1.Store.countDocuments(query);
        console.log(`✅ [SEARCH BY CATEGORY] Found ${total} stores matching query`);
        let stores = [];
        if (total > 0) {
            stores = await Store_1.Store.find(query)
                .populate({
                path: 'category',
                select: 'name slug',
                options: { strictPopulate: false }
            })
                .select('name slug description logo banner location ratings operationalInfo deliveryCategories isActive isFeatured offers tags createdAt contact')
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .lean();
            // Populate products for each store
            for (const store of stores) {
                const products = await Product_1.Product.find({
                    store: store._id,
                    isActive: true
                })
                    .select('name title slug pricing price images image ratings rating inventory tags brand category')
                    .populate('category', 'name slug')
                    .limit(4) // Limit to 4 products per store
                    .lean();
                // Transform products to match frontend ProductItem type
                const transformedProducts = products.map((product) => {
                    // Extract price values from either price or pricing fields
                    const selling = product.price?.current || product.pricing?.selling || product.pricing?.salePrice || product.pricing?.base || 0;
                    const original = product.price?.original || product.pricing?.original || product.pricing?.basePrice || product.pricing?.mrp || selling;
                    const discount = original > selling ? Math.round(((original - selling) / original) * 100) : 0;
                    return {
                        productId: product._id.toString(),
                        name: product.name || product.title || '',
                        description: product.description || '',
                        price: selling, // Current/selling price as number
                        originalPrice: original > selling ? original : undefined,
                        discountPercentage: discount || undefined,
                        imageUrl: product.images?.[0] || product.image || 'https://via.placeholder.com/300',
                        imageAlt: product.name,
                        hasRezPay: true,
                        inStock: product.inventory?.isAvailable !== false,
                        category: product.category?.name || '',
                        subcategory: product.subcategory?.name || '',
                        brand: product.brand || '',
                        rating: product.ratings?.average || product.rating?.value || 0,
                        reviewCount: product.ratings?.count || product.rating?.count || 0,
                        sizes: product.variants?.map((v) => v.size).filter(Boolean) || [],
                        colors: product.variants?.map((v) => v.color).filter(Boolean) || [],
                        tags: product.tags || []
                    };
                });
                store.products = transformedProducts;
            }
            console.log(`✅ [SEARCH BY CATEGORY] Populated ${stores.length} stores with products`);
            if (stores.length > 0 && stores[0].products) {
                console.log(`  First store "${stores[0].name}" has ${stores[0].products.length} products`);
                if (stores[0].products.length > 0) {
                    const p = stores[0].products[0];
                    console.log(`  First product: "${p.name}", price: ${p.price} (type: ${typeof p.price}), rating: ${p.rating}`);
                }
            }
        }
        // Calculate distance for each store if location is provided
        let storesWithDistance = stores;
        if (location && stores.length > 0) {
            const [lng, lat] = location.toString().split(',').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
                const radiusKm = Number(radius);
                storesWithDistance = stores
                    .map((store) => {
                    if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
                        try {
                            const distance = calculateDistance([lng, lat], store.location.coordinates);
                            return { ...store, distance: Math.round(distance * 100) / 100 };
                        }
                        catch (error) {
                            console.error('Error calculating distance for store:', store._id, error);
                            return { ...store, distance: null };
                        }
                    }
                    return { ...store, distance: null };
                })
                    .filter((store) => {
                    // Filter by radius if distance was calculated
                    if (store.distance !== null && store.distance !== undefined) {
                        return store.distance <= radiusKm;
                    }
                    return true; // Include stores without coordinates
                });
            }
        }
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            stores: storesWithDistance,
            category,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, `Stores found for category: ${category}`);
    }
    catch (error) {
        console.error('Search stores by category error:', error);
        throw new errorHandler_1.AppError('Failed to search stores by category', 500);
    }
});
// Search stores by delivery time range
exports.searchStoresByDeliveryTime = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { minTime = 15, maxTime = 60, location, radius = 10, page = 1, limit = 20 } = req.query;
    try {
        const query = { isActive: true };
        // Add location filtering
        if (location) {
            const [lng, lat] = location.toString().split(',').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
                query['location.coordinates'] = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: Number(radius) * 1000
                    }
                };
            }
        }
        const stores = await Store_1.Store.find(query)
            .populate('category', 'name slug')
            .sort({ 'ratings.average': -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();
        // Filter stores by delivery time range
        const filteredStores = stores.filter((store) => {
            const deliveryTime = store.operationalInfo?.deliveryTime;
            if (!deliveryTime)
                return false;
            // Extract time range from string like "30-45 mins"
            const timeMatch = deliveryTime.match(/(\d+)-(\d+)/);
            if (timeMatch) {
                const minDeliveryTime = parseInt(timeMatch[1]);
                const maxDeliveryTime = parseInt(timeMatch[2]);
                return minDeliveryTime >= Number(minTime) && maxDeliveryTime <= Number(maxTime);
            }
            // Handle single time like "30 mins"
            const singleTimeMatch = deliveryTime.match(/(\d+)/);
            if (singleTimeMatch) {
                const deliveryTime = parseInt(singleTimeMatch[1]);
                return deliveryTime >= Number(minTime) && deliveryTime <= Number(maxTime);
            }
            return false;
        });
        const total = filteredStores.length;
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            stores: filteredStores,
            deliveryTimeRange: { min: Number(minTime), max: Number(maxTime) },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, `Stores found with delivery time ${minTime}-${maxTime} minutes`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to search stores by delivery time', 500);
    }
});
// Advanced store search with filters
exports.advancedStoreSearch = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { search, category, deliveryTime, priceRange, rating, paymentMethods, features, sortBy = 'rating', location, radius = 10, page = 1, limit = 20 } = req.query;
    try {
        const query = { isActive: true };
        // Text search
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'basicInfo.cuisine': { $regex: search, $options: 'i' } }
            ];
        }
        // Category filtering
        if (category) {
            query[`deliveryCategories.${category}`] = true;
        }
        // Delivery time filtering
        if (deliveryTime) {
            const [minTime, maxTime] = deliveryTime.toString().split('-').map(Number);
            if (!isNaN(minTime) && !isNaN(maxTime)) {
                query['operationalInfo.deliveryTime'] = {
                    $gte: minTime,
                    $lte: maxTime
                };
            }
        }
        // Price range filtering
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.toString().split('-').map(Number);
            if (!isNaN(minPrice) && !isNaN(maxPrice)) {
                query['operationalInfo.minimumOrder'] = {
                    $gte: minPrice,
                    $lte: maxPrice
                };
            }
        }
        // Rating filtering
        if (rating) {
            query['ratings.average'] = { $gte: Number(rating) };
        }
        // Payment methods filtering
        if (paymentMethods) {
            const methods = paymentMethods.toString().split(',');
            query['operationalInfo.paymentMethods'] = { $in: methods };
        }
        // Features filtering
        if (features) {
            const featureList = features.toString().split(',');
            featureList.forEach((feature) => {
                switch (feature) {
                    case 'freeDelivery':
                        query['operationalInfo.freeDeliveryAbove'] = { $exists: true };
                        break;
                    case 'walletPayment':
                        query['operationalInfo.acceptsWalletPayment'] = true;
                        break;
                    case 'verified':
                        query.isVerified = true;
                        break;
                    case 'featured':
                        query.isFeatured = true;
                        break;
                }
            });
        }
        // Location-based filtering
        if (location) {
            const [lng, lat] = location.toString().split(',').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
                query['location.coordinates'] = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: Number(radius) * 1000
                    }
                };
            }
        }
        // Sorting
        let sort = {};
        switch (sortBy) {
            case 'rating':
                sort = { 'ratings.average': -1, 'ratings.count': -1 };
                break;
            case 'distance':
                // Distance sorting is handled by $near query
                sort = { 'ratings.average': -1 };
                break;
            case 'name':
                sort = { name: 1 };
                break;
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'price':
                sort = { 'operationalInfo.minimumOrder': 1 };
                break;
            default:
                sort = { 'ratings.average': -1 };
        }
        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const stores = await Store_1.Store.find(query)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'name slug')
            .lean();
        const total = await Store_1.Store.countDocuments(query);
        // Calculate distances if location provided
        if (location && stores.length > 0) {
            const [lng, lat] = location.toString().split(',').map(Number);
            stores.forEach((store) => {
                if (store.location?.coordinates) {
                    store.distance = calculateDistance([lng, lat], store.location.coordinates);
                }
            });
        }
        (0, response_1.sendSuccess)(res, {
            stores,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalStores: total,
                hasNextPage: skip + stores.length < total,
                hasPrevPage: Number(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Advanced store search error:', error);
        throw new errorHandler_1.AppError('Failed to search stores', 500);
    }
});
// Get available store categories
exports.getStoreCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const categories = [
            {
                id: 'fastDelivery',
                name: '30 min delivery',
                description: 'Fast food delivery in 30 minutes or less',
                icon: '🚀',
                color: '#7B61FF'
            },
            {
                id: 'budgetFriendly',
                name: '1 rupees store',
                description: 'Ultra-budget items starting from 1 rupee',
                icon: '💰',
                color: '#6E56CF'
            },
            {
                id: 'premium',
                name: 'Luxury store',
                description: 'Premium brands and luxury products',
                icon: '👑',
                color: '#A78BFA'
            },
            {
                id: 'organic',
                name: 'Organic Store',
                description: '100% organic and natural products',
                icon: '🌱',
                color: '#34D399'
            },
            {
                id: 'alliance',
                name: 'Alliance Store',
                description: 'Trusted neighborhood supermarkets',
                icon: '🤝',
                color: '#9F7AEA'
            },
            {
                id: 'lowestPrice',
                name: 'Lowest Price',
                description: 'Guaranteed lowest prices with price match',
                icon: '💸',
                color: '#22D3EE'
            },
            {
                id: 'mall',
                name: 'Rez Mall',
                description: 'One-stop shopping destination',
                icon: '🏬',
                color: '#60A5FA'
            },
            {
                id: 'cashStore',
                name: 'Cash Store',
                description: 'Cash-only transactions with exclusive discounts',
                icon: '💵',
                color: '#8B5CF6'
            }
        ];
        // Get count for each category
        const categoryCounts = await Promise.all(categories.map(async (category) => {
            const count = await Store_1.Store.countDocuments({
                isActive: true,
                [`deliveryCategories.${category.id}`]: true
            });
            return { ...category, count };
        }));
        (0, response_1.sendSuccess)(res, {
            categories: categoryCounts
        }, 'Store categories retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch store categories', 500);
    }
});
// Get trending stores - FOR FRONTEND TRENDING SECTION
exports.getTrendingStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, limit = 20, page = 1, days = 7 } = req.query;
    try {
        console.log('🔥 [TRENDING STORES] Getting trending stores:', {
            category,
            limit,
            page,
            days
        });
        // Try to get from cache first
        const cacheKey = `store:trending:${category || 'all'}:${limit}:${page}:${days}`;
        const cachedStores = await redisService_1.default.get(cacheKey);
        if (cachedStores) {
            console.log('✅ [TRENDING STORES] Returning from cache');
            return (0, response_1.sendSuccess)(res, cachedStores, 'Trending stores retrieved successfully');
        }
        // Calculate date threshold for trending (default last 7 days)
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(days));
        // Get order counts per store in the last N days
        const orderStats = await Order_1.Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo },
                    status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.store',
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$totals.total' }
                }
            }
        ]);
        // Create a map of store IDs to order stats
        const orderStatsMap = new Map(orderStats.map(stat => [stat._id.toString(), {
                orderCount: stat.orderCount,
                totalRevenue: stat.totalRevenue
            }]));
        // Build query for stores - only require isActive, not isVerified
        // Verified stores will get higher ranking through trending score
        const query = {
            isActive: true
        };
        if (category) {
            query.category = category;
        }
        // Get stores with analytics
        const stores = await Store_1.Store.find(query)
            .select('name logo banner category location ratings analytics contact createdAt description')
            .lean();
        // Calculate trending score for each store
        const storesWithScore = stores
            .map(store => {
            const storeId = store._id.toString();
            const orderData = orderStatsMap.get(storeId) || { orderCount: 0, totalRevenue: 0 };
            // Calculate trending score: (orders * 10) + (views * 1) + (revenue * 0.01) + (rating * 5)
            // Added rating factor so new stores without orders still have a score
            const trendingScore = (orderData.orderCount * 10) +
                (store.analytics?.views || 0) +
                (orderData.totalRevenue * 0.01) +
                ((store.ratings?.average || 0) * 5);
            return {
                ...store,
                trendingScore,
                recentOrders: orderData.orderCount,
                recentRevenue: orderData.totalRevenue
            };
        })
            // Show all active stores, not just ones with activity
            .sort((a, b) => b.trendingScore - a.trendingScore); // Sort by score descending
        // Apply pagination
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedStores = storesWithScore.slice(startIndex, endIndex);
        const result = {
            stores: paginatedStores,
            pagination: {
                total: storesWithScore.length,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(storesWithScore.length / Number(limit))
            }
        };
        // Cache for 30 minutes (trending data changes frequently)
        await redisService_1.default.set(cacheKey, result, 1800); // 30 minutes in seconds
        console.log('✅ [TRENDING STORES] Returning', paginatedStores.length, 'trending stores');
        (0, response_1.sendSuccess)(res, result, 'Trending stores retrieved successfully');
    }
    catch (error) {
        console.error('❌ [TRENDING STORES] Error:', error);
        throw new errorHandler_1.AppError('Failed to get trending stores', 500);
    }
});
// ========================
// FOLLOWER NOTIFICATION ENDPOINTS
// ========================
const followerNotificationService_1 = __importDefault(require("../services/followerNotificationService"));
/**
 * Get follower count for a store
 * GET /api/stores/:storeId/followers/count
 */
exports.getStoreFollowerCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    try {
        const count = await followerNotificationService_1.default.getStoreFollowerCount(storeId);
        (0, response_1.sendSuccess)(res, { count }, 'Follower count retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET FOLLOWER COUNT] Error:', error);
        throw new errorHandler_1.AppError('Failed to get follower count', 500);
    }
});
/**
 * Get all followers of a store (Admin/Merchant only)
 * GET /api/stores/:storeId/followers
 */
exports.getStoreFollowers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.userId;
    try {
        // Verify user is store owner/merchant
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check authorization (store owner or admin)
        if (store.merchantId?.toString() !== userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.AppError('Not authorized to view followers', 403);
        }
        const followerIds = await followerNotificationService_1.default.getStoreFollowers(storeId);
        (0, response_1.sendSuccess)(res, {
            storeId,
            followerCount: followerIds.length,
            followers: followerIds
        }, 'Followers retrieved successfully');
    }
    catch (error) {
        console.error('❌ [GET FOLLOWERS] Error:', error);
        throw new errorHandler_1.AppError('Failed to get followers', 500);
    }
});
/**
 * Send custom notification to all followers
 * POST /api/stores/:storeId/notify-followers
 * Body: { title, message, imageUrl?, deepLink? }
 */
exports.sendFollowerNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { title, message, imageUrl, deepLink } = req.body;
    const userId = req.userId;
    try {
        // Verify user is store owner/merchant
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check authorization (store owner or admin)
        if (store.merchantId?.toString() !== userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.AppError('Not authorized to send notifications', 403);
        }
        // Validate input
        if (!title || !message) {
            return (0, response_1.sendBadRequest)(res, 'Title and message are required');
        }
        const result = await followerNotificationService_1.default.notifyStoreUpdate(storeId, {
            title,
            message,
            imageUrl
        });
        (0, response_1.sendSuccess)(res, result, 'Notifications sent successfully');
    }
    catch (error) {
        console.error('❌ [SEND FOLLOWER NOTIFICATION] Error:', error);
        throw new errorHandler_1.AppError('Failed to send notifications', 500);
    }
});
/**
 * Notify followers about a new offer
 * POST /api/stores/:storeId/notify-offer
 * Body: { offerId, title, description?, discount?, imageUrl? }
 */
exports.notifyNewOffer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { offerId, title, description, discount, imageUrl } = req.body;
    const userId = req.userId;
    try {
        // Verify user is store owner/merchant
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check authorization
        if (store.merchantId?.toString() !== userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        const result = await followerNotificationService_1.default.notifyNewOffer(storeId, {
            _id: offerId,
            title,
            description,
            discount,
            imageUrl
        });
        (0, response_1.sendSuccess)(res, result, 'Offer notification sent to followers');
    }
    catch (error) {
        console.error('❌ [NOTIFY NEW OFFER] Error:', error);
        throw new errorHandler_1.AppError('Failed to send offer notification', 500);
    }
});
/**
 * Notify followers about a new product
 * POST /api/stores/:storeId/notify-product
 * Body: { productId }
 */
exports.notifyNewProduct = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { productId } = req.body;
    const userId = req.userId;
    try {
        // Verify user is store owner/merchant
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendNotFound)(res, 'Store not found');
        }
        // Check authorization
        if (store.merchantId?.toString() !== userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        // Get product details
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return (0, response_1.sendNotFound)(res, 'Product not found');
        }
        const result = await followerNotificationService_1.default.notifyNewProduct(storeId, {
            _id: product._id,
            name: product.name,
            description: product.description,
            pricing: product.pricing,
            images: product.images,
            slug: product.slug
        });
        (0, response_1.sendSuccess)(res, result, 'Product notification sent to followers');
    }
    catch (error) {
        console.error('❌ [NOTIFY NEW PRODUCT] Error:', error);
        throw new errorHandler_1.AppError('Failed to send product notification', 500);
    }
});
// Helper function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

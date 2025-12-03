import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendNotFound,
  sendPaginated,
  sendError
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';
import { CacheKeys, generateQueryCacheKey, withCache } from '../utils/cacheHelper';
import { logProductSearch } from '../services/searchHistoryService';

// Get all products with filtering and pagination
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    store,
    minPrice,
    maxPrice,
    rating,
    inStock,
    featured,
    search,
    sortBy = 'createdAt',
    page = 1,
    limit = 20,
    excludeProducts,
    diversityMode = 'none'
  } = req.query;

  console.log('🔍 [GET PRODUCTS] Query params:', {
    category, store, excludeProducts, diversityMode
  });

  // Try to get from cache first (skip if excludeProducts or diversityMode is used)
  if (!excludeProducts && diversityMode === 'none') {
    const filterHash = generateQueryCacheKey({
      category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit
    });
    const cacheKey = CacheKeys.productList(filterHash);
    const cachedData = await redisService.get<any>(cacheKey);

    if (cachedData) {
      console.log('✅ [GET PRODUCTS] Returning from cache');
      return sendPaginated(res, cachedData.products, Number(page), Number(limit), cachedData.total);
    }
  }

  // Build query
  const query: any = {
    isActive: true,
    'inventory.isAvailable': true
  };

  // Apply filters
  if (category) query.category = category;
  if (store) query.store = store;
  if (featured !== undefined) query.isFeatured = featured === 'true';
  if (inStock === 'true') query['inventory.stock'] = { $gt: 0 };

  // Price range filter
  if (minPrice || maxPrice) {
    query['pricing.selling'] = {};
    if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
    if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
  }

  // Rating filter
  if (rating) {
    query['ratings.average'] = { $gte: Number(rating) };
  }

  // Exclude products filter - parse comma-separated string to ObjectId array
  if (excludeProducts && typeof excludeProducts === 'string') {
    const excludedIds = excludeProducts.split(',').map(id => {
      try {
        return new mongoose.Types.ObjectId(id.trim());
      } catch (error) {
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
    let productsQuery = Product.find(query)
      .populate('category', 'name slug')
      .populate('store', 'name logo location.city');

    // Apply search if provided
    if (search) {
      productsQuery = Product.find({
        ...query,
        $text: { $search: search as string }
      })
        .select({ score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('store', 'name logo location.city')
        .sort({ score: { $meta: 'textScore' } });
    } else {
      // Apply sorting
      let sortOptions: any = {};
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
    const totalProducts = await Product.countDocuments(query);

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);
    const products = await productsQuery
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Track views for authenticated users
    if (req.user && products.length > 0) {
      // Increment view count for products (async, don't wait)
      Product.updateMany(
        { _id: { $in: products.map(p => p._id) } },
        { $inc: { 'analytics.views': 1 } }
      ).catch(console.error);
    }

    // Log search history for authenticated users (async, don't block)
    if (req.user && search) {
      logProductSearch(
        (req.user as any)._id,
        search as string,
        totalProducts,
        {
          category: category as string,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          rating: rating ? Number(rating) : undefined
        }
      ).catch(err => console.error('Failed to log product search:', err));
    }

    // Apply diversity mode if specified
    let finalProducts = products;
    if (diversityMode && diversityMode !== 'none') {
      console.log('🎨 [GET PRODUCTS] Applying diversity mode:', diversityMode);

      // Import diversityService dynamically to avoid circular dependencies
      const { diversityService } = await import('../services/diversityService');

      // Cast products to any to avoid type mismatch (Mongoose lean() types vs DiversityProduct)
      const diverseProducts = await diversityService.applyDiversityMode(
        products as any,
        diversityMode as 'balanced' | 'category_diverse' | 'price_diverse',
        {
          maxPerCategory: 2,
          maxPerBrand: 2,
          priceRanges: 3,
          minRating: 3.0
        }
      );

      // Cast back to original type
      finalProducts = diverseProducts as any;

      console.log('✨ [GET PRODUCTS] Diversity applied. Products:', products.length, '→', finalProducts.length);
    }

    // Cache the results (only if no excludeProducts or diversityMode)
    if (!excludeProducts && diversityMode === 'none') {
      const filterHash = generateQueryCacheKey({
        category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit
      });
      const cacheKey = CacheKeys.productList(filterHash);
      await redisService.set(
        cacheKey,
        { products: finalProducts, total: totalProducts },
        CacheTTL.PRODUCT_LIST
      );
    }

    sendPaginated(res, finalProducts, Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch products', 500);
  }
});

// Get single product by ID
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log('🔍 [GET PRODUCT BY ID] Starting query for ID:', id);

    // Try to get from cache first
    const cacheKey = CacheKeys.product(id);
    const cachedProduct = await redisService.get<any>(cacheKey);

    if (cachedProduct) {
      console.log('✅ [GET PRODUCT BY ID] Returning from cache');
      return sendSuccess(res, cachedProduct, 'Product retrieved successfully');
    }

    const product = await Product.findOne({
      _id: id,
      isActive: true
    })
      .populate('category', 'name slug type')
      .populate('store', 'name logo slug location contact ratings operationalInfo');

    console.log('📦 [GET PRODUCT BY ID] Product found:', product ? 'Yes' : 'No');

    if (!product) {
      console.log('❌ [GET PRODUCT BY ID] Product not found or not active');
      return sendNotFound(res, 'Product not found');
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
        name: (product.store as any)?.name,
        location: (product.store as any)?.location,
        operationalInfo: (product.store as any)?.operationalInfo,
      }
    });

    console.log('🔍 [GET PRODUCT BY ID] Getting similar products...');
    // Get similar products
    const similarProducts = await Product.find({
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
    await redisService.set(cacheKey, response, CacheTTL.PRODUCT_DETAIL);

    console.log('✅ [GET PRODUCT BY ID] Returning product successfully');
    sendSuccess(res, response, 'Product retrieved successfully');

  } catch (error) {
    console.error('❌ [GET PRODUCT BY ID] Error occurred:', error);
    console.error('❌ [GET PRODUCT BY ID] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ [GET PRODUCT BY ID] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch product', 500);
  }
});

// Get products by category
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categorySlug } = req.params;
  const {
    minPrice,
    maxPrice,
    rating,
    sortBy = 'createdAt',
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Try to get from cache first
    const categoryFilterHash = generateQueryCacheKey({ minPrice, maxPrice, rating, sortBy, page, limit });
    const categoryCacheKey = CacheKeys.productsByCategory(categorySlug, categoryFilterHash);
    const cachedData = await redisService.get<any>(categoryCacheKey);

    if (cachedData) {
      console.log('✅ [GET PRODUCTS BY CATEGORY] Returning from cache');
      return sendPaginated(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
    }

    // Find category
    const category = await Category.findOne({
      slug: categorySlug,
      isActive: true
    });

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Build query
    const query: any = {
      category: category._id,
      isActive: true,
      'inventory.isAvailable': true
    };

    // Apply filters
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Get total count
    const totalProducts = await Product.countDocuments(query);

    // Apply sorting
    let sortOptions: any = {};
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
    const products = await Product.find(query)
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
    await redisService.set(
      categoryCacheKey,
      { response, total: totalProducts },
      CacheTTL.PRODUCT_LIST
    );

    sendPaginated(res, [response], Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch products by category', 500);
  }
});

// Get products by store
export const getProductsByStore = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const {
    category,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Check if storeId is a valid ObjectId format (24 hex characters)
    // If not, return empty results immediately since store field only accepts ObjectIds
    if (!mongoose.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
      console.log(`ℹ️ [PRODUCTS] Store ID "${storeId}" is not a valid ObjectId format, returning empty array`);
      return sendPaginated(res, [], Number(page), Number(limit), 0);
    }

    // Try to get from cache first
    const storeFilterHash = generateQueryCacheKey({ category, minPrice, maxPrice, sortBy, page, limit });
    const storeCacheKey = CacheKeys.productsByStore(storeId, storeFilterHash);
    const cachedData = await redisService.get<any>(storeCacheKey);

    if (cachedData) {
      console.log('✅ [GET PRODUCTS BY STORE] Returning from cache');
      return sendPaginated(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
    }

    // Verify store exists
    const store = await Store.findOne({
      _id: new mongoose.Types.ObjectId(storeId),
      isActive: true
    });

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Build query
    const query: any = {
      store: new mongoose.Types.ObjectId(storeId),
      isActive: true,
      'inventory.isAvailable': true
    };

    // Apply filters
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    // Get total count
    const totalProducts = await Product.countDocuments(query);

    // Apply sorting
    let sortOptions: any = {};
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
    const products = await Product.find(query)
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
    await redisService.set(
      storeCacheKey,
      { response, total: totalProducts },
      CacheTTL.STORE_PRODUCTS
    );

    sendPaginated(res, [response], Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch store products', 500);
  }
});

// Get featured products - FOR FRONTEND "Just for You" SECTION
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    console.log('🔍 [FEATURED PRODUCTS] Starting query with limit:', limit);

    // Try to get from cache first
    const cacheKey = CacheKeys.productFeatured(Number(limit));
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      console.log('✅ [FEATURED PRODUCTS] Returning from cache');
      return sendSuccess(res, cachedProducts, 'Featured products retrieved successfully');
    }

    // First, let's check what products exist
    const totalProducts = await Product.countDocuments();
    console.log('📊 [FEATURED PRODUCTS] Total products in database:', totalProducts);

    const featuredCount = await Product.countDocuments({ isFeatured: true });
    console.log('📊 [FEATURED PRODUCTS] Products with isFeatured=true:', featuredCount);

    const activeCount = await Product.countDocuments({ isActive: true });
    console.log('📊 [FEATURED PRODUCTS] Products with isActive=true:', activeCount);

    const inventoryCount = await Product.countDocuments({ 'inventory.isAvailable': true });
    console.log('📊 [FEATURED PRODUCTS] Products with inventory.isAvailable=true:', inventoryCount);

    // Try the full query
    console.log('🔍 [FEATURED PRODUCTS] Executing main query...');
    const products = await Product.find({
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
        category: (product.category as any)?.name || product.category || 'General',
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
    await redisService.set(cacheKey, transformedProducts, CacheTTL.PRODUCT_FEATURED);

    sendSuccess(res, transformedProducts, 'Featured products retrieved successfully');
  } catch (error) {
    console.error('❌ [FEATURED PRODUCTS] Error occurred:', error);
    console.error('❌ [FEATURED PRODUCTS] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ [FEATURED PRODUCTS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch featured products', 500);
  }
});

// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
export const getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    console.log('🔍 [NEW ARRIVALS] Starting query with limit:', limit);

    // Try to get from cache first
    const cacheKey = CacheKeys.productNewArrivals(Number(limit));
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      console.log('✅ [NEW ARRIVALS] Returning from cache');
      return sendSuccess(res, cachedProducts, 'New arrival products retrieved successfully');
    }

    // First, let's check what products exist
    const totalProducts = await Product.countDocuments();
    console.log('📊 [NEW ARRIVALS] Total products in database:', totalProducts);

    const activeCount = await Product.countDocuments({ isActive: true });
    console.log('📊 [NEW ARRIVALS] Products with isActive=true:', activeCount);

    const inventoryCount = await Product.countDocuments({ 'inventory.isAvailable': true });
    console.log('📊 [NEW ARRIVALS] Products with inventory.isAvailable=true:', inventoryCount);

    // Try the query
    console.log('🔍 [NEW ARRIVALS] Executing main query...');
    const products = await Product.find({
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
        category: (product.category as any)?.name || product.category || 'General',
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
    await redisService.set(cacheKey, transformedProducts, CacheTTL.PRODUCT_NEW_ARRIVALS);

    sendSuccess(res, transformedProducts, 'New arrival products retrieved successfully');
  } catch (error) {
    console.error('❌ [NEW ARRIVALS] Error occurred:', error);
    console.error('❌ [NEW ARRIVALS] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ [NEW ARRIVALS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch new arrival products', 500);
  }
});

// Search products
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    q: searchText,
    category,
    store,
    brand,
    minPrice,
    maxPrice,
    rating,
    inStock,
    page = 1,
    limit = 20
  } = req.query;

  if (!searchText) {
    return sendError(res, 'Search query is required', 400);
  }

  try {
    // Try to get from cache first
    const searchFilterHash = generateQueryCacheKey({
      category, store, brand, minPrice, maxPrice, rating, inStock, page, limit
    });
    const searchCacheKey = CacheKeys.productSearch(searchText as string, searchFilterHash);
    const cachedData = await redisService.get<any>(searchCacheKey);

    if (cachedData) {
      console.log('✅ [SEARCH PRODUCTS] Returning from cache');
      return sendPaginated(res, cachedData.products, Number(page), Number(limit), cachedData.total);
    }

    // Build filters
    const filters: any = {};
    if (category) filters.category = category;
    if (store) filters.store = store;
    if (brand) filters.brand = brand;
    if (minPrice || maxPrice) {
      filters.priceRange = {};
      if (minPrice) filters.priceRange.min = Number(minPrice);
      if (maxPrice) filters.priceRange.max = Number(maxPrice);
    }
    if (rating) filters.rating = Number(rating);
    if (inStock === 'true') filters.inStock = true;

    // Pagination options
    const options = {
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit)
    };

    // Search products using text search and filters
    const searchQuery: any = {
      isActive: true,
      $text: { $search: searchText as string }
    };

    // Apply filters to the query
    if (filters.category) searchQuery.category = filters.category;
    if (filters.store) searchQuery.store = filters.store;
    if (filters.priceRange) {
      searchQuery.basePrice = {};
      if (filters.priceRange.min) searchQuery.basePrice.$gte = filters.priceRange.min;
      if (filters.priceRange.max) searchQuery.basePrice.$lte = filters.priceRange.max;
    }
    if (filters.rating) searchQuery.averageRating = { $gte: filters.rating };
    if (filters.inStock) searchQuery.inventory = { $gt: 0 };

    const products = await Product.find(searchQuery)
      .populate('category', 'name slug')
      .populate('store', 'name slug')
      .skip(options.skip)
      .limit(options.limit)
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .lean();

    // Get total count for the same search
    const totalQuery = Product.find({
      $text: { $search: searchText as string },
      isActive: true,
      ...filters
    });

    const total = await totalQuery.countDocuments();

    // Cache the results
    await redisService.set(
      searchCacheKey,
      { products, total },
      CacheTTL.PRODUCT_SEARCH
    );

    sendPaginated(res, products, Number(page), Number(limit), total);

  } catch (error) {
    throw new AppError('Search failed', 500);
  }
});

// Get product recommendations
export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit = 6 } = req.query;

  try {
    console.log('🔍 [RECOMMENDATIONS] Getting recommendations for product:', productId);

    const product = await Product.findById(productId);

    if (!product) {
      return sendNotFound(res, 'Product not found');
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

    const recommendations = await Product.find({
      category: product.category,
      _id: { $ne: productId },
      isActive: true,
      'inventory.isAvailable': true,
      'pricing.selling': {
        $gte: priceRange.min,
        $lte: priceRange.max
      }
    })
      .populate('category', 'name slug')  // ✅ Populate category
      .populate('store', 'name logo')
      .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
      .limit(Number(limit))
      .lean();

    console.log('✅ [RECOMMENDATIONS] Found', recommendations.length, 'recommendations');

    // ✅ CRITICAL FIX: Transform data for frontend
    const transformedRecommendations = recommendations.map((product: any) => {
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
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: sellingPrice,  // ✅ FIXED: Now properly extracts price
        originalPrice: originalPrice,
        discount: discount,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        brand: product.brand || '',
        cashback: (product.cashback?.percentage || 0) > 0,
        cashbackPercentage: product.cashback?.percentage || 0,
        category: product.category?.name || (typeof product.category === 'string' ? product.category : ''),  // ✅ FIXED: Properly extract category
        store: product.store,
      };
    });

    console.log('✅ [RECOMMENDATIONS] Transformed sample:', transformedRecommendations[0]);

    sendSuccess(res, transformedRecommendations, 'Product recommendations retrieved successfully');

  } catch (error) {
    console.error('❌ [RECOMMENDATIONS] Error:', error);
    throw new AppError('Failed to get recommendations', 500);
  }
});

// Track product view and increment analytics
export const trackProductView = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log('👁️ [TRACK VIEW] Tracking view for product:', id);

    const product = await Product.findById(id);

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Increment views with daily analytics
    await product.incrementViews();

    // Track user-specific view if authenticated
    if (req.user) {
      // You could also track in user activity here
      console.log('👤 [TRACK VIEW] User', req.user.id, 'viewed product', id);
    }

    sendSuccess(res, {
      views: product.analytics.views,
      todayViews: product.analytics.todayViews
    }, 'Product view tracked successfully');

  } catch (error) {
    console.error('❌ [TRACK VIEW] Error:', error);
    throw new AppError('Failed to track product view', 500);
  }
});

// Get product analytics including "people bought today"
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log('📊 [PRODUCT ANALYTICS] Getting analytics for product:', id);

    const product = await Product.findById(id)
      .select('analytics cashback deliveryInfo pricing');

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Calculate cashback for display
    const cashbackAmount = product.calculateCashback();

    // Get estimated delivery based on user location (if available)
    const userLocation = req.query.location ? JSON.parse(req.query.location as string) : null;
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
    sendSuccess(res, analytics, 'Product analytics retrieved successfully');

  } catch (error) {
    console.error('❌ [PRODUCT ANALYTICS] Error:', error);
    throw new AppError('Failed to get product analytics', 500);
  }
});

// Get frequently bought together products
export const getFrequentlyBoughtTogether = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 4 } = req.query;

  try {
    console.log('🛍️ [FREQUENTLY BOUGHT] Getting frequently bought products for:', id);

    const product = await Product.findById(id)
      .populate({
        path: 'frequentlyBoughtWith.productId',
        select: 'name title price pricing image images rating ratings inventory'
      });

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Sort by purchase count and get top items
    const frequentProducts = product.frequentlyBoughtWith
      ?.sort((a: any, b: any) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
      .slice(0, Number(limit))
      .map((item: any) => item.productId)
      .filter((p: any) => p) || [];

    // If we don't have enough frequently bought products, get from same category
    if (frequentProducts.length < Number(limit)) {
      const additionalProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id, $nin: frequentProducts.map((p: any) => p._id) },
        isActive: true,
        'inventory.isAvailable': true
      })
        .select('name title price pricing image images rating ratings inventory')
        .limit(Number(limit) - frequentProducts.length)
        .lean();

      frequentProducts.push(...additionalProducts);
    }

    console.log('✅ [FREQUENTLY BOUGHT] Found', frequentProducts.length, 'frequently bought products');
    sendSuccess(res, frequentProducts, 'Frequently bought products retrieved successfully');

  } catch (error) {
    console.error('❌ [FREQUENTLY BOUGHT] Error:', error);
    throw new AppError('Failed to get frequently bought products', 500);
  }
});

// Get bundle products
export const getBundleProducts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    console.log('📦 [BUNDLE PRODUCTS] Getting bundle products for:', id);

    const product = await Product.findById(id)
      .populate({
        path: 'bundleProducts',
        select: 'name title price pricing image images rating ratings inventory cashback'
      });

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    const bundleProducts = product.bundleProducts || [];

    // Calculate bundle discount if products exist
    let bundleDiscount = 0;
    if (bundleProducts.length > 0) {
      const individualTotal = bundleProducts.reduce((sum: number, p: any) => {
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
      bundlePrice: bundleProducts.reduce((sum: number, p: any) => {
        return sum + (p.pricing?.selling || p.price?.current || 0);
      }, product.pricing?.selling || 0) - bundleDiscount
    };

    console.log('✅ [BUNDLE PRODUCTS] Returning bundle with', bundleProducts.length, 'products');
    sendSuccess(res, response, 'Bundle products retrieved successfully');

  } catch (error) {
    console.error('❌ [BUNDLE PRODUCTS] Error:', error);
    throw new AppError('Failed to get bundle products', 500);
  }
});

// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
export const getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchQuery } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return sendError(res, 'Search query is required', 400);
  }

  try {
    console.log('🔍 [SEARCH SUGGESTIONS] Getting suggestions for:', searchQuery);

    // Try to get from cache first
    const cacheKey = `product:suggestions:${searchQuery.toLowerCase()}`;
    const cachedSuggestions = await redisService.get<string[]>(cacheKey);

    if (cachedSuggestions) {
      console.log('✅ [SEARCH SUGGESTIONS] Returning from cache');
      return sendSuccess(res, cachedSuggestions, 'Search suggestions retrieved successfully');
    }

    // Search for products matching the query
    const products = await Product.find({
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
    await redisService.set(cacheKey, suggestions, CacheTTL.SHORT_CACHE);

    console.log('✅ [SEARCH SUGGESTIONS] Found', suggestions.length, 'suggestions');
    sendSuccess(res, suggestions, 'Search suggestions retrieved successfully');

  } catch (error) {
    console.error('❌ [SEARCH SUGGESTIONS] Error:', error);
    throw new AppError('Failed to get search suggestions', 500);
  }
});

// Get popular searches - FOR FRONTEND SEARCH
export const getPopularSearches = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    console.log('🔍 [POPULAR SEARCHES] Getting popular searches with limit:', limit);

    // Try to get from cache first
    const cacheKey = `product:popular-searches:${limit}`;
    const cachedSearches = await redisService.get<string[]>(cacheKey);

    if (cachedSearches) {
      console.log('✅ [POPULAR SEARCHES] Returning from cache');
      return sendSuccess(res, cachedSearches, 'Popular searches retrieved successfully');
    }

    // Get top categories and brands as popular search terms
    const [topCategories, topBrands] = await Promise.all([
      Category.find({ isActive: true })
        .sort({ productCount: -1 })
        .limit(5)
        .select('name')
        .lean(),
      Product.aggregate([
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
    await redisService.set(cacheKey, popularSearches, 3600); // 1 hour in seconds

    console.log('✅ [POPULAR SEARCHES] Returning', popularSearches.length, 'popular searches');
    sendSuccess(res, popularSearches, 'Popular searches retrieved successfully');

  } catch (error) {
    console.error('❌ [POPULAR SEARCHES] Error:', error);
    throw new AppError('Failed to get popular searches', 500);
  }
});

// Get trending products - FOR FRONTEND TRENDING SECTION
export const getTrendingProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    limit = 20,
    page = 1,
    days = 7
  } = req.query;

  try {
    console.log('🔥 [TRENDING PRODUCTS] Getting trending products:', {
      category,
      limit,
      page,
      days
    });

    // Try to get from cache first
    const cacheKey = `product:trending:${category || 'all'}:${limit}:${page}:${days}`;
    const cachedProducts = await redisService.get<any>(cacheKey);

    if (cachedProducts) {
      console.log('✅ [TRENDING PRODUCTS] Returning from cache');
      return sendSuccess(res, cachedProducts, 'Trending products retrieved successfully');
    }

    // Calculate date threshold for trending (default last 7 days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Build query
    const query: any = {
      isActive: true,
      'inventory.isAvailable': true,
      createdAt: { $gte: daysAgo } // Only products from last N days
    };

    if (category) {
      query.category = category;
    }

    // Aggregate trending products with weighted scoring
    const trendingProducts = await Product.aggregate([
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
    const totalCount = await Product.countDocuments({
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
    await redisService.set(cacheKey, result, 1800); // 30 minutes in seconds

    console.log('✅ [TRENDING PRODUCTS] Returning', trendingProducts.length, 'trending products');
    sendSuccess(res, result, 'Trending products retrieved successfully');

  } catch (error) {
    console.error('❌ [TRENDING PRODUCTS] Error:', error);
    throw new AppError('Failed to get trending products', 500);
  }
});

// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
export const getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 5 } = req.query;

  try {
    console.log('🔗 [RELATED PRODUCTS] Getting related products for:', id);

    // Try to get from cache first
    // Added :v2 suffix to bust old cache with missing price data
    const cacheKey = `${CacheKeys.productRecommendations(id, Number(limit))}:v2`;
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      console.log('✅ [RELATED PRODUCTS] Returning from cache');
      return sendSuccess(res, cachedProducts, 'Related products retrieved successfully');
    }

    const product = await Product.findById(id);

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Get related products from the same category OR same brand
    const relatedProducts = await Product.find({
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
    const transformedRelatedProducts = relatedProducts.map((product: any) => {
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
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: sellingPrice,  // ✅ FIXED: Now properly extracts price
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
    await redisService.set(cacheKey, transformedRelatedProducts, CacheTTL.PRODUCT_DETAIL);

    console.log('✅ [RELATED PRODUCTS] Found', transformedRelatedProducts.length, 'related products');
    sendSuccess(res, transformedRelatedProducts, 'Related products retrieved successfully');

  } catch (error) {
    console.error('❌ [RELATED PRODUCTS] Error:', error);
    throw new AppError('Failed to get related products', 500);
  }
});

// Check product availability - FOR FRONTEND CART/CHECKOUT
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { variantId, quantity = 1 } = req.query;

  try {
    console.log('✅ [CHECK AVAILABILITY] Checking availability for product:', id);

    const product = await Product.findById(id);

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    let availableStock = product.inventory.stock;
    let isLowStock = false;

    // Check variant stock if variantId is provided
    if (variantId && product.inventory.variants) {
      const variant = product.inventory.variants.find(
        (v: any) => v._id?.toString() === variantId || v.sku === variantId
      );

      if (variant) {
        availableStock = variant.stock;
      } else {
        return sendNotFound(res, 'Variant not found');
      }
    }

    // Check if unlimited (digital products)
    if (product.inventory.unlimited) {
      return sendSuccess(res, {
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
    sendSuccess(res, response, 'Product availability checked successfully');

  } catch (error) {
    console.error('❌ [CHECK AVAILABILITY] Error:', error);
    throw new AppError('Failed to check product availability', 500);
  }
});
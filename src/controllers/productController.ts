import { Request, Response } from 'express';
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
    limit = 20
  } = req.query;

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

  try {
    let productsQuery = Product.find(query)
      .populate('category', 'name slug')
      .populate('store', 'name logo location.city');

    // Apply search if provided
    if (search) {
      productsQuery = Product.find({
        ...query,
        $text: { $search: search as string }
      }, { score: { $meta: 'textScore' } })
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

    sendPaginated(res, products, Number(page), Number(limit), totalProducts);

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
    .populate('store', 'name logo location contact ratings operationalInfo');

    console.log('📦 [GET PRODUCT BY ID] Product found:', product ? 'Yes' : 'No');

    if (!product) {
      console.log('❌ [GET PRODUCT BY ID] Product not found or not active');
      return sendNotFound(res, 'Product not found');
    }

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

    const response = {
      ...product.toObject(),
      similarProducts
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
    // Verify store exists
    const store = await Store.findOne({ 
      _id: storeId, 
      isActive: true 
    });

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Build query
    const query: any = {
      store: storeId,
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
    const product = await Product.findById(productId);
    
    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

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
    .populate('store', 'name logo')
    .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
    .limit(Number(limit))
    .lean();

    sendSuccess(res, recommendations, 'Product recommendations retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to get recommendations', 500);
  }
});
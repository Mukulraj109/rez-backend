import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Transaction } from '../models/Transaction';
import { Category } from '../models/Category';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { logStoreSearch } from '../services/searchHistoryService';

// Get all stores with filtering and pagination
export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    location,
    radius = 10,
    rating,
    isOpen,
    search,
    tags,
    isFeatured,
    sortBy = 'rating',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = { isActive: true };

    // Apply filters
    if (category) query.category = category;
    if (rating) query['ratings.average'] = { $gte: Number(rating) };

    // Filter by tags
    if (tags) {
      // tags can be a string or array - handle both
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray.map(tag => new RegExp(tag as string, 'i')) };
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
    // Using $geoWithin with $centerSphere for better compatibility with legacy coordinate arrays
    let userLng: number | undefined;
    let userLat: number | undefined;
    if (location) {
      const [lng, lat] = location.toString().split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        userLng = lng;
        userLat = lat;
        const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians]
          }
        };
      }
    }

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'distance':
        // Distance sorting will be handled after fetching with $geoWithin
        sortOptions['ratings.average'] = -1; // Default sort, will re-sort by distance after
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

    const stores = await Store.find(query)
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
    let filteredStores: any[] = stores;
    if (isOpen === 'true') {
      filteredStores = stores.filter((store: any) => {
        // Simple open check - in a real app, you'd implement the isOpen method
        return store.isActive;
      });
    }

    // Calculate distances if location was provided
    if (userLng !== undefined && userLat !== undefined) {
      filteredStores = filteredStores.map((store: any) => {
        if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
          try {
            const distance = calculateDistance([userLng, userLat], store.location.coordinates);
            return { ...store, distance: Math.round(distance * 100) / 100 };
          } catch (e) {
            return { ...store, distance: null };
          }
        }
        return { ...store, distance: null };
      });

      // Sort by distance if requested
      if (sortBy === 'distance') {
        filteredStores.sort((a: any, b: any) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    const total = await Store.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    // Log search history for authenticated users (async, don't block)
    if (req.user && search) {
      logStoreSearch(
        (req.user as any)._id,
        search as string,
        total,
        {
          category: category as string,
          location: location as string,
          rating: rating ? Number(rating) : undefined,
          tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined
        }
      ).catch(err => console.error('Failed to log store search:', err));
    }

    sendSuccess(res, {
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

  } catch (error) {
    console.error('❌ [GET STORES] Error fetching stores:', error);
    throw new AppError('Failed to fetch stores', 500);
  }
});

// Get single store by ID or slug
export const getStoreById = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    console.log('🔍 [GET STORE] Fetching store:', storeId);

    const query = storeId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: storeId }
      : { slug: storeId };

    console.log('🔍 [GET STORE] Query:', query);

    const store = await Store.findOne({ ...query, isActive: true })
      .populate('category', 'name slug')
      .lean();

    console.log('🔍 [GET STORE] Store found:', !!store);

    if (!store) {
      console.error('❌ [GET STORE] Store not found or not active');
      return sendNotFound(res, 'Store not found');
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
    const products = await Product.find({
      store: store._id,
      isActive: true
    })
      .populate('category', 'name slug')
      .limit(20)
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ [GET STORE] Found', products.length, 'products');

    // Increment view count (simplified)
    await Store.updateOne({ _id: store._id }, { $inc: { 'analytics.views': 1 } });

    sendSuccess(res, {
      store,
      products,
      productsCount: await Product.countDocuments({ store: store._id, isActive: true })
    }, 'Store retrieved successfully');

  } catch (error: any) {
    console.error('❌ [GET STORE] Error:', error.message);
    console.error('❌ [GET STORE] Stack:', error.stack);
    throw new AppError(`Failed to fetch store: ${error.message}`, 500);
  }
});

// Get store products
export const getStoreProducts = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const {
    category,
    search,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const store = await Store.findById(storeId);
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    const query: any = { store: storeId, isActive: true };

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions: any = {};
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

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    throw new AppError('Failed to fetch store products', 500);
  }
});

// Get nearby stores
export const getNearbyStores = asyncHandler(async (req: Request, res: Response) => {
  const { lng, lat, longitude, latitude, location, radius = 5, limit = 10 } = req.query;

  // Accept multiple formats:
  // 1. lng/lat as separate params
  // 2. longitude/latitude as separate params
  // 3. location as "lng,lat" string (from storeSearchService)
  let finalLng = lng || longitude;
  let finalLat = lat || latitude;

  // Parse location string if provided (format: "lng,lat")
  if (!finalLng && !finalLat && location && typeof location === 'string') {
    const [parsedLng, parsedLat] = location.split(',');
    if (parsedLng && parsedLat) {
      finalLng = parsedLng.trim();
      finalLat = parsedLat.trim();
    }
  }

  if (!finalLng || !finalLat) {
    return sendBadRequest(res, 'Longitude and latitude are required. Provide lng/lat, longitude/latitude, or location as "lng,lat"');
  }

  const userLng = Number(finalLng);
  const userLat = Number(finalLat);

  // Validate coordinates
  if (isNaN(userLng) || isNaN(userLat) || userLng < -180 || userLng > 180 || userLat < -90 || userLat > 90) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Use $geoWithin with $centerSphere for better compatibility with legacy coordinate arrays
    const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km

    const stores = await Store.find({
      isActive: true,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], radiusInRadians]
        }
      }
    })
      .populate('category', 'name slug icon')
      .limit(Number(limit))
      .lean();

    // Calculate distances for each store
    const storesWithDistance = stores.map((store: any) => {
      if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
        try {
          const distance = calculateDistance([userLng, userLat], store.location.coordinates);
          return { ...store, distance: Math.round(distance * 100) / 100 };
        } catch (e) {
          return { ...store, distance: null };
        }
      }
      return { ...store, distance: null };
    });

    // Sort by distance
    storesWithDistance.sort((a: any, b: any) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    sendSuccess(res, { stores: storesWithDistance }, 'Nearby stores retrieved successfully');

  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    throw new AppError('Failed to fetch nearby stores', 500);
  }
});

// Get featured stores
export const getFeaturedStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // First, try to get featured stores
    let stores = await Store.find({
      isActive: true,
      isFeatured: true
    })
      .populate('category', 'name slug icon')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // If no featured stores, get all active stores sorted by rating
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true
      })
        .populate('category', 'name slug icon')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }
    // If featured stores exist but less than limit, fill with other active stores
    else if (stores.length < Number(limit)) {
      const featuredIds = stores.map(s => s._id);
      const additionalStores = await Store.find({
        isActive: true,
        _id: { $nin: featuredIds }
      })
        .populate('category', 'name slug icon')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(Number(limit) - stores.length)
        .lean();

      stores = [...stores, ...additionalStores];
    }

    sendSuccess(res, { stores }, 'Featured stores retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured stores', 500);
  }
});

// Search stores
export const searchStores = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchText, category, page = 1, limit = 20 } = req.query;

  if (!searchText) {
    return sendBadRequest(res, 'Search query is required');
  }

  try {
    const query: any = {
      isActive: true,
      $or: [
        { name: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
        { 'location.address': { $regex: searchText, $options: 'i' } },
        { 'location.city': { $regex: searchText, $options: 'i' } },
        { tags: { $regex: searchText, $options: 'i' } }
      ]
    };

    // Filter by category if provided
    if (category) {
      if (typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
        // Category is a string slug, find the ObjectId
        const categoryDoc = await Category.findOne({
          slug: category.toLowerCase(),
          isActive: true
        });

        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // Category not found, return empty results
          return sendSuccess(res, {
            stores: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }, 'Store search completed successfully');
        }
      } else {
        // Assume it's an ObjectId
        query.category = category;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const stores = await Store.find(query)
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Store.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    throw new AppError('Failed to search stores', 500);
  }
});

// Get store categories
export const getStoresByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20, sortBy = 'rating' } = req.query;

  try {
    const query = {
      isActive: true,
      category: categoryId  // Fixed: was 'categories', should be 'category'
    };

    const sortOptions: any = {};
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

    const stores = await Store.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Fetch products for each store
    const storesWithProducts = await Promise.all(
      stores.map(async (store: any) => {
        const products = await Product.find({
          store: store._id,
          isActive: true,
          isDeleted: { $ne: true }
        })
          .select('name images pricing ratings inventory tags brand shortDescription subCategory category')
          .limit(10)
          .lean();

        // Transform products to match frontend expected format
        const transformedProducts = products.map((product: any) => ({
          _id: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          imageUrl: product.images?.[0] || '',
          price: product.pricing?.selling || 0,
          originalPrice: product.pricing?.original || 0,
          rating: product.ratings?.average || 0,
          reviewCount: product.ratings?.count || 0,
          inStock: product.inventory?.isAvailable !== false,
          tags: product.tags || [],
          brand: product.brand || '',
          description: product.shortDescription || '',
          subCategory: product.subCategory?.toString() || null,
          category: product.category?.toString() || null
        }));

        return {
          ...store,
          products: transformedProducts
        };
      })
    );

    const total = await Store.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: storesWithProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Stores by category retrieved successfully');

  } catch (error) {
    console.error('Error fetching stores by category:', error);
    throw new AppError('Failed to fetch stores by category', 500);
  }
});

// Get store operating hours and status
export const getStoreOperatingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const store = await Store.findById(storeId).select('operationalInfo name').lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Simple implementation - in a real app, you'd use the isOpen method
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = (store as any).operationalInfo?.hours?.[currentDay];
    const isOpen = todayHours && !todayHours.closed &&
      currentTime >= todayHours.open &&
      currentTime <= todayHours.close;

    sendSuccess(res, {
      storeId: store._id,
      storeName: store.name,
      isOpen,
      hours: (store as any).operationalInfo?.hours,
      currentTime,
      currentDay
    }, 'Store operating status retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store operating status', 500);
  }
});

// Search stores by delivery category
export const searchStoresByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const {
    location,
    radius = 10,
    page = 1,
    limit = 20,
    sortBy = 'rating'
  } = req.query;

  try {
    const query: any = {
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
    const sortOptions: any = {};
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
    const total = await Store.countDocuments(query);
    console.log(`✅ [SEARCH BY CATEGORY] Found ${total} stores matching query`);

    let stores: any[] = [];
    if (total > 0) {
      stores = await Store.find(query)
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
        // Use aggregation to safely populate category and filter out invalid category references
        const products = await Product.aggregate([
          {
            $match: {
              store: store._id,
              isActive: true,
              category: { $exists: true, $type: 'objectId' } // Only include products with valid ObjectId category
            }
          },
          {
            $project: {
              name: 1,
              title: 1,
              slug: 1,
              pricing: 1,
              price: 1,
              images: 1,
              image: 1,
              ratings: 1,
              rating: 1,
              inventory: 1,
              tags: 1,
              brand: 1,
              category: 1,
              variants: 1,
              description: 1,
              subcategory: 1
            }
          },
          {
            $lookup: {
              from: 'categories',
              let: { categoryId: '$category' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$categoryId']
                    },
                    isActive: true
                  }
                },
                {
                  $project: {
                    name: 1,
                    slug: 1
                  }
                }
              ],
              as: 'category'
            }
          },
          {
            $unwind: {
              path: '$category',
              preserveNullAndEmptyArrays: true
            }
          },
          { $limit: 4 }
        ]);

        // Transform products to match frontend ProductItem type
        const transformedProducts = products.map((product: any) => {
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
            category: (product.category && typeof product.category === 'object' ? product.category.name : null) || '',
            subcategory: (product.subcategory && typeof product.subcategory === 'object' ? product.subcategory.name : null) || '',
            brand: product.brand || '',
            rating: product.ratings?.average || product.rating?.value || 0,
            reviewCount: product.ratings?.count || product.rating?.count || 0,
            sizes: product.variants?.map((v: any) => v.size).filter(Boolean) || [],
            colors: product.variants?.map((v: any) => v.color).filter(Boolean) || [],
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
          .map((store: any) => {
            if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
              try {
                const distance = calculateDistance(
                  [lng, lat],
                  store.location.coordinates
                );
                return { ...store, distance: Math.round(distance * 100) / 100 };
              } catch (error) {
                console.error('Error calculating distance for store:', store._id, error);
                return { ...store, distance: null };
              }
            }
            return { ...store, distance: null };
          })
          .filter((store: any) => {
            // Filter by radius if distance was calculated
            if (store.distance !== null && store.distance !== undefined) {
              return store.distance <= radiusKm;
            }
            return true; // Include stores without coordinates
          });
      }
    }

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    console.error('Search stores by category error:', error);
    throw new AppError('Failed to search stores by category', 500);
  }
});

// Search stores by delivery time range
export const searchStoresByDeliveryTime = asyncHandler(async (req: Request, res: Response) => {
  const {
    minTime = 15,
    maxTime = 60,
    location,
    radius = 10,
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = { isActive: true };

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

    const stores = await Store.find(query)
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Filter stores by delivery time range
    const filteredStores = stores.filter((store: any) => {
      const deliveryTime = store.operationalInfo?.deliveryTime;
      if (!deliveryTime) return false;

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

    sendSuccess(res, {
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

  } catch (error) {
    throw new AppError('Failed to search stores by delivery time', 500);
  }
});

// Advanced store search with filters
export const advancedStoreSearch = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    category,
    deliveryTime,
    priceRange,
    rating,
    paymentMethods,
    features,
    sortBy = 'rating',
    location,
    radius = 10,
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = { isActive: true };

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
      featureList.forEach((feature: string) => {
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
    // Note: Using $geoWithin with $centerSphere for better compatibility with legacy coordinate arrays
    // This avoids issues with $near requiring specific index configurations
    let userLng: number | undefined;
    let userLat: number | undefined;
    if (location) {
      const [lng, lat] = location.toString().split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        userLng = lng;
        userLat = lat;
        // Use $geoWithin with $centerSphere for more reliable geospatial queries
        // $centerSphere takes [lng, lat] and radius in radians (distance / Earth's radius in km)
        const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians]
          }
        };
      }
    }

    // Sorting
    let sort: any = {};
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

    const stores = await Store.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('category', 'name slug')
      .lean();

    const total = await Store.countDocuments(query);

    // Calculate distances if location provided
    if (userLng !== undefined && userLat !== undefined && stores.length > 0) {
      stores.forEach((store: any) => {
        if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
          try {
            store.distance = calculateDistance(
              [userLng, userLat],
              store.location.coordinates
            );
          } catch (e) {
            store.distance = null;
          }
        }
      });

      // Sort by distance if sortBy is distance
      if (sortBy === 'distance') {
        stores.sort((a: any, b: any) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    sendSuccess(res, {
      stores,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalStores: total,
        hasNextPage: skip + stores.length < total,
        hasPrevPage: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Advanced store search error:', error);
    throw new AppError('Failed to search stores', 500);
  }
});

// Get available store categories
export const getStoreCategories = asyncHandler(async (req: Request, res: Response) => {
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
    const categoryCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Store.countDocuments({
          isActive: true,
          [`deliveryCategories.${category.id}`]: true
        });
        return { ...category, count };
      })
    );

    sendSuccess(res, {
      categories: categoryCounts
    }, 'Store categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store categories', 500);
  }
});

// Get trending stores - FOR FRONTEND TRENDING SECTION
export const getTrendingStores = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    limit = 20,
    page = 1,
    days = 7
  } = req.query;

  try {
    console.log('🔥 [TRENDING STORES] Getting trending stores:', {
      category,
      limit,
      page,
      days
    });

    // Try to get from cache first
    const cacheKey = `store:trending:${category || 'all'}:${limit}:${page}:${days}`;
    const cachedStores = await redisService.get<any>(cacheKey);

    if (cachedStores) {
      console.log('✅ [TRENDING STORES] Returning from cache');
      return sendSuccess(res, cachedStores, 'Trending stores retrieved successfully');
    }

    // Calculate date threshold for trending (default last 7 days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Get order counts per store in the last N days
    const orderStats = await Order.aggregate([
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
    const orderStatsMap = new Map(
      orderStats.map(stat => [stat._id.toString(), {
        orderCount: stat.orderCount,
        totalRevenue: stat.totalRevenue
      }])
    );

    // Build query for stores - only require isActive, not isVerified
    // Verified stores will get higher ranking through trending score
    const query: any = {
      isActive: true
    };

    // Handle category conversion if provided (can be string name/slug or ObjectId)
    if (category) {
      if (typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
        // Category is a string name/slug, need to find the ObjectId
        const categoryDoc = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${category}$`, 'i') } },
            { slug: category.toLowerCase() }
          ],
          isActive: true
        });

        if (!categoryDoc) {
          console.log('❌ [TRENDING STORES] Category not found:', category);
          // If category not found, return empty results instead of error
          const result = {
            stores: [],
            pagination: {
              total: 0,
              page: Number(page),
              limit: Number(limit),
              pages: 0
            }
          };
          await redisService.set(cacheKey, result, 1800);
          return sendSuccess(res, result, 'Trending stores retrieved successfully');
        }

        query.category = categoryDoc._id;
        console.log('✅ [TRENDING STORES] Category converted to ObjectId:', categoryDoc.name, categoryDoc._id);
      } else if (mongoose.Types.ObjectId.isValid(category as string)) {
        // Already a valid ObjectId, convert to ObjectId type
        query.category = new mongoose.Types.ObjectId(category as string);
      }
    }

    // Get stores with analytics - use aggregation to safely populate category
    // This prevents errors when some stores have string category values instead of ObjectIds
    const matchStage: any = {
      ...query
    };

    // Add condition to only include stores with valid ObjectId category references
    // This filters out stores with string category values like "Salon"
    const categoryTypeCheck = { category: { $exists: true, $type: 'objectId' } };

    if (matchStage.$and) {
      matchStage.$and.push(categoryTypeCheck);
    } else {
      matchStage.$and = [categoryTypeCheck];
    }

    const stores = await Store.aggregate([
      { $match: matchStage },
      {
        $project: {
          name: 1,
          logo: 1,
          banner: 1,
          videos: 1,
          category: 1,
          location: 1,
          ratings: 1,
          analytics: 1,
          contact: 1,
          createdAt: 1,
          description: 1,
          offers: 1,
          rewardRules: 1
        }
      },
      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$category' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$categoryId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            },
            {
              $project: {
                name: 1,
                slug: 1,
                icon: 1
              }
            }
          ],
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    // Calculate trending score for each store
    const storesWithScore = stores
      .map(store => {
        const storeId = store._id.toString();
        const orderData = orderStatsMap.get(storeId) || { orderCount: 0, totalRevenue: 0 };

        // Calculate trending score: (orders * 10) + (views * 1) + (revenue * 0.01) + (rating * 5)
        // Added rating factor so new stores without orders still have a score
        const trendingScore =
          (orderData.orderCount * 10) +
          ((store.analytics as any)?.views || 0) +
          (orderData.totalRevenue * 0.01) +
          (((store.ratings as any)?.average || 0) * 5);

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
    await redisService.set(cacheKey, result, 1800); // 30 minutes in seconds

    console.log('✅ [TRENDING STORES] Returning', paginatedStores.length, 'trending stores');
    sendSuccess(res, result, 'Trending stores retrieved successfully');

  } catch (error) {
    console.error('❌ [TRENDING STORES] Error:', error);
    throw new AppError('Failed to get trending stores', 500);
  }
});

// ========================
// FOLLOWER NOTIFICATION ENDPOINTS
// ========================

import followerNotificationService from '../services/followerNotificationService';

/**
 * Get follower count for a store
 * GET /api/stores/:storeId/followers/count
 */
export const getStoreFollowerCount = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const count = await followerNotificationService.getStoreFollowerCount(storeId);

    sendSuccess(res, { count }, 'Follower count retrieved successfully');
  } catch (error) {
    console.error('❌ [GET FOLLOWER COUNT] Error:', error);
    throw new AppError('Failed to get follower count', 500);
  }
});

/**
 * Get all followers of a store (Admin/Merchant only)
 * GET /api/stores/:storeId/followers
 */
export const getStoreFollowers = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization (store owner or admin)
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized to view followers', 403);
    }

    const followerIds = await followerNotificationService.getStoreFollowers(storeId);

    sendSuccess(res, {
      storeId,
      followerCount: followerIds.length,
      followers: followerIds
    }, 'Followers retrieved successfully');
  } catch (error) {
    console.error('❌ [GET FOLLOWERS] Error:', error);
    throw new AppError('Failed to get followers', 500);
  }
});

/**
 * Send custom notification to all followers
 * POST /api/stores/:storeId/notify-followers
 * Body: { title, message, imageUrl?, deepLink? }
 */
export const sendFollowerNotification = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { title, message, imageUrl, deepLink } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization (store owner or admin)
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized to send notifications', 403);
    }

    // Validate input
    if (!title || !message) {
      return sendBadRequest(res, 'Title and message are required');
    }

    const result = await followerNotificationService.notifyStoreUpdate(storeId, {
      title,
      message,
      imageUrl
    });

    sendSuccess(res, result, 'Notifications sent successfully');
  } catch (error) {
    console.error('❌ [SEND FOLLOWER NOTIFICATION] Error:', error);
    throw new AppError('Failed to send notifications', 500);
  }
});

/**
 * Notify followers about a new offer
 * POST /api/stores/:storeId/notify-offer
 * Body: { offerId, title, description?, discount?, imageUrl? }
 */
export const notifyNewOffer = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { offerId, title, description, discount, imageUrl } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized', 403);
    }

    const result = await followerNotificationService.notifyNewOffer(storeId, {
      _id: offerId,
      title,
      description,
      discount,
      imageUrl
    });

    sendSuccess(res, result, 'Offer notification sent to followers');
  } catch (error) {
    console.error('❌ [NOTIFY NEW OFFER] Error:', error);
    throw new AppError('Failed to send offer notification', 500);
  }
});

/**
 * Notify followers about a new product
 * POST /api/stores/:storeId/notify-product
 * Body: { productId }
 */
export const notifyNewProduct = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { productId } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized', 403);
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    const result = await followerNotificationService.notifyNewProduct(storeId, {
      _id: product._id,
      name: product.name,
      description: product.description,
      pricing: product.pricing,
      images: product.images,
      slug: product.slug
    });

    sendSuccess(res, result, 'Product notification sent to followers');
  } catch (error) {
    console.error('❌ [NOTIFY NEW PRODUCT] Error:', error);
    throw new AppError('Failed to send product notification', 500);
  }
});

// Search stores by category slug (for frontend categories page)
export const getStoresByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = 'rating'
  } = req.query;

  try {
    console.log(`🔍 [GET STORES BY SLUG] Searching for category: ${slug}`);

    // Import Category model (named export)
    const { Category } = require('../models/Category');

    // Find the category by slug (could be main category or subcategory)
    const category = await Category.findOne({
      slug: slug,
      isActive: true
    }).lean();

    if (!category) {
      console.log(`❌ [GET STORES BY SLUG] Category not found: ${slug}`);
      return sendNotFound(res, `Category '${slug}' not found`);
    }

    console.log(`✅ [GET STORES BY SLUG] Found category: ${category.name} (${category._id})`);

    // Determine if this is a subcategory or main category
    const isSubcategory = !!category.parentCategory;

    let query: any;

    if (isSubcategory) {
      // For subcategories: search ONLY by subcategory fields, NOT by parent category
      // This ensures we get stores specific to this subcategory
      console.log(`🔍 [GET STORES BY SLUG] Searching as SUBCATEGORY: ${slug}`);
      query = {
        isActive: true,
        $or: [
          { subcategory: category._id },
          { subCategories: category._id },
          { subcategorySlug: slug }
        ]
      };
    } else {
      // For main categories: search by category and all child categories
      const categoryIds = [category._id];
      if (category.childCategories && category.childCategories.length > 0) {
        categoryIds.push(...category.childCategories);
      }
      console.log(`🔍 [GET STORES BY SLUG] Searching as MAIN CATEGORY: ${slug}, including ${categoryIds.length} category IDs`);
      query = {
        isActive: true,
        $or: [
          { category: { $in: categoryIds } },
          { categories: { $in: categoryIds } },
          { subcategory: { $in: categoryIds } },
          { subCategories: { $elemMatch: { $in: categoryIds } } }
        ]
      };
    }

    // Sorting
    const sortOptions: any = {};
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

    // Fetch stores
    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('category', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query)
    ]);

    console.log(`📦 [GET STORES BY SLUG] Found ${stores.length} stores for category ${slug}`);

    // Fetch products for each store (first 4 products)
    const storesWithProducts = await Promise.all(
      stores.map(async (store: any) => {
        const products = await Product.find({
          store: store._id,
          isActive: true
        })
          .select('name pricing images slug ratings inventory subSubCategory')
          .limit(4)
          .lean();

        // Transform products to expected format
        // Handle both old (price/rating) and new (pricing/ratings) field structures
        const transformedProducts = products.map((product: any) => ({
          _id: product._id,
          productId: product._id,
          name: product.name,
          // Support both pricing.selling (new) and pricing.current/price.current (old)
          price: product.pricing?.selling || product.pricing?.current || product.price?.current || 0,
          originalPrice: product.pricing?.original || product.price?.original || null,
          discountPercentage: product.pricing?.discount || product.price?.discount || null,
          imageUrl: product.images?.[0] || 'https://via.placeholder.com/150',
          // Support both ratings.average (new) and rating.value (old)
          rating: product.ratings?.average || product.rating?.value || 0,
          reviewCount: product.ratings?.count || product.rating?.count || 0,
          inStock: product.inventory?.isAvailable !== false,
          subSubCategory: product.subSubCategory || null
        }));

        return {
          ...store,
          products: transformedProducts
        };
      })
    );

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: storesWithProducts,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Found ${total} stores for category: ${category.name}`);

  } catch (error) {
    console.error('❌ [GET STORES BY SLUG] Error:', error);
    throw new AppError('Failed to get stores by category slug', 500);
  }
});

// Get user's visit count and loyalty info for a specific store
export const getUserStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = (req as any).userId;

  if (!userId) {
    return sendBadRequest(res, 'User authentication required');
  }

  try {
    // Get the store to check loyalty config
    const store = await Store.findById(storeId).select('name rewardRules');

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Count transactions (visits) for this user at this store
    const visitCount = await Transaction.countDocuments({
      user: userId,
      'source.metadata.storeInfo.id': storeId,
      'status.current': 'completed',
      category: { $in: ['spending', 'paybill', 'cashback'] }
    });

    // Get loyalty configuration from store
    const loyaltyConfig = (store as any).rewardRules?.visitMilestoneRewards || [];

    // Find the next reward milestone
    let nextMilestone = null;
    let totalVisitsRequired = 5; // Default
    let nextReward = 'Free Coffee'; // Default

    for (const milestone of loyaltyConfig) {
      if (visitCount < milestone.visits) {
        nextMilestone = milestone;
        totalVisitsRequired = milestone.visits;
        nextReward = milestone.reward || 'Free Reward';
        break;
      }
    }

    // If user completed all milestones, use the last one as reference
    if (!nextMilestone && loyaltyConfig.length > 0) {
      const lastMilestone = loyaltyConfig[loyaltyConfig.length - 1];
      totalVisitsRequired = lastMilestone.visits;
      nextReward = lastMilestone.reward || 'Free Reward';
    }

    // Calculate progress
    const progress = Math.min(visitCount / totalVisitsRequired, 1);
    const visitsRemaining = Math.max(totalVisitsRequired - visitCount, 0);

    return sendSuccess(res, {
      storeId,
      storeName: store.name,
      visitsCompleted: visitCount,
      totalVisitsRequired,
      nextReward,
      visitsRemaining,
      progress,
      hasCompletedMilestone: visitCount >= totalVisitsRequired,
      loyaltyConfig
    }, 'User store visits retrieved successfully');

  } catch (error) {
    console.error('❌ [GET USER STORE VISITS] Error:', error);
    throw new AppError('Failed to get user store visits', 500);
  }
});

// Get recent earnings by users at a specific store
// Shows "People are earning here" section data
export const getRecentEarnings = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    // Get the store to verify it exists
    const store = await Store.findById(storeId).select('name');

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Get recent transactions for this store
    // Convert storeId string to ObjectId for proper matching
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const recentTransactions = await Transaction.find({
      'source.metadata.storeInfo.id': storeObjectId,
      'status.current': 'completed',
      category: { $in: ['spending', 'paybill', 'cashback', 'earning'] }
    })
      .populate('user', 'name firstName lastName avatar profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format the response
    const recentEarnings = recentTransactions.map((tx: any) => {
      const user = tx.user || {};
      const userName = user.firstName || user.name?.split(' ')[0] || 'User';
      const amount = Math.abs(tx.amount || 0);
      const coinsEarned = Math.round(amount * 0.05); // 5% coin earning

      // Calculate time ago
      const timeAgo = getTimeAgo(new Date(tx.createdAt));

      return {
        id: tx._id.toString(),
        name: userName,
        avatar: user.avatar || user.profilePicture || null,
        amountEarned: amount,
        coinsEarned,
        timeAgo
      };
    });

    return sendSuccess(res, recentEarnings, 'Recent earnings retrieved successfully');

  } catch (error) {
    console.error('❌ [GET RECENT EARNINGS] Error:', error);
    throw new AppError('Failed to get recent earnings', 500);
  }
});

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// Get top cashback stores
// GET /api/stores/top-cashback
export const getTopCashbackStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, limit = 10, minCashback = 10 } = req.query;

  try {
    // Build query for stores with cashback >= minCashback
    const query: any = {
      isActive: true,
      'offers.cashback': { $exists: true, $gte: Number(minCashback) }
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ 'offers.cashback': -1, 'ratings.average': -1 })
      .limit(Number(limit))
      .lean();

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 }; // Round to 1 decimal
        }
        return store;
      });

      // Sort by distance if location provided
      stores.sort((a: any, b: any) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return (b.offers?.cashback || 0) - (a.offers?.cashback || 0);
      });
    }

    // Format response
    const formattedStores = stores.map((store: any) => ({
      _id: store._id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      cashbackPercentage: store.offers?.cashback || 0,
      maxCashback: store.offers?.maxCashback,
      minOrderAmount: store.offers?.minOrderAmount,
      distance: store.distance,
      rating: store.ratings?.average || 0,
      reviewCount: store.ratings?.count || 0,
      category: store.category,
      location: store.location
    }));

    sendSuccess(res, { stores: formattedStores }, 'Top cashback stores retrieved successfully');

  } catch (error) {
    console.error('❌ [GET TOP CASHBACK STORES] Error:', error);
    throw new AppError('Failed to fetch top cashback stores', 500);
  }
});

// Get BNPL (Buy Now Pay Later) stores
// GET /api/stores/bnpl
export const getBNPLStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, limit = 10 } = req.query;

  try {
    // Query stores with BNPL payment methods
    // Check both operationalInfo.paymentMethods and paymentSettings.acceptPayLater
    const query: any = {
      isActive: true,
      $or: [
        { 'operationalInfo.paymentMethods': { $in: ['bnpl', 'installment', 'pay-later', 'paylater'] } },
        { 'paymentSettings.acceptPayLater': true }
      ]
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 };
        }
        return store;
      });

      // Sort by distance if location provided
      stores.sort((a: any, b: any) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return (b.ratings?.average || 0) - (a.ratings?.average || 0);
      });
    }

    // Format response with BNPL options
    const formattedStores = stores.map((store: any) => {
      // Extract BNPL options from payment methods
      const paymentMethods = store.operationalInfo?.paymentMethods || [];
      const bnplOptions: string[] = [];

      if (paymentMethods.includes('bnpl') || paymentMethods.includes('pay-later') || paymentMethods.includes('paylater')) {
        bnplOptions.push('3 months', '6 months');
      }
      if (paymentMethods.includes('installment')) {
        bnplOptions.push('3 months', '6 months', '12 months');
      }

      return {
        _id: store._id,
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        bnplOptions: bnplOptions.length > 0 ? bnplOptions : ['3 months', '6 months'], // Default options
        paymentMethods: paymentMethods,
        distance: store.distance,
        rating: store.ratings?.average || 0,
        category: store.category,
        location: store.location
      };
    });

    sendSuccess(res, { stores: formattedStores }, 'BNPL stores retrieved successfully');

  } catch (error) {
    console.error('❌ [GET BNPL STORES] Error:', error);
    throw new AppError('Failed to fetch BNPL stores', 500);
  }
});

// Get nearby stores for homepage - optimized endpoint with all computed fields
// GET /api/stores/nearby-homepage
export const getNearbyStoresForHomepage = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius = 2, limit = 5 } = req.query;

  // Validate coordinates
  if (!latitude || !longitude) {
    return sendBadRequest(res, 'Latitude and longitude are required');
  }

  const userLat = Number(latitude);
  const userLng = Number(longitude);

  if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Import StoreVisit model for queue data
    const { StoreVisit } = require('../models/StoreVisit');

    // Use $geoWithin with $centerSphere for geospatial query
    const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km

    const stores = await Store.find({
      isActive: true,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], radiusInRadians]
        }
      }
    })
      .select('name slug logo location operationalInfo offers rewardRules storeVisitConfig isActive')
      .limit(Number(limit) * 2) // Fetch more to filter closed stores if needed
      .lean();

    // Get current date/time info for calculations
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);

    // Get today's date range for queue query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get store IDs for queue aggregation
    const storeIds = stores.map((s: any) => s._id);

    // Aggregate queue counts for all stores in one query
    const queueCounts = await StoreVisit.aggregate([
      {
        $match: {
          storeId: { $in: storeIds },
          visitType: 'queue',
          status: { $in: ['pending', 'checked_in'] },
          visitDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$storeId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of store ID to queue count
    const queueCountMap = new Map<string, number>(
      queueCounts.map((q: any) => [q._id.toString(), q.count as number])
    );

    // Helper function to format distance
    const formatDistance = (distanceKm: number): string => {
      if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
      }
      return `${distanceKm.toFixed(1)}km`;
    };

    // Helper function to get wait time string
    const getWaitTimeString = (queueCount: number): string => {
      if (queueCount === 0) return 'No wait';
      if (queueCount <= 2) return '5 min';
      if (queueCount <= 5) return '15 min';
      return `${queueCount * 5} min`;
    };

    // Process stores with computed fields
    const processedStores = stores.map((store: any) => {
      // Calculate distance
      let distance = null;
      let distanceFormatted = '';
      if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
        distance = calculateDistance([userLng, userLat], store.location.coordinates);
        distanceFormatted = formatDistance(distance);
      }

      // Check if store is open
      const todayHours = store.operationalInfo?.hours?.[dayName];
      let isOpen = false;
      let isClosingSoon = false;
      let status = 'Closed';

      if (todayHours && !todayHours.closed && todayHours.open && todayHours.close) {
        isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;

        if (isOpen) {
          // Check if closing soon (within 30 minutes)
          const closeTime = todayHours.close;
          const closingMinutes = parseInt(closeTime.split(':')[0]) * 60 + parseInt(closeTime.split(':')[1]);
          isClosingSoon = closingMinutes - currentMinutes <= 30 && closingMinutes > currentMinutes;

          status = isClosingSoon ? 'Closing soon' : 'Open';
        }
      }

      // Get queue count for wait time
      const queueCount: number = queueCountMap.get(store._id.toString()) || 0;
      const waitTime = getWaitTimeString(queueCount);

      // Get cashback percentage
      const cashbackPercent = store.offers?.cashback || store.rewardRules?.baseCashbackPercent || 5;
      const cashback = `${cashbackPercent}% cashback`;

      // Check if store is live (has live_availability feature)
      const isLive = store.isActive &&
        (store.storeVisitConfig?.features?.includes('live_availability') ||
          store.storeVisitConfig?.enabled === true);

      return {
        id: store._id.toString(),
        name: store.name,
        distance: distanceFormatted,
        distanceValue: distance, // For sorting
        isLive,
        status,
        waitTime,
        cashback,
        closingSoon: isClosingSoon
      };
    });

    // Filter out stores without valid coordinates and sort by distance
    const validStores = processedStores
      .filter((s: any) => s.distanceValue !== null)
      .sort((a: any, b: any) => a.distanceValue - b.distanceValue)
      .slice(0, Number(limit))
      .map((s: any) => {
        // Remove distanceValue from response (internal use only)
        const { distanceValue, ...rest } = s;
        return rest;
      });

    sendSuccess(res, { stores: validStores }, 'Nearby stores for homepage retrieved successfully');

  } catch (error) {
    console.error('❌ [GET NEARBY STORES HOMEPAGE] Error:', error);
    throw new AppError('Failed to fetch nearby stores for homepage', 500);
  }
});

/**
 * Get new stores (recently added stores for homepage NewOnRezSection)
 * GET /api/stores/new
 */
export const getNewStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 4, days = 30, latitude, longitude } = req.query;

  try {
    console.log('🔍 [GET NEW STORES] Fetching recently added stores...');

    // Calculate the date threshold (stores added within the last X days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - Number(days));

    const query: any = {
      isActive: true,
      createdAt: { $gte: dateThreshold }
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // If not enough stores from recent days, get any stores sorted by newest
    if (stores.length < Number(limit)) {
      stores = await Store.find({ isActive: true })
        .populate('category', 'name slug icon')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 };
        }
        return store;
      });
    }

    // Format for frontend NewOnRezSection
    const formattedStores = stores.map((store: any, index: number) => ({
      id: store._id,
      name: store.name,
      slug: store.slug,
      category: store.category?.name || 'General',
      image: store.logo || store.banner?.[0] || `https://images.unsplash.com/photo-${1441984904996 + index}-e0b6ba687e04?w=400`,
      people: Math.floor(Math.random() * 300) + 50, // Simulated active users
      cashback: `${store.offers?.cashback || 10}%`,
      rating: store.ratings?.average || 4.0,
      distance: store.distance,
      isNew: true
    }));

    console.log(`✅ [GET NEW STORES] Found ${formattedStores.length} new stores`);

    sendSuccess(res, {
      stores: formattedStores,
      total: formattedStores.length,
      // Separate into featured (first store) and small stores for UI
      featuredStore: formattedStores[0] || null,
      smallStores: formattedStores.slice(1, 3),
      horizontalStore: formattedStores[3] || null
    }, 'New stores retrieved successfully');

  } catch (error) {
    console.error('❌ [GET NEW STORES] Error:', error);
    throw new AppError('Failed to fetch new stores', 500);
  }
});

/**
 * Get stores by tag (cuisine) for Browse by Cuisine feature
 * GET /api/stores/by-tag/:tag
 */
export const getStoresByTag = asyncHandler(async (req: Request, res: Response) => {
  const { tag } = req.params;
  const { page = 1, limit = 20, sortBy = 'rating' } = req.query;

  try {
    console.log(`🔍 [GET STORES BY TAG] Searching for tag: ${tag}`);

    // Build query to find stores with matching tag (case insensitive)
    const tagLower = tag.toLowerCase();
    const query: any = {
      isActive: true,
      $or: [
        { tags: { $elemMatch: { $regex: new RegExp(tagLower, 'i') } } },
        { name: { $regex: new RegExp(tagLower, 'i') } }
      ]
    };

    // Sorting options
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'cashback':
        sortOptions['offers.cashback'] = -1;
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

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('category', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query)
    ]);

    console.log(`📦 [GET STORES BY TAG] Found ${stores.length} stores for tag: ${tag}`);

    // Format response
    const formattedStores = stores.map((store: any) => ({
      _id: store._id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      banner: store.banner,
      rating: store.ratings?.average || 0,
      reviewCount: store.ratings?.count || 0,
      cashback: store.offers?.cashback || 0,
      tags: store.tags || [],
      location: store.location?.address || 'Multiple Locations',
      deliveryTime: store.operationalInfo?.deliveryTime || '30-45 mins',
      isVerified: store.verification?.isVerified || store.isVerified || false,
      category: store.category
    }));

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: formattedStores,
      tag: tag,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Found ${total} stores for tag: ${tag}`);

  } catch (error) {
    console.error('❌ [GET STORES BY TAG] Error:', error);
    throw new AppError('Failed to get stores by tag', 500);
  }
});

/**
 * Get cuisine counts for Browse by Cuisine section
 * GET /api/stores/cuisine-counts
 * Returns count of stores for each common cuisine tag
 */
export const getCuisineCounts = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 [GET CUISINE COUNTS] Aggregating cuisine counts...');

    // Define the cuisines we want to count
    const cuisines = [
      { id: 'pizza', name: 'Pizza', icon: '🍕' },
      { id: 'biryani', name: 'Biryani', icon: '🍗' },
      { id: 'burgers', name: 'Burgers', icon: '🍔' },
      { id: 'chinese', name: 'Chinese', icon: '🥡' },
      { id: 'desserts', name: 'Desserts', icon: '🍰' },
      { id: 'healthy', name: 'Healthy', icon: '🥗' },
      { id: 'south-indian', name: 'South Indian', icon: '🍛' },
      { id: 'north-indian', name: 'North Indian', icon: '🍛' },
      { id: 'cafe', name: 'Café', icon: '☕' },
      { id: 'street-food', name: 'Street Food', icon: '🌮' },
      { id: 'ice-cream', name: 'Ice Cream', icon: '🍦' },
      { id: 'thali', name: 'Thali', icon: '🍱' },
    ];

    // Count stores for each cuisine
    const cuisineCounts = await Promise.all(
      cuisines.map(async (cuisine) => {
        const count = await Store.countDocuments({
          isActive: true,
          $or: [
            { tags: { $elemMatch: { $regex: new RegExp(cuisine.id, 'i') } } },
            { name: { $regex: new RegExp(cuisine.id, 'i') } }
          ]
        });

        return {
          id: cuisine.id,
          name: cuisine.name,
          icon: cuisine.icon,
          count: count,
          displayCount: count > 0 ? `${count}+ places` : '0 places'
        };
      })
    );

    // Sort by count (most popular first) and filter out zeros
    const sortedCounts = cuisineCounts
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);

    console.log(`✅ [GET CUISINE COUNTS] Found ${sortedCounts.length} cuisines with stores`);

    sendSuccess(res, {
      cuisines: sortedCounts,
      total: sortedCounts.reduce((sum, c) => sum + c.count, 0)
    }, 'Cuisine counts retrieved successfully');

  } catch (error) {
    console.error('❌ [GET CUISINE COUNTS] Error:', error);
    throw new AppError('Failed to get cuisine counts', 500);
  }
});
import { Request, Response } from 'express';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get all stores with filtering and pagination
export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const { 
    category, 
    location, 
    radius = 10, 
    rating, 
    isOpen, 
    search, 
    sortBy = 'rating', 
    page = 1, 
    limit = 20 
  } = req.query;

  try {
    const query: any = { isActive: true };
    
    // Apply filters
    if (category) query.category = category;
    if (rating) query['ratings.average'] = { $gte: Number(rating) };
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

    const stores = await Store.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Filter by open status if requested
    let filteredStores = stores;
    if (isOpen === 'true') {
      filteredStores = stores.filter((store: any) => {
        // Simple open check - in a real app, you'd implement the isOpen method
        return store.isActive;
      });
    }

    const total = await Store.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

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
    throw new AppError('Failed to fetch stores', 500);
  }
});

// Get single store by ID or slug
export const getStoreById = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const query = storeId.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: storeId } 
      : { slug: storeId };

    const store = await Store.findOne({ ...query, isActive: true })
      .populate('category', 'name slug')
      .populate('owner', 'profile.firstName profile.lastName')
      .lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Get store products
    const products = await Product.find({ 
      store: store._id, 
      isActive: true 
    })
    .populate('category', 'name slug')
    .limit(20)
    .sort({ createdAt: -1 })
    .lean();

    // Increment view count (simplified)
    await Store.updateOne({ _id: store._id }, { $inc: { 'analytics.views': 1 } });

    sendSuccess(res, {
      store,
      products,
      productsCount: await Product.countDocuments({ store: store._id, isActive: true })
    }, 'Store retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store', 500);
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
        sortOptions.basePrice = 1;
        break;
      case 'price_high':
        sortOptions.basePrice = -1;
        break;
      case 'rating':
        sortOptions.averageRating = -1;
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
  const { lng, lat, radius = 5, limit = 10 } = req.query;

  if (!lng || !lat) {
    return sendBadRequest(res, 'Longitude and latitude are required');
  }

  try {
    const stores = await Store.find({
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

    sendSuccess(res, stores, 'Nearby stores retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch nearby stores', 500);
  }
});

// Get featured stores
export const getFeaturedStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const stores = await Store.find({
      isActive: true,
      isFeatured: true
    })
    .sort({ 'ratings.average': -1, createdAt: -1 })
    .limit(Number(limit))
    .lean();

    sendSuccess(res, stores, 'Featured stores retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured stores', 500);
  }
});

// Search stores
export const searchStores = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchText, page = 1, limit = 20 } = req.query;

  if (!searchText) {
    return sendBadRequest(res, 'Search query is required');
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
      categories: categoryId 
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
    }, 'Stores by category retrieved successfully');

  } catch (error) {
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
      isActive: true,
      [`deliveryCategories.${category}`]: true 
    };
    
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
    
    let stores: any[] = [];
    if (total > 0) {
      stores = await Store.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();
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
    if (location && stores.length > 0) {
      const [lng, lat] = location.toString().split(',').map(Number);
      stores.forEach((store: any) => {
        if (store.location?.coordinates) {
          store.distance = calculateDistance(
            [lng, lat],
            store.location.coordinates
          );
        }
      });
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

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}
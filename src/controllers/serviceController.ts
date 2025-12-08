import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { ServiceCategory } from '../models/ServiceCategory';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

/**
 * Get all services with filters
 * GET /api/services
 */
export const getServices = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      serviceType,
      minPrice,
      maxPrice,
      rating,
      sortBy = 'rating',
      storeId
    } = req.query;

    // Build query
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    };

    // Category filter
    if (category) {
      const serviceCategory = await ServiceCategory.findOne({ slug: category });
      if (serviceCategory) {
        query.serviceCategory = serviceCategory._id;
      }
    }

    // Store filter
    if (storeId) {
      query.store = new mongoose.Types.ObjectId(storeId as string);
    }

    // Service type filter
    if (serviceType) {
      query['serviceDetails.serviceType'] = serviceType;
    }

    // Price filter
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Sorting
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
      case 'popular':
        sortOptions = { 'analytics.purchases': -1 };
        break;
      default:
        sortOptions = { 'ratings.average': -1, createdAt: -1 };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      Product.find(query)
        .populate('store', 'name logo location contact operationalInfo')
        .populate('serviceCategory', 'name icon cashbackPercentage slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
};

/**
 * Get popular services for homepage
 * GET /api/services/popular
 */
export const getPopularServices = async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const services = await Product.find({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    })
      .populate('store', 'name logo location contact operationalInfo')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .sort({ 'analytics.purchases': -1, 'ratings.average': -1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error: any) {
    logger.error('Error fetching popular services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular services',
      error: error.message
    });
  }
};

/**
 * Get nearby services based on user location
 * GET /api/services/nearby
 */
export const getNearbyServices = async (req: Request, res: Response) => {
  try {
    const {
      latitude,
      longitude,
      radius = '10', // km
      limit = '20',
      category
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);
    const limitNum = parseInt(limit as string, 10);

    // Find nearby stores first
    const nearbyStores = await Store.find({
      'location.coordinates': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000 // Convert km to meters
        }
      },
      isActive: true
    }).select('_id');

    const storeIds = nearbyStores.map(store => store._id);

    // Build query for services
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      store: { $in: storeIds }
    };

    // Category filter
    if (category) {
      const serviceCategory = await ServiceCategory.findOne({ slug: category });
      if (serviceCategory) {
        query.serviceCategory = serviceCategory._id;
      }
    }

    const services = await Product.find(query)
      .populate('store', 'name logo location contact operationalInfo')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .sort({ 'ratings.average': -1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: services,
      count: services.length,
      location: { latitude: lat, longitude: lng, radius: radiusKm }
    });
  } catch (error: any) {
    logger.error('Error fetching nearby services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby services',
      error: error.message
    });
  }
};

/**
 * Get service by ID
 * GET /api/services/:id
 */
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }

    const service = await Product.findOne({
      _id: id,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    })
      .populate('store', 'name logo location contact operationalInfo')
      .populate('serviceCategory', 'name icon cashbackPercentage slug description')
      .populate('category', 'name slug')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Track view
    await Product.findByIdAndUpdate(id, {
      $inc: { 'analytics.views': 1, 'analytics.todayViews': 1 }
    });

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error: any) {
    logger.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
};

/**
 * Get related services
 * GET /api/services/:id/related
 */
export const getRelatedServices = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }

    const service = await Product.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Find related services from same category or store
    const relatedServices = await Product.find({
      _id: { $ne: id },
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      $or: [
        { serviceCategory: service.serviceCategory },
        { store: service.store }
      ]
    })
      .populate('store', 'name logo')
      .populate('serviceCategory', 'name icon cashbackPercentage')
      .sort({ 'ratings.average': -1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: relatedServices,
      count: relatedServices.length
    });
  } catch (error: any) {
    logger.error('Error fetching related services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related services',
      error: error.message
    });
  }
};

/**
 * Get featured services (for homepage banner)
 * GET /api/services/featured
 */
export const getFeaturedServices = async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const services = await Product.find({
      productType: 'service',
      isActive: true,
      isFeatured: true,
      isDeleted: { $ne: true }
    })
      .populate('store', 'name logo location')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .sort({ 'ratings.average': -1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error: any) {
    logger.error('Error fetching featured services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured services',
      error: error.message
    });
  }
};

/**
 * Search services
 * GET /api/services/search
 */
export const searchServices = async (req: Request, res: Response) => {
  try {
    const {
      q,
      page = '1',
      limit = '20',
      category,
      serviceType,
      minPrice,
      maxPrice
    } = req.query;

    if (!q || (q as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchText = (q as string).trim();

    // Build query
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      $text: { $search: searchText }
    };

    // Category filter
    if (category) {
      const serviceCategory = await ServiceCategory.findOne({ slug: category });
      if (serviceCategory) {
        query.serviceCategory = serviceCategory._id;
      }
    }

    // Service type filter
    if (serviceType) {
      query['serviceDetails.serviceType'] = serviceType;
    }

    // Price filter
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      Product.find(query, { score: { $meta: 'textScore' } })
        .populate('store', 'name logo location')
        .populate('serviceCategory', 'name icon cashbackPercentage slug')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: services,
      query: searchText,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error('Error searching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search services',
      error: error.message
    });
  }
};

// Export all controller functions
export default {
  getServices,
  getPopularServices,
  getNearbyServices,
  getServiceById,
  getRelatedServices,
  getFeaturedServices,
  searchServices
};

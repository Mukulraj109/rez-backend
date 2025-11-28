import { Request, Response } from 'express';
import Outlet from '../models/Outlet';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

/**
 * GET /api/outlets
 * Get all outlets with filters
 */
export const getOutlets = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      store,
      isActive = 'true',
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    // Build filter
    const filter: any = {};

    if (store) {
      filter.store = store;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [outlets, total] = await Promise.all([
      Outlet.find(filter)
        .populate('store', 'name logo category')
        .populate('offers', 'title cashBackPercentage validUntil')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Outlet.countDocuments(filter),
    ]);

    sendPaginated(res, outlets, pageNum, limitNum, total, 'Outlets fetched successfully');
  } catch (error) {
    console.error('Error fetching outlets:', error);
    sendError(res, 'Failed to fetch outlets', 500);
  }
};

/**
 * GET /api/outlets/:id
 * Get single outlet by ID
 */
export const getOutletById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const outlet = await Outlet.findById(id)
      .populate('store', 'name logo category description ratings contact')
      .populate('offers', 'title image cashBackPercentage validUntil')
      .lean();

    if (!outlet) {
      return sendError(res, 'Outlet not found', 404);
    }

    sendSuccess(res, outlet, 'Outlet fetched successfully');
  } catch (error) {
    console.error('Error fetching outlet:', error);
    sendError(res, 'Failed to fetch outlet', 500);
  }
};

/**
 * GET /api/outlets/store/:storeId
 * Get all outlets for a specific store
 */
export const getOutletsByStore = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, isActive = 'true' } = req.query;

    const filter: any = {
      store: storeId,
    };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [outlets, total] = await Promise.all([
      Outlet.find(filter)
        .populate('offers', 'title cashBackPercentage validUntil')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Outlet.countDocuments(filter),
    ]);

    sendPaginated(res, outlets, pageNum, limitNum, total, 'Store outlets fetched successfully');
  } catch (error) {
    console.error('Error fetching store outlets:', error);
    sendError(res, 'Failed to fetch store outlets', 500);
  }
};

/**
 * GET /api/outlets/nearby
 * Find nearby outlets based on location
 */
export const getNearbyOutlets = async (req: Request, res: Response) => {
  try {
    const { lng, lat, radius = 10, limit = 20, store } = req.query;

    if (!lng || !lat) {
      return sendError(res, 'Longitude and latitude are required', 400);
    }

    const longitude = Number(lng);
    const latitude = Number(lat);

    // Validate coordinates
    if (
      isNaN(longitude) ||
      isNaN(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return sendError(res, 'Invalid coordinates', 400);
    }

    // Build query
    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: Number(radius) * 1000, // Convert km to meters
        },
      },
      isActive: true,
    };

    if (store) {
      query.store = store;
    }

    const outlets = await Outlet.find(query)
      .populate('store', 'name logo category')
      .populate('offers', 'title cashBackPercentage validUntil')
      .limit(Number(limit))
      .lean();

    // Calculate distances for each outlet
    const outletsWithDistance = outlets.map((outlet: any) => {
      const [outletLng, outletLat] = outlet.location.coordinates;

      // Haversine formula for distance calculation
      const toRadians = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371; // Earth's radius in km

      const dLat = toRadians(outletLat - latitude);
      const dLon = toRadians(outletLng - longitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(latitude)) *
          Math.cos(toRadians(outletLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        ...outlet,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        distanceUnit: 'km',
      };
    });

    sendSuccess(
      res,
      {
        outlets: outletsWithDistance,
        count: outletsWithDistance.length,
        searchCenter: { lng: longitude, lat: latitude },
        searchRadius: Number(radius),
      },
      'Nearby outlets fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching nearby outlets:', error);
    sendError(res, 'Failed to fetch nearby outlets', 500);
  }
};

/**
 * GET /api/outlets/:id/opening-hours
 * Get opening hours for a specific outlet
 */
export const getOutletOpeningHours = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const outlet = await Outlet.findById(id).select('name openingHours').lean();

    if (!outlet) {
      return sendError(res, 'Outlet not found', 404);
    }

    // Check if open now
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todayHours = outlet.openingHours?.find((hours: any) => hours.day === currentDay);
    let isOpenNow = false;

    if (todayHours && !todayHours.isClosed) {
      isOpenNow = currentTime >= todayHours.open && currentTime <= todayHours.close;
    }

    sendSuccess(
      res,
      {
        outlet: {
          _id: outlet._id,
          name: outlet.name,
        },
        openingHours: outlet.openingHours,
        isOpenNow,
        currentDay,
        currentTime,
      },
      'Opening hours fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching opening hours:', error);
    sendError(res, 'Failed to fetch opening hours', 500);
  }
};

/**
 * GET /api/outlets/:id/offers
 * Get offers available at a specific outlet
 */
export const getOutletOffers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const outlet = await Outlet.findById(id)
      .populate({
        path: 'offers',
        match: {
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
        select: 'title description image cashBackPercentage validUntil termsAndConditions',
      })
      .lean();

    if (!outlet) {
      return sendError(res, 'Outlet not found', 404);
    }

    sendSuccess(
      res,
      {
        outlet: {
          _id: outlet._id,
          name: outlet.name,
          address: outlet.address,
        },
        offers: outlet.offers || [],
        offersCount: outlet.offers?.length || 0,
      },
      'Outlet offers fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching outlet offers:', error);
    sendError(res, 'Failed to fetch outlet offers', 500);
  }
};

/**
 * POST /api/outlets/search
 * Search outlets by name or address
 */
export const searchOutlets = async (req: Request, res: Response) => {
  try {
    const { query, store, page = 1, limit = 20 } = req.body;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    // Build filter
    const filter: any = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
      ],
    };

    if (store) {
      filter.store = store;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [outlets, total] = await Promise.all([
      Outlet.find(filter)
        .populate('store', 'name logo')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Outlet.countDocuments(filter),
    ]);

    sendPaginated(res, outlets, pageNum, limitNum, total, 'Outlets search results');
  } catch (error) {
    console.error('Error searching outlets:', error);
    sendError(res, 'Failed to search outlets', 500);
  }
};

/**
 * GET /api/outlets/store/:storeId/count
 * Get count of outlets for a store
 */
export const getStoreOutletCount = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const count = await Outlet.countDocuments({
      store: storeId,
      isActive: true,
    });

    sendSuccess(
      res,
      {
        storeId,
        outletCount: count,
      },
      'Outlet count fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching outlet count:', error);
    sendError(res, 'Failed to fetch outlet count', 500);
  }
};

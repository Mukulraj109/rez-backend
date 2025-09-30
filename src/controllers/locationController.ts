import { Request, Response } from 'express';
import { User } from '../models/User';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest,
  sendUnauthorized 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { geocodingService, GeocodeRequest, SearchAddressRequest } from '../services/geocodingService';

// Update user location
export const updateUserLocation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendUnauthorized(res, 'User not authenticated');
  }

  const { latitude, longitude, address, source = 'manual' } = req.body;

  // Validate coordinates
  if (!geocodingService.validateCoordinates(latitude, longitude)) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // If no address provided, get it from coordinates
    let locationData = {
      coordinates: [longitude, latitude] as [number, number],
      address: address || '',
      city: '',
      state: '',
      pincode: '',
    };

    if (!address) {
      try {
        const geocodeResult = await geocodingService.reverseGeocode({ latitude, longitude });
        locationData = {
          coordinates: [longitude, latitude],
          address: geocodeResult.formattedAddress,
          city: geocodeResult.city,
          state: geocodeResult.state,
          pincode: geocodeResult.pincode || '',
        };
      } catch (error) {
        console.error('Geocoding failed:', error);
        // Continue with coordinates only
      }
    }

    // Update user location
    user.profile.location = {
      ...user.profile.location,
      ...locationData,
    };

    // Add to location history
    if (!user.profile.locationHistory) {
      user.profile.locationHistory = [];
    }

    user.profile.locationHistory.push({
      coordinates: [longitude, latitude],
      address: locationData.address,
      timestamp: new Date(),
      source: source,
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    user.profile.locationHistory = user.profile.locationHistory.filter(
      (entry: any) => entry.timestamp > thirtyDaysAgo
    );

    // Get timezone
    try {
      const timezone = await geocodingService.getTimezone(latitude, longitude);
      user.profile.timezone = timezone;
    } catch (error) {
      console.error('Timezone detection failed:', error);
    }

    await user.save();

    sendSuccess(res, {
      message: 'Location updated successfully',
      location: {
        coordinates: locationData.coordinates,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        pincode: locationData.pincode,
        timezone: user.profile.timezone,
      },
    });
  } catch (error) {
    console.error('Location update error:', error);
    throw new AppError('Failed to update location', 500);
  }
});

// Get current user location
export const getCurrentLocation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendUnauthorized(res, 'User not authenticated');
  }

  try {
    const user = await User.findById(userId).select('profile.location profile.timezone');
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    if (!user.profile.location || !user.profile.location.coordinates) {
      return sendNotFound(res, 'No location found for user');
    }

    sendSuccess(res, {
      location: {
        coordinates: user.profile.location.coordinates,
        address: user.profile.location.address,
        city: user.profile.location.city,
        state: user.profile.location.state,
        pincode: user.profile.location.pincode,
        timezone: user.profile.timezone,
      },
    });
  } catch (error) {
    console.error('Get location error:', error);
    throw new AppError('Failed to get location', 500);
  }
});

// Get location history
export const getLocationHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendUnauthorized(res, 'User not authenticated');
  }

  const { limit = 10, page = 1 } = req.query;

  try {
    const user = await User.findById(userId).select('profile.locationHistory');
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const history = user.profile.locationHistory || [];
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedHistory = history.slice(startIndex, endIndex);

    sendSuccess(res, {
      history: paginatedHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: history.length,
        hasNext: endIndex < history.length,
        hasPrevious: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get location history error:', error);
    throw new AppError('Failed to get location history', 500);
  }
});

// Reverse geocoding - Convert coordinates to address
export const reverseGeocode = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;

  if (!geocodingService.validateCoordinates(latitude, longitude)) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    const result = await geocodingService.reverseGeocode({ latitude, longitude });
    sendSuccess(res, result);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new AppError('Failed to get address from coordinates', 500);
  }
});

// Search addresses
export const searchAddresses = asyncHandler(async (req: Request, res: Response) => {
  const { query, limit = 5 } = req.body;

  if (!query || query.trim().length < 2) {
    return sendBadRequest(res, 'Query must be at least 2 characters long');
  }

  try {
    const results = await geocodingService.searchAddresses({ query: query.trim(), limit });
    sendSuccess(res, { results });
  } catch (error) {
    console.error('Address search error:', error);
    throw new AppError('Failed to search addresses', 500);
  }
});

// Validate address
export const validateAddress = asyncHandler(async (req: Request, res: Response) => {
  const { address, latitude, longitude } = req.body;

  if (!address && (!latitude || !longitude)) {
    return sendBadRequest(res, 'Either address or coordinates must be provided');
  }

  try {
    let isValid = false;
    let validatedAddress = null;

    if (latitude && longitude) {
      // Validate coordinates
      isValid = geocodingService.validateCoordinates(latitude, longitude);
      if (isValid) {
        try {
          validatedAddress = await geocodingService.reverseGeocode({ latitude, longitude });
        } catch (error) {
          isValid = false;
        }
      }
    } else if (address) {
      // Search for address
      try {
        const results = await geocodingService.searchAddresses({ query: address, limit: 1 });
        isValid = results.length > 0;
        if (isValid) {
          validatedAddress = results[0];
        }
      } catch (error) {
        isValid = false;
      }
    }

    sendSuccess(res, {
      isValid,
      validatedAddress,
    });
  } catch (error) {
    console.error('Address validation error:', error);
    throw new AppError('Failed to validate address', 500);
  }
});

// Get timezone for coordinates
export const getTimezone = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return sendBadRequest(res, 'Latitude and longitude are required');
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!geocodingService.validateCoordinates(lat, lng)) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    const timezone = await geocodingService.getTimezone(lat, lng);
    sendSuccess(res, { timezone });
  } catch (error) {
    console.error('Timezone error:', error);
    throw new AppError('Failed to get timezone', 500);
  }
});

// Get nearby stores (enhanced version)
export const getNearbyStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius = 5, limit = 20 } = req.query;

  if (!latitude || !longitude) {
    return sendBadRequest(res, 'Latitude and longitude are required');
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!geocodingService.validateCoordinates(lat, lng)) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Import Store model dynamically to avoid circular dependency
    const { Store } = await import('../models/Store');
    
    const stores = await Store.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Number(radius) * 1000, // Convert km to meters
        },
      },
    })
    .populate('categories', 'name slug')
    .limit(Number(limit))
    .lean();

    // Add distance to each store
    const storesWithDistance = stores.map((store: any) => {
      if (store.location?.coordinates) {
        const distance = geocodingService.calculateDistance(
          lat, lng,
          store.location.coordinates[1], store.location.coordinates[0]
        );
        return {
          ...store,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        };
      }
      return store;
    });

    sendSuccess(res, {
      stores: storesWithDistance,
      userLocation: {
        coordinates: [lng, lat],
        radius: Number(radius),
      },
    });
  } catch (error) {
    console.error('Nearby stores error:', error);
    throw new AppError('Failed to get nearby stores', 500);
  }
});

// Get location statistics
export const getLocationStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendUnauthorized(res, 'User not authenticated');
  }

  try {
    const user = await User.findById(userId).select('profile.location profile.locationHistory');
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const history = user.profile.locationHistory || [];
    const currentLocation = user.profile.location;

    // Calculate statistics
    const totalLocations = history.length;
    const uniqueCities = new Set(history.map((entry: any) => entry.city)).size;
    const lastUpdated = history.length > 0 ? history[history.length - 1].timestamp : null;

    // Most visited city
    const cityCounts: { [key: string]: number } = {};
    history.forEach((entry: any) => {
      if (entry.city) {
        cityCounts[entry.city] = (cityCounts[entry.city] || 0) + 1;
      }
    });

    const mostVisitedCity = Object.keys(cityCounts).reduce((a, b) => 
      cityCounts[a] > cityCounts[b] ? a : b, ''
    );

    sendSuccess(res, {
      stats: {
        totalLocations,
        uniqueCities,
        mostVisitedCity,
        lastUpdated,
        currentLocation: currentLocation ? {
          city: currentLocation.city,
          state: currentLocation.state,
          coordinates: currentLocation.coordinates,
        } : null,
      },
    });
  } catch (error) {
    console.error('Location stats error:', error);
    throw new AppError('Failed to get location statistics', 500);
  }
});

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationStats = exports.getNearbyStores = exports.getTimezone = exports.validateAddress = exports.searchAddresses = exports.reverseGeocode = exports.getLocationHistory = exports.getCurrentLocation = exports.updateUserLocation = void 0;
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const geocodingService_1 = require("../services/geocodingService");
// Update user location
exports.updateUserLocation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return (0, response_1.sendUnauthorized)(res, 'User not authenticated');
    }
    const { latitude, longitude, address, source = 'manual' } = req.body;
    // Validate coordinates
    if (!geocodingService_1.geocodingService.validateCoordinates(latitude, longitude)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid coordinates provided');
    }
    try {
        // Get user
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // If no address provided, get it from coordinates
        let locationData = {
            coordinates: [longitude, latitude],
            address: address || '',
            city: '',
            state: '',
            pincode: '',
        };
        if (!address) {
            try {
                const geocodeResult = await geocodingService_1.geocodingService.reverseGeocode({ latitude, longitude });
                locationData = {
                    coordinates: [longitude, latitude],
                    address: geocodeResult.formattedAddress,
                    city: geocodeResult.city,
                    state: geocodeResult.state,
                    pincode: geocodeResult.pincode || '',
                };
            }
            catch (error) {
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
        user.profile.locationHistory = user.profile.locationHistory.filter((entry) => entry.timestamp > thirtyDaysAgo);
        // Get timezone
        try {
            const timezone = await geocodingService_1.geocodingService.getTimezone(latitude, longitude);
            user.profile.timezone = timezone;
        }
        catch (error) {
            console.error('Timezone detection failed:', error);
        }
        await user.save();
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        console.error('Location update error:', error);
        throw new errorHandler_1.AppError('Failed to update location', 500);
    }
});
// Get current user location
exports.getCurrentLocation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return (0, response_1.sendUnauthorized)(res, 'User not authenticated');
    }
    try {
        const user = await User_1.User.findById(userId).select('profile.location profile.timezone');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        if (!user.profile.location || !user.profile.location.coordinates) {
            return (0, response_1.sendNotFound)(res, 'No location found for user');
        }
        (0, response_1.sendSuccess)(res, {
            location: {
                coordinates: user.profile.location.coordinates,
                address: user.profile.location.address,
                city: user.profile.location.city,
                state: user.profile.location.state,
                pincode: user.profile.location.pincode,
                timezone: user.profile.timezone,
            },
        });
    }
    catch (error) {
        console.error('Get location error:', error);
        throw new errorHandler_1.AppError('Failed to get location', 500);
    }
});
// Get location history
exports.getLocationHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return (0, response_1.sendUnauthorized)(res, 'User not authenticated');
    }
    const { limit = 10, page = 1 } = req.query;
    try {
        const user = await User_1.User.findById(userId).select('profile.locationHistory');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        const history = user.profile.locationHistory || [];
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedHistory = history.slice(startIndex, endIndex);
        (0, response_1.sendSuccess)(res, {
            history: paginatedHistory,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: history.length,
                hasNext: endIndex < history.length,
                hasPrevious: Number(page) > 1,
            },
        });
    }
    catch (error) {
        console.error('Get location history error:', error);
        throw new errorHandler_1.AppError('Failed to get location history', 500);
    }
});
// Reverse geocoding - Convert coordinates to address
exports.reverseGeocode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!geocodingService_1.geocodingService.validateCoordinates(latitude, longitude)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid coordinates provided');
    }
    try {
        const result = await geocodingService_1.geocodingService.reverseGeocode({ latitude, longitude });
        (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        console.error('Reverse geocoding error:', error);
        throw new errorHandler_1.AppError('Failed to get address from coordinates', 500);
    }
});
// Search addresses
exports.searchAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { query, limit = 5 } = req.body;
    if (!query || query.trim().length < 2) {
        return (0, response_1.sendBadRequest)(res, 'Query must be at least 2 characters long');
    }
    try {
        const results = await geocodingService_1.geocodingService.searchAddresses({ query: query.trim(), limit });
        (0, response_1.sendSuccess)(res, { results });
    }
    catch (error) {
        console.error('Address search error:', error);
        throw new errorHandler_1.AppError('Failed to search addresses', 500);
    }
});
// Validate address
exports.validateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { address, latitude, longitude } = req.body;
    if (!address && (!latitude || !longitude)) {
        return (0, response_1.sendBadRequest)(res, 'Either address or coordinates must be provided');
    }
    try {
        let isValid = false;
        let validatedAddress = null;
        if (latitude && longitude) {
            // Validate coordinates
            isValid = geocodingService_1.geocodingService.validateCoordinates(latitude, longitude);
            if (isValid) {
                try {
                    validatedAddress = await geocodingService_1.geocodingService.reverseGeocode({ latitude, longitude });
                }
                catch (error) {
                    isValid = false;
                }
            }
        }
        else if (address) {
            // Search for address
            try {
                const results = await geocodingService_1.geocodingService.searchAddresses({ query: address, limit: 1 });
                isValid = results.length > 0;
                if (isValid) {
                    validatedAddress = results[0];
                }
            }
            catch (error) {
                isValid = false;
            }
        }
        (0, response_1.sendSuccess)(res, {
            isValid,
            validatedAddress,
        });
    }
    catch (error) {
        console.error('Address validation error:', error);
        throw new errorHandler_1.AppError('Failed to validate address', 500);
    }
});
// Get timezone for coordinates
exports.getTimezone = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return (0, response_1.sendBadRequest)(res, 'Latitude and longitude are required');
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!geocodingService_1.geocodingService.validateCoordinates(lat, lng)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid coordinates provided');
    }
    try {
        const timezone = await geocodingService_1.geocodingService.getTimezone(lat, lng);
        (0, response_1.sendSuccess)(res, { timezone });
    }
    catch (error) {
        console.error('Timezone error:', error);
        throw new errorHandler_1.AppError('Failed to get timezone', 500);
    }
});
// Get nearby stores (enhanced version)
exports.getNearbyStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { latitude, longitude, radius = 5, limit = 20 } = req.query;
    if (!latitude || !longitude) {
        return (0, response_1.sendBadRequest)(res, 'Latitude and longitude are required');
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!geocodingService_1.geocodingService.validateCoordinates(lat, lng)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid coordinates provided');
    }
    try {
        // Import Store model dynamically to avoid circular dependency
        const { Store } = await Promise.resolve().then(() => __importStar(require('../models/Store')));
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
        const storesWithDistance = stores.map((store) => {
            if (store.location?.coordinates) {
                const distance = geocodingService_1.geocodingService.calculateDistance(lat, lng, store.location.coordinates[1], store.location.coordinates[0]);
                return {
                    ...store,
                    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                };
            }
            return store;
        });
        (0, response_1.sendSuccess)(res, {
            stores: storesWithDistance,
            userLocation: {
                coordinates: [lng, lat],
                radius: Number(radius),
            },
        });
    }
    catch (error) {
        console.error('Nearby stores error:', error);
        throw new errorHandler_1.AppError('Failed to get nearby stores', 500);
    }
});
// Get location statistics
exports.getLocationStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return (0, response_1.sendUnauthorized)(res, 'User not authenticated');
    }
    try {
        const user = await User_1.User.findById(userId).select('profile.location profile.locationHistory');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        const history = user.profile.locationHistory || [];
        const currentLocation = user.profile.location;
        // Calculate statistics
        const totalLocations = history.length;
        const uniqueCities = new Set(history.map((entry) => entry.city)).size;
        const lastUpdated = history.length > 0 ? history[history.length - 1].timestamp : null;
        // Most visited city
        const cityCounts = {};
        history.forEach((entry) => {
            if (entry.city) {
                cityCounts[entry.city] = (cityCounts[entry.city] || 0) + 1;
            }
        });
        const mostVisitedCity = Object.keys(cityCounts).reduce((a, b) => cityCounts[a] > cityCounts[b] ? a : b, '');
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        console.error('Location stats error:', error);
        throw new errorHandler_1.AppError('Failed to get location statistics', 500);
    }
});

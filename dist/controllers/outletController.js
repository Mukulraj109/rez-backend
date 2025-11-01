"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreOutletCount = exports.searchOutlets = exports.getOutletOffers = exports.getOutletOpeningHours = exports.getNearbyOutlets = exports.getOutletsByStore = exports.getOutletById = exports.getOutlets = void 0;
const Outlet_1 = __importDefault(require("../models/Outlet"));
const response_1 = require("../utils/response");
/**
 * GET /api/outlets
 * Get all outlets with filters
 */
const getOutlets = async (req, res) => {
    try {
        const { page = 1, limit = 20, store, isActive = 'true', sortBy = 'name', order = 'asc', } = req.query;
        // Build filter
        const filter = {};
        if (store) {
            filter.store = store;
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [outlets, total] = await Promise.all([
            Outlet_1.default.find(filter)
                .populate('store', 'name logo category')
                .populate('offers', 'title cashBackPercentage validUntil')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Outlet_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, outlets, pageNum, limitNum, total, 'Outlets fetched successfully');
    }
    catch (error) {
        console.error('Error fetching outlets:', error);
        (0, response_1.sendError)(res, 'Failed to fetch outlets', 500);
    }
};
exports.getOutlets = getOutlets;
/**
 * GET /api/outlets/:id
 * Get single outlet by ID
 */
const getOutletById = async (req, res) => {
    try {
        const { id } = req.params;
        const outlet = await Outlet_1.default.findById(id)
            .populate('store', 'name logo category description ratings contact')
            .populate('offers', 'title image cashBackPercentage validUntil')
            .lean();
        if (!outlet) {
            return (0, response_1.sendError)(res, 'Outlet not found', 404);
        }
        (0, response_1.sendSuccess)(res, outlet, 'Outlet fetched successfully');
    }
    catch (error) {
        console.error('Error fetching outlet:', error);
        (0, response_1.sendError)(res, 'Failed to fetch outlet', 500);
    }
};
exports.getOutletById = getOutletById;
/**
 * GET /api/outlets/store/:storeId
 * Get all outlets for a specific store
 */
const getOutletsByStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { page = 1, limit = 20, isActive = 'true' } = req.query;
        const filter = {
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
            Outlet_1.default.find(filter)
                .populate('offers', 'title cashBackPercentage validUntil')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Outlet_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, outlets, pageNum, limitNum, total, 'Store outlets fetched successfully');
    }
    catch (error) {
        console.error('Error fetching store outlets:', error);
        (0, response_1.sendError)(res, 'Failed to fetch store outlets', 500);
    }
};
exports.getOutletsByStore = getOutletsByStore;
/**
 * GET /api/outlets/nearby
 * Find nearby outlets based on location
 */
const getNearbyOutlets = async (req, res) => {
    try {
        const { lng, lat, radius = 10, limit = 20, store } = req.query;
        if (!lng || !lat) {
            return (0, response_1.sendError)(res, 'Longitude and latitude are required', 400);
        }
        const longitude = Number(lng);
        const latitude = Number(lat);
        // Validate coordinates
        if (isNaN(longitude) ||
            isNaN(latitude) ||
            longitude < -180 ||
            longitude > 180 ||
            latitude < -90 ||
            latitude > 90) {
            return (0, response_1.sendError)(res, 'Invalid coordinates', 400);
        }
        // Build query
        const query = {
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
        const outlets = await Outlet_1.default.find(query)
            .populate('store', 'name logo category')
            .populate('offers', 'title cashBackPercentage validUntil')
            .limit(Number(limit))
            .lean();
        // Calculate distances for each outlet
        const outletsWithDistance = outlets.map((outlet) => {
            const [outletLng, outletLat] = outlet.location.coordinates;
            // Haversine formula for distance calculation
            const toRadians = (deg) => (deg * Math.PI) / 180;
            const R = 6371; // Earth's radius in km
            const dLat = toRadians(outletLat - latitude);
            const dLon = toRadians(outletLng - longitude);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
        (0, response_1.sendSuccess)(res, {
            outlets: outletsWithDistance,
            count: outletsWithDistance.length,
            searchCenter: { lng: longitude, lat: latitude },
            searchRadius: Number(radius),
        }, 'Nearby outlets fetched successfully');
    }
    catch (error) {
        console.error('Error fetching nearby outlets:', error);
        (0, response_1.sendError)(res, 'Failed to fetch nearby outlets', 500);
    }
};
exports.getNearbyOutlets = getNearbyOutlets;
/**
 * GET /api/outlets/:id/opening-hours
 * Get opening hours for a specific outlet
 */
const getOutletOpeningHours = async (req, res) => {
    try {
        const { id } = req.params;
        const outlet = await Outlet_1.default.findById(id).select('name openingHours').lean();
        if (!outlet) {
            return (0, response_1.sendError)(res, 'Outlet not found', 404);
        }
        // Check if open now
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const todayHours = outlet.openingHours?.find((hours) => hours.day === currentDay);
        let isOpenNow = false;
        if (todayHours && !todayHours.isClosed) {
            isOpenNow = currentTime >= todayHours.open && currentTime <= todayHours.close;
        }
        (0, response_1.sendSuccess)(res, {
            outlet: {
                _id: outlet._id,
                name: outlet.name,
            },
            openingHours: outlet.openingHours,
            isOpenNow,
            currentDay,
            currentTime,
        }, 'Opening hours fetched successfully');
    }
    catch (error) {
        console.error('Error fetching opening hours:', error);
        (0, response_1.sendError)(res, 'Failed to fetch opening hours', 500);
    }
};
exports.getOutletOpeningHours = getOutletOpeningHours;
/**
 * GET /api/outlets/:id/offers
 * Get offers available at a specific outlet
 */
const getOutletOffers = async (req, res) => {
    try {
        const { id } = req.params;
        const outlet = await Outlet_1.default.findById(id)
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
            return (0, response_1.sendError)(res, 'Outlet not found', 404);
        }
        (0, response_1.sendSuccess)(res, {
            outlet: {
                _id: outlet._id,
                name: outlet.name,
                address: outlet.address,
            },
            offers: outlet.offers || [],
            offersCount: outlet.offers?.length || 0,
        }, 'Outlet offers fetched successfully');
    }
    catch (error) {
        console.error('Error fetching outlet offers:', error);
        (0, response_1.sendError)(res, 'Failed to fetch outlet offers', 500);
    }
};
exports.getOutletOffers = getOutletOffers;
/**
 * POST /api/outlets/search
 * Search outlets by name or address
 */
const searchOutlets = async (req, res) => {
    try {
        const { query, store, page = 1, limit = 20 } = req.body;
        if (!query || typeof query !== 'string') {
            return (0, response_1.sendError)(res, 'Search query is required', 400);
        }
        // Build filter
        const filter = {
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
            Outlet_1.default.find(filter)
                .populate('store', 'name logo')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Outlet_1.default.countDocuments(filter),
        ]);
        (0, response_1.sendPaginated)(res, outlets, pageNum, limitNum, total, 'Outlets search results');
    }
    catch (error) {
        console.error('Error searching outlets:', error);
        (0, response_1.sendError)(res, 'Failed to search outlets', 500);
    }
};
exports.searchOutlets = searchOutlets;
/**
 * GET /api/outlets/store/:storeId/count
 * Get count of outlets for a store
 */
const getStoreOutletCount = async (req, res) => {
    try {
        const { storeId } = req.params;
        const count = await Outlet_1.default.countDocuments({
            store: storeId,
            isActive: true,
        });
        (0, response_1.sendSuccess)(res, {
            storeId,
            outletCount: count,
        }, 'Outlet count fetched successfully');
    }
    catch (error) {
        console.error('Error fetching outlet count:', error);
        (0, response_1.sendError)(res, 'Failed to fetch outlet count', 500);
    }
};
exports.getStoreOutletCount = getStoreOutletCount;

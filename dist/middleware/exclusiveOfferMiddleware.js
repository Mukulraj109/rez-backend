"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFollowingStore = isFollowingStore;
exports.getUserFollowedStores = getUserFollowedStores;
exports.addFollowerContext = addFollowerContext;
exports.filterExclusiveOffers = filterExclusiveOffers;
exports.checkExclusiveOfferAccess = checkExclusiveOfferAccess;
const Wishlist_1 = require("../models/Wishlist");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Check if user is following a store
 * @param userId - The user ID
 * @param storeId - The store ID
 * @returns Promise<boolean> - True if user follows the store
 */
async function isFollowingStore(userId, storeId) {
    try {
        const wishlist = await Wishlist_1.Wishlist.findOne({
            user: userId,
            'items': {
                $elemMatch: {
                    itemType: 'Store',
                    itemId: new mongoose_1.default.Types.ObjectId(storeId.toString())
                }
            }
        });
        return !!wishlist;
    }
    catch (error) {
        console.error('Error checking follow status:', error);
        return false;
    }
}
/**
 * Get all stores that a user follows
 * @param userId - The user ID
 * @returns Promise<string[]> - Array of store IDs
 */
async function getUserFollowedStores(userId) {
    try {
        const wishlists = await Wishlist_1.Wishlist.find({
            user: userId,
            'items.itemType': 'Store'
        }).select('items');
        const storeIds = [];
        wishlists.forEach(wishlist => {
            wishlist.items.forEach(item => {
                if (item.itemType === 'Store') {
                    storeIds.push(item.itemId.toString());
                }
            });
        });
        return [...new Set(storeIds)]; // Remove duplicates
    }
    catch (error) {
        console.error('Error getting followed stores:', error);
        return [];
    }
}
/**
 * Middleware to add follower context to requests
 * Adds req.followedStores array with store IDs user follows
 */
async function addFollowerContext(req, res, next) {
    try {
        if (req.user?.id) {
            const followedStores = await getUserFollowedStores(req.user.id);
            req.followedStores = followedStores;
        }
        else {
            req.followedStores = [];
        }
        next();
    }
    catch (error) {
        console.error('Error in addFollowerContext middleware:', error);
        req.followedStores = [];
        next();
    }
}
/**
 * Filter offers based on follower-exclusive status
 * @param offers - Array of offers
 * @param userId - User ID (optional)
 * @param followedStores - Array of store IDs user follows (optional)
 * @returns Promise<any[]> - Filtered offers
 */
async function filterExclusiveOffers(offers, userId, followedStores) {
    if (!offers || offers.length === 0) {
        return [];
    }
    const now = new Date();
    let userFollowedStores = followedStores;
    // Get followed stores if not provided
    if (userId && !userFollowedStores) {
        userFollowedStores = await getUserFollowedStores(userId);
    }
    return offers.filter(offer => {
        // If offer is not follower-exclusive, show to everyone
        if (!offer.isFollowerExclusive) {
            return true;
        }
        // Check if exclusive period has expired
        if (offer.exclusiveUntil && now > new Date(offer.exclusiveUntil)) {
            return true; // Show to everyone after exclusive period
        }
        // If user is not authenticated, hide exclusive offers
        if (!userId) {
            return false;
        }
        // Check if user follows the store
        const storeId = offer.store?.id?.toString() || offer.store?.toString();
        if (!storeId) {
            return false;
        }
        const isFollowing = userFollowedStores?.includes(storeId);
        // Based on visibility setting
        if (offer.visibleTo === 'followers' && isFollowing) {
            return true;
        }
        if (offer.visibleTo === 'premium') {
            // TODO: Add premium user check here
            // For now, treat premium same as followers
            return isFollowing;
        }
        if (offer.visibleTo === 'all') {
            return true;
        }
        return false;
    });
}
/**
 * Middleware to check if user can access an exclusive offer
 * Use this on single offer endpoints (e.g., GET /offers/:id)
 */
async function checkExclusiveOfferAccess(req, res, next) {
    try {
        const offer = req.offer; // Assumes offer is attached by previous middleware
        if (!offer) {
            return next();
        }
        // If not exclusive, allow access
        if (!offer.isFollowerExclusive) {
            return next();
        }
        // Check if exclusive period has expired
        const now = new Date();
        if (offer.exclusiveUntil && now > new Date(offer.exclusiveUntil)) {
            return next(); // Allow access after exclusive period
        }
        // Check if user is authenticated
        if (!req.user?.id) {
            res.status(403).json({
                success: false,
                message: 'This is a follower-exclusive offer. Please follow the store to access it.'
            });
            return;
        }
        // Check if user follows the store
        const storeId = offer.store?._id?.toString() || offer.store?.id?.toString() || offer.store?.toString();
        const isFollowing = await isFollowingStore(req.user.id, storeId);
        if (offer.visibleTo === 'followers' && !isFollowing) {
            res.status(403).json({
                success: false,
                message: 'This offer is exclusive to store followers. Please follow the store to access it.',
                requiresFollow: true,
                storeId
            });
            return;
        }
        if (offer.visibleTo === 'premium') {
            // TODO: Add premium user check
            if (!isFollowing) {
                res.status(403).json({
                    success: false,
                    message: 'This offer is exclusive to premium members and store followers.',
                    requiresFollow: true,
                    storeId
                });
                return;
            }
        }
        next();
    }
    catch (error) {
        console.error('Error in checkExclusiveOfferAccess:', error);
        next(); // Continue on error to avoid breaking the flow
    }
}

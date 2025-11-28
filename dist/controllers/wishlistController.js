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
exports.removeItemByTypeAndId = exports.checkWishlistStatus = exports.getDefaultWishlist = exports.getPublicWishlists = exports.deleteWishlist = exports.updateWishlistItem = exports.removeFromWishlist = exports.addToWishlist = exports.getWishlistById = exports.createWishlist = exports.getUserWishlists = void 0;
const Wishlist_1 = require("../models/Wishlist");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const storeFollowService = __importStar(require("../services/storeFollowService"));
const followerAnalyticsService_1 = require("../services/followerAnalyticsService");
// Get user's wishlists
exports.getUserWishlists = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { category, page = 1, limit = 20 } = req.query;
    try {
        const query = { user: userId };
        if (category)
            query.category = category;
        const skip = (Number(page) - 1) * Number(limit);
        const wishlists = await Wishlist_1.Wishlist.find(query)
            .populate('items.itemId', 'name images basePrice salePrice')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Wishlist_1.Wishlist.countDocuments(query);
        (0, response_1.sendSuccess)(res, {
            wishlists,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, 'Wishlists retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch wishlists', 500);
    }
});
// Create new wishlist
exports.createWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { name, description, category, isPublic } = req.body;
    try {
        const wishlist = new Wishlist_1.Wishlist({
            user: userId,
            name,
            description,
            category: category || 'personal',
            isPublic: isPublic || false
        });
        await wishlist.save();
        (0, response_1.sendSuccess)(res, wishlist, 'Wishlist created successfully', 201);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to create wishlist', 500);
    }
});
// Get single wishlist
exports.getWishlistById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { wishlistId } = req.params;
    const userId = req.userId;
    try {
        const wishlist = await Wishlist_1.Wishlist.findById(wishlistId)
            .populate('user', 'profile.firstName profile.lastName profile.avatar')
            .populate('items.itemId', 'name images basePrice salePrice store')
            .populate('items.itemId.store', 'name slug')
            .lean();
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        // Check if user can access this wishlist
        if (!wishlist.isPublic && (!userId || wishlist.user._id.toString() !== userId)) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        (0, response_1.sendSuccess)(res, wishlist, 'Wishlist retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch wishlist', 500);
    }
});
// Add item to wishlist
exports.addToWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { wishlistId } = req.params;
    const userId = req.userId;
    const { itemType: rawItemType, itemId, priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;
    try {
        // Normalize itemType to match backend schema (capitalize first letter)
        const itemType = rawItemType.charAt(0).toUpperCase() + rawItemType.slice(1).toLowerCase();
        // Validate itemType
        const validTypes = ['Product', 'Store', 'Video'];
        if (!validTypes.includes(itemType)) {
            return (0, response_1.sendBadRequest)(res, `Invalid itemType. Must be one of: ${validTypes.join(', ')}`);
        }
        const wishlist = await Wishlist_1.Wishlist.findOne({ _id: wishlistId, user: userId });
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        // Check if item already exists in wishlist
        const existingItem = wishlist.items.find(item => item.itemType === itemType && item.itemId.toString() === itemId);
        if (existingItem) {
            return (0, response_1.sendBadRequest)(res, 'Item already exists in wishlist');
        }
        // Verify item exists
        if (itemType === 'Product') {
            const product = await Product_1.Product.findById(itemId);
            if (!product) {
                return (0, response_1.sendNotFound)(res, 'Product not found');
            }
        }
        else if (itemType === 'Store') {
            const store = await Store_1.Store.findById(itemId);
            if (!store) {
                return (0, response_1.sendNotFound)(res, 'Store not found');
            }
        }
        // Add item to wishlist
        wishlist.items.push({
            itemType: itemType,
            itemId,
            addedAt: new Date(),
            priority: priority || 'medium',
            notes,
            targetPrice,
            notifyOnPriceChange: notifyOnPriceChange !== false,
            notifyOnAvailability: notifyOnAvailability !== false,
            tags: tags || []
        });
        await wishlist.save();
        // If the item is a Store, increment the followers count and record analytics
        if (itemType === 'Store') {
            try {
                await storeFollowService.incrementFollowers(itemId);
                // Record follow event for analytics
                (0, followerAnalyticsService_1.recordNewFollow)(itemId).catch(err => console.error('[WishlistController] Failed to record follow analytics:', err));
            }
            catch (error) {
                console.error('[WishlistController] Failed to increment store followers:', error);
                // Don't fail the entire request if followers update fails
            }
        }
        const populatedWishlist = await Wishlist_1.Wishlist.findById(wishlist._id)
            .populate('items.itemId', 'name images basePrice salePrice')
            .lean();
        (0, response_1.sendSuccess)(res, populatedWishlist, 'Item added to wishlist successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to add item to wishlist', 500);
    }
});
// Remove item from wishlist
exports.removeFromWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { wishlistId, itemId } = req.params;
    const userId = req.userId;
    try {
        const wishlist = await Wishlist_1.Wishlist.findOne({ _id: wishlistId, user: userId });
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        const itemIndex = wishlist.items.findIndex(item => item.itemId.toString() === itemId);
        if (itemIndex === -1) {
            return (0, response_1.sendNotFound)(res, 'Item not found in wishlist');
        }
        // Store the item info before removing it
        const removedItem = wishlist.items[itemIndex];
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        // If the removed item is a Store, decrement the followers count and record analytics
        if (removedItem.itemType === 'Store') {
            try {
                await storeFollowService.decrementFollowers(removedItem.itemId.toString());
                // Record unfollow event for analytics
                (0, followerAnalyticsService_1.recordUnfollow)(removedItem.itemId).catch(err => console.error('[WishlistController] Failed to record unfollow analytics:', err));
            }
            catch (error) {
                console.error('[WishlistController] Failed to decrement store followers:', error);
                // Don't fail the entire request if followers update fails
            }
        }
        (0, response_1.sendSuccess)(res, null, 'Item removed from wishlist successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to remove item from wishlist', 500);
    }
});
// Update wishlist item
exports.updateWishlistItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { wishlistId, itemId } = req.params;
    const userId = req.userId;
    const { priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;
    try {
        const wishlist = await Wishlist_1.Wishlist.findOne({ _id: wishlistId, user: userId });
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        const item = wishlist.items.find(item => item.itemId.toString() === itemId);
        if (!item) {
            return (0, response_1.sendNotFound)(res, 'Item not found in wishlist');
        }
        // Update item properties
        if (priority)
            item.priority = priority;
        if (notes !== undefined)
            item.notes = notes;
        if (targetPrice !== undefined)
            item.targetPrice = targetPrice;
        if (notifyOnPriceChange !== undefined)
            item.notifyOnPriceChange = notifyOnPriceChange;
        if (notifyOnAvailability !== undefined)
            item.notifyOnAvailability = notifyOnAvailability;
        if (tags)
            item.tags = tags;
        await wishlist.save();
        const populatedWishlist = await Wishlist_1.Wishlist.findById(wishlist._id)
            .populate('items.itemId', 'name images basePrice salePrice')
            .lean();
        (0, response_1.sendSuccess)(res, populatedWishlist, 'Wishlist item updated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to update wishlist item', 500);
    }
});
// Delete wishlist
exports.deleteWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { wishlistId } = req.params;
    const userId = req.userId;
    try {
        const wishlist = await Wishlist_1.Wishlist.findOneAndDelete({ _id: wishlistId, user: userId });
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Wishlist not found');
        }
        (0, response_1.sendSuccess)(res, null, 'Wishlist deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete wishlist', 500);
    }
});
// Get public wishlists
exports.getPublicWishlists = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, search, page = 1, limit = 20 } = req.query;
    try {
        const query = { isPublic: true };
        if (category)
            query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const wishlists = await Wishlist_1.Wishlist.find(query)
            .populate('user', 'profile.firstName profile.lastName profile.avatar')
            .populate('items.itemId', 'name images basePrice')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Wishlist_1.Wishlist.countDocuments(query);
        (0, response_1.sendSuccess)(res, {
            wishlists,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, 'Public wishlists retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch public wishlists', 500);
    }
});
// Get default wishlist (or create one if it doesn't exist)
exports.getDefaultWishlist = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    try {
        // First, try to find an existing default wishlist
        let wishlist = await Wishlist_1.Wishlist.findOne({ user: userId, isDefault: true })
            .populate('items.itemId', 'name images basePrice salePrice')
            .lean();
        // If no default wishlist exists, create one
        if (!wishlist) {
            const newWishlist = new Wishlist_1.Wishlist({
                user: userId,
                name: 'My Wishlist',
                description: 'My default wishlist',
                category: 'personal',
                isDefault: true,
                isPublic: false
            });
            await newWishlist.save();
            wishlist = await Wishlist_1.Wishlist.findById(newWishlist._id)
                .populate('items.itemId', 'name images basePrice salePrice')
                .lean();
        }
        (0, response_1.sendSuccess)(res, wishlist, 'Default wishlist retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch default wishlist', 500);
    }
});
// Check if an item is in user's wishlist
exports.checkWishlistStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { itemType, itemId } = req.query;
    try {
        if (!itemType || !itemId) {
            return (0, response_1.sendBadRequest)(res, 'itemType and itemId are required');
        }
        // Normalize itemType to match backend schema (capitalize first letter)
        const normalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();
        // Validate itemType
        const validTypes = ['Product', 'Store', 'Video'];
        if (!validTypes.includes(normalizedItemType)) {
            return (0, response_1.sendBadRequest)(res, `Invalid itemType. Must be one of: ${validTypes.join(', ')}`);
        }
        // Find any wishlist belonging to the user that contains this item
        const wishlist = await Wishlist_1.Wishlist.findOne({
            user: userId,
            'items.itemType': normalizedItemType,
            'items.itemId': itemId
        }).lean();
        if (wishlist) {
            const item = wishlist.items.find((i) => i.itemType === normalizedItemType && i.itemId.toString() === itemId);
            (0, response_1.sendSuccess)(res, {
                inWishlist: true,
                wishlistItemId: item?._id?.toString(),
                wishlistId: wishlist._id.toString(),
                addedAt: item?.addedAt
            }, 'Item is in wishlist');
        }
        else {
            (0, response_1.sendSuccess)(res, {
                inWishlist: false
            }, 'Item is not in wishlist');
        }
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to check wishlist status', 500);
    }
});
// Remove item from wishlist by itemType and itemId (for convenience)
exports.removeItemByTypeAndId = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { itemType, itemId } = req.body;
    try {
        if (!itemType || !itemId) {
            return (0, response_1.sendBadRequest)(res, 'itemType and itemId are required');
        }
        // Normalize itemType to match backend schema
        const normalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();
        // Find wishlist containing this item and remove it
        const wishlist = await Wishlist_1.Wishlist.findOneAndUpdate({
            user: userId,
            'items.itemType': normalizedItemType,
            'items.itemId': itemId
        }, {
            $pull: { items: { itemType: normalizedItemType, itemId: itemId } }
        }, { new: true });
        if (!wishlist) {
            return (0, response_1.sendNotFound)(res, 'Item not found in any wishlist');
        }
        // If the removed item is a Store, decrement the followers count
        if (normalizedItemType === 'Store') {
            try {
                await storeFollowService.decrementFollowers(itemId);
            }
            catch (error) {
                console.error('[WishlistController] Failed to decrement store followers:', error);
                // Don't fail the entire request if followers update fails
            }
        }
        (0, response_1.sendSuccess)(res, null, 'Item removed from wishlist successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to remove item from wishlist', 500);
    }
});

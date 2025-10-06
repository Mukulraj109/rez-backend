"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicWishlists = exports.deleteWishlist = exports.updateWishlistItem = exports.removeFromWishlist = exports.addToWishlist = exports.getWishlistById = exports.createWishlist = exports.getUserWishlists = void 0;
const Wishlist_1 = require("../models/Wishlist");
const Product_1 = require("../models/Product");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
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
    const { itemType, itemId, priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;
    try {
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
        // Add item to wishlist
        wishlist.items.push({
            itemType,
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
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
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

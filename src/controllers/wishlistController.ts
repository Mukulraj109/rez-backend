import { Request, Response } from 'express';
import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get user's wishlists
export const getUserWishlists = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { category, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const wishlists = await Wishlist.find(query)
      .populate('items.itemId', 'name images basePrice salePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Wishlist.countDocuments(query);

    sendSuccess(res, {
      wishlists,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Wishlists retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch wishlists', 500);
  }
});

// Create new wishlist
export const createWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, description, category, isPublic } = req.body;

  try {
    const wishlist = new Wishlist({
      user: userId,
      name,
      description,
      category: category || 'personal',
      isPublic: isPublic || false
    });

    await wishlist.save();

    sendSuccess(res, wishlist, 'Wishlist created successfully', 201);
  } catch (error) {
    throw new AppError('Failed to create wishlist', 500);
  }
});

// Get single wishlist
export const getWishlistById = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId;

  try {
    const wishlist = await Wishlist.findById(wishlistId)
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .populate('items.itemId', 'name images basePrice salePrice store')
      .populate('items.itemId.store', 'name slug')
      .lean();

    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    // Check if user can access this wishlist
    if (!wishlist.isPublic && (!userId || (wishlist as any).user._id.toString() !== userId)) {
      return sendNotFound(res, 'Wishlist not found');
    }

    sendSuccess(res, wishlist, 'Wishlist retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch wishlist', 500);
  }
});

// Add item to wishlist
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId!;
  const { itemType, itemId, priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;

  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    // Check if item already exists in wishlist
    const existingItem = wishlist.items.find(item => 
      item.itemType === itemType && item.itemId.toString() === itemId
    );

    if (existingItem) {
      return sendBadRequest(res, 'Item already exists in wishlist');
    }

    // Verify item exists
    if (itemType === 'Product') {
      const product = await Product.findById(itemId);
      if (!product) {
        return sendNotFound(res, 'Product not found');
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

    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.itemId', 'name images basePrice salePrice')
      .lean();

    sendSuccess(res, populatedWishlist, 'Item added to wishlist successfully');
  } catch (error) {
    throw new AppError('Failed to add item to wishlist', 500);
  }
});

// Remove item from wishlist
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId, itemId } = req.params;
  const userId = req.userId!;

  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    const itemIndex = wishlist.items.findIndex(item => 
      item.itemId.toString() === itemId
    );

    if (itemIndex === -1) {
      return sendNotFound(res, 'Item not found in wishlist');
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    sendSuccess(res, null, 'Item removed from wishlist successfully');
  } catch (error) {
    throw new AppError('Failed to remove item from wishlist', 500);
  }
});

// Update wishlist item
export const updateWishlistItem = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId, itemId } = req.params;
  const userId = req.userId!;
  const { priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;

  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId });
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    const item = wishlist.items.find(item => 
      item.itemId.toString() === itemId
    );

    if (!item) {
      return sendNotFound(res, 'Item not found in wishlist');
    }

    // Update item properties
    if (priority) item.priority = priority;
    if (notes !== undefined) item.notes = notes;
    if (targetPrice !== undefined) item.targetPrice = targetPrice;
    if (notifyOnPriceChange !== undefined) item.notifyOnPriceChange = notifyOnPriceChange;
    if (notifyOnAvailability !== undefined) item.notifyOnAvailability = notifyOnAvailability;
    if (tags) item.tags = tags;

    await wishlist.save();

    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.itemId', 'name images basePrice salePrice')
      .lean();

    sendSuccess(res, populatedWishlist, 'Wishlist item updated successfully');
  } catch (error) {
    throw new AppError('Failed to update wishlist item', 500);
  }
});

// Delete wishlist
export const deleteWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId!;

  try {
    const wishlist = await Wishlist.findOneAndDelete({ _id: wishlistId, user: userId });
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    sendSuccess(res, null, 'Wishlist deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete wishlist', 500);
  }
});

// Get public wishlists
export const getPublicWishlists = asyncHandler(async (req: Request, res: Response) => {
  const { category, search, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { isPublic: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const wishlists = await Wishlist.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .populate('items.itemId', 'name images basePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Wishlist.countDocuments(query);

    sendSuccess(res, {
      wishlists,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Public wishlists retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch public wishlists', 500);
  }
});
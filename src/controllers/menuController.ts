// Menu Controller - Handle menu operations
import { Request, Response } from 'express';
import Menu, { IMenuItem, IMenuCategory } from '../models/Menu';
import PreOrder from '../models/PreOrder';
import { Store } from '../models/Store';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Get store menu by store ID
 * GET /api/menu/store/:storeId
 */
export const getStoreMenu = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return sendError(res, 'Store not found', 404);
    }

    // Get menu
    const menu = await Menu.findByStoreId(storeId);

    if (!menu) {
      return sendSuccess(res, {
        storeId,
        storeName: store.name,
        categories: [],
        isActive: false,
        lastUpdated: new Date().toISOString(),
      }, 'No menu available for this store');
    }

    // Transform response
    const response = {
      storeId: menu.storeId,
      storeName: store.name,
      categories: menu.categories.map((cat: IMenuCategory) => ({
        _id: cat._id,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
        items: cat.items.map((item: IMenuItem) => ({
          _id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          category: item.category,
          isAvailable: item.isAvailable,
          preparationTime: item.preparationTime,
          nutritionalInfo: item.nutritionalInfo,
          dietaryInfo: item.dietaryInfo,
          spicyLevel: item.spicyLevel,
          allergens: item.allergens,
          tags: item.tags,
        })),
      })),
      isActive: menu.isActive,
      lastUpdated: menu.updatedAt,
    };

    sendSuccess(res, response, 'Menu retrieved successfully');
  } catch (error: any) {
    console.error('[MENU] Error getting store menu:', error);
    sendError(res, error.message || 'Failed to retrieve menu', 500);
  }
};

/**
 * Create or update store menu
 * POST /api/menu/store/:storeId
 */
export const createOrUpdateMenu = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { categories } = req.body;

    // Validate request
    if (!categories || !Array.isArray(categories)) {
      return sendError(res, 'Categories array is required', 400);
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return sendError(res, 'Store not found', 404);
    }

    // Find existing menu or create new
    let menu = await Menu.findOne({ storeId });

    if (menu) {
      // Update existing menu
      menu.categories = categories;
      menu.isActive = true;
      await menu.save();
    } else {
      // Create new menu
      menu = new Menu({
        storeId,
        categories,
        isActive: true,
      });
      await menu.save();

      // Update store to indicate it has a menu
      await Store.findByIdAndUpdate(storeId, {
        hasMenu: true,
        menuCategories: categories.map((cat: IMenuCategory) => cat.name),
      });
    }

    sendSuccess(res, menu, 'Menu saved successfully', 201);
  } catch (error: any) {
    console.error('[MENU] Error creating/updating menu:', error);
    sendError(res, error.message || 'Failed to save menu', 500);
  }
};

/**
 * Add menu item to category
 * POST /api/menu/items
 */
export const addMenuItem = async (req: Request, res: Response) => {
  try {
    const { storeId, categoryId, item } = req.body;

    // Validate request
    if (!storeId || !categoryId || !item) {
      return sendError(res, 'Store ID, category ID, and item data are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId });
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Add item to category
    await menu.addMenuItem(categoryId, item);

    sendSuccess(res, menu, 'Menu item added successfully', 201);
  } catch (error: any) {
    console.error('[MENU] Error adding menu item:', error);
    sendError(res, error.message || 'Failed to add menu item', 500);
  }
};

/**
 * Update menu item
 * PUT /api/menu/items/:itemId
 */
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { storeId, categoryId, ...updateData } = req.body;

    // Validate request
    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId });
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Update item
    await menu.updateMenuItem(categoryId, itemId, updateData);

    sendSuccess(res, menu, 'Menu item updated successfully');
  } catch (error: any) {
    console.error('[MENU] Error updating menu item:', error);
    sendError(res, error.message || 'Failed to update menu item', 500);
  }
};

/**
 * Delete menu item
 * DELETE /api/menu/items/:itemId
 */
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { storeId, categoryId } = req.body;

    // Validate request
    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    // Get menu
    const menu = await Menu.findOne({ storeId });
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    // Delete item
    await menu.deleteMenuItem(categoryId, itemId);

    sendSuccess(res, { deleted: true }, 'Menu item deleted successfully');
  } catch (error: any) {
    console.error('[MENU] Error deleting menu item:', error);
    sendError(res, error.message || 'Failed to delete menu item', 500);
  }
};

/**
 * Get menu item by ID
 * GET /api/menu/items/:itemId
 */
export const getMenuItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { storeId, categoryId } = req.query;

    if (!storeId || !categoryId) {
      return sendError(res, 'Store ID and category ID are required', 400);
    }

    const menu = await Menu.findOne({ storeId });
    if (!menu) {
      return sendError(res, 'Menu not found', 404);
    }

    const item = menu.getMenuItem(categoryId as string, itemId);
    if (!item) {
      return sendError(res, 'Menu item not found', 404);
    }

    sendSuccess(res, item, 'Menu item retrieved successfully');
  } catch (error: any) {
    console.error('[MENU] Error getting menu item:', error);
    sendError(res, error.message || 'Failed to retrieve menu item', 500);
  }
};

/**
 * Create pre-order
 * POST /api/menu/pre-orders
 */
export const createPreOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const {
      storeId,
      items,
      scheduledTime,
      deliveryType,
      deliveryAddress,
      contactPhone,
      notes,
    } = req.body;

    // Validate request
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Store ID and items are required', 400);
    }

    if (!deliveryType || !['pickup', 'delivery'].includes(deliveryType)) {
      return sendError(res, 'Valid delivery type (pickup/delivery) is required', 400);
    }

    if (!contactPhone) {
      return sendError(res, 'Contact phone is required', 400);
    }

    // Get menu to validate items and prices
    const menu = await Menu.findByStoreId(storeId);
    if (!menu) {
      return sendError(res, 'Menu not found for this store', 404);
    }

    // Validate and price items
    const orderItems = [];
    for (const requestItem of items) {
      let found = false;
      for (const category of menu.categories) {
        const menuItem = category.items.find((item: any) => item._id?.toString() === requestItem.menuItemId);
        if (menuItem) {
          if (!menuItem.isAvailable) {
            return sendError(res, `Item "${menuItem.name}" is not available`, 400);
          }

          orderItems.push({
            menuItemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: requestItem.quantity,
            specialInstructions: requestItem.specialInstructions,
          });

          found = true;
          break;
        }
      }

      if (!found) {
        return sendError(res, `Menu item not found: ${requestItem.menuItemId}`, 404);
      }
    }

    // Create pre-order
    const preOrder = new PreOrder({
      storeId,
      userId,
      items: orderItems,
      scheduledTime,
      deliveryType,
      deliveryAddress,
      contactPhone,
      notes,
    });

    // Calculate totals
    preOrder.calculateTotals();

    await preOrder.save();

    // Populate store details
    await preOrder.populate('storeId', 'name logo location');

    sendSuccess(res, preOrder, 'Pre-order created successfully', 201);
  } catch (error: any) {
    console.error('[MENU] Error creating pre-order:', error);
    sendError(res, error.message || 'Failed to create pre-order', 500);
  }
};

/**
 * Get user's pre-orders
 * GET /api/menu/pre-orders/user
 */
export const getUserPreOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const preOrders = await PreOrder.findUserOrders(userId, limit);

    sendSuccess(res, preOrders, 'Pre-orders retrieved successfully');
  } catch (error: any) {
    console.error('[MENU] Error getting user pre-orders:', error);
    sendError(res, error.message || 'Failed to retrieve pre-orders', 500);
  }
};

/**
 * Get pre-order by ID
 * GET /api/menu/pre-orders/:preOrderId
 */
export const getPreOrder = async (req: Request, res: Response) => {
  try {
    const { preOrderId } = req.params;
    const userId = req.userId;

    const preOrder = await PreOrder.findById(preOrderId)
      .populate('storeId', 'name logo location contact')
      .populate('userId', 'profile.firstName profile.lastName profile.avatar');

    if (!preOrder) {
      return sendError(res, 'Pre-order not found', 404);
    }

    // Check authorization
    if (userId && preOrder.userId._id.toString() !== userId) {
      return sendError(res, 'Unauthorized to view this pre-order', 403);
    }

    sendSuccess(res, preOrder, 'Pre-order retrieved successfully');
  } catch (error: any) {
    console.error('[MENU] Error getting pre-order:', error);
    sendError(res, error.message || 'Failed to retrieve pre-order', 500);
  }
};

/**
 * Cancel pre-order
 * PUT /api/menu/pre-orders/:preOrderId/cancel
 */
export const cancelPreOrder = async (req: Request, res: Response) => {
  try {
    const { preOrderId } = req.params;
    const userId = req.userId;

    const preOrder = await PreOrder.findById(preOrderId);
    if (!preOrder) {
      return sendError(res, 'Pre-order not found', 404);
    }

    // Check authorization
    if (userId && preOrder.userId.toString() !== userId) {
      return sendError(res, 'Unauthorized to cancel this pre-order', 403);
    }

    // Update status to cancelled
    await preOrder.updateStatus('cancelled');

    sendSuccess(res, preOrder, 'Pre-order cancelled successfully');
  } catch (error: any) {
    console.error('[MENU] Error cancelling pre-order:', error);
    sendError(res, error.message || 'Failed to cancel pre-order', 500);
  }
};

/**
 * Search menu items
 * GET /api/menu/search
 */
export const searchMenuItems = async (req: Request, res: Response) => {
  try {
    const { query, storeId } = req.query;

    if (!query) {
      return sendError(res, 'Search query is required', 400);
    }

    const searchQuery: any = {
      isActive: true,
      $text: { $search: query as string },
    };

    if (storeId) {
      searchQuery.storeId = storeId;
    }

    const menus = await Menu.find(searchQuery);

    // Extract matching items from all menus
    const results: any[] = [];
    for (const menu of menus) {
      for (const category of menu.categories) {
        for (const item of category.items) {
          if (
            item.name.toLowerCase().includes((query as string).toLowerCase()) ||
            item.description?.toLowerCase().includes((query as string).toLowerCase()) ||
            item.tags?.some(tag => tag.toLowerCase().includes((query as string).toLowerCase()))
          ) {
            results.push({
              _id: item._id,
              name: item.name,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              image: item.image,
              category: item.category,
              isAvailable: item.isAvailable,
              preparationTime: item.preparationTime,
              nutritionalInfo: item.nutritionalInfo,
              dietaryInfo: item.dietaryInfo,
              spicyLevel: item.spicyLevel,
              allergens: item.allergens,
              tags: item.tags,
              storeId: menu.storeId,
              categoryName: category.name,
            });
          }
        }
      }
    }

    sendSuccess(res, results, `Found ${results.length} menu items`);
  } catch (error: any) {
    console.error('[MENU] Error searching menu items:', error);
    sendError(res, error.message || 'Failed to search menu items', 500);
  }
};

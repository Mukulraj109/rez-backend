"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMenuItems = exports.cancelPreOrder = exports.getPreOrder = exports.getUserPreOrders = exports.createPreOrder = exports.getMenuItem = exports.deleteMenuItem = exports.updateMenuItem = exports.addMenuItem = exports.createOrUpdateMenu = exports.getStoreMenu = void 0;
const Menu_1 = __importDefault(require("../models/Menu"));
const PreOrder_1 = __importDefault(require("../models/PreOrder"));
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
/**
 * Get store menu by store ID
 * GET /api/menu/store/:storeId
 */
const getStoreMenu = async (req, res) => {
    try {
        const { storeId } = req.params;
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendError)(res, 'Store not found', 404);
        }
        // Get menu
        const menu = await Menu_1.default.findByStoreId(storeId);
        if (!menu) {
            return (0, response_1.sendSuccess)(res, {
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
            categories: menu.categories.map((cat) => ({
                _id: cat._id,
                name: cat.name,
                description: cat.description,
                displayOrder: cat.displayOrder,
                items: cat.items.map((item) => ({
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
        (0, response_1.sendSuccess)(res, response, 'Menu retrieved successfully');
    }
    catch (error) {
        console.error('[MENU] Error getting store menu:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to retrieve menu', 500);
    }
};
exports.getStoreMenu = getStoreMenu;
/**
 * Create or update store menu
 * POST /api/menu/store/:storeId
 */
const createOrUpdateMenu = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { categories } = req.body;
        // Validate request
        if (!categories || !Array.isArray(categories)) {
            return (0, response_1.sendError)(res, 'Categories array is required', 400);
        }
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            return (0, response_1.sendError)(res, 'Store not found', 404);
        }
        // Find existing menu or create new
        let menu = await Menu_1.default.findOne({ storeId });
        if (menu) {
            // Update existing menu
            menu.categories = categories;
            menu.isActive = true;
            await menu.save();
        }
        else {
            // Create new menu
            menu = new Menu_1.default({
                storeId,
                categories,
                isActive: true,
            });
            await menu.save();
            // Update store to indicate it has a menu
            await Store_1.Store.findByIdAndUpdate(storeId, {
                hasMenu: true,
                menuCategories: categories.map((cat) => cat.name),
            });
        }
        (0, response_1.sendSuccess)(res, menu, 'Menu saved successfully', 201);
    }
    catch (error) {
        console.error('[MENU] Error creating/updating menu:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to save menu', 500);
    }
};
exports.createOrUpdateMenu = createOrUpdateMenu;
/**
 * Add menu item to category
 * POST /api/menu/items
 */
const addMenuItem = async (req, res) => {
    try {
        const { storeId, categoryId, item } = req.body;
        // Validate request
        if (!storeId || !categoryId || !item) {
            return (0, response_1.sendError)(res, 'Store ID, category ID, and item data are required', 400);
        }
        // Get menu
        const menu = await Menu_1.default.findOne({ storeId });
        if (!menu) {
            return (0, response_1.sendError)(res, 'Menu not found', 404);
        }
        // Add item to category
        await menu.addMenuItem(categoryId, item);
        (0, response_1.sendSuccess)(res, menu, 'Menu item added successfully', 201);
    }
    catch (error) {
        console.error('[MENU] Error adding menu item:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to add menu item', 500);
    }
};
exports.addMenuItem = addMenuItem;
/**
 * Update menu item
 * PUT /api/menu/items/:itemId
 */
const updateMenuItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { storeId, categoryId, ...updateData } = req.body;
        // Validate request
        if (!storeId || !categoryId) {
            return (0, response_1.sendError)(res, 'Store ID and category ID are required', 400);
        }
        // Get menu
        const menu = await Menu_1.default.findOne({ storeId });
        if (!menu) {
            return (0, response_1.sendError)(res, 'Menu not found', 404);
        }
        // Update item
        await menu.updateMenuItem(categoryId, itemId, updateData);
        (0, response_1.sendSuccess)(res, menu, 'Menu item updated successfully');
    }
    catch (error) {
        console.error('[MENU] Error updating menu item:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to update menu item', 500);
    }
};
exports.updateMenuItem = updateMenuItem;
/**
 * Delete menu item
 * DELETE /api/menu/items/:itemId
 */
const deleteMenuItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { storeId, categoryId } = req.body;
        // Validate request
        if (!storeId || !categoryId) {
            return (0, response_1.sendError)(res, 'Store ID and category ID are required', 400);
        }
        // Get menu
        const menu = await Menu_1.default.findOne({ storeId });
        if (!menu) {
            return (0, response_1.sendError)(res, 'Menu not found', 404);
        }
        // Delete item
        await menu.deleteMenuItem(categoryId, itemId);
        (0, response_1.sendSuccess)(res, { deleted: true }, 'Menu item deleted successfully');
    }
    catch (error) {
        console.error('[MENU] Error deleting menu item:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to delete menu item', 500);
    }
};
exports.deleteMenuItem = deleteMenuItem;
/**
 * Get menu item by ID
 * GET /api/menu/items/:itemId
 */
const getMenuItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { storeId, categoryId } = req.query;
        if (!storeId || !categoryId) {
            return (0, response_1.sendError)(res, 'Store ID and category ID are required', 400);
        }
        const menu = await Menu_1.default.findOne({ storeId });
        if (!menu) {
            return (0, response_1.sendError)(res, 'Menu not found', 404);
        }
        const item = menu.getMenuItem(categoryId, itemId);
        if (!item) {
            return (0, response_1.sendError)(res, 'Menu item not found', 404);
        }
        (0, response_1.sendSuccess)(res, item, 'Menu item retrieved successfully');
    }
    catch (error) {
        console.error('[MENU] Error getting menu item:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to retrieve menu item', 500);
    }
};
exports.getMenuItem = getMenuItem;
/**
 * Create pre-order
 * POST /api/menu/pre-orders
 */
const createPreOrder = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const { storeId, items, scheduledTime, deliveryType, deliveryAddress, contactPhone, notes, } = req.body;
        // Validate request
        if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
            return (0, response_1.sendError)(res, 'Store ID and items are required', 400);
        }
        if (!deliveryType || !['pickup', 'delivery'].includes(deliveryType)) {
            return (0, response_1.sendError)(res, 'Valid delivery type (pickup/delivery) is required', 400);
        }
        if (!contactPhone) {
            return (0, response_1.sendError)(res, 'Contact phone is required', 400);
        }
        // Get menu to validate items and prices
        const menu = await Menu_1.default.findByStoreId(storeId);
        if (!menu) {
            return (0, response_1.sendError)(res, 'Menu not found for this store', 404);
        }
        // Validate and price items
        const orderItems = [];
        for (const requestItem of items) {
            let found = false;
            for (const category of menu.categories) {
                const menuItem = category.items.find((item) => item._id?.toString() === requestItem.menuItemId);
                if (menuItem) {
                    if (!menuItem.isAvailable) {
                        return (0, response_1.sendError)(res, `Item "${menuItem.name}" is not available`, 400);
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
                return (0, response_1.sendError)(res, `Menu item not found: ${requestItem.menuItemId}`, 404);
            }
        }
        // Create pre-order
        const preOrder = new PreOrder_1.default({
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
        (0, response_1.sendSuccess)(res, preOrder, 'Pre-order created successfully', 201);
    }
    catch (error) {
        console.error('[MENU] Error creating pre-order:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to create pre-order', 500);
    }
};
exports.createPreOrder = createPreOrder;
/**
 * Get user's pre-orders
 * GET /api/menu/pre-orders/user
 */
const getUserPreOrders = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const limit = parseInt(req.query.limit) || 20;
        const preOrders = await PreOrder_1.default.findUserOrders(userId, limit);
        (0, response_1.sendSuccess)(res, preOrders, 'Pre-orders retrieved successfully');
    }
    catch (error) {
        console.error('[MENU] Error getting user pre-orders:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to retrieve pre-orders', 500);
    }
};
exports.getUserPreOrders = getUserPreOrders;
/**
 * Get pre-order by ID
 * GET /api/menu/pre-orders/:preOrderId
 */
const getPreOrder = async (req, res) => {
    try {
        const { preOrderId } = req.params;
        const userId = req.userId;
        const preOrder = await PreOrder_1.default.findById(preOrderId)
            .populate('storeId', 'name logo location contact')
            .populate('userId', 'profile.firstName profile.lastName profile.avatar');
        if (!preOrder) {
            return (0, response_1.sendError)(res, 'Pre-order not found', 404);
        }
        // Check authorization
        if (userId && preOrder.userId._id.toString() !== userId) {
            return (0, response_1.sendError)(res, 'Unauthorized to view this pre-order', 403);
        }
        (0, response_1.sendSuccess)(res, preOrder, 'Pre-order retrieved successfully');
    }
    catch (error) {
        console.error('[MENU] Error getting pre-order:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to retrieve pre-order', 500);
    }
};
exports.getPreOrder = getPreOrder;
/**
 * Cancel pre-order
 * PUT /api/menu/pre-orders/:preOrderId/cancel
 */
const cancelPreOrder = async (req, res) => {
    try {
        const { preOrderId } = req.params;
        const userId = req.userId;
        const preOrder = await PreOrder_1.default.findById(preOrderId);
        if (!preOrder) {
            return (0, response_1.sendError)(res, 'Pre-order not found', 404);
        }
        // Check authorization
        if (userId && preOrder.userId.toString() !== userId) {
            return (0, response_1.sendError)(res, 'Unauthorized to cancel this pre-order', 403);
        }
        // Update status to cancelled
        await preOrder.updateStatus('cancelled');
        (0, response_1.sendSuccess)(res, preOrder, 'Pre-order cancelled successfully');
    }
    catch (error) {
        console.error('[MENU] Error cancelling pre-order:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to cancel pre-order', 500);
    }
};
exports.cancelPreOrder = cancelPreOrder;
/**
 * Search menu items
 * GET /api/menu/search
 */
const searchMenuItems = async (req, res) => {
    try {
        const { query, storeId } = req.query;
        if (!query) {
            return (0, response_1.sendError)(res, 'Search query is required', 400);
        }
        const searchQuery = {
            isActive: true,
            $text: { $search: query },
        };
        if (storeId) {
            searchQuery.storeId = storeId;
        }
        const menus = await Menu_1.default.find(searchQuery);
        // Extract matching items from all menus
        const results = [];
        for (const menu of menus) {
            for (const category of menu.categories) {
                for (const item of category.items) {
                    if (item.name.toLowerCase().includes(query.toLowerCase()) ||
                        item.description?.toLowerCase().includes(query.toLowerCase()) ||
                        item.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
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
        (0, response_1.sendSuccess)(res, results, `Found ${results.length} menu items`);
    }
    catch (error) {
        console.error('[MENU] Error searching menu items:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to search menu items', 500);
    }
};
exports.searchMenuItems = searchMenuItems;

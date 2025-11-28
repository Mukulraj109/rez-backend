import { Request, Response } from 'express';
/**
 * Get store menu by store ID
 * GET /api/menu/store/:storeId
 */
export declare const getStoreMenu: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create or update store menu
 * POST /api/menu/store/:storeId
 */
export declare const createOrUpdateMenu: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Add menu item to category
 * POST /api/menu/items
 */
export declare const addMenuItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update menu item
 * PUT /api/menu/items/:itemId
 */
export declare const updateMenuItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete menu item
 * DELETE /api/menu/items/:itemId
 */
export declare const deleteMenuItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get menu item by ID
 * GET /api/menu/items/:itemId
 */
export declare const getMenuItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create pre-order
 * POST /api/menu/pre-orders
 */
export declare const createPreOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's pre-orders
 * GET /api/menu/pre-orders/user
 */
export declare const getUserPreOrders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get pre-order by ID
 * GET /api/menu/pre-orders/:preOrderId
 */
export declare const getPreOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Cancel pre-order
 * PUT /api/menu/pre-orders/:preOrderId/cancel
 */
export declare const cancelPreOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Search menu items
 * GET /api/menu/search
 */
export declare const searchMenuItems: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;

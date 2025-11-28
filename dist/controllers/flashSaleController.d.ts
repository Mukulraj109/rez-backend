import { Request, Response } from 'express';
declare class FlashSaleController {
    /**
     * Get all active flash sales
     */
    getActiveFlashSales(req: Request, res: Response): Promise<void>;
    /**
     * Get upcoming flash sales
     */
    getUpcomingFlashSales(req: Request, res: Response): Promise<void>;
    /**
     * Get flash sales expiring soon
     */
    getExpiringSoonFlashSales(req: Request, res: Response): Promise<void>;
    /**
     * Get flash sale by ID
     */
    getFlashSaleById(req: Request, res: Response): Promise<void>;
    /**
     * Get flash sales by product
     */
    getFlashSalesByProduct(req: Request, res: Response): Promise<void>;
    /**
     * Get flash sales by category
     */
    getFlashSalesByCategory(req: Request, res: Response): Promise<void>;
    /**
     * Create flash sale (admin only)
     */
    createFlashSale(req: Request, res: Response): Promise<void>;
    /**
     * Update flash sale (admin only)
     */
    updateFlashSale(req: Request, res: Response): Promise<void>;
    /**
     * Delete flash sale (admin only)
     */
    deleteFlashSale(req: Request, res: Response): Promise<void>;
    /**
     * Validate flash sale purchase
     */
    validateFlashSalePurchase(req: Request, res: Response): Promise<void>;
    /**
     * Track flash sale click
     */
    trackClick(req: Request, res: Response): Promise<void>;
    /**
     * Get flash sale statistics (admin only)
     */
    getFlashSaleStats(req: Request, res: Response): Promise<void>;
    /**
     * Find best offer for cart
     */
    findBestOffer(req: Request, res: Response): Promise<void>;
    /**
     * Apply specific offer to cart
     */
    applyOffer(req: Request, res: Response): Promise<void>;
    /**
     * Validate promo code
     */
    validatePromoCode(req: Request, res: Response): Promise<void>;
}
declare const _default: FlashSaleController;
export default _default;

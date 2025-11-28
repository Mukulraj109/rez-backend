import { Request, Response } from 'express';
import flashSaleService from '../services/flashSaleService';
import offerService from '../services/offerService';

class FlashSaleController {
  /**
   * Get all active flash sales
   */
  async getActiveFlashSales(req: Request, res: Response): Promise<void> {
    try {
      const flashSales = await flashSaleService.getActiveFlashSales();

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting active flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get upcoming flash sales
   */
  async getUpcomingFlashSales(req: Request, res: Response): Promise<void> {
    try {
      const flashSales = await flashSaleService.getUpcomingFlashSales();

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting upcoming flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get flash sales expiring soon
   */
  async getExpiringSoonFlashSales(req: Request, res: Response): Promise<void> {
    try {
      const minutes = parseInt(req.query.minutes as string) || 5;
      const flashSales = await flashSaleService.getExpiringSoonFlashSales(minutes);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting expiring flash sales:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get flash sale by ID
   */
  async getFlashSaleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flashSale = await flashSaleService.getFlashSaleById(id);

      if (!flashSale) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      // Track view
      await flashSaleService.trackView(id);

      res.status(200).json({
        success: true,
        data: flashSale,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get flash sales by product
   */
  async getFlashSalesByProduct(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const flashSales = await flashSaleService.getFlashSalesByProduct(productId);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting flash sales by product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get flash sales by category
   */
  async getFlashSalesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;
      const flashSales = await flashSaleService.getFlashSalesByCategory(categoryId);

      res.status(200).json({
        success: true,
        data: flashSales,
        count: flashSales.length,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting flash sales by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sales',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create flash sale (admin only)
   */
  async createFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const flashSaleData = {
        ...req.body,
        createdBy: (req as any).user.userId, // Assumes auth middleware sets user
      };

      const flashSale = await flashSaleService.createFlashSale(flashSaleData);

      res.status(201).json({
        success: true,
        message: 'Flash sale created successfully',
        data: flashSale,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error creating flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update flash sale (admin only)
   */
  async updateFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flashSale = await flashSaleService.updateFlashSale(id, req.body);

      if (!flashSale) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Flash sale updated successfully',
        data: flashSale,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error updating flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete flash sale (admin only)
   */
  async deleteFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await flashSaleService.deleteFlashSale(id);

      res.status(200).json({
        success: true,
        message: 'Flash sale deleted successfully',
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error deleting flash sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete flash sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate flash sale purchase
   */
  async validateFlashSalePurchase(req: Request, res: Response): Promise<void> {
    try {
      const { flashSaleId, productId, quantity } = req.body;
      const userId = (req as any).user.userId;

      const validation = await flashSaleService.validateFlashSalePurchase({
        flashSaleId,
        userId,
        productId,
        quantity,
      });

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error validating purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate flash sale purchase',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Track flash sale click
   */
  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await flashSaleService.trackClick(id);

      res.status(200).json({
        success: true,
        message: 'Click tracked successfully',
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track click',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get flash sale statistics (admin only)
   */
  async getFlashSaleStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await flashSaleService.getFlashSaleStats(id);

      if (!stats) {
        res.status(404).json({
          success: false,
          message: 'Flash sale not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flash sale statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Find best offer for cart
   */
  async findBestOffer(req: Request, res: Response): Promise<void> {
    try {
      const { cartTotal, items } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.findBestOffer(cartTotal, items, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error finding best offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find best offer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Apply specific offer to cart
   */
  async applyOffer(req: Request, res: Response): Promise<void> {
    try {
      const { offerId, cartTotal, items } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.applyOffer(offerId, cartTotal, items, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error applying offer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply offer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(req: Request, res: Response): Promise<void> {
    try {
      const { promoCode, cartTotal } = req.body;
      const userId = (req as any).user.userId;

      const result = await offerService.validatePromoCode(promoCode, cartTotal, userId);

      if (!result.valid) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ [FlashSaleController] Error validating promo code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate promo code',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new FlashSaleController();

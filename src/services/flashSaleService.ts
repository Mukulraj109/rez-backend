import FlashSale, { IFlashSale } from '../models/FlashSale';
import mongoose from 'mongoose';
import stockSocketService from './stockSocketService'; // Import socket service instead

interface CreateFlashSaleData {
  title: string;
  description: string;
  image: string;
  banner?: string;
  discountPercentage: number;
  discountAmount?: number;
  priority?: number;
  startTime: Date;
  endTime: Date;
  maxQuantity: number;
  limitPerUser?: number;
  lowStockThreshold?: number;
  products: string[];
  stores?: string[];
  category?: string;
  originalPrice?: number;
  flashSalePrice?: number;
  termsAndConditions?: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  notifyOnStart?: boolean;
  notifyOnEndingSoon?: boolean;
  notifyOnLowStock?: boolean;
  createdBy: string;
}

interface UpdateFlashSaleData {
  title?: string;
  description?: string;
  image?: string;
  banner?: string;
  discountPercentage?: number;
  discountAmount?: number;
  priority?: number;
  startTime?: Date;
  endTime?: Date;
  maxQuantity?: number;
  limitPerUser?: number;
  lowStockThreshold?: number;
  products?: string[];
  stores?: string[];
  category?: string;
  originalPrice?: number;
  flashSalePrice?: number;
  termsAndConditions?: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  notifyOnStart?: boolean;
  notifyOnEndingSoon?: boolean;
  notifyOnLowStock?: boolean;
  isActive?: boolean;
}

interface FlashSalePurchaseData {
  flashSaleId: string;
  userId: string;
  productId: string;
  quantity: number;
}

class FlashSaleService {
  /**
   * Create a new flash sale
   */
  async createFlashSale(data: CreateFlashSaleData): Promise<IFlashSale> {
    try {
      const flashSale = new FlashSale({
        ...data,
        products: data.products.map(id => new mongoose.Types.ObjectId(id)),
        stores: data.stores?.map(id => new mongoose.Types.ObjectId(id)),
        category: data.category ? new mongoose.Types.ObjectId(data.category) : undefined,
        createdBy: new mongoose.Types.ObjectId(data.createdBy),
      });

      await flashSale.save();

      // Populate related data
      await flashSale.populate('products', 'name image price');
      await flashSale.populate('stores', 'name logo');
      await flashSale.populate('category', 'name');

      console.log('✅ [FlashSaleService] Flash sale created:', flashSale._id);

      // Schedule start notification if in the future
      if (flashSale.notifyOnStart && flashSale.startTime > new Date()) {
        this.scheduleStartNotification(flashSale);
      }

      return flashSale;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error creating flash sale:', error);
      throw error;
    }
  }

  /**
   * Get all active flash sales
   */
  async getActiveFlashSales(): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getActive()
        .populate('products', 'name image price stock')
        .populate('stores', 'name logo location')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting active flash sales:', error);
      throw error;
    }
  }

  /**
   * Get upcoming flash sales
   */
  async getUpcomingFlashSales(): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getUpcoming()
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting upcoming flash sales:', error);
      throw error;
    }
  }

  /**
   * Get flash sales expiring soon
   */
  async getExpiringSoonFlashSales(minutes: number = 5): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getExpiringSoon(minutes)
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting expiring flash sales:', error);
      throw error;
    }
  }

  /**
   * Get flash sale by ID
   */
  async getFlashSaleById(flashSaleId: string): Promise<IFlashSale | null> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId)
        .populate('products', 'name image price stock description')
        .populate('stores', 'name logo location')
        .populate('category', 'name slug')
        .lean();

      return flashSale;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting flash sale:', error);
      throw error;
    }
  }

  /**
   * Get flash sales by product ID
   */
  async getFlashSalesByProduct(productId: string): Promise<IFlashSale[]> {
    try {
      const now = new Date();
      const flashSales = await FlashSale.find({
        products: new mongoose.Types.ObjectId(productId),
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $nin: ['ended', 'sold_out'] },
      })
        .sort({ priority: -1, discountPercentage: -1 })
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting flash sales by product:', error);
      throw error;
    }
  }

  /**
   * Get flash sales by category
   */
  async getFlashSalesByCategory(categoryId: string): Promise<IFlashSale[]> {
    try {
      const flashSales = await FlashSale.getActive()
        .where('category', new mongoose.Types.ObjectId(categoryId))
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug')
        .lean();

      return flashSales;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting flash sales by category:', error);
      throw error;
    }
  }

  /**
   * Update flash sale
   */
  async updateFlashSale(flashSaleId: string, data: UpdateFlashSaleData): Promise<IFlashSale | null> {
    try {
      const updateData: any = { ...data };

      // Convert string IDs to ObjectIds
      if (data.products) {
        updateData.products = data.products.map(id => new mongoose.Types.ObjectId(id));
      }
      if (data.stores) {
        updateData.stores = data.stores.map(id => new mongoose.Types.ObjectId(id));
      }
      if (data.category) {
        updateData.category = new mongoose.Types.ObjectId(data.category);
      }

      const flashSale = await FlashSale.findByIdAndUpdate(
        flashSaleId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('products', 'name image price')
        .populate('stores', 'name logo')
        .populate('category', 'name slug');

      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      console.log('✅ [FlashSaleService] Flash sale updated:', flashSaleId);

      // Emit socket event for update
      if (io) {
        stockSocketService.getIO()?.emit('flashsale:updated', {
          flashSaleId: flashSale._id,
          title: flashSale.title,
          status: flashSale.status,
          remainingQuantity: flashSale.getAvailableQuantity(),
        });
      }

      return flashSale;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error updating flash sale:', error);
      throw error;
    }
  }

  /**
   * Validate flash sale purchase
   */
  async validateFlashSalePurchase(data: FlashSalePurchaseData): Promise<{
    valid: boolean;
    message?: string;
    flashSale?: IFlashSale;
  }> {
    try {
      const flashSale = await FlashSale.findById(data.flashSaleId);

      if (!flashSale) {
        return { valid: false, message: 'Flash sale not found' };
      }

      if (!flashSale.isActive()) {
        return { valid: false, message: 'Flash sale is not active' };
      }

      if (!flashSale.canPurchase(data.quantity)) {
        return { valid: false, message: 'Insufficient stock or quantity exceeds limit' };
      }

      // Check if product is part of flash sale
      const productInSale = flashSale.products.some(
        p => p.toString() === data.productId
      );

      if (!productInSale) {
        return { valid: false, message: 'Product is not part of this flash sale' };
      }

      // TODO: Check user purchase history for limitPerUser
      // This would require checking Order model for user's previous purchases

      return { valid: true, flashSale };
    } catch (error) {
      console.error('❌ [FlashSaleService] Error validating flash sale purchase:', error);
      throw error;
    }
  }

  /**
   * Update sold quantity after purchase
   */
  async updateSoldQuantity(flashSaleId: string, quantity: number, userId: string): Promise<IFlashSale | null> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId);

      if (!flashSale) {
        throw new Error('Flash sale not found');
      }

      // Update quantities
      flashSale.soldQuantity += quantity;
      flashSale.purchaseCount += 1;

      // Track unique customers
      if (!flashSale.notifiedUsers.includes(new mongoose.Types.ObjectId(userId))) {
        flashSale.uniqueCustomers += 1;
      }

      await flashSale.save();

      console.log('✅ [FlashSaleService] Updated sold quantity:', {
        flashSaleId,
        soldQuantity: flashSale.soldQuantity,
        maxQuantity: flashSale.maxQuantity,
      });

      // Emit socket events
      if (io) {
        // Stock update event
        stockSocketService.getIO()?.emit('flashsale:stock_updated', {
          flashSaleId: flashSale._id,
          soldQuantity: flashSale.soldQuantity,
          remainingQuantity: flashSale.getAvailableQuantity(),
          progress: flashSale.getProgress(),
        });

        // Check for low stock
        const progress = flashSale.getProgress();
        if (progress >= flashSale.lowStockThreshold && flashSale.notifyOnLowStock) {
          stockSocketService.getIO()?.emit('flashsale:stock_low', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
            remainingQuantity: flashSale.getAvailableQuantity(),
            progress,
          });
        }

        // Check if sold out
        if (flashSale.soldQuantity >= flashSale.maxQuantity) {
          flashSale.status = 'sold_out';
          await flashSale.save();

          stockSocketService.getIO()?.emit('flashsale:sold_out', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
          });
        }
      }

      return flashSale;
    } catch (error) {
      console.error('❌ [FlashSaleService] Error updating sold quantity:', error);
      throw error;
    }
  }

  /**
   * Track flash sale view
   */
  async trackView(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndUpdate(flashSaleId, {
        $inc: { viewCount: 1 },
      });
    } catch (error) {
      console.error('❌ [FlashSaleService] Error tracking view:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }

  /**
   * Track flash sale click
   */
  async trackClick(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndUpdate(flashSaleId, {
        $inc: { clickCount: 1 },
      });
    } catch (error) {
      console.error('❌ [FlashSaleService] Error tracking click:', error);
      // Don't throw - analytics shouldn't break the flow
    }
  }

  /**
   * Delete flash sale
   */
  async deleteFlashSale(flashSaleId: string): Promise<void> {
    try {
      await FlashSale.findByIdAndDelete(flashSaleId);
      console.log('✅ [FlashSaleService] Flash sale deleted:', flashSaleId);

      // Emit socket event
      if (io) {
        stockSocketService.getIO()?.emit('flashsale:deleted', { flashSaleId });
      }
    } catch (error) {
      console.error('❌ [FlashSaleService] Error deleting flash sale:', error);
      throw error;
    }
  }

  /**
   * Schedule start notification (would integrate with notification service)
   */
  private scheduleStartNotification(flashSale: IFlashSale): void {
    const timeUntilStart = flashSale.startTime.getTime() - Date.now();

    if (timeUntilStart > 0) {
      setTimeout(() => {
        console.log('🔔 [FlashSaleService] Flash sale starting:', flashSale.title);

        // Emit socket event
        if (io) {
          stockSocketService.getIO()?.emit('flashsale:started', {
            flashSaleId: flashSale._id,
            title: flashSale.title,
            discountPercentage: flashSale.discountPercentage,
            endTime: flashSale.endTime,
          });
        }

        // TODO: Send push notifications to users
      }, timeUntilStart);
    }
  }

  /**
   * Check and emit ending soon events (called by cron job)
   */
  async checkEndingSoon(): Promise<void> {
    try {
      const expiringSales = await this.getExpiringSoonFlashSales(5);

      for (const sale of expiringSales) {
        if (sale.notifyOnEndingSoon && io) {
          stockSocketService.getIO()?.emit('flashsale:ending_soon', {
            flashSaleId: sale._id,
            title: sale.title,
            endTime: sale.endTime,
            remainingQuantity: sale.maxQuantity - sale.soldQuantity,
          });
        }
      }
    } catch (error) {
      console.error('❌ [FlashSaleService] Error checking ending soon:', error);
    }
  }

  /**
   * Mark ended flash sales (called by cron job)
   */
  async markEndedFlashSales(): Promise<void> {
    try {
      const now = new Date();
      const result = await FlashSale.updateMany(
        {
          isActive: true,
          endTime: { $lt: now },
          status: { $nin: ['ended', 'sold_out'] },
        },
        {
          $set: { status: 'ended' },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ [FlashSaleService] Marked ${result.modifiedCount} flash sales as ended`);

        // Emit socket event
        if (io) {
          stockSocketService.getIO()?.emit('flashsale:batch_ended', {
            count: result.modifiedCount,
          });
        }
      }
    } catch (error) {
      console.error('❌ [FlashSaleService] Error marking ended flash sales:', error);
    }
  }

  /**
   * Get flash sale statistics
   */
  async getFlashSaleStats(flashSaleId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    totalPurchases: number;
    uniqueCustomers: number;
    conversionRate: number;
    soldPercentage: number;
    remainingTime: number;
  } | null> {
    try {
      const flashSale = await FlashSale.findById(flashSaleId);

      if (!flashSale) {
        return null;
      }

      const conversionRate = flashSale.viewCount > 0
        ? (flashSale.purchaseCount / flashSale.viewCount) * 100
        : 0;

      return {
        totalViews: flashSale.viewCount,
        totalClicks: flashSale.clickCount,
        totalPurchases: flashSale.purchaseCount,
        uniqueCustomers: flashSale.uniqueCustomers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        soldPercentage: flashSale.getProgress(),
        remainingTime: flashSale.getRemainingTime(),
      };
    } catch (error) {
      console.error('❌ [FlashSaleService] Error getting flash sale stats:', error);
      throw error;
    }
  }
}

export default new FlashSaleService();

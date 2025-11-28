"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlashSale_1 = __importDefault(require("../models/FlashSale"));
const mongoose_1 = __importDefault(require("mongoose"));
const stockSocketService_1 = __importDefault(require("./stockSocketService")); // Import socket service instead
class FlashSaleService {
    /**
     * Create a new flash sale
     */
    async createFlashSale(data) {
        try {
            const flashSale = new FlashSale_1.default({
                ...data,
                products: data.products.map(id => new mongoose_1.default.Types.ObjectId(id)),
                stores: data.stores?.map(id => new mongoose_1.default.Types.ObjectId(id)),
                category: data.category ? new mongoose_1.default.Types.ObjectId(data.category) : undefined,
                createdBy: new mongoose_1.default.Types.ObjectId(data.createdBy),
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
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error creating flash sale:', error);
            throw error;
        }
    }
    /**
     * Get all active flash sales
     */
    async getActiveFlashSales() {
        try {
            const flashSales = await FlashSale_1.default.getActive()
                .populate('products', 'name image price stock')
                .populate('stores', 'name logo location')
                .populate('category', 'name slug')
                .lean();
            return flashSales;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting active flash sales:', error);
            throw error;
        }
    }
    /**
     * Get upcoming flash sales
     */
    async getUpcomingFlashSales() {
        try {
            const flashSales = await FlashSale_1.default.getUpcoming()
                .populate('products', 'name image price')
                .populate('stores', 'name logo')
                .populate('category', 'name slug')
                .lean();
            return flashSales;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting upcoming flash sales:', error);
            throw error;
        }
    }
    /**
     * Get flash sales expiring soon
     */
    async getExpiringSoonFlashSales(minutes = 5) {
        try {
            const flashSales = await FlashSale_1.default.getExpiringSoon(minutes)
                .populate('products', 'name image price')
                .populate('stores', 'name logo')
                .populate('category', 'name slug')
                .lean();
            return flashSales;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting expiring flash sales:', error);
            throw error;
        }
    }
    /**
     * Get flash sale by ID
     */
    async getFlashSaleById(flashSaleId) {
        try {
            const flashSale = await FlashSale_1.default.findById(flashSaleId)
                .populate('products', 'name image price stock description')
                .populate('stores', 'name logo location')
                .populate('category', 'name slug')
                .lean();
            return flashSale;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting flash sale:', error);
            throw error;
        }
    }
    /**
     * Get flash sales by product ID
     */
    async getFlashSalesByProduct(productId) {
        try {
            const now = new Date();
            const flashSales = await FlashSale_1.default.find({
                products: new mongoose_1.default.Types.ObjectId(productId),
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now },
                status: { $nin: ['ended', 'sold_out'] },
            })
                .sort({ priority: -1, discountPercentage: -1 })
                .populate('category', 'name slug')
                .lean();
            return flashSales;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting flash sales by product:', error);
            throw error;
        }
    }
    /**
     * Get flash sales by category
     */
    async getFlashSalesByCategory(categoryId) {
        try {
            const flashSales = await FlashSale_1.default.getActive()
                .where('category', new mongoose_1.default.Types.ObjectId(categoryId))
                .populate('products', 'name image price')
                .populate('stores', 'name logo')
                .populate('category', 'name slug')
                .lean();
            return flashSales;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting flash sales by category:', error);
            throw error;
        }
    }
    /**
     * Update flash sale
     */
    async updateFlashSale(flashSaleId, data) {
        try {
            const updateData = { ...data };
            // Convert string IDs to ObjectIds
            if (data.products) {
                updateData.products = data.products.map(id => new mongoose_1.default.Types.ObjectId(id));
            }
            if (data.stores) {
                updateData.stores = data.stores.map(id => new mongoose_1.default.Types.ObjectId(id));
            }
            if (data.category) {
                updateData.category = new mongoose_1.default.Types.ObjectId(data.category);
            }
            const flashSale = await FlashSale_1.default.findByIdAndUpdate(flashSaleId, updateData, { new: true, runValidators: true })
                .populate('products', 'name image price')
                .populate('stores', 'name logo')
                .populate('category', 'name slug');
            if (!flashSale) {
                throw new Error('Flash sale not found');
            }
            console.log('✅ [FlashSaleService] Flash sale updated:', flashSaleId);
            // Emit socket event for update
            if (io) {
                stockSocketService_1.default.getIO()?.emit('flashsale:updated', {
                    flashSaleId: flashSale._id,
                    title: flashSale.title,
                    status: flashSale.status,
                    remainingQuantity: flashSale.getAvailableQuantity(),
                });
            }
            return flashSale;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error updating flash sale:', error);
            throw error;
        }
    }
    /**
     * Validate flash sale purchase
     */
    async validateFlashSalePurchase(data) {
        try {
            const flashSale = await FlashSale_1.default.findById(data.flashSaleId);
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
            const productInSale = flashSale.products.some(p => p.toString() === data.productId);
            if (!productInSale) {
                return { valid: false, message: 'Product is not part of this flash sale' };
            }
            // TODO: Check user purchase history for limitPerUser
            // This would require checking Order model for user's previous purchases
            return { valid: true, flashSale };
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error validating flash sale purchase:', error);
            throw error;
        }
    }
    /**
     * Update sold quantity after purchase
     */
    async updateSoldQuantity(flashSaleId, quantity, userId) {
        try {
            const flashSale = await FlashSale_1.default.findById(flashSaleId);
            if (!flashSale) {
                throw new Error('Flash sale not found');
            }
            // Update quantities
            flashSale.soldQuantity += quantity;
            flashSale.purchaseCount += 1;
            // Track unique customers
            if (!flashSale.notifiedUsers.includes(new mongoose_1.default.Types.ObjectId(userId))) {
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
                stockSocketService_1.default.getIO()?.emit('flashsale:stock_updated', {
                    flashSaleId: flashSale._id,
                    soldQuantity: flashSale.soldQuantity,
                    remainingQuantity: flashSale.getAvailableQuantity(),
                    progress: flashSale.getProgress(),
                });
                // Check for low stock
                const progress = flashSale.getProgress();
                if (progress >= flashSale.lowStockThreshold && flashSale.notifyOnLowStock) {
                    stockSocketService_1.default.getIO()?.emit('flashsale:stock_low', {
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
                    stockSocketService_1.default.getIO()?.emit('flashsale:sold_out', {
                        flashSaleId: flashSale._id,
                        title: flashSale.title,
                    });
                }
            }
            return flashSale;
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error updating sold quantity:', error);
            throw error;
        }
    }
    /**
     * Track flash sale view
     */
    async trackView(flashSaleId) {
        try {
            await FlashSale_1.default.findByIdAndUpdate(flashSaleId, {
                $inc: { viewCount: 1 },
            });
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error tracking view:', error);
            // Don't throw - analytics shouldn't break the flow
        }
    }
    /**
     * Track flash sale click
     */
    async trackClick(flashSaleId) {
        try {
            await FlashSale_1.default.findByIdAndUpdate(flashSaleId, {
                $inc: { clickCount: 1 },
            });
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error tracking click:', error);
            // Don't throw - analytics shouldn't break the flow
        }
    }
    /**
     * Delete flash sale
     */
    async deleteFlashSale(flashSaleId) {
        try {
            await FlashSale_1.default.findByIdAndDelete(flashSaleId);
            console.log('✅ [FlashSaleService] Flash sale deleted:', flashSaleId);
            // Emit socket event
            if (io) {
                stockSocketService_1.default.getIO()?.emit('flashsale:deleted', { flashSaleId });
            }
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error deleting flash sale:', error);
            throw error;
        }
    }
    /**
     * Schedule start notification (would integrate with notification service)
     */
    scheduleStartNotification(flashSale) {
        const timeUntilStart = flashSale.startTime.getTime() - Date.now();
        if (timeUntilStart > 0) {
            setTimeout(() => {
                console.log('🔔 [FlashSaleService] Flash sale starting:', flashSale.title);
                // Emit socket event
                if (io) {
                    stockSocketService_1.default.getIO()?.emit('flashsale:started', {
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
    async checkEndingSoon() {
        try {
            const expiringSales = await this.getExpiringSoonFlashSales(5);
            for (const sale of expiringSales) {
                if (sale.notifyOnEndingSoon && io) {
                    stockSocketService_1.default.getIO()?.emit('flashsale:ending_soon', {
                        flashSaleId: sale._id,
                        title: sale.title,
                        endTime: sale.endTime,
                        remainingQuantity: sale.maxQuantity - sale.soldQuantity,
                    });
                }
            }
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error checking ending soon:', error);
        }
    }
    /**
     * Mark ended flash sales (called by cron job)
     */
    async markEndedFlashSales() {
        try {
            const now = new Date();
            const result = await FlashSale_1.default.updateMany({
                isActive: true,
                endTime: { $lt: now },
                status: { $nin: ['ended', 'sold_out'] },
            }, {
                $set: { status: 'ended' },
            });
            if (result.modifiedCount > 0) {
                console.log(`✅ [FlashSaleService] Marked ${result.modifiedCount} flash sales as ended`);
                // Emit socket event
                if (io) {
                    stockSocketService_1.default.getIO()?.emit('flashsale:batch_ended', {
                        count: result.modifiedCount,
                    });
                }
            }
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error marking ended flash sales:', error);
        }
    }
    /**
     * Get flash sale statistics
     */
    async getFlashSaleStats(flashSaleId) {
        try {
            const flashSale = await FlashSale_1.default.findById(flashSaleId);
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
        }
        catch (error) {
            console.error('❌ [FlashSaleService] Error getting flash sale stats:', error);
            throw error;
        }
    }
}
exports.default = new FlashSaleService();

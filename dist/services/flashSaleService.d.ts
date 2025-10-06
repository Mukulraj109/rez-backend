import { IFlashSale } from '../models/FlashSale';
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
declare class FlashSaleService {
    /**
     * Create a new flash sale
     */
    createFlashSale(data: CreateFlashSaleData): Promise<IFlashSale>;
    /**
     * Get all active flash sales
     */
    getActiveFlashSales(): Promise<IFlashSale[]>;
    /**
     * Get upcoming flash sales
     */
    getUpcomingFlashSales(): Promise<IFlashSale[]>;
    /**
     * Get flash sales expiring soon
     */
    getExpiringSoonFlashSales(minutes?: number): Promise<IFlashSale[]>;
    /**
     * Get flash sale by ID
     */
    getFlashSaleById(flashSaleId: string): Promise<IFlashSale | null>;
    /**
     * Get flash sales by product ID
     */
    getFlashSalesByProduct(productId: string): Promise<IFlashSale[]>;
    /**
     * Get flash sales by category
     */
    getFlashSalesByCategory(categoryId: string): Promise<IFlashSale[]>;
    /**
     * Update flash sale
     */
    updateFlashSale(flashSaleId: string, data: UpdateFlashSaleData): Promise<IFlashSale | null>;
    /**
     * Validate flash sale purchase
     */
    validateFlashSalePurchase(data: FlashSalePurchaseData): Promise<{
        valid: boolean;
        message?: string;
        flashSale?: IFlashSale;
    }>;
    /**
     * Update sold quantity after purchase
     */
    updateSoldQuantity(flashSaleId: string, quantity: number, userId: string): Promise<IFlashSale | null>;
    /**
     * Track flash sale view
     */
    trackView(flashSaleId: string): Promise<void>;
    /**
     * Track flash sale click
     */
    trackClick(flashSaleId: string): Promise<void>;
    /**
     * Delete flash sale
     */
    deleteFlashSale(flashSaleId: string): Promise<void>;
    /**
     * Schedule start notification (would integrate with notification service)
     */
    private scheduleStartNotification;
    /**
     * Check and emit ending soon events (called by cron job)
     */
    checkEndingSoon(): Promise<void>;
    /**
     * Mark ended flash sales (called by cron job)
     */
    markEndedFlashSales(): Promise<void>;
    /**
     * Get flash sale statistics
     */
    getFlashSaleStats(flashSaleId: string): Promise<{
        totalViews: number;
        totalClicks: number;
        totalPurchases: number;
        uniqueCustomers: number;
        conversionRate: number;
        soldPercentage: number;
        remainingTime: number;
    } | null>;
}
declare const _default: FlashSaleService;
export default _default;

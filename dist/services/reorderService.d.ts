export interface ReorderItem {
    productId: string;
    variantId?: string;
    quantity: number;
    currentPrice: number;
    originalPrice: number;
    priceDifference: number;
    isAvailable: boolean;
    hasStockIssue: boolean;
    availableStock: number;
    hasVariantIssue: boolean;
    replacementSuggestion?: {
        productId: string;
        name: string;
        price: number;
        image: string;
    };
}
export interface ReorderValidation {
    canReorder: boolean;
    items: ReorderItem[];
    unavailableItems: any[];
    priceChanges: any[];
    totalOriginal: number;
    totalCurrent: number;
    totalDifference: number;
    warnings: string[];
}
export interface FrequentlyOrderedItem {
    productId: string;
    productName: string;
    productImage: string;
    storeId: string;
    storeName: string;
    orderCount: number;
    lastOrderDate: Date;
    averageQuantity: number;
    totalSpent: number;
    currentPrice: number;
    isAvailable: boolean;
}
export interface ReorderSuggestion {
    type: 'frequent' | 'consumable' | 'subscription';
    productId: string;
    productName: string;
    productImage: string;
    storeId: string;
    storeName: string;
    reason: string;
    lastOrderDate?: Date;
    orderFrequency?: number;
    suggestedQuantity: number;
    currentPrice: number;
    isAvailable: boolean;
}
declare class ReorderService {
    /**
     * Validate if an order can be reordered
     * Checks product availability, stock, and price changes
     */
    validateReorder(userId: string, orderId: string, selectedItemIds?: string[]): Promise<ReorderValidation>;
    /**
     * Add order items to cart
     */
    addToCart(userId: string, orderId: string, selectedItemIds?: string[]): Promise<any>;
    /**
     * Get frequently ordered items
     */
    getFrequentlyOrdered(userId: string, limit?: number): Promise<FrequentlyOrderedItem[]>;
    /**
     * Get smart reorder suggestions
     */
    getReorderSuggestions(userId: string): Promise<ReorderSuggestion[]>;
}
declare const reorderService: ReorderService;
export default reorderService;

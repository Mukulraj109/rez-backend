import { IOffer } from '../models/Offer';
import { IFlashSale } from '../models/FlashSale';
interface CartItem {
    productId: string;
    quantity: number;
    price: number;
    storeId?: string;
    categoryId?: string;
}
interface OfferCalculation {
    offerId: string;
    offerType: 'flash_sale' | 'exclusive' | 'category' | 'store' | 'general';
    title: string;
    description: string;
    priority: number;
    savings: number;
    finalPrice: number;
    discountPercentage: number;
    applicable: boolean;
    reason?: string;
}
interface BestOfferResult {
    bestOffer: OfferCalculation | null;
    allApplicableOffers: OfferCalculation[];
    originalTotal: number;
    finalTotal: number;
    totalSavings: number;
}
declare class OfferService {
    /**
     * Priority order for offer types (higher number = higher priority)
     */
    private readonly OFFER_PRIORITY;
    /**
     * Find the best offer for a cart
     */
    findBestOffer(cartTotal: number, items: CartItem[], userId: string): Promise<BestOfferResult>;
    /**
     * Get all applicable offers for cart
     */
    private getAllApplicableOffers;
    /**
     * Get flash sale offers
     */
    private getFlashSaleOffers;
    /**
     * Get exclusive user offers (based on loyalty tier)
     */
    private getExclusiveOffers;
    /**
     * Get category-specific offers
     */
    private getCategoryOffers;
    /**
     * Get store-wide offers
     */
    private getStoreOffers;
    /**
     * Get general/global offers
     */
    private getGeneralOffers;
    /**
     * Apply offer to cart
     */
    applyOffer(offerId: string, cartTotal: number, items: CartItem[], userId: string): Promise<{
        success: boolean;
        finalPrice: number;
        savings: number;
        offer?: OfferCalculation;
        message?: string;
    }>;
    /**
     * Validate promo code
     */
    validatePromoCode(promoCode: string, cartTotal: number, userId: string): Promise<{
        valid: boolean;
        offer?: IOffer | IFlashSale;
        savings?: number;
        finalPrice?: number;
        message?: string;
    }>;
}
declare const _default: OfferService;
export default _default;

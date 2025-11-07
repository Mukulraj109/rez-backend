import mongoose, { Document, Model } from 'mongoose';
interface IFlashSaleMethods {
    isActive(): boolean;
    isExpiring(minutes: number): boolean;
    getRemainingTime(): number;
    hasStock(): boolean;
    canPurchase(quantity: number): boolean;
    getAvailableQuantity(): number;
    getProgress(): number;
}
interface IFlashSaleModel extends Model<IFlashSale, {}, IFlashSaleMethods> {
    getActive(): any;
    getUpcoming(): any;
    getExpiringSoon(minutes: number): any;
    getLowStock(threshold: number): any;
}
export interface IFlashSale extends Document, IFlashSaleMethods {
    title: string;
    description: string;
    image: string;
    banner?: string;
    discountPercentage: number;
    discountAmount?: number;
    priority: number;
    startTime: Date;
    endTime: Date;
    duration?: number;
    maxQuantity: number;
    soldQuantity: number;
    limitPerUser: number;
    lowStockThreshold: number;
    products: mongoose.Types.ObjectId[];
    stores?: mongoose.Types.ObjectId[];
    category?: mongoose.Types.ObjectId;
    originalPrice?: number;
    flashSalePrice?: number;
    enabled: boolean;
    status: 'scheduled' | 'active' | 'ending_soon' | 'ended' | 'sold_out';
    termsAndConditions: string[];
    minimumPurchase?: number;
    maximumDiscount?: number;
    viewCount: number;
    clickCount: number;
    purchaseCount: number;
    uniqueCustomers: number;
    notifyOnStart: boolean;
    notifyOnEndingSoon: boolean;
    notifyOnLowStock: boolean;
    notifiedUsers: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const FlashSale: IFlashSaleModel;
export default FlashSale;

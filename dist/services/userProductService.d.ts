import { Types } from 'mongoose';
import { IUserProduct } from '../models/UserProduct';
import { IServiceRequest, ITechnician } from '../models/ServiceRequest';
interface CreateUserProductData {
    userId: Types.ObjectId;
    productId: Types.ObjectId;
    orderId: Types.ObjectId;
    quantity: number;
    totalPrice: number;
    purchaseDate: Date;
    warranty?: {
        hasWarranty: boolean;
        duration?: number;
        warrantyCard?: string;
        terms?: string[];
    };
    installation?: {
        required: boolean;
    };
}
interface CreateServiceRequestData {
    userId: Types.ObjectId;
    userProductId: Types.ObjectId;
    productId: Types.ObjectId;
    requestType: 'repair' | 'replacement' | 'installation' | 'maintenance' | 'inspection';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    issueDescription: string;
    issueCategory?: string;
    images?: string[];
    addressId: Types.ObjectId;
    estimatedCost?: number;
}
declare class UserProductService {
    /**
     * Create user product entry (auto-called on order delivery)
     */
    createUserProduct(data: CreateUserProductData): Promise<IUserProduct>;
    /**
     * Create user products from delivered order
     */
    createUserProductsFromOrder(orderId: Types.ObjectId): Promise<IUserProduct[]>;
    /**
     * Get user's products
     */
    getUserProducts(userId: Types.ObjectId, filters?: any): Promise<IUserProduct[]>;
    /**
     * Get product details
     */
    getProductDetails(userId: Types.ObjectId, productId: Types.ObjectId): Promise<IUserProduct | null>;
    /**
     * Get products with expiring warranties
     */
    getExpiringWarranties(userId: Types.ObjectId, days?: number): Promise<IUserProduct[]>;
    /**
     * Get products with expiring AMC
     */
    getExpiringAMC(userId: Types.ObjectId, days?: number): Promise<IUserProduct[]>;
    /**
     * Register product
     */
    registerProduct(userId: Types.ObjectId, productId: Types.ObjectId, serialNumber: string, registrationNumber?: string): Promise<IUserProduct>;
    /**
     * Schedule installation
     */
    scheduleInstallation(userId: Types.ObjectId, productId: Types.ObjectId, scheduledDate: Date, technician?: string, notes?: string): Promise<IUserProduct>;
    /**
     * Renew AMC
     */
    renewAMC(userId: Types.ObjectId, productId: Types.ObjectId, duration: number, amount: number): Promise<IUserProduct>;
    /**
     * Create service request
     */
    createServiceRequest(data: CreateServiceRequestData): Promise<IServiceRequest>;
    /**
     * Get user's service requests
     */
    getUserServiceRequests(userId: Types.ObjectId, filters?: any, page?: number, limit?: number): Promise<{
        requests: IServiceRequest[];
        total: number;
        pages: number;
    }>;
    /**
     * Get service request details
     */
    getServiceRequestDetails(userId: Types.ObjectId, requestId: Types.ObjectId): Promise<IServiceRequest | null>;
    /**
     * Schedule service request
     */
    scheduleServiceRequest(userId: Types.ObjectId, requestId: Types.ObjectId, scheduledDate: Date, timeSlot: string, technician?: ITechnician): Promise<IServiceRequest>;
    /**
     * Cancel service request
     */
    cancelServiceRequest(userId: Types.ObjectId, requestId: Types.ObjectId, reason: string): Promise<IServiceRequest>;
    /**
     * Reschedule service request
     */
    rescheduleServiceRequest(userId: Types.ObjectId, requestId: Types.ObjectId, newDate: Date, newTimeSlot: string): Promise<IServiceRequest>;
    /**
     * Rate service request
     */
    rateServiceRequest(userId: Types.ObjectId, requestId: Types.ObjectId, rating: number, feedback?: string): Promise<IServiceRequest>;
    /**
     * Get active service requests
     */
    getActiveServiceRequests(userId: Types.ObjectId): Promise<IServiceRequest[]>;
    /**
     * Mark expired warranties (scheduled task)
     */
    markExpiredWarranties(): Promise<number>;
    /**
     * Send warranty expiry reminders (to be implemented with notification service)
     */
    sendWarrantyExpiryReminders(days?: number): Promise<void>;
    /**
     * Send AMC renewal reminders
     */
    sendAMCRenewalReminders(days?: number): Promise<void>;
}
declare const _default: UserProductService;
export default _default;

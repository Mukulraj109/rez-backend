"use strict";
// UserProduct Service
// Business logic for user product and service request management
Object.defineProperty(exports, "__esModule", { value: true });
const UserProduct_1 = require("../models/UserProduct");
const ServiceRequest_1 = require("../models/ServiceRequest");
const Order_1 = require("../models/Order");
class UserProductService {
    /**
     * Create user product entry (auto-called on order delivery)
     */
    async createUserProduct(data) {
        try {
            // Calculate warranty dates if warranty exists
            let warrantyData = data.warranty || { hasWarranty: false };
            if (warrantyData.hasWarranty && warrantyData.duration) {
                const startDate = new Date(data.purchaseDate);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + warrantyData.duration);
                warrantyData = {
                    ...warrantyData,
                    startDate,
                    endDate,
                };
            }
            const userProduct = await UserProduct_1.UserProduct.create({
                user: data.userId,
                product: data.productId,
                order: data.orderId,
                quantity: data.quantity,
                totalPrice: data.totalPrice,
                purchaseDate: data.purchaseDate,
                warranty: warrantyData,
                installation: data.installation || { required: false, scheduled: false, completed: false },
                status: 'active',
            });
            console.log(`✅ [USER PRODUCT SERVICE] Created user product: ${userProduct._id}`);
            return userProduct;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error creating user product:', error);
            throw error;
        }
    }
    /**
     * Create user products from delivered order
     */
    async createUserProductsFromOrder(orderId) {
        try {
            const order = await Order_1.Order.findById(orderId).populate('items.product');
            if (!order) {
                console.log(`⚠️ [USER PRODUCT SERVICE] Order not found: ${orderId}`);
                return [];
            }
            // Only create for delivered orders
            if (order.status !== 'delivered') {
                console.log(`⚠️ [USER PRODUCT SERVICE] Order not delivered yet: ${orderId}`);
                return [];
            }
            // Check if user products already exist for this order
            const existingProducts = await UserProduct_1.UserProduct.find({ order: orderId });
            if (existingProducts.length > 0) {
                console.log(`⚠️ [USER PRODUCT SERVICE] User products already exist for order: ${orderId}`);
                return existingProducts;
            }
            const userProducts = [];
            for (const orderItem of order.items) {
                const product = orderItem.product;
                if (!product) {
                    continue;
                }
                // Determine if product has warranty
                const hasWarranty = product.warranty?.duration > 0;
                const warrantyDuration = product.warranty?.duration || 0;
                // Determine if product needs installation
                const needsInstallation = product.installationRequired || false;
                const userProduct = await this.createUserProduct({
                    userId: order.user,
                    productId: product._id,
                    orderId: order._id,
                    quantity: orderItem.quantity,
                    totalPrice: orderItem.price * orderItem.quantity,
                    purchaseDate: order.createdAt,
                    warranty: hasWarranty ? {
                        hasWarranty: true,
                        duration: warrantyDuration,
                        terms: product.warranty?.terms || [],
                    } : undefined,
                    installation: {
                        required: needsInstallation,
                    },
                });
                userProducts.push(userProduct);
            }
            console.log(`✅ [USER PRODUCT SERVICE] Created ${userProducts.length} user products from order`);
            return userProducts;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error creating user products from order:', error);
            throw error;
        }
    }
    /**
     * Get user's products
     */
    async getUserProducts(userId, filters = {}) {
        try {
            return await UserProduct_1.UserProduct.getUserProducts(userId, filters);
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting user products:', error);
            throw error;
        }
    }
    /**
     * Get product details
     */
    async getProductDetails(userId, productId) {
        try {
            const userProduct = await UserProduct_1.UserProduct.findOne({
                _id: productId,
                user: userId,
            })
                .populate('product', 'name images category basePrice description')
                .populate('order', 'orderNumber totalAmount createdAt')
                .populate('serviceRequests')
                .lean();
            return userProduct;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting product details:', error);
            throw error;
        }
    }
    /**
     * Get products with expiring warranties
     */
    async getExpiringWarranties(userId, days = 30) {
        try {
            return await UserProduct_1.UserProduct.getExpiringWarranties(userId, days);
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting expiring warranties:', error);
            throw error;
        }
    }
    /**
     * Get products with expiring AMC
     */
    async getExpiringAMC(userId, days = 30) {
        try {
            return await UserProduct_1.UserProduct.getExpiringAMC(userId, days);
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting expiring AMC:', error);
            throw error;
        }
    }
    /**
     * Register product
     */
    async registerProduct(userId, productId, serialNumber, registrationNumber) {
        try {
            const userProduct = await UserProduct_1.UserProduct.findOne({
                _id: productId,
                user: userId,
            });
            if (!userProduct) {
                throw new Error('Product not found');
            }
            if (userProduct.registration.isRegistered) {
                throw new Error('Product is already registered');
            }
            await userProduct.registerProduct(serialNumber, registrationNumber);
            console.log(`✅ [USER PRODUCT SERVICE] Product registered successfully`);
            return userProduct;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error registering product:', error);
            throw error;
        }
    }
    /**
     * Schedule installation
     */
    async scheduleInstallation(userId, productId, scheduledDate, technician, notes) {
        try {
            const userProduct = await UserProduct_1.UserProduct.findOne({
                _id: productId,
                user: userId,
            });
            if (!userProduct) {
                throw new Error('Product not found');
            }
            if (!userProduct.installation.required) {
                throw new Error('Installation not required for this product');
            }
            await userProduct.scheduleInstallation(scheduledDate, technician, notes);
            console.log(`✅ [USER PRODUCT SERVICE] Installation scheduled successfully`);
            return userProduct;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error scheduling installation:', error);
            throw error;
        }
    }
    /**
     * Renew AMC
     */
    async renewAMC(userId, productId, duration, amount) {
        try {
            const userProduct = await UserProduct_1.UserProduct.findOne({
                _id: productId,
                user: userId,
            });
            if (!userProduct) {
                throw new Error('Product not found');
            }
            await userProduct.renewAMC(duration, amount);
            console.log(`✅ [USER PRODUCT SERVICE] AMC renewed successfully`);
            return userProduct;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error renewing AMC:', error);
            throw error;
        }
    }
    /**
     * Create service request
     */
    async createServiceRequest(data) {
        try {
            // Verify user product exists and belongs to user
            const userProduct = await UserProduct_1.UserProduct.findOne({
                _id: data.userProductId,
                user: data.userId,
            });
            if (!userProduct) {
                throw new Error('Product not found');
            }
            // Generate request number
            const requestNumber = await ServiceRequest_1.ServiceRequest.generateRequestNumber();
            // Check if warranty covers the service
            let warrantyCovered = false;
            if (userProduct.warranty.hasWarranty && userProduct.warrantyStatus === 'active') {
                if (data.requestType === 'repair' || data.requestType === 'replacement') {
                    warrantyCovered = true;
                }
            }
            // Create service request
            const serviceRequest = await ServiceRequest_1.ServiceRequest.create({
                requestNumber,
                user: data.userId,
                userProduct: data.userProductId,
                product: data.productId,
                requestType: data.requestType,
                priority: data.priority || 'medium',
                issueDescription: data.issueDescription,
                issueCategory: data.issueCategory,
                images: data.images || [],
                address: data.addressId,
                cost: {
                    estimatedCost: data.estimatedCost || 0,
                    warrantyCovered,
                },
                status: 'pending',
            });
            // Add service request reference to user product
            userProduct.serviceRequests.push(serviceRequest._id);
            await userProduct.save();
            console.log(`✅ [USER PRODUCT SERVICE] Created service request: ${requestNumber}`);
            return serviceRequest;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error creating service request:', error);
            throw error;
        }
    }
    /**
     * Get user's service requests
     */
    async getUserServiceRequests(userId, filters = {}, page = 1, limit = 20) {
        try {
            return await ServiceRequest_1.ServiceRequest.getUserRequests(userId, filters, page, limit);
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting service requests:', error);
            throw error;
        }
    }
    /**
     * Get service request details
     */
    async getServiceRequestDetails(userId, requestId) {
        try {
            const request = await ServiceRequest_1.ServiceRequest.findOne({
                _id: requestId,
                user: userId,
            })
                .populate('product', 'name images category')
                .populate('userProduct', 'purchaseDate warranty registration')
                .populate('address', 'fullAddress city state pincode')
                .lean();
            return request;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting service request details:', error);
            throw error;
        }
    }
    /**
     * Schedule service request
     */
    async scheduleServiceRequest(userId, requestId, scheduledDate, timeSlot, technician) {
        try {
            const request = await ServiceRequest_1.ServiceRequest.findOne({
                _id: requestId,
                user: userId,
            });
            if (!request) {
                throw new Error('Service request not found');
            }
            await request.scheduleService(scheduledDate, timeSlot, technician);
            console.log(`✅ [USER PRODUCT SERVICE] Service request scheduled successfully`);
            return request;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error scheduling service request:', error);
            throw error;
        }
    }
    /**
     * Cancel service request
     */
    async cancelServiceRequest(userId, requestId, reason) {
        try {
            const request = await ServiceRequest_1.ServiceRequest.findOne({
                _id: requestId,
                user: userId,
            });
            if (!request) {
                throw new Error('Service request not found');
            }
            await request.cancelService(reason);
            console.log(`✅ [USER PRODUCT SERVICE] Service request cancelled successfully`);
            return request;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error cancelling service request:', error);
            throw error;
        }
    }
    /**
     * Reschedule service request
     */
    async rescheduleServiceRequest(userId, requestId, newDate, newTimeSlot) {
        try {
            const request = await ServiceRequest_1.ServiceRequest.findOne({
                _id: requestId,
                user: userId,
            });
            if (!request) {
                throw new Error('Service request not found');
            }
            await request.rescheduleService(newDate, newTimeSlot);
            console.log(`✅ [USER PRODUCT SERVICE] Service request rescheduled successfully`);
            return request;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error rescheduling service request:', error);
            throw error;
        }
    }
    /**
     * Rate service request
     */
    async rateServiceRequest(userId, requestId, rating, feedback) {
        try {
            const request = await ServiceRequest_1.ServiceRequest.findOne({
                _id: requestId,
                user: userId,
            });
            if (!request) {
                throw new Error('Service request not found');
            }
            await request.rateService(rating, feedback);
            console.log(`✅ [USER PRODUCT SERVICE] Service request rated successfully`);
            return request;
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error rating service request:', error);
            throw error;
        }
    }
    /**
     * Get active service requests
     */
    async getActiveServiceRequests(userId) {
        try {
            return await ServiceRequest_1.ServiceRequest.getActiveRequests(userId);
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error getting active service requests:', error);
            throw error;
        }
    }
    /**
     * Mark expired warranties (scheduled task)
     */
    async markExpiredWarranties() {
        try {
            return await UserProduct_1.UserProduct.markExpiredWarranties();
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error marking expired warranties:', error);
            throw error;
        }
    }
    /**
     * Send warranty expiry reminders (to be implemented with notification service)
     */
    async sendWarrantyExpiryReminders(days = 30) {
        try {
            // Get all products with warranties expiring in specified days
            const expiringProducts = await UserProduct_1.UserProduct.find({
                'warranty.hasWarranty': true,
                'warranty.endDate': {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
                },
            })
                .populate('user', 'profile.firstName profile.phoneNumber profile.email')
                .populate('product', 'name')
                .lean();
            console.log(`📧 [USER PRODUCT SERVICE] Found ${expiringProducts.length} products with expiring warranties`);
            // TODO: Integrate with notification service to send reminders
            // For now, just logging
            for (const product of expiringProducts) {
                console.log(`⚠️ Warranty expiring soon for product: ${product.product.name}`);
            }
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error sending warranty expiry reminders:', error);
            throw error;
        }
    }
    /**
     * Send AMC renewal reminders
     */
    async sendAMCRenewalReminders(days = 30) {
        try {
            // Get all products with AMC expiring in specified days
            const expiringAMC = await UserProduct_1.UserProduct.find({
                'amc.hasAMC': true,
                'amc.endDate': {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
                },
            })
                .populate('user', 'profile.firstName profile.phoneNumber profile.email')
                .populate('product', 'name')
                .lean();
            console.log(`📧 [USER PRODUCT SERVICE] Found ${expiringAMC.length} products with expiring AMC`);
            // TODO: Integrate with notification service to send reminders
            for (const product of expiringAMC) {
                console.log(`⚠️ AMC expiring soon for product: ${product.product.name}`);
            }
        }
        catch (error) {
            console.error('❌ [USER PRODUCT SERVICE] Error sending AMC renewal reminders:', error);
            throw error;
        }
    }
}
exports.default = new UserProductService();

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashbackModel = exports.CashbackMongoModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CashbackSchema = new mongoose_1.Schema({
    requestNumber: { type: String, required: true, unique: true },
    merchantId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    orderId: { type: String, required: true },
    customer: {
        id: String,
        name: String,
        email: String,
        phone: String,
        avatar: String,
        totalCashbackEarned: Number,
        accountAge: Number,
        verificationStatus: { type: String, enum: ['verified', 'pending', 'unverified'] }
    },
    order: {
        id: String,
        orderNumber: String,
        totalAmount: Number,
        orderDate: Date,
        items: [{
                productId: String,
                productName: String,
                quantity: Number,
                price: Number,
                cashbackEligible: Boolean
            }]
    },
    requestedAmount: { type: Number, required: true },
    approvedAmount: Number,
    cashbackRate: { type: Number, required: true },
    calculationBreakdown: [{
            productId: String,
            productName: String,
            quantity: Number,
            productPrice: Number,
            cashbackRate: Number,
            cashbackAmount: Number,
            categoryId: String,
            categoryName: String
        }],
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled'],
        default: 'pending'
    },
    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    riskScore: { type: Number, required: true },
    riskFactors: [{
            type: { type: String, enum: ['velocity', 'amount', 'pattern', 'device', 'location', 'account'] },
            severity: { type: String, enum: ['low', 'medium', 'high'] },
            description: String,
            value: mongoose_1.Schema.Types.Mixed
        }],
    flaggedForReview: { type: Boolean, default: false },
    reviewedBy: String,
    reviewedAt: Date,
    approvalNotes: String,
    rejectionReason: String,
    paymentMethod: { type: String, enum: ['wallet', 'bank_transfer', 'check'] },
    paymentReference: String,
    paidAt: Date,
    expiresAt: { type: Date, required: true },
    timeline: [{
            status: String,
            timestamp: Date,
            notes: String,
            by: String
        }],
    paidAmount: Number
}, {
    timestamps: true
});
const CashbackMongoModel = mongoose_1.default.model('CashbackRequest', CashbackSchema);
exports.CashbackMongoModel = CashbackMongoModel;
class CashbackModel {
    static generateRequestNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `CB${year}${month}${day}${timestamp}${random}`;
    }
    static async create(requestData) {
        const requestNumber = this.generateRequestNumber();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const mongoCashback = new CashbackMongoModel({
            requestNumber,
            ...requestData,
            expiresAt
        });
        const savedRequest = await mongoCashback.save();
        return {
            id: savedRequest._id.toString(),
            requestNumber: savedRequest.requestNumber,
            ...requestData,
            expiresAt,
            createdAt: savedRequest.createdAt,
            updatedAt: savedRequest.updatedAt
        };
    }
    static async findById(id) {
        try {
            const request = await CashbackMongoModel.findById(id);
            if (!request)
                return null;
            return {
                id: request._id.toString(),
                ...request.toObject(),
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            return null;
        }
    }
    static async findByMerchantId(merchantId) {
        const requests = await CashbackMongoModel.find({ merchantId });
        return requests.map(request => ({
            id: request._id.toString(),
            ...request.toObject(),
            createdAt: request.createdAt,
            updatedAt: request.updatedAt
        }));
    }
    static async search(params) {
        const query = { merchantId: params.merchantId };
        if (params.status) {
            query.status = params.status;
        }
        if (params.customerId) {
            query.customerId = params.customerId;
        }
        if (params.dateRange) {
            query.createdAt = {
                $gte: params.dateRange.start,
                $lte: params.dateRange.end
            };
        }
        if (params.amountRange) {
            query.requestedAmount = {
                $gte: params.amountRange.min,
                $lte: params.amountRange.max
            };
        }
        if (params.riskLevel) {
            const riskRanges = {
                low: { min: 0, max: 39 },
                medium: { min: 40, max: 69 },
                high: { min: 70, max: 100 }
            };
            const range = riskRanges[params.riskLevel];
            query.riskScore = {
                $gte: range.min,
                $lte: range.max
            };
        }
        if (params.flaggedOnly) {
            query.flaggedForReview = true;
        }
        const sortBy = params.sortBy || 'created';
        const sortOrder = params.sortOrder || 'desc';
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        let sortField;
        switch (sortBy) {
            case 'created':
                sortField = 'createdAt';
                break;
            case 'amount':
                sortField = 'requestedAmount';
                break;
            case 'risk_score':
                sortField = 'riskScore';
                break;
            case 'expires':
                sortField = 'expiresAt';
                break;
            default:
                sortField = 'createdAt';
        }
        const sortOptions = {};
        sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
        const [requests, totalCount] = await Promise.all([
            CashbackMongoModel.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .exec(),
            CashbackMongoModel.countDocuments(query)
        ]);
        const transformedRequests = requests.map(request => ({
            id: request._id.toString(),
            ...request.toObject(),
            createdAt: request.createdAt,
            updatedAt: request.updatedAt
        }));
        return {
            requests: transformedRequests,
            totalCount,
            page,
            limit,
            hasNext: skip + limit < totalCount,
            hasPrevious: page > 1
        };
    }
    static async getMetrics(merchantId) {
        const requests = await this.findByMerchantId(merchantId);
        const pendingRequests = requests.filter(req => req.status === 'pending');
        const highRiskRequests = requests.filter(req => req.riskScore >= 70 || req.flaggedForReview);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const autoApprovedToday = requests.filter(req => req.status === 'approved' &&
            req.reviewedAt &&
            req.reviewedAt >= today &&
            !req.flaggedForReview).length;
        const approvedRequests = requests.filter(req => req.reviewedAt && req.createdAt);
        const avgApprovalTime = approvedRequests.length > 0
            ? approvedRequests.reduce((sum, req) => {
                const approvalTime = req.reviewedAt.getTime() - req.createdAt.getTime();
                return sum + (approvalTime / (1000 * 60 * 60));
            }, 0) / approvedRequests.length
            : 0;
        const totalCashbackPaid = requests
            .filter(req => req.status === 'paid')
            .reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
        const cashbackROI = totalCashbackPaid > 0 ? 300 : 0;
        const customerRetentionImpact = Math.min(totalCashbackPaid * 0.1, 25);
        return {
            totalPendingRequests: pendingRequests.length,
            totalPendingAmount: pendingRequests.reduce((sum, req) => sum + req.requestedAmount, 0),
            highRiskRequests: highRiskRequests.length,
            autoApprovedToday,
            avgApprovalTime,
            cashbackROI,
            customerRetentionImpact
        };
    }
    static assessRisk(requestData) {
        const riskFactors = [];
        if (requestData.requestedAmount > 100) {
            riskFactors.push({
                type: 'amount',
                severity: 'high',
                description: 'Unusually high cashback amount',
                value: requestData.requestedAmount
            });
        }
        if (requestData.customer.accountAge < 7) {
            riskFactors.push({
                type: 'account',
                severity: 'high',
                description: 'Very new account (less than 1 week)',
                value: requestData.customer.accountAge
            });
        }
        if (requestData.customer.verificationStatus !== 'verified') {
            riskFactors.push({
                type: 'account',
                severity: 'medium',
                description: 'Unverified account',
                value: requestData.customer.verificationStatus
            });
        }
        const weights = { low: 10, medium: 25, high: 40 };
        const riskScore = Math.min(riskFactors.reduce((score, factor) => score + weights[factor.severity], 0), 100);
        const flaggedForReview = riskScore >= 70 ||
            riskFactors.some(factor => factor.severity === 'high');
        return {
            riskScore,
            riskFactors,
            flaggedForReview
        };
    }
    static async approve(id, approvedAmount, notes, reviewedBy) {
        try {
            const updatedRequest = await CashbackMongoModel.findByIdAndUpdate(id, {
                status: 'approved',
                approvedAmount,
                approvalNotes: notes,
                reviewedBy: reviewedBy || 'system',
                reviewedAt: new Date(),
                $push: {
                    timeline: {
                        status: 'approved',
                        timestamp: new Date(),
                        notes: notes || 'Request approved',
                        by: reviewedBy || 'system'
                    }
                }
            }, { new: true });
            if (!updatedRequest)
                return null;
            return {
                id: updatedRequest._id.toString(),
                ...updatedRequest.toObject(),
                createdAt: updatedRequest.createdAt,
                updatedAt: updatedRequest.updatedAt
            };
        }
        catch (error) {
            return null;
        }
    }
    static async reject(id, reason, reviewedBy) {
        try {
            const updatedRequest = await CashbackMongoModel.findByIdAndUpdate(id, {
                status: 'rejected',
                rejectionReason: reason,
                reviewedBy: reviewedBy || 'system',
                reviewedAt: new Date(),
                $push: {
                    timeline: {
                        status: 'rejected',
                        timestamp: new Date(),
                        notes: `Request rejected: ${reason}`,
                        by: reviewedBy || 'system'
                    }
                }
            }, { new: true });
            if (!updatedRequest)
                return null;
            return {
                id: updatedRequest._id.toString(),
                ...updatedRequest.toObject(),
                createdAt: updatedRequest.createdAt,
                updatedAt: updatedRequest.updatedAt
            };
        }
        catch (error) {
            return null;
        }
    }
    static async markAsPaid(id, paymentMethod, paymentReference) {
        try {
            const updatedRequest = await CashbackMongoModel.findByIdAndUpdate(id, {
                status: 'paid',
                paymentMethod,
                paymentReference,
                paidAt: new Date(),
                $push: {
                    timeline: {
                        status: 'paid',
                        timestamp: new Date(),
                        notes: `Payment processed via ${paymentMethod}`,
                        by: 'system'
                    }
                }
            }, { new: true });
            if (!updatedRequest)
                return null;
            return {
                id: updatedRequest._id.toString(),
                ...updatedRequest.toObject(),
                createdAt: updatedRequest.createdAt,
                updatedAt: updatedRequest.updatedAt
            };
        }
        catch (error) {
            return null;
        }
    }
    static async bulkApprove(requestIds, notes, reviewedBy) {
        const results = [];
        for (const requestId of requestIds) {
            try {
                const request = await this.findById(requestId);
                if (!request) {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Request not found'
                    });
                    continue;
                }
                if (request.status !== 'pending' && request.status !== 'under_review') {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Request cannot be approved - invalid status'
                    });
                    continue;
                }
                const updatedRequest = await this.approve(requestId, request.requestedAmount, notes, reviewedBy);
                if (updatedRequest) {
                    results.push({
                        success: true,
                        requestId
                    });
                }
                else {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Failed to approve request'
                    });
                }
            }
            catch (error) {
                results.push({
                    success: false,
                    requestId,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    static async bulkReject(requestIds, reason, reviewedBy) {
        const results = [];
        for (const requestId of requestIds) {
            try {
                const request = await this.findById(requestId);
                if (!request) {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Request not found'
                    });
                    continue;
                }
                if (request.status !== 'pending' && request.status !== 'under_review') {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Request cannot be rejected - invalid status'
                    });
                    continue;
                }
                const updatedRequest = await this.reject(requestId, reason, reviewedBy);
                if (updatedRequest) {
                    results.push({
                        success: true,
                        requestId
                    });
                }
                else {
                    results.push({
                        success: false,
                        requestId,
                        message: 'Failed to reject request'
                    });
                }
            }
            catch (error) {
                results.push({
                    success: false,
                    requestId,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    static async getAnalytics(merchantId, dateRange) {
        const query = { merchantId };
        if (dateRange) {
            query.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }
        const requests = await CashbackMongoModel.find(query);
        const totalRequests = requests.length;
        const totalAmount = requests.reduce((sum, req) => sum + req.requestedAmount, 0);
        const approvedRequests = requests.filter(req => req.status === 'approved' || req.status === 'paid');
        const approvedAmount = approvedRequests.reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
        const pendingRequests = requests.filter(req => req.status === 'pending').length;
        const rejectedRequests = requests.filter(req => req.status === 'rejected').length;
        const paidRequests = requests.filter(req => req.status === 'paid').length;
        const paidAmount = requests.filter(req => req.status === 'paid').reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
        const averageRequestAmount = totalRequests > 0 ? totalAmount / totalRequests : 0;
        const approvalRate = totalRequests > 0 ? (approvedRequests.length / totalRequests) * 100 : 0;
        // Calculate average processing time for completed requests
        const completedRequests = requests.filter(req => req.reviewedAt && req.createdAt);
        const averageProcessingTime = completedRequests.length > 0
            ? completedRequests.reduce((sum, req) => {
                const processingTime = req.reviewedAt.getTime() - req.createdAt.getTime();
                return sum + (processingTime / (1000 * 60 * 60)); // Convert to hours
            }, 0) / completedRequests.length
            : 0;
        // Top customers by cashback earned
        const customerCashback = new Map();
        requests.forEach(req => {
            if (req.status === 'paid') {
                const existing = customerCashback.get(req.customerId) || {
                    name: req.customer.name,
                    totalCashback: 0,
                    requestCount: 0
                };
                existing.totalCashback += req.approvedAmount || req.requestedAmount;
                existing.requestCount += 1;
                customerCashback.set(req.customerId, existing);
            }
        });
        const topCustomers = Array.from(customerCashback.entries())
            .map(([customerId, data]) => ({
            customerId,
            customerName: data.name,
            totalCashback: data.totalCashback,
            requestCount: data.requestCount
        }))
            .sort((a, b) => b.totalCashback - a.totalCashback)
            .slice(0, 10);
        // Monthly trends
        const monthlyTrends = [];
        const last6Months = new Array(6).fill(0).map((_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return date;
        }).reverse();
        last6Months.forEach(date => {
            const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
            const monthRequests = requests.filter(req => req.createdAt.toISOString().slice(0, 7) === monthStr);
            const monthPaidAmount = monthRequests
                .filter(req => req.status === 'paid')
                .reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
            const monthOrderCount = monthRequests.length;
            const monthFraudAttempts = monthRequests.filter(req => req.flaggedForReview).length;
            monthlyTrends.push({
                month: monthStr,
                cashbackPaid: monthPaidAmount,
                ordersWithCashback: monthOrderCount,
                fraudAttempts: monthFraudAttempts
            });
        });
        // Top categories (using sample data since we don't have category breakdown)
        const topCategories = [
            {
                categoryId: 'cat_food',
                categoryName: 'Food & Beverages',
                cashbackPaid: paidAmount * 0.6,
                orderCount: Math.floor(paidRequests * 0.6)
            },
            {
                categoryId: 'cat_retail',
                categoryName: 'Retail',
                cashbackPaid: paidAmount * 0.3,
                orderCount: Math.floor(paidRequests * 0.3)
            },
            {
                categoryId: 'cat_other',
                categoryName: 'Other',
                cashbackPaid: paidAmount * 0.1,
                orderCount: Math.floor(paidRequests * 0.1)
            }
        ];
        const fraudDetectionRate = totalRequests > 0 ? (requests.filter(req => req.flaggedForReview).length / totalRequests) * 100 : 0;
        const customerRetentionImpact = Math.min(paidAmount * 0.15, 35); // Estimated impact
        const revenueImpact = paidAmount * 2.5; // Estimated revenue multiplier
        return {
            totalPaid: paidAmount,
            totalPending: pendingRequests,
            averageApprovalTime: averageProcessingTime,
            approvalRate,
            fraudDetectionRate,
            customerRetentionImpact,
            revenueImpact,
            topCategories,
            monthlyTrends
        };
    }
    static async createSampleRequests(merchantId) {
        const sampleCustomers = [
            {
                id: 'customer_1',
                name: 'John Smith',
                email: 'john.smith@example.com',
                phone: '+1-555-0101',
                avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=john',
                totalCashbackEarned: 145.50,
                accountAge: 120,
                verificationStatus: 'verified'
            },
            {
                id: 'customer_2',
                name: 'Emily Johnson',
                email: 'emily.johnson@example.com',
                phone: '+1-555-0102',
                avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=emily',
                totalCashbackEarned: 89.25,
                accountAge: 45,
                verificationStatus: 'verified'
            },
            {
                id: 'customer_3',
                name: 'Michael Davis',
                email: 'michael.davis@example.com',
                phone: '+1-555-0103',
                avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=michael',
                totalCashbackEarned: 12.50,
                accountAge: 5,
                verificationStatus: 'pending'
            }
        ];
        const sampleOrder = {
            id: 'order_1',
            orderNumber: 'ORD24081601',
            totalAmount: 75.99,
            orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            items: [
                {
                    productId: 'product_1',
                    productName: 'Premium Coffee Beans',
                    quantity: 2,
                    price: 24.99,
                    cashbackEligible: true
                },
                {
                    productId: 'product_2',
                    productName: 'Artisan Bread',
                    quantity: 1,
                    price: 8.50,
                    cashbackEligible: true
                }
            ]
        };
        const statuses = ['pending', 'approved', 'rejected', 'paid'];
        const priorities = ['normal', 'high', 'urgent'];
        for (let i = 0; i < 20; i++) {
            const customer = sampleCustomers[i % sampleCustomers.length];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
            const requestedAmount = Math.random() * 50 + 5;
            const cashbackRate = 5 + Math.random() * 5;
            const calculationBreakdown = sampleOrder.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                productPrice: item.price,
                cashbackRate,
                cashbackAmount: item.price * item.quantity * (cashbackRate / 100),
                categoryId: 'cat_food',
                categoryName: 'Food & Beverages'
            }));
            const requestData = {
                merchantId,
                customerId: customer.id,
                orderId: sampleOrder.id,
                customer,
                order: sampleOrder,
                requestedAmount,
                cashbackRate,
                calculationBreakdown,
                status: randomStatus,
                priority: randomPriority,
                timeline: [{
                        status: randomStatus,
                        timestamp: new Date(),
                        notes: 'Initial request created'
                    }]
            };
            const riskAssessment = this.assessRisk(requestData);
            const fullRequestData = {
                ...requestData,
                ...riskAssessment,
                timeline: [{
                        status: randomStatus,
                        timestamp: new Date(),
                        notes: 'Initial request created'
                    }]
            };
            await this.create(fullRequestData);
        }
    }
}
exports.CashbackModel = CashbackModel;

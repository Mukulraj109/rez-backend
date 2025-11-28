"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingSummary = exports.downloadInvoice = exports.getInvoice = exports.getBillingHistory = void 0;
const Subscription_1 = require("../models/Subscription");
const Payment_1 = require("../models/Payment");
const mongoose_1 = require("mongoose");
const pdfService_1 = require("../services/pdfService");
const User_1 = require("../models/User");
/**
 * Get billing history for a user
 * GET /api/billing/history
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - skip: number (for pagination, default: 0)
 * - limit: number (for pagination, default: 20)
 */
const getBillingHistory = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Parse query parameters
        const { startDate, endDate, skip = 0, limit = 20 } = req.query;
        // Build query filter
        const filter = {
            user: userId,
            status: { $ne: 'trial' } // Exclude trial periods from billing history
        };
        // Add date range filter if provided
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }
        // Get total count for pagination
        const total = await Subscription_1.Subscription.countDocuments(filter);
        // Get subscription billing records
        const subscriptions = await Subscription_1.Subscription.find(filter)
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .select('tier billingCycle price status createdAt startDate endDate razorpaySubscriptionId metadata')
            .lean();
        // Get related payment records
        const paymentFilter = {
            user: userId,
            status: 'completed',
            'metadata.type': 'subscription'
        };
        if (startDate || endDate) {
            paymentFilter.createdAt = {};
            if (startDate) {
                paymentFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                paymentFilter.createdAt.$lte = new Date(endDate);
            }
        }
        const payments = await Payment_1.Payment.find(paymentFilter)
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .select('paymentId amount status createdAt paymentMethod gatewayResponse metadata')
            .lean();
        // Combine and format billing history
        const billingHistory = [];
        // Add subscription records
        for (const sub of subscriptions) {
            const status = sub.status === 'active' || sub.status === 'expired' ? 'paid' :
                sub.status === 'payment_failed' ? 'failed' : 'pending';
            billingHistory.push({
                id: sub._id.toString(),
                date: sub.createdAt,
                amount: sub.price,
                status: status,
                billingCycle: sub.billingCycle,
                tier: sub.tier,
                type: 'subscription',
                invoiceUrl: sub.razorpaySubscriptionId
                    ? `/api/billing/invoice/${sub._id}`
                    : undefined,
                paymentMethod: 'Razorpay',
                description: `${sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} ${sub.billingCycle} subscription`
            });
        }
        // Add payment records
        for (const payment of payments) {
            billingHistory.push({
                id: payment.paymentId,
                date: payment.createdAt,
                amount: payment.amount,
                status: 'paid',
                billingCycle: payment.metadata?.billingCycle || 'monthly',
                tier: payment.metadata?.tier || 'premium',
                type: 'payment',
                invoiceUrl: `/api/billing/invoice/${payment.paymentId}`,
                paymentMethod: payment.paymentMethod?.toUpperCase() || 'UPI',
                transactionId: payment.gatewayResponse?.transactionId,
                description: payment.metadata?.description || 'Subscription payment'
            });
        }
        // Sort combined history by date
        billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Apply pagination to combined results
        const paginatedHistory = billingHistory.slice(Number(skip), Number(skip) + Number(limit));
        res.status(200).json({
            success: true,
            data: {
                history: paginatedHistory,
                pagination: {
                    total: billingHistory.length,
                    skip: Number(skip),
                    limit: Number(limit),
                    hasMore: Number(skip) + Number(limit) < billingHistory.length
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch billing history',
            error: error.message
        });
    }
};
exports.getBillingHistory = getBillingHistory;
/**
 * Get specific invoice details
 * GET /api/billing/invoice/:transactionId
 */
const getInvoice = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { transactionId } = req.params;
        // Check if it's a subscription ID (ObjectId) or payment ID
        let invoice = null;
        // Try to find as subscription first
        if (mongoose_1.Types.ObjectId.isValid(transactionId)) {
            const subscription = await Subscription_1.Subscription.findOne({
                _id: transactionId,
                user: userId
            }).lean();
            if (subscription) {
                invoice = {
                    id: subscription._id.toString(),
                    invoiceNumber: `SUB-${subscription._id.toString().slice(-8).toUpperCase()}`,
                    date: subscription.createdAt,
                    dueDate: subscription.startDate,
                    status: subscription.status === 'active' || subscription.status === 'expired' ? 'paid' :
                        subscription.status === 'payment_failed' ? 'failed' : 'pending',
                    // Customer details
                    customer: {
                        id: userId.toString(),
                        name: req.user?.profile?.firstName
                            ? `${req.user.profile.firstName} ${req.user.profile?.lastName || ''}`.trim()
                            : 'REZ User',
                        email: req.user?.email || '',
                        phone: req.user?.phoneNumber || ''
                    },
                    // Line items
                    items: [
                        {
                            description: `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Subscription`,
                            billingCycle: subscription.billingCycle,
                            quantity: 1,
                            unitPrice: subscription.price,
                            amount: subscription.price
                        }
                    ],
                    // Pricing breakdown
                    subtotal: subscription.price,
                    tax: 0,
                    discount: subscription.metadata?.promoCode ? subscription.price * 0.1 : 0, // Assume 10% promo discount
                    total: subscription.price,
                    // Payment details
                    paymentMethod: 'Razorpay',
                    paymentId: subscription.razorpaySubscriptionId,
                    transactionId: subscription.razorpaySubscriptionId,
                    // Period
                    billingPeriod: {
                        start: subscription.startDate,
                        end: subscription.endDate
                    },
                    // Additional info
                    notes: subscription.metadata?.promoCode
                        ? `Promo code applied: ${subscription.metadata.promoCode}`
                        : undefined
                };
            }
        }
        // Try to find as payment if not found as subscription
        if (!invoice) {
            const payment = await Payment_1.Payment.findOne({
                paymentId: transactionId,
                user: userId
            }).lean();
            if (payment) {
                invoice = {
                    id: payment.paymentId,
                    invoiceNumber: `PAY-${payment.paymentId.slice(-8).toUpperCase()}`,
                    date: payment.createdAt,
                    dueDate: payment.createdAt,
                    status: payment.status === 'completed' ? 'paid' : payment.status,
                    // Customer details
                    customer: {
                        id: userId.toString(),
                        name: payment.userDetails?.name || 'REZ User',
                        email: payment.userDetails?.email || '',
                        phone: payment.userDetails?.phone || ''
                    },
                    // Line items
                    items: [
                        {
                            description: payment.metadata?.description || 'Subscription Payment',
                            billingCycle: payment.metadata?.billingCycle || 'monthly',
                            quantity: 1,
                            unitPrice: payment.amount,
                            amount: payment.amount
                        }
                    ],
                    // Pricing breakdown
                    subtotal: payment.amount,
                    tax: 0,
                    discount: 0,
                    total: payment.amount,
                    // Payment details
                    paymentMethod: payment.paymentMethod?.toUpperCase() || 'UPI',
                    paymentId: payment.paymentId,
                    transactionId: payment.gatewayResponse?.transactionId || payment.paymentId,
                    // Additional info
                    notes: payment.metadata?.notes
                };
            }
        }
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }
        res.status(200).json({
            success: true,
            data: invoice
        });
    }
    catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice',
            error: error.message
        });
    }
};
exports.getInvoice = getInvoice;
/**
 * Download invoice as PDF
 * GET /api/billing/invoice/:transactionId/download
 */
const downloadInvoice = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { transactionId } = req.params;
        // Get invoice data
        const invoiceData = await getInvoiceData(transactionId, userId);
        if (!invoiceData) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }
        // Get user info for billing address
        const user = await User_1.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Prepare user info for PDF
        const userName = user.fullName ||
            (user.profile?.firstName ? `${user.profile.firstName} ${user.profile?.lastName || ''}`.trim() : 'N/A');
        const userAddress = user.profile?.location?.address ?
            `${user.profile.location.address}${user.profile.location.city ? ', ' + user.profile.location.city : ''}${user.profile.location.state ? ', ' + user.profile.location.state : ''}${user.profile.location.pincode ? ' ' + user.profile.location.pincode : ''}` :
            undefined;
        const userInfo = {
            name: userName,
            email: user.email || 'N/A',
            phone: user.phoneNumber || user.phone || undefined,
            address: userAddress
        };
        // Generate and stream PDF
        await pdfService_1.PDFService.generateInvoicePDF(res, invoiceData, userInfo);
    }
    catch (error) {
        console.error('Error downloading invoice:', error);
        // Only send JSON error if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to download invoice',
                error: error.message
            });
        }
    }
};
exports.downloadInvoice = downloadInvoice;
/**
 * Get billing statistics/summary
 * GET /api/billing/summary
 */
const getBillingSummary = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Get all subscriptions for the user
        const subscriptions = await Subscription_1.Subscription.find({
            user: userId
        }).sort({ createdAt: -1 });
        // Get all payments for the user
        const payments = await Payment_1.Payment.find({
            user: userId,
            status: 'completed',
            'metadata.type': 'subscription'
        });
        // Calculate totals
        const totalSpent = subscriptions.reduce((sum, sub) => {
            if (sub.status === 'active' || sub.status === 'expired') {
                return sum + sub.price;
            }
            return sum;
        }, 0) + payments.reduce((sum, pay) => sum + pay.amount, 0);
        const totalTransactions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'expired').length + payments.length;
        // Get current active subscription
        const currentSubscription = subscriptions.find(sub => sub.isActive && sub.isActive());
        // Calculate savings from current subscription
        const totalSavings = currentSubscription?.usage?.totalSavings || 0;
        res.status(200).json({
            success: true,
            data: {
                totalSpent,
                totalTransactions,
                totalSavings,
                netSavings: totalSavings - totalSpent,
                currentTier: currentSubscription?.tier || 'free',
                memberSince: subscriptions.length > 0
                    ? subscriptions[subscriptions.length - 1].createdAt
                    : null,
                lastPayment: subscriptions[0]?.createdAt || payments[0]?.createdAt || null
            }
        });
    }
    catch (error) {
        console.error('Error fetching billing summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch billing summary',
            error: error.message
        });
    }
};
exports.getBillingSummary = getBillingSummary;
// Helper function to get invoice data
async function getInvoiceData(transactionId, userId) {
    // Try subscription first
    if (mongoose_1.Types.ObjectId.isValid(transactionId)) {
        const subscription = await Subscription_1.Subscription.findOne({
            _id: transactionId,
            user: userId
        }).lean();
        if (subscription) {
            return subscription;
        }
    }
    // Try payment
    const payment = await Payment_1.Payment.findOne({
        paymentId: transactionId,
        user: userId
    }).lean();
    return payment;
}

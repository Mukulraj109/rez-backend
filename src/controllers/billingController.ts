import { Request, Response } from 'express';
import { Subscription, ISubscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { Types } from 'mongoose';

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
export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Parse query parameters
    const {
      startDate,
      endDate,
      skip = 0,
      limit = 20
    } = req.query;

    // Build query filter
    const filter: any = {
      user: userId,
      status: { $ne: 'trial' } // Exclude trial periods from billing history
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Get total count for pagination
    const total = await Subscription.countDocuments(filter);

    // Get subscription billing records
    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .select('tier billingCycle price status createdAt startDate endDate razorpaySubscriptionId metadata')
      .lean();

    // Get related payment records
    const paymentFilter: any = {
      user: userId,
      status: 'completed',
      'metadata.type': 'subscription'
    };

    if (startDate || endDate) {
      paymentFilter.createdAt = {};
      if (startDate) {
        paymentFilter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        paymentFilter.createdAt.$lte = new Date(endDate as string);
      }
    }

    const payments = await Payment.find(paymentFilter)
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
  } catch (error: any) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing history',
      error: error.message
    });
  }
};

/**
 * Get specific invoice details
 * GET /api/billing/invoice/:transactionId
 */
export const getInvoice = async (req: Request, res: Response) => {
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
    let invoice: any = null;

    // Try to find as subscription first
    if (Types.ObjectId.isValid(transactionId)) {
      const subscription = await Subscription.findOne({
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
      const payment = await Payment.findOne({
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
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

/**
 * Download invoice as PDF
 * GET /api/billing/invoice/:transactionId/download
 *
 * Note: This is a placeholder. In production, you would:
 * 1. Use a PDF generation library (pdfkit, puppeteer, etc.)
 * 2. Generate a proper invoice PDF with company branding
 * 3. Return the PDF as a downloadable file
 */
export const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { transactionId } = req.params;

    // For now, return the invoice data as JSON
    // In production, generate and return a PDF
    const invoiceResponse = await getInvoiceData(transactionId, userId);

    if (!invoiceResponse) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // TODO: Generate PDF using a library like pdfkit or puppeteer
    // For now, return JSON with a message
    res.status(200).json({
      success: true,
      message: 'PDF generation not yet implemented. Use the invoice data below.',
      data: invoiceResponse,
      note: 'In production, this endpoint will return a PDF file'
    });
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice',
      error: error.message
    });
  }
};

/**
 * Get billing statistics/summary
 * GET /api/billing/summary
 */
export const getBillingSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get all subscriptions for the user
    const subscriptions = await Subscription.find({
      user: userId
    }).sort({ createdAt: -1 });

    // Get all payments for the user
    const payments = await Payment.find({
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

    const totalTransactions = subscriptions.filter(
      sub => sub.status === 'active' || sub.status === 'expired'
    ).length + payments.length;

    // Get current active subscription
    const currentSubscription = subscriptions.find(sub =>
      sub.isActive && sub.isActive()
    );

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
  } catch (error: any) {
    console.error('Error fetching billing summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing summary',
      error: error.message
    });
  }
};

// Helper function to get invoice data
async function getInvoiceData(transactionId: string, userId: any) {
  // Try subscription first
  if (Types.ObjectId.isValid(transactionId)) {
    const subscription = await Subscription.findOne({
      _id: transactionId,
      user: userId
    }).lean();

    if (subscription) {
      return subscription;
    }
  }

  // Try payment
  const payment = await Payment.findOne({
    paymentId: transactionId,
    user: userId
  }).lean();

  return payment;
}

import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { MerchantModel } from '../models/Merchant';
import { CrossAppSyncService } from '../merchantservices/CrossAppSyncService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/merchant-profile/customer-view
// @desc    Get merchant profile formatted for customer app display
// @access  Private
router.get('/customer-view', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const merchant = await MerchantModel.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Format for customer app display
    const customerViewProfile = {
      // Basic Information
      merchantId: merchant.id,
      storeName: merchant.displayName || merchant.businessName || '',
      businessName: merchant.businessName || '',
      description: merchant.description || '',
      tagline: merchant.tagline || '',
      
      // Visual Assets
      logo: merchant.logo || '',
      coverImage: merchant.coverImage || '',
      galleryImages: merchant.galleryImages || [],
      brandColors: merchant.brandColors || {
        primary: '#007AFF',
        secondary: '#5AC8FA',
        accent: '#FF9500'
      },

      // Location & Contact (safe defaults)
      address: {
        street: merchant.address?.street || '',
        city: merchant.address?.city || '',
        state: merchant.address?.state || '',
        zipCode: merchant.address?.zipCode || '',
        country: merchant.address?.country || '',
        coordinates: merchant.address?.coordinates || []
      },
      contact: {
        phone: merchant.contact?.phone || '',
        email: merchant.contact?.email || '',
        website: merchant.contact?.website || ''
      },
      
      // Business Information
      categories: merchant.categories || [],
      tags: merchant.tags || [],
      businessHours: merchant.businessHours || {},
      timezone: merchant.timezone || 'UTC',
      
      // Services & Features
      deliveryOptions: merchant.deliveryOptions || [],
      paymentMethods: merchant.paymentMethods || [],
      serviceArea: merchant.serviceArea || '',
      features: merchant.features || [],
      
      // Customer-facing Policies
      policies: {
        returns: merchant.policies?.returns || '',
        shipping: merchant.policies?.shipping || '',
        privacy: merchant.policies?.privacy || '',
        terms: merchant.policies?.terms || ''
      },
      
      // Social Proof
      ratings: {
        average: merchant.ratings?.average || 0,
        count: merchant.ratings?.count || 0,
        breakdown: merchant.ratings?.breakdown || {}
      },
      reviewSummary: merchant.reviewSummary || {
        totalReviews: 0,
        averageRating: 0,
        recentReviews: []
      },
      
      // Social Media
      socialMedia: merchant.socialMedia || {},
      
      // Operational Status
      isActive: merchant.status === 'active',
      isOpen: isCurrentlyOpen(merchant.businessHours, merchant.timezone),
      isFeatured: merchant.isFeatured || false,
      isVerified: merchant.verification?.isVerified || false,
      
      // Performance Metrics (public)
      metrics: {
        totalOrders: merchant.metrics?.totalOrders || 0,
        totalCustomers: merchant.metrics?.totalCustomers || 0,
        averageRating: merchant.ratings?.average || 0,
        responseTime: merchant.metrics?.averageResponseTime || '< 1 hour',
        fulfillmentRate: merchant.metrics?.fulfillmentRate || 95
      },
      
      // Special Offers & Promotions
      promotions: merchant.activePromotions || [],
      announcements: merchant.announcements || [],
      
      // App-specific Data
      searchKeywords: merchant.searchKeywords || [],
      sortOrder: merchant.sortOrder || 0,
      lastActive: merchant.lastActiveAt || null,
      joinedDate: merchant.createdAt || null,
      
      // Customer App Features
      customerAppFeatures: {
        instantMessaging: merchant.features?.includes('instant_messaging') || false,
        videoConsultation: merchant.features?.includes('video_consultation') || false,
        appointmentBooking: merchant.features?.includes('appointment_booking') || false,
        subscriptionServices: merchant.features?.includes('subscriptions') || false,
        giftCards: merchant.features?.includes('gift_cards') || false,
        loyaltyProgram: merchant.features?.includes('loyalty_program') || false
      }
    };

    return res.json({
      success: true,
      data: customerViewProfile
    });

  } catch (error) {
    console.error('Error getting customer view profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get merchant profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// @route   PUT /api/merchant-profile/customer-settings
// @desc    Update customer-facing profile settings
// @access  Private
router.put('/customer-settings', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const {
      displayName,
      description,
      tagline,
      categories,
      tags,
      businessHours,
      deliveryOptions,
      serviceArea,
      features,
      socialMedia,
      brandColors,
      announcements,
      promotions
    } = req.body;

    const updates: any = {};
    
    // Only update provided fields
    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (tagline !== undefined) updates.tagline = tagline;
    if (categories !== undefined) updates.categories = categories;
    if (tags !== undefined) updates.tags = tags;
    if (businessHours !== undefined) updates.businessHours = businessHours;
    if (deliveryOptions !== undefined) updates.deliveryOptions = deliveryOptions;
    if (serviceArea !== undefined) updates.serviceArea = serviceArea;
    if (features !== undefined) updates.features = features;
    if (socialMedia !== undefined) updates.socialMedia = socialMedia;
    if (brandColors !== undefined) updates.brandColors = brandColors;
    if (announcements !== undefined) updates.announcements = announcements;
    if (promotions !== undefined) updates.activePromotions = promotions;

    const updatedMerchant = await MerchantModel.findByIdAndUpdate(merchantId, updates, { new: true });

    if (!updatedMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Trigger sync to customer app
    try {
      await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
        type: 'profile_updated',
        merchantId,
        updatedFields: Object.keys(updates),
        timestamp: new Date()
      });
    } catch (syncError) {
      console.error('Failed to sync merchant profile update:', syncError);
    }

    return res.json({
      success: true,
      data: updatedMerchant,
      message: 'Customer-facing profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant-profile/visibility
// @desc    Get merchant visibility settings for customer app
// @access  Private
router.get('/visibility', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const merchant = await MerchantModel.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const visibility = {
      isActive: merchant.status === 'active',
      isPubliclyVisible: merchant.isPubliclyVisible !== false,
      searchable: merchant.searchable !== false,
      acceptingOrders: merchant.acceptingOrders !== false,
      showInDirectory: merchant.showInDirectory !== false,
      featuredListing: merchant.isFeatured || false,
      showContact: merchant.showContact !== false,
      showRatings: merchant.showRatings !== false,
      showBusinessHours: merchant.showBusinessHours !== false,
      allowCustomerMessages: merchant.allowCustomerMessages !== false,
      showPromotions: merchant.showPromotions !== false
    };

    return res.json({
      success: true,
      data: visibility
    });

  } catch (error) {
    console.error('Error getting visibility settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get visibility settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/merchant-profile/visibility
// @desc    Update merchant visibility settings
// @access  Private
router.put('/visibility', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const visibilitySettings = req.body;

    const updates = {
      isPubliclyVisible: visibilitySettings.isPubliclyVisible,
      searchable: visibilitySettings.searchable,
      acceptingOrders: visibilitySettings.acceptingOrders,
      showInDirectory: visibilitySettings.showInDirectory,
      isFeatured: visibilitySettings.featuredListing,
      showContact: visibilitySettings.showContact,
      showRatings: visibilitySettings.showRatings,
      showBusinessHours: visibilitySettings.showBusinessHours,
      allowCustomerMessages: visibilitySettings.allowCustomerMessages,
      showPromotions: visibilitySettings.showPromotions
    };

    const updatedMerchant = await MerchantModel.findByIdAndUpdate(merchantId, updates, { new: true });

    if (!updatedMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Sync visibility changes to customer app
    try {
      await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
        type: 'visibility_updated',
        merchantId,
        visibilitySettings,
        timestamp: new Date()
      });
    } catch (syncError) {
      console.error('Failed to sync visibility update:', syncError);
    }

    return res.json({
      success: true,
      data: updates,
      message: 'Visibility settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating visibility settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update visibility settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/merchant-profile/sync-to-customer-app
// @desc    Manually sync merchant profile to customer app
// @access  Private
router.post('/sync-to-customer-app', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    
    // Trigger full merchant profile sync
    await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
      type: 'full_profile_sync',
      merchantId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Merchant profile sync triggered successfully'
    });

  } catch (error) {
    console.error('Error syncing merchant profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync merchant profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant-profile/customer-reviews
// @desc    Get reviews and ratings from customer app
// @access  Private
router.get('/customer-reviews', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const { page = '1', limit = '10', rating } = req.query;

    // In a real implementation, this would fetch from customer app database
    // For now, return mock data
    const mockReviews = {
      reviews: [
        {
          id: 'review_1',
          customerId: 'customer_1',
          customerName: 'John D.',
          rating: 5,
          comment: 'Excellent service and fast delivery!',
          orderId: 'order_123',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          verified: true,
          helpful: 12,
          response: {
            message: 'Thank you for your feedback!',
            respondedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        },
        {
          id: 'review_2',
          customerId: 'customer_2',
          customerName: 'Sarah M.',
          rating: 4,
          comment: 'Good quality products, could improve packaging.',
          orderId: 'order_124',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          verified: true,
          helpful: 8
        }
      ],
      summary: {
        totalReviews: 150,
        averageRating: 4.6,
        ratingBreakdown: {
          5: 95,
          4: 35,
          3: 15,
          2: 3,
          1: 2
        }
      },
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: 15,
        totalItems: 150,
        itemsPerPage: parseInt(limit as string)
      }
    };

    res.json({
      success: true,
      data: mockReviews
    });

  } catch (error) {
    console.error('Error getting customer reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer reviews',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to check if store is currently open
function isCurrentlyOpen(businessHours: any, timezone: string = 'UTC'): boolean {
  try {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: timezone 
    }).toLowerCase() as keyof typeof businessHours;
    
    const todayHours = businessHours[dayOfWeek];
    if (!todayHours || !todayHours.isOpen) {
      return false;
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone
    });

    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  } catch (error) {
    console.error('Error checking if store is open:', error);
    return false;
  }
}

export default router;
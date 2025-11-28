import { apiClient } from './index';
import { getApiUrl } from '../../config/api';

// ==================== TYPES ====================

export interface CustomerViewProfile {
    merchantId: string;
    storeName: string;
    businessName: string;
    description: string;
    tagline: string;
    logo: string;
    coverImage: string;
    galleryImages: string[];
    brandColors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        coordinates: number[];
    };
    contact: {
        phone: string;
        email: string;
        website: string;
    };
    categories: string[];
    tags: string[];
    businessHours: Record<string, { isOpen: boolean; open: string; close: string }>;
    timezone: string;
    deliveryOptions: string[];
    paymentMethods: string[];
    serviceArea: string;
    features: string[];
    policies: {
        returns: string;
        shipping: string;
        privacy: string;
        terms: string;
    };
    ratings: {
        average: number;
        count: number;
        breakdown: Record<number, number>;
    };
    reviewSummary: {
        totalReviews: number;
        averageRating: number;
        recentReviews: any[];
    };
    socialMedia: Record<string, string>;
    isActive: boolean;
    isOpen: boolean;
    isFeatured: boolean;
    isVerified: boolean;
    metrics: {
        totalOrders: number;
        totalCustomers: number;
        averageRating: number;
        responseTime: string;
        fulfillmentRate: number;
    };
    promotions: any[];
    announcements: any[];
    searchKeywords: string[];
    sortOrder: number;
    lastActive: Date | null;
    joinedDate: Date | null;
    customerAppFeatures: {
        instantMessaging: boolean;
        videoConsultation: boolean;
        appointmentBooking: boolean;
        subscriptionServices: boolean;
        giftCards: boolean;
        loyaltyProgram: boolean;
    };
}

export interface CustomerSettings {
    displayName?: string;
    description?: string;
    tagline?: string;
    categories?: string[];
    tags?: string[];
    businessHours?: Record<string, { isOpen: boolean; open: string; close: string }>;
    deliveryOptions?: string[];
    serviceArea?: string;
    features?: string[];
    socialMedia?: Record<string, string>;
    brandColors?: {
        primary: string;
        secondary: string;
        accent: string;
    };
    announcements?: any[];
    promotions?: any[];
}

export interface VisibilitySettings {
    isPubliclyVisible?: boolean;
    searchable?: boolean;
    acceptingOrders?: boolean;
    showInDirectory?: boolean;
    featuredListing?: boolean;
    showContact?: boolean;
    showRatings?: boolean;
    showBusinessHours?: boolean;
    allowCustomerMessages?: boolean;
    showPromotions?: boolean;
}

export interface CustomerReview {
    id: string;
    customerId: string;
    customerName: string;
    customerAvatar?: string;
    rating: number;
    title: string;
    comment: string;
    images: string[];
    createdAt: Date;
    verified: boolean;
    helpful: number;
}

export interface ReviewSummary {
    totalReviews: number;
    averageRating: number;
    ratingBreakdown: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

export interface CustomerReviewsResponse {
    reviews: CustomerReview[];
    summary: ReviewSummary;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

// ==================== SERVICE ====================

class ProfileService {
    /**
     * Get merchant profile formatted for customer app display
     */
    async getCustomerViewProfile(): Promise<CustomerViewProfile> {
        try {
            const response = await apiClient.get<CustomerViewProfile>('/merchant/profile/customer-view');

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get customer view profile');
            }
        } catch (error: any) {
            console.error('Get customer view profile error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get customer view profile');
        }
    }

    /**
     * Update customer-facing profile settings
     * @param settings - Customer settings to update
     */
    async updateCustomerSettings(settings: CustomerSettings): Promise<CustomerViewProfile> {
        try {
            const response = await apiClient.put<CustomerViewProfile>('/merchant/profile/customer-settings', settings);

            if (response.success && response.data) {
                console.log('✅ Customer settings updated successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to update customer settings');
            }
        } catch (error: any) {
            console.error('Update customer settings error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to update customer settings');
        }
    }

    /**
     * Get merchant visibility settings for customer app
     */
    async getVisibilitySettings(): Promise<VisibilitySettings> {
        try {
            const response = await apiClient.get<VisibilitySettings>('/merchant/profile/visibility');

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get visibility settings');
            }
        } catch (error: any) {
            console.error('Get visibility settings error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get visibility settings');
        }
    }

    /**
     * Update merchant visibility settings
     * @param settings - Visibility settings to update
     */
    async updateVisibilitySettings(settings: VisibilitySettings): Promise<VisibilitySettings> {
        try {
            const response = await apiClient.put<VisibilitySettings>('/merchant/profile/visibility', settings);

            if (response.success && response.data) {
                console.log('✅ Visibility settings updated successfully');
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to update visibility settings');
            }
        } catch (error: any) {
            console.error('Update visibility settings error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to update visibility settings');
        }
    }

    /**
     * Manually trigger sync of merchant profile to customer app
     */
    async syncToCustomerApp(): Promise<void> {
        try {
            const response = await apiClient.post('/merchant/profile/sync-to-customer-app', {});

            if (response.success) {
                console.log('✅ Merchant profile sync triggered successfully');
            } else {
                throw new Error(response.message || 'Failed to sync merchant profile');
            }
        } catch (error: any) {
            console.error('Sync to customer app error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to sync merchant profile');
        }
    }

    /**
     * Get customer reviews from customer app
     * @param params - Pagination and filter parameters
     */
    async getCustomerReviews(params?: {
        page?: number;
        limit?: number;
        rating?: number;
    }): Promise<CustomerReviewsResponse> {
        try {
            const queryParams = new URLSearchParams();

            if (params) {
                if (params.page) queryParams.append('page', params.page.toString());
                if (params.limit) queryParams.append('limit', params.limit.toString());
                if (params.rating) queryParams.append('rating', params.rating.toString());
            }

            const url = queryParams.toString()
                ? `/merchant/profile/customer-reviews?${queryParams}`
                : '/merchant/profile/customer-reviews';

            const response = await apiClient.get<CustomerReviewsResponse>(url);

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get customer reviews');
            }
        } catch (error: any) {
            console.error('Get customer reviews error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get customer reviews');
        }
    }

    /**
     * Format business hours for display
     */
    formatBusinessHours(businessHours: Record<string, { isOpen: boolean; open: string; close: string }>): string {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const openDays = days.filter(day => businessHours[day]?.isOpen);

        if (openDays.length === 0) {
            return 'Closed';
        }

        if (openDays.length === 7) {
            const hours = businessHours[openDays[0]];
            return `Open daily ${hours.open} - ${hours.close}`;
        }

        return `Open ${openDays.length} days/week`;
    }

    /**
     * Get visibility status badge color
     */
    getVisibilityStatusColor(settings: VisibilitySettings): string {
        if (!settings.isPubliclyVisible) {
            return '#ef4444'; // Red - not visible
        } else if (!settings.acceptingOrders) {
            return '#f59e0b'; // Amber - visible but not accepting orders
        } else {
            return '#10b981'; // Green - fully visible and accepting orders
        }
    }

    /**
     * Get visibility status label
     */
    getVisibilityStatusLabel(settings: VisibilitySettings): string {
        if (!settings.isPubliclyVisible) {
            return 'Hidden from customers';
        } else if (!settings.acceptingOrders) {
            return 'Visible but not accepting orders';
        } else {
            return 'Visible and accepting orders';
        }
    }

    /**
     * Validate customer settings before submission
     */
    validateCustomerSettings(settings: CustomerSettings): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (settings.displayName && settings.displayName.length < 2) {
            errors.push('Display name must be at least 2 characters');
        }

        if (settings.description && settings.description.length < 10) {
            errors.push('Description must be at least 10 characters');
        }

        if (settings.brandColors) {
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (settings.brandColors.primary && !hexColorRegex.test(settings.brandColors.primary)) {
                errors.push('Primary color must be a valid hex color');
            }
            if (settings.brandColors.secondary && !hexColorRegex.test(settings.brandColors.secondary)) {
                errors.push('Secondary color must be a valid hex color');
            }
            if (settings.brandColors.accent && !hexColorRegex.test(settings.brandColors.accent)) {
                errors.push('Accent color must be a valid hex color');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Format rating for display
     */
    formatRating(rating: number): string {
        return rating.toFixed(1);
    }

    /**
     * Get rating color
     */
    getRatingColor(rating: number): string {
        if (rating >= 4.5) return '#10b981'; // Green
        if (rating >= 3.5) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    }
}

// Create and export singleton instance
export const profileService = new ProfileService();
export default profileService;

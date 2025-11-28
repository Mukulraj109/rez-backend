import { apiClient } from './index';
import { buildApiUrl } from '../../config/api';

// ==================== TYPES ====================

export interface ProductReview {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    title: string;
    comment: string;
    images: string[];
    verified: boolean;
    helpful: number;
    createdAt: Date;
    updatedAt: Date;
    moderationStatus?: 'pending' | 'approved' | 'rejected';
    moderatedBy?: string;
    moderatedAt?: Date;
    moderationReason?: string;
    merchantResponse?: {
        message: string;
        respondedAt: Date;
        respondedBy: string;
    };
    flagged: boolean;
    flagReason?: string;
}

export interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    ratingBreakdown: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
    percentageRecommended: number;
    verifiedPurchases: number;
    withImages: number;
    withMerchantResponse: number;
}

export interface ProductReviewsResponse {
    reviews: ProductReview[];
    stats: ReviewStats;
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

export interface ReviewResponse {
    reviewId: string;
    productId: string;
    message: string;
    respondedAt: Date;
    respondedBy: string;
}

export interface FlagReviewRequest {
    reason: 'inappropriate' | 'spam' | 'fake' | 'offensive' | 'other';
    details?: string;
}

// ==================== SERVICE ====================

class ReviewsService {
    /**
     * Get all reviews for a specific store
     * @param storeId - Store ID
     * @param params - Pagination and filter parameters
     */
    async getStoreReviews(
        storeId: string,
        params?: {
            page?: number;
            limit?: number;
            rating?: number;
            filter?: 'all' | 'with_images' | 'verified' | '5' | '4' | '3' | '2' | '1';
            sort?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
            moderationStatus?: 'pending' | 'approved' | 'rejected';
        }
    ): Promise<ProductReviewsResponse> {
        try {
            const queryParams = new URLSearchParams();

            if (params) {
                if (params.page) queryParams.append('page', params.page.toString());
                if (params.limit) queryParams.append('limit', params.limit.toString());
                if (params.rating) queryParams.append('rating', params.rating.toString());
                if (params.filter && params.filter !== 'all') {
                    queryParams.append('filter', params.filter);
                }
                if (params.sort) {
                    queryParams.append('sort', params.sort);
                }
                if (params.moderationStatus) {
                    queryParams.append('moderationStatus', params.moderationStatus);
                }
            }

            const url = queryParams.toString()
                ? `/merchant/stores/${storeId}/reviews?${queryParams}`
                : `/merchant/stores/${storeId}/reviews`;

            const response = await apiClient.get<ProductReviewsResponse>(url);

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get store reviews');
            }
        } catch (error: any) {
            console.error('Get store reviews error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get store reviews');
        }
    }

    /**
     * Get all reviews for a specific product
     * @param productId - Product ID
     * @param params - Pagination and filter parameters
     */
    async getProductReviews(
        productId: string,
        params?: {
            page?: number;
            limit?: number;
            filter?: 'all' | 'with_images' | 'verified' | '5' | '4' | '3' | '2' | '1';
        }
    ): Promise<ProductReviewsResponse> {
        try {
            const queryParams = new URLSearchParams();

            if (params) {
                if (params.page) queryParams.append('page', params.page.toString());
                if (params.limit) queryParams.append('limit', params.limit.toString());
                if (params.filter && params.filter !== 'all') {
                    queryParams.append('filter', params.filter);
                }
            }

            const url = queryParams.toString()
                ? `/merchant/products/${productId}/reviews?${queryParams}`
                : `/merchant/products/${productId}/reviews`;

            const response = await apiClient.get<ProductReviewsResponse>(url);

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get product reviews');
            }
        } catch (error: any) {
            console.error('Get product reviews error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get product reviews');
        }
    }

    /**
     * Respond to a customer review
     * @param productId - Product ID
     * @param reviewId - Review ID
     * @param response - Response message
     */
    async respondToReview(
        productId: string,
        reviewId: string,
        response: string
    ): Promise<ReviewResponse> {
        try {
            if (!response || response.trim().length < 10) {
                throw new Error('Response must be at least 10 characters');
            }

            const apiResponse = await apiClient.post<ReviewResponse>(
                `/merchant/products/${productId}/reviews/${reviewId}/response`,
                { response: response.trim() }
            );

            if (apiResponse.success && apiResponse.data) {
                console.log('✅ Review response posted successfully');
                return apiResponse.data;
            } else {
                throw new Error(apiResponse.message || 'Failed to respond to review');
            }
        } catch (error: any) {
            console.error('Respond to review error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to respond to review');
        }
    }

    /**
     * Flag an inappropriate review
     * @param productId - Product ID
     * @param reviewId - Review ID
     * @param data - Flag reason and details
     */
    async flagReview(
        productId: string,
        reviewId: string,
        data: FlagReviewRequest
    ): Promise<void> {
        try {
            const response = await apiClient.put(
                `/merchant/products/${productId}/reviews/${reviewId}/flag`,
                data
            );

            if (response.success) {
                console.log('✅ Review flagged successfully');
            } else {
                throw new Error(response.message || 'Failed to flag review');
            }
        } catch (error: any) {
            console.error('Flag review error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to flag review');
        }
    }

    /**
     * Get review statistics for a product
     * @param productId - Product ID
     */
    async getReviewStats(productId: string): Promise<ReviewStats> {
        try {
            const response = await apiClient.get<ReviewStats>(
                `/merchant/products/${productId}/reviews/stats`
            );

            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get review stats');
            }
        } catch (error: any) {
            console.error('Get review stats error:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to get review stats');
        }
    }

    /**
     * Format rating for display
     */
    formatRating(rating: number): string {
        return rating.toFixed(1);
    }

    /**
     * Get rating color based on value
     */
    getRatingColor(rating: number): string {
        if (rating >= 4.5) return '#10b981'; // Green
        if (rating >= 3.5) return '#f59e0b'; // Amber
        if (rating >= 2.5) return '#f97316'; // Orange
        return '#ef4444'; // Red
    }

    /**
     * Get rating stars as array for UI rendering
     */
    getRatingStars(rating: number): { full: number; half: boolean; empty: number } {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return {
            full: fullStars,
            half: hasHalfStar,
            empty: emptyStars
        };
    }

    /**
     * Format review date for display
     */
    formatReviewDate(date: Date): string {
        const reviewDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - reviewDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            return reviewDate.toLocaleDateString();
        }
    }

    /**
     * Calculate review sentiment
     */
    getReviewSentiment(rating: number): 'positive' | 'neutral' | 'negative' {
        if (rating >= 4) return 'positive';
        if (rating >= 3) return 'neutral';
        return 'negative';
    }

    /**
     * Get sentiment color
     */
    getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
        const colors = {
            positive: '#10b981',
            neutral: '#f59e0b',
            negative: '#ef4444'
        };
        return colors[sentiment];
    }

    /**
     * Validate review response before submission
     */
    validateResponse(response: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!response || response.trim().length === 0) {
            errors.push('Response cannot be empty');
        } else if (response.trim().length < 10) {
            errors.push('Response must be at least 10 characters');
        } else if (response.trim().length > 1000) {
            errors.push('Response must be less than 1000 characters');
        }

        // Check for inappropriate content (basic check)
        const inappropriateWords = ['spam', 'scam', 'fake'];
        const lowerResponse = response.toLowerCase();
        inappropriateWords.forEach(word => {
            if (lowerResponse.includes(word)) {
                errors.push(`Response may contain inappropriate content: "${word}"`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get review statistics summary text
     */
    getStatsSummary(stats: ReviewStats): string {
        if (stats.totalReviews === 0) {
            return 'No reviews yet';
        }

        const avgRating = stats.averageRating.toFixed(1);
        const totalReviews = stats.totalReviews;

        return `${avgRating} out of 5 stars (${totalReviews} review${totalReviews > 1 ? 's' : ''})`;
    }

    /**
     * Calculate percentage for rating breakdown
     */
    getRatingPercentage(count: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((count / total) * 100);
    }

    /**
     * Approve a review for a store
     * @param storeId - Store ID
     * @param reviewId - Review ID
     */
    async approveReview(storeId: string, reviewId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await apiClient.post(
                `/merchant/stores/${storeId}/reviews/${reviewId}/approve`,
                {}
            );
            return { success: true, message: response.message || 'Review approved successfully' };
        } catch (error: any) {
            console.error('Error approving review:', error);
            throw new Error(error.message || 'Failed to approve review');
        }
    }

    /**
     * Reject a review for a store
     * @param storeId - Store ID
     * @param reviewId - Review ID
     * @param reason - Optional rejection reason
     */
    async rejectReview(storeId: string, reviewId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await apiClient.post(
                `/merchant/stores/${storeId}/reviews/${reviewId}/reject`,
                { reason }
            );
            return { success: true, message: response.message || 'Review rejected successfully' };
        } catch (error: any) {
            console.error('Error rejecting review:', error);
            throw new Error(error.message || 'Failed to reject review');
        }
    }
}

// Create and export singleton instance
export const reviewsService = new ReviewsService();
export default reviewsService;

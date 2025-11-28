/**
 * Integration service to trigger gamification features from existing app actions
 */
declare class GamificationIntegrationService {
    /**
     * Call this after order is placed
     */
    onOrderPlaced(userId: string, orderData: any): Promise<void>;
    /**
     * Call this after order is delivered
     */
    onOrderDelivered(userId: string, orderData: any): Promise<void>;
    /**
     * Call this after review is submitted
     */
    onReviewSubmitted(userId: string, reviewData: any): Promise<void>;
    /**
     * Call this when review gets a helpful vote
     */
    onReviewHelpfulVote(userId: string, reviewId: string): Promise<void>;
    /**
     * Call this after referral is completed (friend makes first order)
     */
    onReferralCompleted(userId: string, referralData: any): Promise<void>;
    /**
     * Call this after bill is uploaded
     */
    onBillUploaded(userId: string, billData: any): Promise<void>;
    /**
     * Call this on user login
     */
    onUserLogin(userId: string): Promise<void>;
    /**
     * Call this when item is added to wishlist
     */
    onWishlistAdded(userId: string, itemData: any): Promise<void>;
    /**
     * Call this when challenge is completed
     */
    onChallengeCompleted(userId: string, challengeId: string): Promise<void>;
    /**
     * Call this when user wins a game
     */
    onGameWon(userId: string, gameType: string, prize: any): Promise<void>;
    /**
     * Call this when user answers quiz correctly
     */
    onQuizCorrectAnswer(userId: string, score: number): Promise<void>;
    /**
     * Call this when user uses an exclusive deal
     */
    onDealUsed(userId: string, dealData: any): Promise<void>;
    /**
     * Call this when user shares a deal
     */
    onDealShared(userId: string, dealId: string): Promise<void>;
    /**
     * Call this when user explores a category
     */
    onCategoryExplored(userId: string, category: string): Promise<void>;
    /**
     * Call this when user visits a store page
     */
    onStoreVisited(userId: string, storeId: string): Promise<void>;
    /**
     * Call this when user adds a favorite
     */
    onFavoriteAdded(userId: string, itemData: any): Promise<void>;
    /**
     * Call this when new user registers
     */
    onUserRegistered(userId: string): Promise<void>;
}
declare const _default: GamificationIntegrationService;
export default _default;

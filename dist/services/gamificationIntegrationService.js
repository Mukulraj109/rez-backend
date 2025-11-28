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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const challengeService_1 = __importDefault(require("./challengeService"));
const achievementService_1 = __importDefault(require("./achievementService"));
const streakService_1 = __importDefault(require("./streakService"));
const gameService_1 = __importDefault(require("./gameService"));
/**
 * Integration service to trigger gamification features from existing app actions
 */
class GamificationIntegrationService {
    // ======== ORDER INTEGRATION ========
    /**
     * Call this after order is placed
     */
    async onOrderPlaced(userId, orderData) {
        try {
            // Update challenges
            await challengeService_1.default.updateProgress(userId, 'order_count', 1, {
                orderId: orderData.id,
                storeId: orderData.store,
                category: orderData.category,
                amount: orderData.totalPrice
            });
            await challengeService_1.default.updateProgress(userId, 'spend_amount', orderData.totalPrice, {
                orderId: orderData.id,
                amount: orderData.totalPrice
            });
            // Update achievements
            await achievementService_1.default.checkAndAwardAchievements(userId, 'order_placed', {
                orderId: orderData.id
            });
            await achievementService_1.default.checkAndAwardAchievements(userId, 'amount_spent', {
                amount: orderData.totalPrice
            });
            // Check if store is new for user
            const { Order } = await Promise.resolve().then(() => __importStar(require('../models/Order')));
            const previousOrders = await Order.countDocuments({
                user: userId,
                store: orderData.store,
                _id: { $ne: orderData.id }
            });
            if (previousOrders === 0) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'store_visited', {
                    storeId: orderData.store
                });
            }
            // Update order streak
            await streakService_1.default.updateStreak(userId, 'order');
            // Check for special achievements
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 6) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'late_order');
            }
            const day = new Date().getDay();
            if (day === 0 || day === 6) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'weekend_order');
            }
            console.log(`✅ Gamification updated for order ${orderData.id}`);
        }
        catch (error) {
            console.error('Error in onOrderPlaced gamification:', error);
        }
    }
    /**
     * Call this after order is delivered
     */
    async onOrderDelivered(userId, orderData) {
        try {
            // Award scratch card for orders above certain amount
            if (orderData.totalPrice >= 500) {
                await gameService_1.default.createScratchCardSession(userId, `order_${orderData.id}`);
            }
            console.log(`✅ Gamification updated for delivered order ${orderData.id}`);
        }
        catch (error) {
            console.error('Error in onOrderDelivered gamification:', error);
        }
    }
    // ======== REVIEW INTEGRATION ========
    /**
     * Call this after review is submitted
     */
    async onReviewSubmitted(userId, reviewData) {
        try {
            // Update challenges
            await challengeService_1.default.updateProgress(userId, 'review_count', 1, {
                reviewId: reviewData.id
            });
            // Update achievements
            await achievementService_1.default.checkAndAwardAchievements(userId, 'review_written', {
                reviewId: reviewData.id
            });
            // Update review streak
            await streakService_1.default.updateStreak(userId, 'review');
            // Check if review has photos
            if (reviewData.photos && reviewData.photos.length > 0) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'photo_uploaded', { count: reviewData.photos.length });
            }
            console.log(`✅ Gamification updated for review ${reviewData.id}`);
        }
        catch (error) {
            console.error('Error in onReviewSubmitted gamification:', error);
        }
    }
    /**
     * Call this when review gets a helpful vote
     */
    async onReviewHelpfulVote(userId, reviewId) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'helpful_vote', {
                reviewId
            });
            console.log(`✅ Gamification updated for helpful vote on review ${reviewId}`);
        }
        catch (error) {
            console.error('Error in onReviewHelpfulVote gamification:', error);
        }
    }
    // ======== REFERRAL INTEGRATION ========
    /**
     * Call this after referral is completed (friend makes first order)
     */
    async onReferralCompleted(userId, referralData) {
        try {
            // Update challenges
            await challengeService_1.default.updateProgress(userId, 'refer_friends', 1, {
                referralId: referralData.id
            });
            // Update achievements
            await achievementService_1.default.checkAndAwardAchievements(userId, 'referral_completed', {
                referralId: referralData.id
            });
            console.log(`✅ Gamification updated for referral ${referralData.id}`);
        }
        catch (error) {
            console.error('Error in onReferralCompleted gamification:', error);
        }
    }
    // ======== BILL UPLOAD INTEGRATION ========
    /**
     * Call this after bill is uploaded
     */
    async onBillUploaded(userId, billData) {
        try {
            // Update challenges
            await challengeService_1.default.updateProgress(userId, 'upload_bills', 1, {
                billId: billData.id
            });
            // Update achievements
            await achievementService_1.default.checkAndAwardAchievements(userId, 'bill_uploaded', {
                billId: billData.id
            });
            console.log(`✅ Gamification updated for bill upload ${billData.id}`);
        }
        catch (error) {
            console.error('Error in onBillUploaded gamification:', error);
        }
    }
    // ======== LOGIN INTEGRATION ========
    /**
     * Call this on user login
     */
    async onUserLogin(userId) {
        try {
            // Update login streak
            const result = await streakService_1.default.updateStreak(userId, 'login');
            // Check for early bird achievement
            const hour = new Date().getHours();
            if (hour < 8) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'early_login');
            }
            // Update login streak challenges
            await challengeService_1.default.updateProgress(userId, 'login_streak', 1);
            // Check achievements based on streak
            if (result.streak.currentStreak === 7) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'login_streak');
            }
            console.log(`✅ Gamification updated for user login ${userId}`);
        }
        catch (error) {
            console.error('Error in onUserLogin gamification:', error);
        }
    }
    // ======== WISHLIST INTEGRATION ========
    /**
     * Call this when item is added to wishlist
     */
    async onWishlistAdded(userId, itemData) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'wishlist_added', {
                itemId: itemData.id
            });
            console.log(`✅ Gamification updated for wishlist add ${itemData.id}`);
        }
        catch (error) {
            console.error('Error in onWishlistAdded gamification:', error);
        }
    }
    // ======== CHALLENGE INTEGRATION ========
    /**
     * Call this when challenge is completed
     */
    async onChallengeCompleted(userId, challengeId) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'challenge_completed', {
                challengeId
            });
            console.log(`✅ Achievement updated for challenge completion ${challengeId}`);
        }
        catch (error) {
            console.error('Error in onChallengeCompleted gamification:', error);
        }
    }
    // ======== GAME INTEGRATION ========
    /**
     * Call this when user wins a game
     */
    async onGameWon(userId, gameType, prize) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'game_won', {
                gameType,
                prize
            });
            // Check for jackpot
            if (prize.value >= 1000 && prize.type === 'coins') {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'jackpot');
            }
            console.log(`✅ Achievement updated for game win ${gameType}`);
        }
        catch (error) {
            console.error('Error in onGameWon gamification:', error);
        }
    }
    /**
     * Call this when user answers quiz correctly
     */
    async onQuizCorrectAnswer(userId, score) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'quiz_correct');
            if (score === 100) {
                await achievementService_1.default.checkAndAwardAchievements(userId, 'perfect_score');
            }
            console.log(`✅ Achievement updated for quiz score ${score}`);
        }
        catch (error) {
            console.error('Error in onQuizCorrectAnswer gamification:', error);
        }
    }
    // ======== DEAL/OFFER INTEGRATION ========
    /**
     * Call this when user uses an exclusive deal
     */
    async onDealUsed(userId, dealData) {
        try {
            await achievementService_1.default.checkAndAwardAchievements(userId, 'deal_used', {
                dealId: dealData.id
            });
            console.log(`✅ Achievement updated for deal use ${dealData.id}`);
        }
        catch (error) {
            console.error('Error in onDealUsed gamification:', error);
        }
    }
    // ======== SHARE INTEGRATION ========
    /**
     * Call this when user shares a deal
     */
    async onDealShared(userId, dealId) {
        try {
            await challengeService_1.default.updateProgress(userId, 'share_deals', 1, {
                dealId
            });
            console.log(`✅ Challenge updated for deal share ${dealId}`);
        }
        catch (error) {
            console.error('Error in onDealShared gamification:', error);
        }
    }
    // ======== CATEGORY EXPLORATION ========
    /**
     * Call this when user explores a category
     */
    async onCategoryExplored(userId, category) {
        try {
            await challengeService_1.default.updateProgress(userId, 'explore_categories', 1, {
                category
            });
            console.log(`✅ Challenge updated for category exploration ${category}`);
        }
        catch (error) {
            console.error('Error in onCategoryExplored gamification:', error);
        }
    }
    // ======== STORE VISIT INTEGRATION ========
    /**
     * Call this when user visits a store page
     */
    async onStoreVisited(userId, storeId) {
        try {
            await challengeService_1.default.updateProgress(userId, 'visit_stores', 1, {
                storeId
            });
            console.log(`✅ Challenge updated for store visit ${storeId}`);
        }
        catch (error) {
            console.error('Error in onStoreVisited gamification:', error);
        }
    }
    // ======== FAVORITES INTEGRATION ========
    /**
     * Call this when user adds a favorite
     */
    async onFavoriteAdded(userId, itemData) {
        try {
            await challengeService_1.default.updateProgress(userId, 'add_favorites', 1, {
                itemId: itemData.id
            });
            console.log(`✅ Challenge updated for favorite add ${itemData.id}`);
        }
        catch (error) {
            console.error('Error in onFavoriteAdded gamification:', error);
        }
    }
    // ======== NEW USER INTEGRATION ========
    /**
     * Call this when new user registers
     */
    async onUserRegistered(userId) {
        try {
            // Initialize achievements
            await achievementService_1.default.initializeUserAchievements(userId);
            // Check for early adopter
            // TODO: Implement checkSpecialAchievements method in achievementService
            // await achievementService.checkSpecialAchievements(userId);
            console.log(`✅ Gamification initialized for new user ${userId}`);
        }
        catch (error) {
            console.error('Error in onUserRegistered gamification:', error);
        }
    }
}
exports.default = new GamificationIntegrationService();

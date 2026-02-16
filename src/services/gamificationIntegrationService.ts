import challengeService from './challengeService';
import achievementService from './achievementService';
import streakService from './streakService';
import gameService from './gameService';

/**
 * Integration service to trigger gamification features from existing app actions
 */
class GamificationIntegrationService {
  // ======== ORDER INTEGRATION ========

  /**
   * Call this after order is placed
   */
  async onOrderPlaced(userId: string, orderData: any): Promise<void> {
    try {
      // Update challenges
      await challengeService.updateProgress(userId, 'order_count', 1, {
        orderId: orderData.id,
        storeId: orderData.store,
        category: orderData.category,
        amount: orderData.totalPrice
      });

      await challengeService.updateProgress(userId, 'spend_amount', orderData.totalPrice, {
        orderId: orderData.id,
        amount: orderData.totalPrice
      });

      // Update achievements
      await achievementService.checkAndAwardAchievements(userId, 'order_placed', {
        orderId: orderData.id
      });

      await achievementService.checkAndAwardAchievements(userId, 'amount_spent', {
        amount: orderData.totalPrice
      });

      // Check if store is new for user
      const { Order } = await import('../models/Order');
      const previousOrders = await Order.countDocuments({
        user: userId,
        store: orderData.store,
        _id: { $ne: orderData.id }
      });

      if (previousOrders === 0) {
        await achievementService.checkAndAwardAchievements(userId, 'store_visited', {
          storeId: orderData.store
        });
      }

      // Update order streak
      await streakService.updateStreak(userId, 'order');

      // Check for special achievements
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 6) {
        await achievementService.checkAndAwardAchievements(userId, 'late_order');
      }

      const day = new Date().getDay();
      if (day === 0 || day === 6) {
        await achievementService.checkAndAwardAchievements(userId, 'weekend_order');
      }

      console.log(`✅ Gamification updated for order ${orderData.id}`);
    } catch (error) {
      console.error('Error in onOrderPlaced gamification:', error);
    }
  }

  /**
   * Call this after order is delivered
   */
  async onOrderDelivered(userId: string, orderData: any): Promise<void> {
    try {
      // Award scratch card for orders above certain amount
      if (orderData.totalPrice >= 500) {
        await gameService.createScratchCardSession(
          userId,
          `order_${orderData.id}`
        );
      }

      console.log(`✅ Gamification updated for delivered order ${orderData.id}`);
    } catch (error) {
      console.error('Error in onOrderDelivered gamification:', error);
    }
  }

  // ======== REVIEW INTEGRATION ========

  /**
   * Call this after review is submitted
   */
  async onReviewSubmitted(userId: string, reviewData: any): Promise<void> {
    try {
      // Update challenges
      await challengeService.updateProgress(userId, 'review_count', 1, {
        reviewId: reviewData.id
      });

      // Update achievements
      await achievementService.checkAndAwardAchievements(userId, 'review_written', {
        reviewId: reviewData.id
      });

      // Update review streak
      await streakService.updateStreak(userId, 'review');

      // Check if review has photos
      if (reviewData.photos && reviewData.photos.length > 0) {
        await achievementService.checkAndAwardAchievements(
          userId,
          'photo_uploaded',
          { count: reviewData.photos.length }
        );
      }

      console.log(`✅ Gamification updated for review ${reviewData.id}`);
    } catch (error) {
      console.error('Error in onReviewSubmitted gamification:', error);
    }
  }

  /**
   * Call this when review gets a helpful vote
   */
  async onReviewHelpfulVote(userId: string, reviewId: string): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'helpful_vote', {
        reviewId
      });

      console.log(`✅ Gamification updated for helpful vote on review ${reviewId}`);
    } catch (error) {
      console.error('Error in onReviewHelpfulVote gamification:', error);
    }
  }

  // ======== REFERRAL INTEGRATION ========

  /**
   * Call this after referral is completed (friend makes first order)
   */
  async onReferralCompleted(userId: string, referralData: any): Promise<void> {
    try {
      // Update challenges
      await challengeService.updateProgress(userId, 'refer_friends', 1, {
        referralId: referralData.id
      });

      // Update achievements
      await achievementService.checkAndAwardAchievements(userId, 'referral_completed', {
        referralId: referralData.id
      });

      console.log(`✅ Gamification updated for referral ${referralData.id}`);
    } catch (error) {
      console.error('Error in onReferralCompleted gamification:', error);
    }
  }

  // ======== BILL UPLOAD INTEGRATION ========

  /**
   * Call this after bill is uploaded
   */
  async onBillUploaded(userId: string, billData: any): Promise<void> {
    try {
      // Update challenges
      await challengeService.updateProgress(userId, 'upload_bills', 1, {
        billId: billData.id
      });

      // Update achievements
      await achievementService.checkAndAwardAchievements(userId, 'bill_uploaded', {
        billId: billData.id
      });

      console.log(`✅ Gamification updated for bill upload ${billData.id}`);
    } catch (error) {
      console.error('Error in onBillUploaded gamification:', error);
    }
  }

  // ======== LOGIN INTEGRATION ========

  /**
   * Call this on user login
   */
  async onUserLogin(userId: string): Promise<void> {
    try {
      // Update login streak
      const result = await streakService.updateStreak(userId, 'login');

      // Check for early bird achievement
      const hour = new Date().getHours();
      if (hour < 8) {
        await achievementService.checkAndAwardAchievements(userId, 'early_login');
      }

      // Update login streak challenges
      await challengeService.updateProgress(userId, 'login_streak', 1);

      // Check achievements based on streak
      if (result.streak.currentStreak === 7) {
        await achievementService.checkAndAwardAchievements(userId, 'login_streak');
      }

      console.log(`✅ Gamification updated for user login ${userId}`);
    } catch (error) {
      console.error('Error in onUserLogin gamification:', error);
    }
  }

  // ======== WISHLIST INTEGRATION ========

  /**
   * Call this when item is added to wishlist
   */
  async onWishlistAdded(userId: string, itemData: any): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'wishlist_added', {
        itemId: itemData.id
      });

      console.log(`✅ Gamification updated for wishlist add ${itemData.id}`);
    } catch (error) {
      console.error('Error in onWishlistAdded gamification:', error);
    }
  }

  // ======== CHALLENGE INTEGRATION ========

  /**
   * Call this when challenge is completed
   */
  async onChallengeCompleted(userId: string, challengeId: string): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'challenge_completed', {
        challengeId
      });

      console.log(`✅ Achievement updated for challenge completion ${challengeId}`);
    } catch (error) {
      console.error('Error in onChallengeCompleted gamification:', error);
    }
  }

  // ======== GAME INTEGRATION ========

  /**
   * Call this when user wins a game
   */
  async onGameWon(userId: string, gameType: string, prize: any): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'game_won', {
        gameType,
        prize
      });

      // Check for jackpot
      if (prize.value >= 1000 && prize.type === 'coins') {
        await achievementService.checkAndAwardAchievements(userId, 'jackpot');
      }

      console.log(`✅ Achievement updated for game win ${gameType}`);
    } catch (error) {
      console.error('Error in onGameWon gamification:', error);
    }
  }

  /**
   * Call this when user answers quiz correctly
   */
  async onQuizCorrectAnswer(userId: string, score: number): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'quiz_correct');

      if (score === 100) {
        await achievementService.checkAndAwardAchievements(userId, 'perfect_score');
      }

      console.log(`✅ Achievement updated for quiz score ${score}`);
    } catch (error) {
      console.error('Error in onQuizCorrectAnswer gamification:', error);
    }
  }

  // ======== DEAL/OFFER INTEGRATION ========

  /**
   * Call this when user uses an exclusive deal
   */
  async onDealUsed(userId: string, dealData: any): Promise<void> {
    try {
      await achievementService.checkAndAwardAchievements(userId, 'deal_used', {
        dealId: dealData.id
      });

      console.log(`✅ Achievement updated for deal use ${dealData.id}`);
    } catch (error) {
      console.error('Error in onDealUsed gamification:', error);
    }
  }

  // ======== SHARE INTEGRATION ========

  /**
   * Call this when user shares a deal
   */
  async onDealShared(userId: string, dealId: string): Promise<void> {
    try {
      await challengeService.updateProgress(userId, 'share_deals', 1, {
        dealId
      });

      console.log(`✅ Challenge updated for deal share ${dealId}`);
    } catch (error) {
      console.error('Error in onDealShared gamification:', error);
    }
  }

  // ======== CATEGORY EXPLORATION ========

  /**
   * Call this when user explores a category
   */
  async onCategoryExplored(userId: string, category: string): Promise<void> {
    try {
      await challengeService.updateProgress(userId, 'explore_categories', 1, {
        category
      });

      console.log(`✅ Challenge updated for category exploration ${category}`);
    } catch (error) {
      console.error('Error in onCategoryExplored gamification:', error);
    }
  }

  // ======== STORE VISIT INTEGRATION ========

  /**
   * Call this when user visits a store page
   */
  async onStoreVisited(userId: string, storeId: string): Promise<void> {
    try {
      await challengeService.updateProgress(userId, 'visit_stores', 1, {
        storeId
      });

      console.log(`✅ Challenge updated for store visit ${storeId}`);
    } catch (error) {
      console.error('Error in onStoreVisited gamification:', error);
    }
  }

  // ======== FAVORITES INTEGRATION ========

  /**
   * Call this when user adds a favorite
   */
  async onFavoriteAdded(userId: string, itemData: any): Promise<void> {
    try {
      await challengeService.updateProgress(userId, 'add_favorites', 1, {
        itemId: itemData.id
      });

      console.log(`✅ Challenge updated for favorite add ${itemData.id}`);
    } catch (error) {
      console.error('Error in onFavoriteAdded gamification:', error);
    }
  }

  // ======== NEW USER INTEGRATION ========

  /**
   * Call this when new user registers
   */
  async onUserRegistered(userId: string): Promise<void> {
    try {
      // Initialize achievements
      await achievementService.initializeUserAchievements(userId);

      console.log(`✅ Gamification initialized for new user ${userId}`);
    } catch (error) {
      console.error('Error in onUserRegistered gamification:', error);
    }
  }
}

export default new GamificationIntegrationService();

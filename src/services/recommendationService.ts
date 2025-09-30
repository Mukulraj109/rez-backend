import { Store } from '../models/Store';
import { StoreAnalytics } from '../models/StoreAnalytics';
import { Favorite } from '../models/Favorite';
import { Review } from '../models/Review';
import mongoose from 'mongoose';

export interface RecommendationOptions {
  userId?: string;
  location?: {
    coordinates: [number, number];
    radius?: number;
  };
  limit?: number;
  excludeStores?: string[];
  category?: string;
  preferences?: {
    minRating?: number;
    maxDeliveryTime?: number;
    priceRange?: {
      min: number;
      max: number;
    };
    features?: string[];
  };
}

export interface StoreRecommendation {
  store: any;
  score: number;
  reasons: string[];
  confidence: number;
}

class RecommendationService {
  /**
   * Get personalized store recommendations for a user
   */
  async getPersonalizedRecommendations(options: RecommendationOptions): Promise<StoreRecommendation[]> {
    const {
      userId,
      location,
      limit = 10,
      excludeStores = [],
      category,
      preferences = {}
    } = options;

    try {
      let recommendations: StoreRecommendation[] = [];

      if (userId) {
        // Get user-based recommendations
        const userRecommendations = await this.getUserBasedRecommendations(userId, {
          location,
          limit: Math.ceil(limit * 0.6), // 60% user-based
          excludeStores,
          category,
          preferences
        });
        recommendations.push(...userRecommendations);
      }

      // Get collaborative filtering recommendations
      const collaborativeRecommendations = await this.getCollaborativeRecommendations({
        userId,
        location,
        limit: Math.ceil(limit * 0.3), // 30% collaborative
        excludeStores,
        category,
        preferences
      });
      recommendations.push(...collaborativeRecommendations);

      // Get trending/popular recommendations
      const trendingRecommendations = await this.getTrendingRecommendations({
        location,
        limit: Math.ceil(limit * 0.1), // 10% trending
        excludeStores,
        category,
        preferences
      });
      recommendations.push(...trendingRecommendations);

      // Remove duplicates and sort by score
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      const sortedRecommendations = uniqueRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return sortedRecommendations;

    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get user-based recommendations based on user's history
   */
  private async getUserBasedRecommendations(
    userId: string,
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    try {
      // Get user's favorite stores
      const userFavorites = await Favorite.find({ user: userId })
        .populate('store')
        .lean();

      // Get user's review history
      const userReviews = await Review.find({ user: userId })
        .populate('store')
        .lean();

      // Get user's analytics history
      const userAnalytics = await StoreAnalytics.find({ user: userId })
        .populate('store')
        .lean();

      // Extract categories and features from user's history
      const userPreferences = this.extractUserPreferences(userFavorites, userReviews, userAnalytics);

      // Find similar stores
      const similarStores = await this.findSimilarStores(userPreferences, {
        location,
        limit: (limit || 10) * 2, // Get more to filter later
        excludeStores: excludeStores || [],
        category,
        preferences
      });

      // Score and rank recommendations
      const recommendations = similarStores.map(store => ({
        store,
        score: this.calculateUserBasedScore(store, userPreferences),
        reasons: this.generateUserBasedReasons(store, userPreferences),
        confidence: this.calculateConfidence(store, userPreferences)
      }));

      return recommendations;

    } catch (error) {
      console.error('Error getting user-based recommendations:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { userId, location, limit, excludeStores, category, preferences } = options;

    try {
      // Find users with similar preferences
      const similarUsers = await this.findSimilarUsers(userId);

      // Get stores liked by similar users
      const collaborativeStores = await this.getStoresFromSimilarUsers(similarUsers, {
        location,
        limit: (limit || 10) * 2,
        excludeStores: excludeStores || [],
        category,
        preferences
      });

      // Score and rank recommendations
      const recommendations = collaborativeStores.map(store => ({
        store,
        score: this.calculateCollaborativeScore(store, similarUsers),
        reasons: this.generateCollaborativeReasons(store, similarUsers),
        confidence: this.calculateCollaborativeConfidence(store, similarUsers)
      }));

      return recommendations;

    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending/popular recommendations
   */
  private async getTrendingRecommendations(
    options: RecommendationOptions
  ): Promise<StoreRecommendation[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    try {
      // Get popular stores from analytics
      const popularStores = await StoreAnalytics.getPopularStores({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: (limit || 10) * 2
      });

      // Filter and score stores
      const recommendations = popularStores
        .filter(store => !(excludeStores || []).includes(store._id.toString()))
        .map(store => ({
          store,
          score: this.calculateTrendingScore(store),
          reasons: this.generateTrendingReasons(store),
          confidence: this.calculateTrendingConfidence(store)
        }));

      return recommendations;

    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  /**
   * Extract user preferences from their history
   */
  private extractUserPreferences(favorites: any[], reviews: any[], analytics: any[]) {
    const preferences = {
      categories: new Map<string, number>(),
      features: new Map<string, number>(),
      priceRange: { min: Infinity, max: 0 },
      ratingPreference: 0,
      deliveryTimePreference: 0
    };

    // Analyze favorites
    favorites.forEach(fav => {
      if (fav.store) {
        // Category preferences
        if (fav.store.deliveryCategories) {
          Object.entries(fav.store.deliveryCategories).forEach(([key, value]) => {
            if (value) {
              preferences.categories.set(key, (preferences.categories.get(key) || 0) + 1);
            }
          });
        }
      }
    });

    // Analyze reviews
    reviews.forEach(review => {
      if (review.store) {
        preferences.ratingPreference += review.rating;
      }
    });

    if (reviews.length > 0) {
      preferences.ratingPreference /= reviews.length;
    }

    return preferences;
  }

  /**
   * Find stores similar to user preferences
   */
  private async findSimilarStores(
    userPreferences: any,
    options: RecommendationOptions
  ): Promise<any[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    const query: any = {
      isActive: true,
      _id: { $nin: (excludeStores || []).map(id => new mongoose.Types.ObjectId(id)) }
    };

    // Add category filter
    if (category) {
      query[`deliveryCategories.${category}`] = true;
    }

    // Add preferences filters
    if (preferences?.minRating) {
      query['ratings.average'] = { $gte: preferences.minRating };
    }

    if (preferences?.maxDeliveryTime) {
      query['operationalInfo.deliveryTime'] = { $lte: preferences.maxDeliveryTime };
    }

    // Add location filter
    if (location) {
      query['location.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: location.coordinates },
          $maxDistance: (location.radius || 10) * 1000
        }
      };
    }

    const stores = await Store.find(query)
      .limit(limit || 10)
      .lean();

    return stores;
  }

  /**
   * Find users with similar preferences
   */
  private async findSimilarUsers(userId?: string): Promise<any[]> {
    if (!userId) return [];

    try {
      // Get user's favorite categories
      const userFavorites = await Favorite.find({ user: userId })
        .populate('store')
        .lean();

      const userCategories = new Set();
      userFavorites.forEach(fav => {
        if (fav.store && typeof fav.store === 'object' && 'deliveryCategories' in fav.store) {
          const store = fav.store as any;
          if (store.deliveryCategories) {
            Object.entries(store.deliveryCategories).forEach(([key, value]) => {
              if (value) userCategories.add(key);
            });
          }
        }
      });

      // Find users who favorited stores in similar categories
      const similarUsers = await Favorite.aggregate([
        {
          $match: {
            user: { $ne: new mongoose.Types.ObjectId(userId) }
          }
        },
        {
          $lookup: {
            from: 'stores',
            localField: 'store',
            foreignField: '_id',
            as: 'storeInfo'
          }
        },
        { $unwind: '$storeInfo' },
        {
          $match: {
            'storeInfo.deliveryCategories': {
              $elemMatch: {
                $in: Array.from(userCategories)
              }
            }
          }
        },
        {
          $group: {
            _id: '$user',
            commonStores: { $sum: 1 }
          }
        },
        { $sort: { commonStores: -1 } },
        { $limit: 10 }
      ]);

      return similarUsers;

    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get stores from similar users
   */
  private async getStoresFromSimilarUsers(
    similarUsers: any[],
    options: RecommendationOptions
  ): Promise<any[]> {
    const { location, limit, excludeStores, category, preferences } = options;

    const userIds = similarUsers.map(user => user._id);

    const stores = await Favorite.find({
      user: { $in: userIds },
      store: { $nin: (excludeStores || []).map(id => new mongoose.Types.ObjectId(id)) }
    })
      .populate('store')
      .lean();

    return stores.map(fav => fav.store).filter(Boolean);
  }

  /**
   * Calculate user-based recommendation score
   */
  private calculateUserBasedScore(store: any, userPreferences: any): number {
    let score = 0;

    // Category match score
    if (store.deliveryCategories) {
      Object.entries(store.deliveryCategories).forEach(([key, value]) => {
        if (value && userPreferences.categories.has(key)) {
          score += userPreferences.categories.get(key) * 10;
        }
      });
    }

    // Rating match score
    if (store.ratings && userPreferences.ratingPreference > 0) {
      const ratingDiff = Math.abs(store.ratings.average - userPreferences.ratingPreference);
      score += Math.max(0, 20 - ratingDiff * 5);
    }

    // Base popularity score
    if (store.ratings) {
      score += store.ratings.average * 5 + store.ratings.count * 0.1;
    }

    return score;
  }

  /**
   * Calculate collaborative filtering score
   */
  private calculateCollaborativeScore(store: any, similarUsers: any[]): number {
    let score = 0;

    // Count how many similar users favorited this store
    const userCount = similarUsers.length;
    score += userCount * 5;

    // Add store's own popularity
    if (store.ratings) {
      score += store.ratings.average * 3 + store.ratings.count * 0.05;
    }

    return score;
  }

  /**
   * Calculate trending score
   */
  private calculateTrendingScore(store: any): number {
    let score = 0;

    // Recent popularity
    score += store.totalEvents * 0.1;

    // Rating quality
    if (store.ratings) {
      score += store.ratings.average * 5;
    }

    return score;
  }

  /**
   * Generate recommendation reasons
   */
  private generateUserBasedReasons(store: any, userPreferences: any): string[] {
    const reasons = [];

    if (store.ratings && store.ratings.average >= 4.5) {
      reasons.push('Highly rated by customers');
    }

    if (store.deliveryCategories) {
      Object.entries(store.deliveryCategories).forEach(([key, value]) => {
        if (value && userPreferences.categories.has(key)) {
          reasons.push(`Matches your ${key} preference`);
        }
      });
    }

    if (store.ratings && store.ratings.count > 100) {
      reasons.push('Popular with many customers');
    }

    return reasons;
  }

  private generateCollaborativeReasons(store: any, similarUsers: any[]): string[] {
    const reasons = [];

    if (similarUsers.length > 0) {
      reasons.push(`Liked by ${similarUsers.length} users with similar taste`);
    }

    if (store.ratings && store.ratings.average >= 4.0) {
      reasons.push('Well-rated by the community');
    }

    return reasons;
  }

  private generateTrendingReasons(store: any): string[] {
    const reasons = [];

    reasons.push('Trending this week');
    
    if (store.ratings && store.ratings.average >= 4.0) {
      reasons.push('Highly rated');
    }

    return reasons;
  }

  /**
   * Calculate confidence scores
   */
  private calculateConfidence(store: any, userPreferences: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (store.ratings && store.ratings.count > 50) {
      confidence += 0.2;
    }

    if (userPreferences.categories.size > 0) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateCollaborativeConfidence(store: any, similarUsers: any[]): number {
    let confidence = 0.3; // Base confidence

    confidence += Math.min(similarUsers.length * 0.1, 0.4);

    if (store.ratings && store.ratings.count > 20) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateTrendingConfidence(store: any): number {
    let confidence = 0.6; // Base confidence for trending

    if (store.ratings && store.ratings.count > 10) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Remove duplicate recommendations
   */
  private deduplicateRecommendations(recommendations: StoreRecommendation[]): StoreRecommendation[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.store._id.toString())) {
        return false;
      }
      seen.add(rec.store._id.toString());
      return true;
    });
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;

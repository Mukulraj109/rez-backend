import mongoose from 'mongoose';
import UserStreak from '../models/UserStreak';

interface LeaderboardEntry {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  value: number;
  rank: number;
}

class LeaderboardService {
  // Get spending leaderboard
  async getSpendingLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const dateFilter = this.getDateFilter(period);

    const Order = mongoose.model('Order');

    const leaderboard = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$user',
          // Order model uses totals.total, not totalPrice
          totalSpent: { $sum: '$totals.total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            // User model has fullName, profile.firstName, username, email
            name: { $ifNull: ['$userData.fullName', { $ifNull: ['$userData.profile.firstName', { $ifNull: ['$userData.username', '$userData.email'] }] }] },
            email: '$userData.email',
            avatar: '$userData.profilePicture'
          },
          value: '$totalSpent',
          orderCount: 1
        }
      }
    ]);

    return this.addRanks(leaderboard);
  }

  // Get review leaderboard
  async getReviewLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const dateFilter = this.getDateFilter(period);

    const Review = mongoose.model('Review');

    const leaderboard = await Review.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$user',
          totalReviews: { $sum: 1 },
          totalHelpful: { $sum: '$helpfulCount' },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$totalReviews', 10] },
              '$totalHelpful'
            ]
          }
        }
      },
      {
        $sort: { score: -1, totalReviews: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            // User model has fullName, profile.firstName, username, email
            name: { $ifNull: ['$userData.fullName', { $ifNull: ['$userData.profile.firstName', { $ifNull: ['$userData.username', '$userData.email'] }] }] },
            email: '$userData.email',
            avatar: '$userData.profilePicture'
          },
          value: '$totalReviews',
          score: 1,
          totalHelpful: 1,
          averageRating: 1
        }
      }
    ]);

    return this.addRanks(leaderboard);
  }

  // Get referral leaderboard
  async getReferralLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const dateFilter = this.getDateFilter(period, 'referral.referrals.joinedAt');

    const User = mongoose.model('User');

    const leaderboard = await User.aggregate([
      {
        $match: {
          'referral.totalReferrals': { $gt: 0 }
        }
      },
      {
        $unwind: { path: '$referral.referrals', preserveNullAndEmptyArrays: false }
      },
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$_id',
          userData: { $first: '$$ROOT' },
          totalReferrals: { $sum: 1 }
        }
      },
      {
        $sort: { totalReferrals: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            // User model has fullName, profile.firstName, username, email
            name: { $ifNull: ['$userData.fullName', { $ifNull: ['$userData.profile.firstName', { $ifNull: ['$userData.username', '$userData.email'] }] }] },
            email: '$userData.email',
            avatar: '$userData.profilePicture'
          },
          value: '$totalReferrals'
        }
      }
    ]);

    return this.addRanks(leaderboard);
  }

  // Get cashback leaderboard
  async getCashbackLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const dateFilter = this.getDateFilter(period);

    const Order = mongoose.model('Order');

    const leaderboard = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          // Order model uses totals.cashback
          'totals.cashback': { $gt: 0 },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$user',
          totalCashback: { $sum: '$totals.cashback' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalCashback: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            // User model has fullName, profile.firstName, username, email
            name: { $ifNull: ['$userData.fullName', { $ifNull: ['$userData.profile.firstName', { $ifNull: ['$userData.username', '$userData.email'] }] }] },
            email: '$userData.email',
            avatar: '$userData.profilePicture'
          },
          value: '$totalCashback',
          orderCount: 1
        }
      }
    ]);

    return this.addRanks(leaderboard);
  }

  // Get streak leaderboard
  async getStreakLeaderboard(
    type: 'login' | 'order' | 'review' = 'login',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = await UserStreak.aggregate([
      {
        $match: { type }
      },
      {
        $sort: { currentStreak: -1, longestStreak: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            // User model has fullName, profile.firstName, username, email
            name: { $ifNull: ['$userData.fullName', { $ifNull: ['$userData.profile.firstName', { $ifNull: ['$userData.username', '$userData.email'] }] }] },
            email: '$userData.email',
            avatar: '$userData.profilePicture'
          },
          value: '$currentStreak',
          longestStreak: 1
        }
      }
    ]);

    return this.addRanks(leaderboard);
  }

  // Get user's rank in leaderboard
  async getUserRank(
    userId: string,
    leaderboardType: 'spending' | 'reviews' | 'referrals' | 'cashback' | 'streak',
    period: 'day' | 'week' | 'month' | 'all' = 'month'
  ): Promise<{ rank: number; total: number; value: number } | null> {
    let allUsers: any[] = [];

    switch (leaderboardType) {
      case 'spending':
        allUsers = await this.getSpendingLeaderboard(period, 1000);
        break;
      case 'reviews':
        allUsers = await this.getReviewLeaderboard(period, 1000);
        break;
      case 'referrals':
        allUsers = await this.getReferralLeaderboard(period, 1000);
        break;
      case 'cashback':
        allUsers = await this.getCashbackLeaderboard(period, 1000);
        break;
      case 'streak':
        allUsers = await this.getStreakLeaderboard('login', 1000);
        break;
    }

    const userEntry = allUsers.find(entry => entry.user.id.toString() === userId);

    if (!userEntry) {
      return null;
    }

    return {
      rank: userEntry.rank,
      total: allUsers.length,
      value: userEntry.value
    };
  }

  // Get all leaderboards for user
  async getAllUserRanks(
    userId: string,
    period: 'day' | 'week' | 'month' | 'all' = 'month'
  ): Promise<any> {
    const [spending, reviews, referrals, cashback, streak] = await Promise.all([
      this.getUserRank(userId, 'spending', period),
      this.getUserRank(userId, 'reviews', period),
      this.getUserRank(userId, 'referrals', period),
      this.getUserRank(userId, 'cashback', period),
      this.getUserRank(userId, 'streak', period)
    ]);

    return {
      spending,
      reviews,
      referrals,
      cashback,
      streak
    };
  }

  // Helper: Get date filter based on period
  private getDateFilter(
    period: 'day' | 'day' | 'week' | 'month' | 'all',
    dateField: string = 'createdAt'
  ): any {
    if (period === 'all') {
      return {};
    }

    const now = new Date();
    const startDate = new Date();

    if (period === 'day') {
      // Daily: last 24 hours
      startDate.setDate(now.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }

    return {
      [dateField]: { $gte: startDate }
    };
  }

  // Helper: Add ranks to leaderboard entries
  private addRanks(entries: any[]): LeaderboardEntry[] {
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  // Get combined leaderboard stats
  async getLeaderboardStats(): Promise<any> {
    const [spending, reviews, referrals, cashback, streak] = await Promise.all([
      this.getSpendingLeaderboard('month', 3),
      this.getReviewLeaderboard('month', 3),
      this.getReferralLeaderboard('month', 3),
      this.getCashbackLeaderboard('month', 3),
      this.getStreakLeaderboard('login', 3)
    ]);

    return {
      spending: spending.slice(0, 3),
      reviews: reviews.slice(0, 3),
      referrals: referrals.slice(0, 3),
      cashback: cashback.slice(0, 3),
      streak: streak.slice(0, 3)
    };
  }
}

export default new LeaderboardService();

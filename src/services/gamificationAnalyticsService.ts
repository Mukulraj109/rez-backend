import mongoose from 'mongoose';
import Challenge from '../models/Challenge';
import UserChallengeProgress from '../models/UserChallengeProgress';
import UserAchievement from '../models/UserAchievement';
import UserStreak from '../models/UserStreak';
import GameSession from '../models/GameSession';

class GamificationAnalyticsService {
  // Overall gamification engagement metrics
  async getOverallEngagementMetrics(period: 'week' | 'month' | 'all' = 'month'): Promise<any> {
    const dateFilter = this.getDateFilter(period);

    const [
      challengeStats,
      achievementStats,
      streakStats,
      gameStats
    ] = await Promise.all([
      this.getChallengeEngagement(dateFilter),
      this.getAchievementEngagement(dateFilter),
      this.getStreakEngagement(dateFilter),
      this.getGameEngagement(dateFilter)
    ]);

    return {
      period,
      challenges: challengeStats,
      achievements: achievementStats,
      streaks: streakStats,
      games: gameStats,
      summary: {
        totalActiveUsers: this.calculateUniqueUsers([
          challengeStats,
          achievementStats,
          streakStats,
          gameStats
        ]),
        engagementScore: this.calculateEngagementScore({
          challengeStats,
          achievementStats,
          streakStats,
          gameStats
        })
      }
    };
  }

  // Challenge engagement metrics
  private async getChallengeEngagement(dateFilter: any): Promise<any> {
    const stats = await UserChallengeProgress.aggregate([
      {
        $match: { createdAt: dateFilter.createdAt || {} }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $addToSet: '$user' },
          totalChallenges: { $sum: 1 },
          completedChallenges: {
            $sum: { $cond: ['$completed', 1, 0] }
          },
          rewardsClaimed: {
            $sum: { $cond: ['$rewardsClaimed', 1, 0] }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        uniqueParticipants: 0,
        totalChallenges: 0,
        completedChallenges: 0,
        completionRate: 0,
        claimRate: 0
      };
    }

    const data = stats[0];
    const uniqueParticipants = data.totalParticipants.length;

    return {
      uniqueParticipants,
      totalChallenges: data.totalChallenges,
      completedChallenges: data.completedChallenges,
      completionRate: Math.round((data.completedChallenges / data.totalChallenges) * 100),
      claimRate: Math.round((data.rewardsClaimed / data.completedChallenges) * 100)
    };
  }

  // Achievement engagement metrics
  private async getAchievementEngagement(dateFilter: any): Promise<any> {
    const stats = await UserAchievement.aggregate([
      {
        $match: {
          $or: [
            { unlockedAt: dateFilter.createdAt || {} },
            { createdAt: dateFilter.createdAt || {} }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $addToSet: '$user' },
          totalAchievements: { $sum: 1 },
          unlockedAchievements: {
            $sum: { $cond: ['$unlocked', 1, 0] }
          },
          averageProgress: { $avg: '$progress' },
          byTier: {
            $push: {
              tier: '$tier',
              unlocked: '$unlocked'
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        uniqueUsers: 0,
        totalAchievements: 0,
        unlockedAchievements: 0,
        unlockRate: 0,
        averageProgress: 0,
        byTier: {}
      };
    }

    const data = stats[0];
    const tierStats: any = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    };

    data.byTier.forEach((item: any) => {
      if (item.unlocked && tierStats.hasOwnProperty(item.tier)) {
        tierStats[item.tier]++;
      }
    });

    return {
      uniqueUsers: data.totalUsers.length,
      totalAchievements: data.totalAchievements,
      unlockedAchievements: data.unlockedAchievements,
      unlockRate: Math.round((data.unlockedAchievements / data.totalAchievements) * 100),
      averageProgress: Math.round(data.averageProgress),
      byTier: tierStats
    };
  }

  // Streak engagement metrics
  private async getStreakEngagement(dateFilter: any): Promise<any> {
    const stats = await UserStreak.aggregate([
      {
        $match: { createdAt: dateFilter.createdAt || {} }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $addToSet: '$user' },
          averageCurrentStreak: { $avg: '$currentStreak' },
          averageLongestStreak: { $avg: '$longestStreak' },
          activeStreaks: {
            $sum: { $cond: [{ $gt: ['$currentStreak', 0] }, 1, 0] }
          },
          totalStreaks: { $sum: 1 },
          byType: {
            $push: {
              type: '$type',
              currentStreak: '$currentStreak'
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        uniqueUsers: 0,
        activeStreaks: 0,
        averageStreak: 0,
        retentionRate: 0
      };
    }

    const data = stats[0];

    return {
      uniqueUsers: data.totalUsers.length,
      activeStreaks: data.activeStreaks,
      averageCurrentStreak: Math.round(data.averageCurrentStreak),
      averageLongestStreak: Math.round(data.averageLongestStreak),
      retentionRate: Math.round((data.activeStreaks / data.totalStreaks) * 100)
    };
  }

  // Game engagement metrics
  private async getGameEngagement(dateFilter: any): Promise<any> {
    const stats = await GameSession.aggregate([
      {
        $match: {
          createdAt: dateFilter.createdAt || {},
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalPlayers: { $addToSet: '$user' },
          totalGames: { $sum: 1 },
          totalWins: {
            $sum: { $cond: ['$result.won', 1, 0] }
          },
          byGameType: {
            $push: {
              gameType: '$gameType',
              won: '$result.won'
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        uniquePlayers: 0,
        totalGames: 0,
        winRate: 0,
        byGameType: {}
      };
    }

    const data = stats[0];
    const gameTypeStats: any = {
      spin_wheel: { played: 0, won: 0 },
      scratch_card: { played: 0, won: 0 },
      quiz: { played: 0, won: 0 },
      daily_trivia: { played: 0, won: 0 }
    };

    data.byGameType.forEach((item: any) => {
      if (gameTypeStats.hasOwnProperty(item.gameType)) {
        gameTypeStats[item.gameType].played++;
        if (item.won) {
          gameTypeStats[item.gameType].won++;
        }
      }
    });

    // Calculate win rates
    Object.keys(gameTypeStats).forEach(key => {
      const stat = gameTypeStats[key];
      stat.winRate = stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0;
    });

    return {
      uniquePlayers: data.totalPlayers.length,
      totalGames: data.totalGames,
      totalWins: data.totalWins,
      winRate: Math.round((data.totalWins / data.totalGames) * 100),
      byGameType: gameTypeStats
    };
  }

  // User gamification profile
  async getUserGamificationProfile(userId: string): Promise<any> {
    const [
      challengeProgress,
      achievements,
      streaks,
      gameStats
    ] = await Promise.all([
      UserChallengeProgress.countDocuments({ user: userId, completed: true }),
      UserAchievement.countDocuments({ user: userId, unlocked: true }),
      UserStreak.find({ user: userId }),
      GameSession.countDocuments({ user: userId, status: 'completed' })
    ]);

    const totalStreak = streaks.reduce((sum, s) => sum + s.currentStreak, 0);
    const longestStreak = Math.max(...streaks.map(s => s.longestStreak), 0);

    return {
      challengesCompleted: challengeProgress,
      achievementsUnlocked: achievements,
      currentStreakTotal: totalStreak,
      longestStreak,
      gamesPlayed: gameStats,
      level: this.calculateUserLevel({
        challenges: challengeProgress,
        achievements,
        streaks: totalStreak,
        games: gameStats
      }),
      engagement: 'high' // Can be calculated based on activity
    };
  }

  // ROI metrics - engagement increase
  async getGamificationROI(beforeDate: Date, afterDate: Date): Promise<any> {
    const User = mongoose.model('User');
    const Order = mongoose.model('Order');

    const [beforeUsers, afterUsers] = await Promise.all([
      User.countDocuments({
        createdAt: { $lt: beforeDate },
        lastActive: { $gte: beforeDate, $lt: afterDate }
      }),
      User.countDocuments({
        createdAt: { $lt: afterDate },
        lastActive: { $gte: afterDate }
      })
    ]);

    const [beforeOrders, afterOrders] = await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: beforeDate, $lt: afterDate }
      }),
      Order.countDocuments({
        createdAt: { $gte: afterDate }
      })
    ]);

    const engagementIncrease = ((afterUsers - beforeUsers) / beforeUsers) * 100;
    const orderIncrease = ((afterOrders - beforeOrders) / beforeOrders) * 100;

    return {
      activeUsersIncrease: Math.round(engagementIncrease),
      orderIncrease: Math.round(orderIncrease),
      roi: Math.round((engagementIncrease + orderIncrease) / 2)
    };
  }

  // Helper methods
  private getDateFilter(period: 'week' | 'month' | 'all'): any {
    if (period === 'all') {
      return {};
    }

    const now = new Date();
    const startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }

    return {
      createdAt: { $gte: startDate }
    };
  }

  private calculateUniqueUsers(stats: any[]): number {
    const allUsers = new Set();

    stats.forEach(stat => {
      if (stat.uniqueUsers) allUsers.add(stat.uniqueUsers);
      if (stat.uniqueParticipants) allUsers.add(stat.uniqueParticipants);
      if (stat.uniquePlayers) allUsers.add(stat.uniquePlayers);
    });

    return allUsers.size;
  }

  private calculateEngagementScore(data: any): number {
    // Weighted scoring system
    const weights = {
      challenges: 0.3,
      achievements: 0.3,
      streaks: 0.2,
      games: 0.2
    };

    const scores = {
      challenges: data.challengeStats.completionRate || 0,
      achievements: data.achievementStats.unlockRate || 0,
      streaks: data.streakStats.retentionRate || 0,
      games: data.gameStats.winRate || 0
    };

    const totalScore = Object.keys(weights).reduce((sum, key) => {
      return sum + (weights[key as keyof typeof weights] * scores[key as keyof typeof scores]);
    }, 0);

    return Math.round(totalScore);
  }

  private calculateUserLevel(stats: any): number {
    // Simple leveling system
    const points =
      (stats.challenges * 100) +
      (stats.achievements * 200) +
      (stats.streaks * 50) +
      (stats.games * 25);

    return Math.floor(points / 1000) + 1;
  }

  // Top performers by gamification activity
  async getTopPerformers(limit: number = 10): Promise<any[]> {
    const topUsers = await UserAchievement.aggregate([
      {
        $match: { unlocked: true }
      },
      {
        $group: {
          _id: '$user',
          achievementsUnlocked: { $sum: 1 },
          platinumCount: {
            $sum: { $cond: [{ $eq: ['$tier', 'platinum'] }, 1, 0] }
          },
          goldCount: {
            $sum: { $cond: [{ $eq: ['$tier', 'gold'] }, 1, 0] }
          }
        }
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
        $lookup: {
          from: 'userchallengeprogressions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                completed: true
              }
            },
            { $count: 'total' }
          ],
          as: 'challengeStats'
        }
      },
      {
        $addFields: {
          challengesCompleted: {
            $ifNull: [{ $arrayElemAt: ['$challengeStats.total', 0] }, 0]
          }
        }
      },
      {
        $sort: {
          achievementsUnlocked: -1,
          platinumCount: -1,
          goldCount: -1
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          user: {
            id: '$userData._id',
            name: '$userData.name',
            avatar: '$userData.profilePicture'
          },
          achievementsUnlocked: 1,
          challengesCompleted: 1,
          platinumCount: 1,
          goldCount: 1
        }
      }
    ]);

    return topUsers;
  }
}

export default new GamificationAnalyticsService();

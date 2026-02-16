import { Server as SocketIOServer } from 'socket.io';
import { Types } from 'mongoose';

interface EarningsUpdate {
  userId: string;
  type: 'balance' | 'project_status' | 'earnings' | 'notification';
  data: any;
}

class EarningsSocketService {
  private io: SocketIOServer | null = null;
  private static instance: EarningsSocketService;

  private constructor() {}

  static getInstance(): EarningsSocketService {
    if (!EarningsSocketService.instance) {
      EarningsSocketService.instance = new EarningsSocketService();
    }
    return EarningsSocketService.instance;
  }

  initialize(io: SocketIOServer) {
    this.io = io;
    console.log('✅ [EARNINGS SOCKET] Earnings socket service initialized');

    io.on('connection', (socket) => {
      console.log('🔌 [EARNINGS SOCKET] Client connected:', socket.id);

      // Join user's earnings room
      socket.on('join-earnings-room', (userId: string) => {
        socket.join(`earnings-${userId}`);
        console.log(`✅ [EARNINGS SOCKET] User ${userId} joined earnings room`);
      });

      // Leave user's earnings room
      socket.on('leave-earnings-room', (userId: string) => {
        socket.leave(`earnings-${userId}`);
        console.log(`✅ [EARNINGS SOCKET] User ${userId} left earnings room`);
      });

      socket.on('disconnect', () => {
        console.log('🔌 [EARNINGS SOCKET] Client disconnected:', socket.id);
      });
    });
  }

  /**
   * Emit balance update to user
   */
  emitBalanceUpdate(userId: string, balance: number, pendingBalance: number) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('balance-update', {
      balance,
      pendingBalance,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Balance update sent to user ${userId}`);
  }

  /**
   * Emit project status update to user
   */
  emitProjectStatusUpdate(
    userId: string,
    status: { completeNow: number; inReview: number; completed: number }
  ) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('project-status-update', {
      status,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Project status update sent to user ${userId}`);
  }

  /**
   * Emit earnings update to user
   */
  emitEarningsUpdate(
    userId: string,
    earnings: {
      totalEarned: number;
      breakdown: {
        projects: number;
        referrals: number;
        shareAndEarn: number;
        spin: number;
      };
    }
  ) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('earnings-update', {
      earnings,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Earnings update sent to user ${userId}`);
  }

  /**
   * Emit new transaction to user
   */
  emitNewTransaction(userId: string, transaction: any) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('new-transaction', {
      transaction,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] New transaction sent to user ${userId}`);
  }

  /**
   * Emit notification to user
   */
  emitNotification(userId: string, notification: any) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('earnings-notification', {
      notification,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Notification sent to user ${userId}`);
  }

  /**
   * Emit when user earns coins from any gamification action
   */
  emitCoinsEarned(userId: string, amount: number, source: string, description: string) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('coins-earned', {
      amount,
      source, // e.g., 'quiz', 'spin_wheel', 'challenge', 'daily_checkin'
      description,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Coins earned event sent to user ${userId}: ${amount} from ${source}`);
  }

  /**
   * Emit when a challenge is completed
   */
  emitChallengeCompleted(userId: string, challengeTitle: string, coinsReward: number) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('challenge-completed', {
      challengeTitle,
      coinsReward,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Challenge completed event sent to user ${userId}: ${challengeTitle}`);
  }

  /**
   * Emit when achievement is unlocked
   */
  emitAchievementUnlocked(userId: string, achievement: { title: string; icon: string; coinReward: number }) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('achievement-unlocked', {
      ...achievement,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Achievement unlocked event sent to user ${userId}: ${achievement.title}`);
  }

  /**
   * Emit leaderboard rank change
   */
  emitLeaderboardUpdate(userId: string, rank: number, previousRank: number) {
    if (!this.io) {
      console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
      return;
    }

    this.io.to(`earnings-${userId}`).emit('leaderboard-update', {
      rank,
      previousRank,
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 [EARNINGS SOCKET] Leaderboard update sent to user ${userId}: rank ${previousRank} -> ${rank}`);
  }
}

export default EarningsSocketService.getInstance();


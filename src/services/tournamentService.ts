import Tournament, { ITournament } from '../models/Tournament';
import { Wallet } from '../models/Wallet';
import mongoose from 'mongoose';

class TournamentService {
  // Get all tournaments
  async getTournaments(
    status?: 'upcoming' | 'active' | 'completed',
    type?: 'daily' | 'weekly' | 'monthly' | 'special',
    limit: number = 20,
    offset: number = 0
  ): Promise<{ tournaments: ITournament[]; total: number }> {
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['upcoming', 'active'] };
    }

    if (type) {
      query.type = type;
    }

    const [tournaments, total] = await Promise.all([
      Tournament.find(query)
        .select('-participants')
        .sort({ featured: -1, startDate: 1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      Tournament.countDocuments(query)
    ]);

    return { tournaments, total };
  }

  // Get tournament details
  async getTournamentById(tournamentId: string): Promise<ITournament | null> {
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.user', 'name avatar')
      .exec();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament;
  }

  // Join tournament
  async joinTournament(tournamentId: string, userId: string): Promise<ITournament> {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
      throw new Error('Tournament is not accepting participants');
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full');
    }

    // Check if already joined
    const existingParticipant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (existingParticipant) {
      throw new Error('Already joined this tournament');
    }

    // Add participant
    tournament.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      score: 0,
      gamesPlayed: 0,
      joinedAt: new Date()
    });

    await tournament.save();

    return tournament;
  }

  // Leave tournament
  async leaveTournament(tournamentId: string, userId: string): Promise<void> {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'upcoming') {
      throw new Error('Cannot leave an active or completed tournament');
    }

    const participantIndex = tournament.participants.findIndex(
      p => p.user.toString() === userId
    );

    if (participantIndex === -1) {
      throw new Error('Not a participant in this tournament');
    }

    tournament.participants.splice(participantIndex, 1);
    await tournament.save();
  }

  // Update participant score
  async updateParticipantScore(
    tournamentId: string,
    userId: string,
    score: number
  ): Promise<void> {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'active') {
      throw new Error('Tournament is not active');
    }

    const participant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      throw new Error('Not a participant in this tournament');
    }

    participant.score += score;
    participant.gamesPlayed += 1;
    participant.lastPlayedAt = new Date();

    await tournament.save();
  }

  // Get tournament leaderboard
  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100
  ): Promise<any[]> {
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.user', 'name avatar')
      .exec();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Sort participants by score
    const sortedParticipants = tournament.participants
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((p, index) => ({
        rank: index + 1,
        user: p.user,
        score: p.score,
        gamesPlayed: p.gamesPlayed,
        joinedAt: p.joinedAt,
        lastPlayedAt: p.lastPlayedAt
      }));

    return sortedParticipants;
  }

  // Get user's tournament participation
  async getUserTournaments(userId: string): Promise<any[]> {
    const tournaments = await Tournament.find({
      'participants.user': userId
    })
      .select('name type gameType status startDate endDate prizes participants')
      .sort({ startDate: -1 })
      .limit(20)
      .exec();

    return tournaments.map(t => {
      const participant = t.participants.find(
        p => p.user.toString() === userId
      );

      // Calculate user's rank
      const sortedParticipants = [...t.participants].sort((a, b) => b.score - a.score);
      const userRank = sortedParticipants.findIndex(
        p => p.user.toString() === userId
      ) + 1;

      return {
        _id: t._id,
        name: t.name,
        type: t.type,
        gameType: t.gameType,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        userScore: participant?.score || 0,
        userRank,
        totalParticipants: t.participants.length,
        prizes: t.prizes
      };
    });
  }

  // Get user's rank in a tournament
  async getUserRankInTournament(tournamentId: string, userId: string): Promise<any> {
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const participant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      return null;
    }

    // Calculate rank
    const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
    const rank = sortedParticipants.findIndex(
      p => p.user.toString() === userId
    ) + 1;

    // Check if eligible for prize
    const prize = tournament.prizes.find(p => p.rank === rank);

    return {
      rank,
      score: participant.score,
      gamesPlayed: participant.gamesPlayed,
      totalParticipants: tournament.participants.length,
      prize: prize || null,
      isWinner: rank <= tournament.prizes.length
    };
  }

  // Activate upcoming tournaments
  async activateUpcomingTournaments(): Promise<number> {
    const now = new Date();

    const result = await Tournament.updateMany(
      {
        status: 'upcoming',
        startDate: { $lte: now }
      },
      {
        status: 'active'
      }
    );

    return result.modifiedCount || 0;
  }

  // Complete ended tournaments
  async completeEndedTournaments(): Promise<number> {
    const now = new Date();

    const tournaments = await Tournament.find({
      status: 'active',
      endDate: { $lte: now }
    });

    for (const tournament of tournaments) {
      // Calculate final ranks
      const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);

      sortedParticipants.forEach((p, index) => {
        const participant = tournament.participants.find(
          tp => tp.user.toString() === p.user.toString()
        );
        if (participant) {
          participant.rank = index + 1;
        }
      });

      tournament.status = 'completed';
      await tournament.save();

      // Distribute prizes to winners
      await this.distributeTournamentPrizes(tournament);
    }

    return tournaments.length;
  }

  /**
   * Distribute prizes to tournament winners
   */
  private async distributeTournamentPrizes(tournament: ITournament): Promise<void> {
    console.log(`🏆 [TOURNAMENT] Distributing prizes for tournament: ${tournament.name}`);

    const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
    const prizes = tournament.prizes || [];

    for (let i = 0; i < Math.min(sortedParticipants.length, prizes.length); i++) {
      const participant = sortedParticipants[i];
      const prize = prizes[i];

      if (!participant || !prize) continue;

      try {
        const userId = participant.user.toString();

        // Credit prize coins to winner's wallet
        if (prize.coins && prize.coins > 0) {
          const wallet = await Wallet.findOne({ user: userId });

          if (wallet) {
            // Find or create promotion coin type
            let promoCoin = wallet.coins.find((c: any) => c.type === 'promotion');
            if (!promoCoin) {
              wallet.coins.push({
                type: 'promotion',
                amount: 0,
                label: 'Promo Coins',
                color: '#FF6B35',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              } as any);
              promoCoin = wallet.coins[wallet.coins.length - 1];
            }

            promoCoin.amount += prize.coins;
            promoCoin.lastEarned = new Date();

            // Update wallet statistics
            wallet.balance.available += prize.coins;
            wallet.balance.total += prize.coins;
            wallet.statistics.totalEarned += prize.coins;
            wallet.lastTransactionAt = new Date();

            await wallet.save();

            console.log(`✅ [TOURNAMENT] Awarded ${prize.coins} coins to rank ${i + 1} (${userId})`);
          }
        }

        // Update participant with prize awarded flag
        participant.prizeAwarded = true;
        participant.prizeDetails = {
          rank: i + 1,
          coins: prize.coins || 0,
          badge: prize.badge,
          exclusiveDeal: prize.exclusiveDeal,
          awardedAt: new Date()
        };
      } catch (prizeError) {
        console.error(`❌ [TOURNAMENT] Failed to award prize to rank ${i + 1}:`, prizeError);
        // Continue to next winner even if one fails
      }
    }

    // Save updated participant prize statuses
    await tournament.save();
    console.log(`✅ [TOURNAMENT] Prize distribution complete for: ${tournament.name}`);
  }

  // Get featured tournaments
  async getFeaturedTournaments(limit: number = 5): Promise<ITournament[]> {
    return Tournament.find({
      status: { $in: ['upcoming', 'active'] },
      featured: true
    })
      .select('-participants')
      .sort({ startDate: 1 })
      .limit(limit)
      .exec();
  }

  // Get live tournaments for the Play & Earn hub
  async getLiveTournaments(userId?: string, limit: number = 5): Promise<any[]> {
    const tournaments = await Tournament.find({
      status: { $in: ['upcoming', 'active'] }
    })
      .sort({ featured: -1, status: 1, startDate: 1 })
      .limit(limit)
      .exec();

    const now = new Date();

    return tournaments.map(tournament => {
      // Calculate time remaining
      const endDate = new Date(tournament.endDate);
      const startDate = new Date(tournament.startDate);
      let endsIn = '';
      let startsIn = '';

      if (tournament.status === 'active') {
        const diffMs = endDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          endsIn = `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
          endsIn = `${diffHours}h`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          endsIn = `${diffMins}m`;
        }
      } else {
        const diffMs = startDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          startsIn = `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
          startsIn = `${diffHours}h`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          startsIn = `${diffMins}m`;
        }
      }

      // Check if user is participating and get their rank
      let userRank: number | null = null;
      let userScore: number | null = null;
      let isParticipant = false;

      if (userId) {
        const participant = tournament.participants.find(
          p => p.user.toString() === userId
        );

        if (participant) {
          isParticipant = true;
          userScore = participant.score;

          // Calculate rank
          const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
          userRank = sortedParticipants.findIndex(
            p => p.user.toString() === userId
          ) + 1;
        }
      }

      // Get prize pool total
      const totalPrizeValue = tournament.prizes.reduce((sum, prize) => {
        return sum + (prize.coins || 0);
      }, 0);

      // Determine icon based on game type
      const iconMap: Record<string, string> = {
        'spin_wheel': '🎰',
        'memory_match': '🧠',
        'coin_hunt': '🪙',
        'guess_price': '🏷️',
        'quiz': '❓',
        'general': '🏆'
      };

      return {
        id: tournament._id,
        title: tournament.name,
        description: tournament.description,
        type: tournament.type,
        gameType: tournament.gameType,
        status: tournament.status,
        icon: iconMap[tournament.gameType] || '🏆',
        prize: `${totalPrizeValue.toLocaleString()} coins`,
        prizePool: tournament.prizes,
        participants: tournament.participants.length,
        maxParticipants: tournament.maxParticipants,
        endsIn: endsIn || undefined,
        startsIn: startsIn || undefined,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        featured: tournament.featured,
        path: `/explore/tournaments/${tournament._id}`,
        // User-specific data
        isParticipant,
        userRank,
        userScore
      };
    });
  }
}

export default new TournamentService();

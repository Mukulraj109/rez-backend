import Tournament, { ITournament } from '../models/Tournament';
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

      // TODO: Distribute prizes to winners
    }

    return tournaments.length;
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
}

export default new TournamentService();

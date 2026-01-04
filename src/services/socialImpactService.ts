import Program, { IProgram } from '../models/Program';
import SocialImpactEnrollment, { ISocialImpactEnrollment } from '../models/SocialImpactEnrollment';
import UserImpactStats, { IUserImpactStatsModel } from '../models/UserImpactStats';
import Sponsor from '../models/Sponsor';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

interface EventFilters {
  eventStatus?: 'upcoming' | 'ongoing' | 'completed';
  eventType?: string;
  sponsorId?: string;
  city?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

class SocialImpactService {
  // Get all social impact events with filters
  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationOptions = {},
    userId?: string
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { eventStatus, eventType, sponsorId, city } = filters;
    const { page = 1, limit = 20 } = pagination;

    const query: any = {
      type: 'social_impact',
      status: { $in: ['active', 'upcoming'] }
    };

    if (eventStatus) {
      query.eventStatus = eventStatus;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (sponsorId) {
      query.sponsor = sponsorId;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    const total = await Program.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const events = await Program.find(query)
      .select('-participants')
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo')
      .sort({ eventDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    // If user is logged in, check their enrollment status
    let userEnrollments: Map<string, ISocialImpactEnrollment> = new Map();
    if (userId) {
      const enrollments = await SocialImpactEnrollment.find({
        user: userId,
        program: { $in: events.map(e => e._id) }
      });
      enrollments.forEach(e => {
        userEnrollments.set(e.program.toString(), e);
      });
    }

    const eventsWithStatus = events.map(event => {
      const enrollment = userEnrollments.get((event._id as mongoose.Types.ObjectId).toString());
      return {
        ...event.toObject(),
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment?.status || null,
        enrollmentId: enrollment?._id || null
      };
    });

    return { events: eventsWithStatus, total, page, totalPages };
  }

  // Get single event by ID
  async getEventById(eventId: string, userId?: string): Promise<any> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    })
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo description website')
      .exec();

    if (!event) {
      return null;
    }

    let enrollment = null;
    if (userId) {
      enrollment = await SocialImpactEnrollment.findOne({
        user: userId,
        program: eventId
      });
    }

    return {
      ...event.toObject(),
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status || null,
      enrollmentId: enrollment?._id || null,
      enrolledAt: enrollment?.registeredAt || null
    };
  }

  // Register user for an event
  async registerUser(userId: string, eventId: string): Promise<ISocialImpactEnrollment> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.eventStatus === 'completed' || event.eventStatus === 'cancelled') {
      throw new Error('Event is no longer accepting registrations');
    }

    // Check capacity
    if (event.capacity && event.capacity.goal > 0) {
      if ((event.capacity.enrolled || 0) >= event.capacity.goal) {
        throw new Error('Event is full');
      }
    }

    // Check if already registered
    const existing = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (existing) {
      if (existing.status === 'cancelled') {
        // Re-register if previously cancelled
        existing.status = 'registered';
        existing.registeredAt = new Date();
        existing.cancelledAt = undefined;
        existing.cancellationReason = undefined;
        await existing.save();

        // Update capacity
        await Program.findByIdAndUpdate(eventId, {
          $inc: { 'capacity.enrolled': 1 }
        });

        // Update user stats
        await UserImpactStats.findOneAndUpdate(
          { user: userId },
          {
            $inc: { totalEventsRegistered: 1 },
            $setOnInsert: { user: userId }
          },
          { upsert: true }
        );

        return existing;
      }
      throw new Error('Already registered for this event');
    }

    // Create enrollment
    const enrollment = await SocialImpactEnrollment.create({
      user: userId,
      program: eventId,
      status: 'registered',
      registeredAt: new Date()
    });

    // Update capacity
    await Program.findByIdAndUpdate(eventId, {
      $inc: { 'capacity.enrolled': 1 }
    });

    // Update user stats
    await UserImpactStats.findOneAndUpdate(
      { user: userId },
      {
        $inc: { totalEventsRegistered: 1 },
        $setOnInsert: { user: userId }
      },
      { upsert: true }
    );

    return enrollment;
  }

  // Cancel registration
  async cancelRegistration(userId: string, eventId: string, reason?: string): Promise<void> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('Not registered for this event');
    }

    if (enrollment.status === 'completed') {
      throw new Error('Cannot cancel completed participation');
    }

    if (enrollment.status === 'cancelled') {
      throw new Error('Registration already cancelled');
    }

    // Update enrollment
    enrollment.status = 'cancelled';
    enrollment.cancelledAt = new Date();
    enrollment.cancellationReason = reason;
    await enrollment.save();

    // Update capacity
    await Program.findByIdAndUpdate(eventId, {
      $inc: { 'capacity.enrolled': -1 }
    });

    // Update user stats
    await UserImpactStats.findOneAndUpdate(
      { user: userId },
      { $inc: { totalEventsCancelled: 1 } }
    );
  }

  // Check-in user at event (admin only)
  async checkInUser(
    userId: string,
    eventId: string,
    adminId: string
  ): Promise<ISocialImpactEnrollment> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('User is not registered for this event');
    }

    if (enrollment.status !== 'registered') {
      throw new Error(`Cannot check in user with status: ${enrollment.status}`);
    }

    enrollment.status = 'checked_in';
    enrollment.checkedInAt = new Date();
    enrollment.checkedInBy = new mongoose.Types.ObjectId(adminId);
    await enrollment.save();

    return enrollment;
  }

  // Complete participation and award coins (admin only)
  async completeParticipation(
    userId: string,
    eventId: string,
    adminId: string,
    impactValue?: number
  ): Promise<ISocialImpactEnrollment> {
    const event = await Program.findOne({
      _id: eventId,
      type: 'social_impact'
    }).populate('sponsor');

    if (!event) {
      throw new Error('Event not found');
    }

    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('User is not registered for this event');
    }

    if (enrollment.status === 'completed') {
      throw new Error('Participation already completed');
    }

    if (enrollment.status === 'cancelled' || enrollment.status === 'no_show') {
      throw new Error(`Cannot complete participation with status: ${enrollment.status}`);
    }

    // Award coins
    const rezCoins = event.rewards?.rezCoins || 0;
    const brandCoins = event.rewards?.brandCoins || 0;

    if (rezCoins > 0) {
      await CoinTransaction.createTransaction(
        userId,
        'earned',
        rezCoins,
        'achievement',
        `Completed social impact event: ${event.name}`,
        {
          eventId: event._id,
          eventType: event.eventType,
          sponsorId: event.sponsor?._id
        }
      );
    }

    // Update enrollment
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    enrollment.completedBy = new mongoose.Types.ObjectId(adminId);
    enrollment.coinsAwarded = {
      rez: rezCoins,
      brand: brandCoins,
      awardedAt: new Date()
    };

    // Track impact contributed
    if (event.impact && impactValue) {
      enrollment.impactContributed = {
        metric: event.impact.metric,
        value: impactValue
      };
    }

    await enrollment.save();

    // Update user impact stats
    const impactMetric = event.impact?.metric || 'hours';
    const impactVal = impactValue || 1;

    await (UserImpactStats as unknown as IUserImpactStatsModel).updateStatsOnCompletion(
      userId,
      event.eventType || 'other',
      impactMetric,
      impactVal,
      rezCoins,
      brandCoins,
      event.sponsor?._id?.toString()
    );

    // Update event impact current value
    if (event.impact) {
      await Program.findByIdAndUpdate(eventId, {
        $inc: { 'impact.currentValue': impactVal }
      });
    }

    // Update sponsor stats if applicable
    if (event.sponsor) {
      const sponsorService = (await import('./sponsorService')).default;
      await sponsorService.updateSponsorStats(event.sponsor._id.toString());
    }

    return enrollment;
  }

  // Mark user as no-show (admin only)
  async markNoShow(userId: string, eventId: string, adminId: string): Promise<void> {
    const enrollment = await SocialImpactEnrollment.findOne({
      user: userId,
      program: eventId
    });

    if (!enrollment) {
      throw new Error('User is not registered for this event');
    }

    if (enrollment.status === 'completed') {
      throw new Error('Cannot mark completed participation as no-show');
    }

    enrollment.status = 'no_show';
    await enrollment.save();
  }

  // Get user's impact stats
  async getUserStats(userId: string): Promise<any> {
    let stats = await UserImpactStats.findOne({ user: userId });

    if (!stats) {
      // Return default stats if none exist
      return {
        totalEventsRegistered: 0,
        totalEventsCompleted: 0,
        totalEventsAttended: 0,
        livesImpacted: 0,
        treesPlanted: 0,
        hoursContributed: 0,
        mealsServed: 0,
        totalRezCoinsEarned: 0,
        totalBrandCoinsEarned: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    return stats;
  }

  // Get user's enrolled events
  async getUserEnrollments(
    userId: string,
    status?: string
  ): Promise<any[]> {
    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    const enrollments = await SocialImpactEnrollment.find(query)
      .populate({
        path: 'program',
        select: 'name eventType eventDate eventTime location rewards capacity impact eventStatus image organizer',
        populate: {
          path: 'sponsor',
          select: 'name logo brandCoinName'
        }
      })
      .sort({ registeredAt: -1 })
      .exec();

    return enrollments.map(e => ({
      enrollmentId: e._id,
      status: e.status,
      registeredAt: e.registeredAt,
      checkedInAt: e.checkedInAt,
      completedAt: e.completedAt,
      coinsAwarded: e.coinsAwarded,
      event: e.program
    }));
  }

  // Get event participants (admin only)
  async getEventParticipants(
    eventId: string,
    status?: string
  ): Promise<any[]> {
    const query: any = { program: eventId };
    if (status) {
      query.status = status;
    }

    const enrollments = await SocialImpactEnrollment.find(query)
      .populate('user', 'name phoneNumber email profile.avatar')
      .sort({ registeredAt: -1 })
      .exec();

    return enrollments;
  }

  // Bulk complete participants (admin only)
  async bulkComplete(
    eventId: string,
    userIds: string[],
    adminId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        await this.completeParticipation(userId, eventId, adminId);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`User ${userId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // Create social impact event (admin only)
  async createEvent(data: any): Promise<IProgram> {
    // Validate sponsor if provided
    if (data.sponsor) {
      const sponsor = await Sponsor.findById(data.sponsor);
      if (!sponsor) {
        throw new Error('Sponsor not found');
      }
      if (!sponsor.isActive) {
        throw new Error('Sponsor is not active');
      }
    }

    const event = await Program.create({
      ...data,
      type: 'social_impact',
      status: 'active',
      startDate: data.eventDate || new Date(),
      capacity: {
        goal: data.capacity?.goal || 100,
        enrolled: 0
      }
    });

    return event;
  }

  // Update social impact event (admin only)
  async updateEvent(eventId: string, data: any): Promise<IProgram | null> {
    const event = await Program.findOneAndUpdate(
      { _id: eventId, type: 'social_impact' },
      { $set: data },
      { new: true }
    );

    return event;
  }

  // Get leaderboard
  async getLeaderboard(
    metric: 'totalEventsCompleted' | 'livesImpacted' | 'treesPlanted' | 'totalRezCoinsEarned' = 'totalEventsCompleted',
    limit: number = 10
  ): Promise<any[]> {
    const sortField: any = {};
    sortField[metric] = -1;

    const leaderboard = await UserImpactStats.find({
      [metric]: { $gt: 0 }
    })
      .populate('user', 'name profile.avatar')
      .sort(sortField)
      .limit(limit)
      .exec();

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      [metric]: (entry as any)[metric],
      totalEventsCompleted: entry.totalEventsCompleted
    }));
  }
}

export default new SocialImpactService();

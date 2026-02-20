import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Activity Event — standard event format consumed by all gamification systems.
 */
export interface ActivityEvent {
  userId: string;
  eventId: string;
  timestamp: Date;
  type: ActivityEventType;
  category: EventCategory;
  data: {
    entityId?: string;
    entityType?: string;
    amount?: number;
    storeId?: string;
    categorySlug?: string;
    metadata?: Record<string, any>;
  };
  source: {
    controller: string;
    action: string;
  };
}

export type ActivityEventType =
  | 'order_placed' | 'order_delivered'
  | 'review_submitted' | 'review_helpful_vote'
  | 'referral_completed'
  | 'video_created'
  | 'bill_uploaded'
  | 'login' | 'daily_checkin'
  | 'project_completed'
  | 'offer_redeemed'
  | 'game_won' | 'quiz_correct'
  | 'social_share' | 'social_media_submitted' | 'social_media_approved' | 'social_media_credited'
  | 'favorite_added' | 'wishlist_added'
  | 'challenge_completed';

export type EventCategory =
  | 'order' | 'review' | 'referral' | 'video' | 'bill'
  | 'game' | 'social' | 'login' | 'project' | 'offer' | 'event';

/**
 * Gamification Event Bus — central dispatcher for all gamification events.
 *
 * Uses Node.js EventEmitter for immediate in-process fan-out.
 * All consumers register handlers for specific event types.
 * Errors in consumers do NOT propagate to the emitter (non-blocking).
 */
class GamificationEventBus {
  private emitter: EventEmitter;
  private initialized = false;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(20); // Allow many consumers
  }

  /**
   * Emit a gamification event. Called from controllers after qualifying actions.
   * This is fire-and-forget — errors in consumers are caught and logged.
   */
  emit(
    type: ActivityEventType,
    data: {
      userId: string;
      entityId?: string;
      entityType?: string;
      amount?: number;
      storeId?: string;
      categorySlug?: string;
      metadata?: Record<string, any>;
      source?: { controller: string; action: string };
    }
  ): void {
    const event: ActivityEvent = {
      userId: data.userId,
      eventId: uuidv4(),
      timestamp: new Date(),
      type,
      category: this.inferCategory(type),
      data: {
        entityId: data.entityId,
        entityType: data.entityType,
        amount: data.amount,
        storeId: data.storeId,
        categorySlug: data.categorySlug,
        metadata: data.metadata
      },
      source: data.source || { controller: 'unknown', action: type }
    };

    // Emit asynchronously to not block the caller
    setImmediate(() => {
      try {
        this.emitter.emit('gamification_event', event);
        this.emitter.emit(`event:${type}`, event);
      } catch (error) {
        console.error(`[EVENT BUS] Error emitting event ${type}:`, error);
      }
    });
  }

  /**
   * Register a handler for all gamification events.
   */
  onAll(handler: (event: ActivityEvent) => Promise<void> | void): void {
    this.emitter.on('gamification_event', async (event: ActivityEvent) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EVENT BUS] Handler error for ${event.type}:`, error);
      }
    });
  }

  /**
   * Register a handler for a specific event type.
   */
  on(type: ActivityEventType, handler: (event: ActivityEvent) => Promise<void> | void): void {
    this.emitter.on(`event:${type}`, async (event: ActivityEvent) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EVENT BUS] Handler error for ${type}:`, error);
      }
    });
  }

  /**
   * Initialize all event handlers. Called once at server startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Import and register handlers
    try {
      const { registerAchievementHandler } = await import('./handlers/achievementProgressHandler');
      const { registerChallengeHandler } = await import('./handlers/challengeProgressHandler');
      const { registerStreakHandler } = await import('./handlers/streakHandler');
      const { registerLeaderboardHandler } = await import('./handlers/leaderboardHandler');

      registerAchievementHandler(this);
      registerChallengeHandler(this);
      registerStreakHandler(this);
      registerLeaderboardHandler(this);

      this.initialized = true;
      console.log('[EVENT BUS] Gamification event bus initialized with all handlers');
    } catch (error) {
      console.error('[EVENT BUS] Failed to initialize handlers:', error);
    }
  }

  private inferCategory(type: ActivityEventType): EventCategory {
    if (type.startsWith('order')) return 'order';
    if (type.startsWith('review')) return 'review';
    if (type.startsWith('referral')) return 'referral';
    if (type.startsWith('video')) return 'video';
    if (type.startsWith('bill')) return 'bill';
    if (type.startsWith('game') || type.startsWith('quiz')) return 'game';
    if (type.startsWith('social') || type.startsWith('favorite') || type.startsWith('wishlist')) return 'social';
    if (type.startsWith('login') || type.startsWith('daily')) return 'login';
    if (type.startsWith('project')) return 'project';
    if (type.startsWith('offer')) return 'offer';
    if (type.startsWith('challenge')) return 'event';
    return 'event';
  }
}

// Singleton
const gamificationEventBus = new GamificationEventBus();
export default gamificationEventBus;

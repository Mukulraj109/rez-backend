import type { ActivityEvent } from '../gamificationEventBus';

/**
 * Streak Handler
 *
 * Updates user streaks based on login and activity events.
 */

const EVENT_TO_STREAK_TYPE: Record<string, string> = {
  login: 'login',
  daily_checkin: 'login',
  order_placed: 'order',
  order_delivered: 'order',
  review_submitted: 'review',
};

export function registerStreakHandler(eventBus: any): void {
  eventBus.onAll(async (event: ActivityEvent) => {
    const streakType = EVENT_TO_STREAK_TYPE[event.type];
    if (!streakType) return;

    try {
      const streakService = (await import('../../services/streakService')).default;

      if (streakService && typeof streakService.updateStreak === 'function') {
        await streakService.updateStreak(event.userId, streakType as 'login' | 'order' | 'review');
      }
    } catch (error) {
      console.error(`[STREAK HANDLER] Error processing ${event.type} for user ${event.userId}:`, error);
    }
  });

  console.log('[STREAK HANDLER] Registered streak handler');
}

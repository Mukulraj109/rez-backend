import type { ActivityEvent, ActivityEventType } from '../gamificationEventBus';
import { priveMissionService } from '../../services/priveMissionService';

/**
 * Mission Progress Handler
 *
 * Maps gamification events to mission progress tracking.
 * Registered in gamificationEventBus.initialize()
 */
export function registerMissionProgressHandler(eventBus: any): void {
  // Events that can advance mission progress
  const missionEvents: ActivityEventType[] = [
    'order_placed',
    'review_submitted',
    'referral_completed',
    'social_share',
    'daily_checkin',
    'offer_redeemed',
    'bill_uploaded',
    'invite_applied',
  ];

  for (const eventType of missionEvents) {
    eventBus.on(eventType, async (event: ActivityEvent) => {
      try {
        await priveMissionService.trackProgress(
          event.userId.toString(),
          event.type,
          event.data as Record<string, any>
        );
      } catch (err) {
        console.error(`[MISSION] Error tracking progress for ${eventType}:`, err);
      }
    });
  }

  console.log('[MISSION HANDLER] Registered mission progress handler');
}

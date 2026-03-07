import { Request, Response, NextFunction } from 'express';
import { isGamificationEnabled, GamificationFeature } from '../config/gamificationFeatureFlags';
import { sendSuccess } from '../utils/response';

/**
 * Route-level middleware that short-circuits with 200 + empty data
 * when a gamification feature is disabled. Frontend gets a graceful
 * response (not 404), preventing crashes.
 */
export function requireGamificationFeature(
  feature: GamificationFeature,
  emptyResponse: Record<string, any> = {}
) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!isGamificationEnabled(feature)) {
      return sendSuccess(res, emptyResponse);
    }
    next();
  };
}

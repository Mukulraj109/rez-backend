import { Request, Response } from 'express';
declare class StreakController {
    getUserStreaks(req: Request, res: Response): Promise<void>;
    updateStreak(req: Request, res: Response): Promise<void>;
    claimMilestone(req: Request, res: Response): Promise<void>;
    freezeStreak(req: Request, res: Response): Promise<void>;
    getStreakStatistics(req: Request, res: Response): Promise<void>;
    /**
     * Get current user's login streak (JWT-based, no userId param)
     * GET /api/gamification/streaks
     * @returns User's login streak data with lastLogin timestamp
     */
    getCurrentUserStreak(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: StreakController;
export default _default;

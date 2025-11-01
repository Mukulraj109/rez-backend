import { Request, Response } from 'express';
declare class StreakController {
    getUserStreaks(req: Request, res: Response): Promise<void>;
    updateStreak(req: Request, res: Response): Promise<void>;
    claimMilestone(req: Request, res: Response): Promise<void>;
    freezeStreak(req: Request, res: Response): Promise<void>;
    getStreakStatistics(req: Request, res: Response): Promise<void>;
}
declare const _default: StreakController;
export default _default;

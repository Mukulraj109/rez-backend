import { Request, Response } from 'express';
declare class LeaderboardController {
    getSpendingLeaderboard(req: Request, res: Response): Promise<void>;
    getReviewLeaderboard(req: Request, res: Response): Promise<void>;
    getReferralLeaderboard(req: Request, res: Response): Promise<void>;
    getCashbackLeaderboard(req: Request, res: Response): Promise<void>;
    getStreakLeaderboard(req: Request, res: Response): Promise<void>;
    getAllLeaderboards(req: Request, res: Response): Promise<void>;
    getMyRank(req: Request, res: Response): Promise<void>;
}
declare const _default: LeaderboardController;
export default _default;

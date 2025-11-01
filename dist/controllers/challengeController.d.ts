import { Request, Response } from 'express';
declare class ChallengeController {
    getDailyChallenges(req: Request, res: Response): Promise<void>;
    getActiveChallenges(req: Request, res: Response): Promise<void>;
    getMyProgress(req: Request, res: Response): Promise<void>;
    joinChallenge(req: Request, res: Response): Promise<void>;
    claimRewards(req: Request, res: Response): Promise<void>;
    getChallengeLeaderboard(req: Request, res: Response): Promise<void>;
    getStatistics(req: Request, res: Response): Promise<void>;
    generateDailyChallenges(req: Request, res: Response): Promise<void>;
}
declare const _default: ChallengeController;
export default _default;

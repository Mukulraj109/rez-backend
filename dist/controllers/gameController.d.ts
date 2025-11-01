import { Request, Response } from 'express';
declare class GameController {
    createSpinWheel(req: Request, res: Response): Promise<void>;
    playSpinWheel(req: Request, res: Response): Promise<void>;
    createScratchCard(req: Request, res: Response): Promise<void>;
    playScratchCard(req: Request, res: Response): Promise<void>;
    createQuiz(req: Request, res: Response): Promise<void>;
    submitQuiz(req: Request, res: Response): Promise<void>;
    getDailyTrivia(req: Request, res: Response): Promise<void>;
    answerDailyTrivia(req: Request, res: Response): Promise<void>;
    getMyGames(req: Request, res: Response): Promise<void>;
    getPendingGames(req: Request, res: Response): Promise<void>;
    getGameStatistics(req: Request, res: Response): Promise<void>;
}
declare const _default: GameController;
export default _default;

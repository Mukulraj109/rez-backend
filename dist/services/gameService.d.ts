import { IGameSession } from '../models/GameSession';
declare class GameService {
    createSpinWheelSession(userId: string, earnedFrom?: string): Promise<IGameSession>;
    playSpinWheel(sessionId: string): Promise<IGameSession>;
    createScratchCardSession(userId: string, earnedFrom: string): Promise<IGameSession>;
    playScratchCard(sessionId: string): Promise<IGameSession>;
    createQuizSession(userId: string, questions: any[]): Promise<IGameSession>;
    submitQuizAnswers(sessionId: string, answers: {
        questionId: string;
        answer: string;
    }[], correctAnswers: {
        questionId: string;
        answer: string;
    }[]): Promise<IGameSession>;
    getDailyTrivia(): Promise<any>;
    answerDailyTrivia(userId: string, questionId: string, answer: string): Promise<{
        correct: boolean;
        coins: number;
    }>;
    getUserGameSessions(userId: string, gameType?: string, limit?: number): Promise<IGameSession[]>;
    getPendingGames(userId: string): Promise<IGameSession[]>;
    getGameStats(userId: string): Promise<any>;
    private getWeightedRandomPrize;
    expireOldSessions(): Promise<number>;
}
declare const _default: GameService;
export default _default;

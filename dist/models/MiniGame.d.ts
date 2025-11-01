import mongoose, { Document } from 'mongoose';
export interface IMiniGame extends Document {
    user: mongoose.Types.ObjectId;
    gameType: 'spin_wheel' | 'scratch_card' | 'quiz';
    status: 'active' | 'completed' | 'expired';
    difficulty?: 'easy' | 'medium' | 'hard';
    startedAt: Date;
    completedAt?: Date;
    expiresAt: Date;
    reward?: {
        coins?: number;
        cashback?: number;
        discount?: number;
        voucher?: string;
        badge?: string;
    };
    metadata?: {
        segment?: number;
        prize?: string;
        grid?: Array<{
            index: number;
            prize: string;
            type: string;
            value: number;
            revealed: boolean;
        }>;
        scratchedCells?: number[];
        winningCells?: number[];
        winningPrize?: {
            type: 'coins' | 'cashback' | 'discount' | 'voucher' | 'nothing';
            value: number;
            label: string;
            color: string;
        };
        revealed?: boolean;
        revealedPrize?: boolean;
        gridSize?: number;
        questions?: any[];
        answers?: any[];
        score?: number;
        currentQuestion?: number;
        correctAnswers?: number;
        totalQuestions?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const MiniGame: mongoose.Model<IMiniGame, {}, {}, {}, mongoose.Document<unknown, {}, IMiniGame, {}, {}> & IMiniGame & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;

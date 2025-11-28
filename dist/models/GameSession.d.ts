import mongoose, { Document } from 'mongoose';
export interface IGameSession extends Document {
    user: mongoose.Types.ObjectId;
    gameType: 'spin_wheel' | 'scratch_card' | 'quiz' | 'daily_trivia';
    sessionId: string;
    status: 'pending' | 'playing' | 'completed' | 'expired';
    startedAt: Date;
    completedAt?: Date;
    result?: {
        won: boolean;
        prize?: {
            type: 'coins' | 'discount' | 'free_delivery' | 'cashback_multiplier' | 'badge';
            value: number | string;
            description: string;
        };
        score?: number;
    };
    earnedFrom?: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    complete(result: any): Promise<IGameSession>;
}
export interface IGameSessionModel extends mongoose.Model<IGameSession> {
    expireSessions(): Promise<any>;
}
declare const _default: IGameSessionModel;
export default _default;

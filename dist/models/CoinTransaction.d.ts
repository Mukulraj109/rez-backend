import mongoose, { Document, Model } from 'mongoose';
export interface ICoinTransaction extends Document {
    user: mongoose.Types.ObjectId;
    type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus';
    amount: number;
    balance: number;
    source: 'spin_wheel' | 'scratch_card' | 'quiz_game' | 'challenge' | 'achievement' | 'referral' | 'order' | 'review' | 'bill_upload' | 'daily_login' | 'admin' | 'purchase' | 'redemption' | 'expiry';
    description: string;
    metadata?: {
        gameId?: mongoose.Types.ObjectId;
        achievementId?: mongoose.Types.ObjectId;
        challengeId?: mongoose.Types.ObjectId;
        orderId?: mongoose.Types.ObjectId;
        referralId?: mongoose.Types.ObjectId;
        productId?: mongoose.Types.ObjectId;
        voucherId?: mongoose.Types.ObjectId;
        [key: string]: any;
    };
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ICoinTransactionModel extends Model<ICoinTransaction> {
    getUserBalance(userId: string): Promise<number>;
    createTransaction(userId: string, type: string, amount: number, source: string, description: string, metadata?: any): Promise<ICoinTransaction>;
    expireOldCoins(userId: string, daysToExpire?: number): Promise<number>;
}
export declare const CoinTransaction: any;

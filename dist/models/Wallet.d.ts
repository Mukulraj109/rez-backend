import { Document, Types, Model } from 'mongoose';
export interface IWalletModel extends Model<IWallet> {
    createForUser(userId: Types.ObjectId): Promise<IWallet>;
    getWithSummary(userId: Types.ObjectId, period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
}
export interface ICoinBalance {
    type: 'wasil' | 'promotion' | 'cashback' | 'reward';
    amount: number;
    isActive: boolean;
    earnedDate?: Date;
    lastUsed?: Date;
    expiryDate?: Date;
}
export interface IWallet extends Document {
    user: Types.ObjectId;
    balance: {
        total: number;
        available: number;
        pending: number;
    };
    coins: ICoinBalance[];
    currency: string;
    statistics: {
        totalEarned: number;
        totalSpent: number;
        totalCashback: number;
        totalRefunds: number;
        totalTopups: number;
        totalWithdrawals: number;
    };
    limits: {
        maxBalance: number;
        minWithdrawal: number;
        dailySpendLimit: number;
        dailySpent: number;
        lastResetDate: Date;
    };
    settings: {
        autoTopup: boolean;
        autoTopupThreshold: number;
        autoTopupAmount: number;
        lowBalanceAlert: boolean;
        lowBalanceThreshold: number;
    };
    isActive: boolean;
    isFrozen: boolean;
    frozenReason?: string;
    frozenAt?: Date;
    lastTransactionAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    canSpend(amount: number): boolean;
    addFunds(amount: number, type: string): Promise<void>;
    deductFunds(amount: number): Promise<void>;
    freeze(reason: string): Promise<void>;
    unfreeze(): Promise<void>;
    resetDailyLimit(): Promise<void>;
    getFormattedBalance(): string;
}
export declare const Wallet: IWalletModel;

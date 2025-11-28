import mongoose, { Document, Model } from 'mongoose';
export interface ISpinWheelSegment {
    id: string;
    label: string;
    value: number;
    color: string;
    type: 'coins' | 'discount' | 'voucher' | 'nothing';
    icon: string;
    probability?: number;
}
export interface ISpinWheelConfig extends Document {
    isActive: boolean;
    segments: ISpinWheelSegment[];
    rulesPerDay: {
        maxSpins: number;
        spinResetHour: number;
    };
    cooldownMinutes: number;
    rewardExpirationDays: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SpinWheelConfig: Model<ISpinWheelConfig>;
export interface ISpinWheelSpin extends Document {
    userId: mongoose.Types.ObjectId;
    segmentId: string;
    segmentLabel: string;
    rewardType: 'coins' | 'discount' | 'voucher' | 'nothing';
    rewardValue: number;
    spinTimestamp: Date;
    claimedAt?: Date;
    status: 'pending' | 'claimed' | 'expired';
    expiresAt: Date;
    ipAddress?: string;
    deviceInfo?: {
        platform: string;
        appVersion: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const SpinWheelSpin: Model<ISpinWheelSpin>;
export interface IUserSpinMetrics extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    spinsUsedToday: number;
    spinsRemaining: number;
    lastSpinAt?: Date;
    nextSpinEligibleAt?: Date;
    totalCoinsEarned: number;
    totalSpinsCompleted: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserSpinMetrics: Model<IUserSpinMetrics>;
/**
 * Get start of day in UTC
 */
export declare function getStartOfDayUTC(date?: Date): Date;
/**
 * Get end of day in UTC
 */
export declare function getEndOfDayUTC(date?: Date): Date;

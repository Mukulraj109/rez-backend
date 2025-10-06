import mongoose, { Document, Types } from 'mongoose';
export interface IUserProfile {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    location?: {
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        coordinates?: [number, number];
    };
    locationHistory?: Array<{
        coordinates: [number, number];
        address: string;
        city?: string;
        timestamp: Date;
        source: 'manual' | 'gps' | 'ip';
    }>;
    timezone?: string;
}
export interface IUserPreferences {
    language?: string;
    notifications?: boolean;
    categories?: Types.ObjectId[];
    theme?: 'light' | 'dark';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
}
export interface IUserWallet {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    pendingAmount: number;
}
export interface IUserAuth {
    isVerified: boolean;
    isOnboarded: boolean;
    lastLogin?: Date;
    refreshToken?: string;
    otpCode?: string;
    otpExpiry?: Date;
    loginAttempts: number;
    lockUntil?: Date;
}
export interface IUserReferral {
    referralCode: string;
    referredBy?: string;
    referredUsers: string[];
    totalReferrals: number;
    referralEarnings: number;
}
export interface IUser extends Document {
    phoneNumber: string;
    email?: string;
    password?: string;
    profile: IUserProfile;
    preferences: IUserPreferences;
    wallet: IUserWallet;
    auth: IUserAuth;
    referral: IUserReferral;
    socialLogin?: {
        googleId?: string;
        facebookId?: string;
        provider?: 'google' | 'facebook';
    };
    role: 'user' | 'admin' | 'merchant';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateOTP(): string;
    verifyOTP(otp: string): boolean;
    isAccountLocked(): boolean;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;

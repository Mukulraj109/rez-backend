import { Document, Types } from 'mongoose';
export interface IUserProfile {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
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
    ringSize?: string;
    jewelryPreferences?: {
        preferredMetals?: string[];
        preferredStones?: string[];
        style?: 'traditional' | 'modern' | 'vintage' | 'contemporary';
    };
    verificationStatus?: 'pending' | 'approved' | 'rejected';
    verificationDocuments?: {
        documentType: string;
        documentNumber: string;
        documentImage: string;
        submittedAt: Date;
    };
}
export interface IUserPreferences {
    language?: string;
    notifications?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
    };
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
    walletBalance?: number;
    referralCode?: string;
    fullName?: string;
    username?: string;
    referralTier?: 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
    isPremium?: boolean;
    premiumExpiresAt?: Date;
    userType?: string;
    age?: number;
    location?: string;
    interests?: string[];
    phone?: string;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateOTP(): string;
    verifyOTP(otp: string): boolean;
    isAccountLocked(): boolean;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
}
export declare const User: any;

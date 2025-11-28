export interface ReferralTier {
    name: string;
    referralsRequired: number;
    badge: string;
    rewards: {
        tierBonus?: number;
        perReferral?: number;
        voucher?: {
            type: string;
            amount: number;
        };
        lifetimePremium?: boolean;
    };
}
export interface ReferralReward {
    type: 'coins' | 'voucher' | 'premium';
    amount?: number;
    voucherCode?: string;
    voucherType?: string;
    claimed: boolean;
    claimedAt?: Date;
    expiresAt?: Date;
}
export interface QualificationCriteria {
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
}
export declare const REFERRAL_TIERS: Record<string, ReferralTier>;
export declare const DEFAULT_QUALIFICATION_CRITERIA: QualificationCriteria;
export declare enum ReferralStatus {
    PENDING = "pending",
    REGISTERED = "registered",
    ACTIVE = "active",
    QUALIFIED = "qualified",
    EXPIRED = "expired"
}
export interface ReferralStats {
    totalReferrals: number;
    qualifiedReferrals: number;
    pendingReferrals: number;
    lifetimeEarnings: number;
    currentTier: string;
    nextTier: string | null;
    progressToNextTier: number;
    successRate: number;
}
export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatar?: string;
    totalReferrals: number;
    tier: string;
    rank: number;
}
export interface ShareTemplate {
    type: 'whatsapp' | 'facebook' | 'twitter' | 'sms' | 'email';
    message: string;
    subject?: string;
}

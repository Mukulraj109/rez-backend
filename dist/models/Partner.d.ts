import mongoose, { Document } from 'mongoose';
export interface IPartnerBenefits {
    cashbackRate: number;
    birthdayDiscount: number;
    freeDeliveryThreshold: number;
    prioritySupport: boolean;
    earlyAccessSales: boolean;
    transactionBonus?: {
        every: number;
        reward: number;
    };
    descriptions: string[];
}
export declare const LEVEL_OFFERS: {
    PARTNER: {
        title: string;
        description: string;
        discount: number;
        category: string;
        minPurchase: number;
        maxDiscount: number;
        termsAndConditions: string[];
    }[];
    INFLUENCER: {
        title: string;
        description: string;
        discount: number;
        category: string;
        minPurchase: number;
        maxDiscount: number;
        termsAndConditions: string[];
    }[];
    AMBASSADOR: {
        title: string;
        description: string;
        discount: number;
        category: string;
        minPurchase: number;
        maxDiscount: number;
        termsAndConditions: string[];
    }[];
};
export declare const PARTNER_LEVELS: {
    PARTNER: {
        level: number;
        name: string;
        requirements: {
            orders: number;
            timeframe: number;
        };
        benefits: IPartnerBenefits;
    };
    INFLUENCER: {
        level: number;
        name: string;
        requirements: {
            orders: number;
            timeframe: number;
        };
        benefits: IPartnerBenefits;
    };
    AMBASSADOR: {
        level: number;
        name: string;
        requirements: {
            orders: number;
            timeframe: number;
        };
        benefits: IPartnerBenefits;
    };
};
export interface IPartnerLevel {
    level: number;
    name: 'Partner' | 'Influencer' | 'Ambassador';
    requirements: {
        orders: number;
        timeframe: number;
    };
    achievedAt: Date;
}
export interface IOrderMilestone {
    orderCount: number;
    reward: {
        type: 'cashback' | 'discount' | 'points' | 'voucher';
        value: number;
        title: string;
        description?: string;
    };
    achieved: boolean;
    claimedAt?: Date;
}
export interface IRewardTask {
    title: string;
    description: string;
    type: 'review' | 'purchase' | 'referral' | 'social' | 'profile';
    reward: {
        type: 'cashback' | 'discount' | 'points' | 'voucher';
        value: number;
        title: string;
    };
    progress: {
        current: number;
        target: number;
    };
    completed: boolean;
    claimed: boolean;
    completedAt?: Date;
    claimedAt?: Date;
}
export interface IJackpotMilestone {
    spendAmount: number;
    title: string;
    description: string;
    reward: {
        type: 'cashback' | 'discount' | 'points' | 'voucher' | 'product';
        value: number;
        title: string;
    };
    achieved: boolean;
    claimedAt?: Date;
}
export interface IClaimableOffer {
    title: string;
    description: string;
    discount: number;
    category: string;
    validFrom: Date;
    validUntil: Date;
    termsAndConditions: string[];
    claimed: boolean;
    claimedAt?: Date;
    voucherCode?: string;
    minPurchase?: number;
    maxDiscount?: number;
}
export interface IPartner extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    email: string;
    avatar?: string;
    phoneNumber?: string;
    currentLevel: IPartnerLevel;
    levelHistory: IPartnerLevel[];
    totalOrders: number;
    ordersThisLevel: number;
    totalSpent: number;
    joinDate: Date;
    levelStartDate: Date;
    validUntil: Date;
    milestones: IOrderMilestone[];
    tasks: IRewardTask[];
    jackpotProgress: IJackpotMilestone[];
    claimableOffers: IClaimableOffer[];
    earnings: {
        total: number;
        pending: number;
        paid: number;
        thisMonth: number;
        lastMonth: number;
    };
    isActive: boolean;
    status: 'active' | 'inactive' | 'suspended';
    lastActivityDate: Date;
    createdAt: Date;
    updatedAt: Date;
    getDaysRemaining(): number;
    getOrdersNeededForNextLevel(): number;
    canUpgradeLevel(): boolean;
    upgradeLevel(): void;
    isLevelExpired(): boolean;
    handleLevelExpiry(): void;
}
declare const _default: any;
export default _default;

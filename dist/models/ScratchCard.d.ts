import mongoose, { Document, Model } from 'mongoose';
export interface IScratchCardPrize {
    id: string;
    type: 'discount' | 'cashback' | 'coin' | 'voucher';
    value: number;
    title: string;
    description: string;
    icon: string;
    color: string;
    isActive: boolean;
}
export interface IScratchCard extends Document {
    userId: mongoose.Types.ObjectId;
    prize: IScratchCardPrize;
    isScratched: boolean;
    isClaimed: boolean;
    claimedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IScratchCardModel extends Model<IScratchCard> {
    createScratchCard(userId: string): Promise<IScratchCard>;
    getUserScratchCards(userId: string): Promise<IScratchCard[]>;
    claimPrize(scratchCardId: string, userId: string): Promise<IScratchCard>;
    isEligibleForScratchCard(userId: string): Promise<boolean>;
}
export declare const ScratchCard: any;
export default ScratchCard;

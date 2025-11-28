import { IPartnerBenefits } from '../models/Partner';
interface OrderBenefitData {
    subtotal: number;
    deliveryFee: number;
    userId: string;
}
interface AppliedBenefits {
    cashbackRate: number;
    cashbackAmount: number;
    deliveryFee: number;
    deliverySavings: number;
    birthdayDiscount: number;
    totalSavings: number;
    appliedBenefits: string[];
    isBirthdayMonth: boolean;
}
declare class PartnerBenefitsService {
    /**
     * Get partner's current benefits configuration
     */
    getPartnerBenefits(userId: string): Promise<IPartnerBenefits | null>;
    /**
     * Check if current month is user's birthday month
     */
    isUserBirthdayMonth(userId: string): Promise<boolean>;
    /**
     * Apply partner benefits to order
     */
    applyPartnerBenefits(orderData: OrderBenefitData): Promise<AppliedBenefits>;
    /**
     * Check and reward transaction bonus (every 11 orders)
     */
    checkTransactionBonus(userId: string): Promise<number>;
    /**
     * Get all partner levels with their benefits
     */
    getAllLevelBenefits(): Array<{
        level: number;
        name: string;
        requirements: {
            orders: number;
            timeframe: number;
        };
        benefits: IPartnerBenefits;
    }>;
}
declare const partnerBenefitsService: PartnerBenefitsService;
export default partnerBenefitsService;

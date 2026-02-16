// Partner Benefits Service
// Handles application of partner level benefits to orders

import Partner, { PARTNER_LEVELS, IPartnerBenefits } from '../models/Partner';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import mongoose from 'mongoose';
import { pct } from '../utils/currency';

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

class PartnerBenefitsService {
  /**
   * Get partner's current benefits configuration
   */
  async getPartnerBenefits(userId: string): Promise<IPartnerBenefits | null> {
    try {
      const partner = await Partner.findOne({ userId });
      if (!partner || !partner.isActive) {
        return null;
      }
      
      const levelConfig = Object.values(PARTNER_LEVELS).find(
        (l: any) => l.level === partner.currentLevel.level
      );
      
      return levelConfig?.benefits || null;
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error getting benefits:', error);
      return null;
    }
  }
  
  /**
   * Check if current month is user's birthday month
   */
  async isUserBirthdayMonth(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user?.profile?.dateOfBirth) {
        return false;
      }
      
      const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
      const currentMonth = new Date().getMonth();
      
      return birthMonth === currentMonth;
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error checking birthday:', error);
      return false;
    }
  }
  
  /**
   * Apply partner benefits to order
   */
  async applyPartnerBenefits(orderData: OrderBenefitData): Promise<AppliedBenefits> {
    try {
      const benefits = await this.getPartnerBenefits(orderData.userId);
      
      // Default values (no partner benefits)
      const defaultResult: AppliedBenefits = {
        cashbackRate: 2, // Base 2% cashback
        cashbackAmount: pct(orderData.subtotal, 2),
        deliveryFee: orderData.deliveryFee,
        deliverySavings: 0,
        birthdayDiscount: 0,
        totalSavings: 0,
        appliedBenefits: [],
        isBirthdayMonth: false
      };
      
      if (!benefits) {
        console.log('ℹ️ [PARTNER BENEFITS] No partner benefits found, using defaults');
        return defaultResult;
      }
      
      const appliedBenefits: string[] = [];
      let totalSavings = 0;
      let deliveryFee = orderData.deliveryFee;
      let deliverySavings = 0;
      let birthdayDiscount = 0;
      
      // Check if birthday month
      const isBirthdayMonth = await this.isUserBirthdayMonth(orderData.userId);
      
      // Apply partner cashback rate
      const cashbackRate = benefits.cashbackRate;
      const cashbackAmount = pct(orderData.subtotal, cashbackRate);
      totalSavings += cashbackAmount;
      appliedBenefits.push(`${cashbackRate}% Partner Cashback`);
      console.log(`✅ [PARTNER BENEFITS] Applied ${cashbackRate}% cashback: ₹${cashbackAmount}`);
      
      // Apply free delivery if eligible
      if (orderData.subtotal >= benefits.freeDeliveryThreshold && orderData.deliveryFee > 0) {
        deliverySavings = deliveryFee;
        totalSavings += deliverySavings;
        deliveryFee = 0;
        appliedBenefits.push('Free Delivery');
        console.log(`✅ [PARTNER BENEFITS] Applied free delivery: ₹${deliverySavings} saved`);
      }
      
      // Apply birthday discount if in birthday month
      if (isBirthdayMonth && benefits.birthdayDiscount > 0) {
        birthdayDiscount = pct(orderData.subtotal, benefits.birthdayDiscount);
        totalSavings += birthdayDiscount;
        appliedBenefits.push(`${benefits.birthdayDiscount}% Birthday Discount`);
        console.log(`🎂 [PARTNER BENEFITS] Applied birthday discount: ₹${birthdayDiscount}`);
      }
      
      console.log(`💰 [PARTNER BENEFITS] Total savings: ₹${totalSavings}`);
      
      return {
        cashbackRate,
        cashbackAmount,
        deliveryFee,
        deliverySavings,
        birthdayDiscount,
        totalSavings,
        appliedBenefits,
        isBirthdayMonth
      };
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error applying benefits:', error);
      return {
        cashbackRate: 2,
        cashbackAmount: pct(orderData.subtotal, 2),
        deliveryFee: orderData.deliveryFee,
        deliverySavings: 0,
        birthdayDiscount: 0,
        totalSavings: 0,
        appliedBenefits: [],
        isBirthdayMonth: false
      };
    }
  }
  
  /**
   * Check and reward transaction bonus (every 11 orders)
   */
  async checkTransactionBonus(userId: string): Promise<number> {
    try {
      const partner = await Partner.findOne({ userId });
      if (!partner || !partner.isActive) {
        return 0;
      }
      
      const benefits = await this.getPartnerBenefits(userId);
      if (!benefits || !benefits.transactionBonus) {
        return 0;
      }
      
      const { every, reward } = benefits.transactionBonus;
      
      // Check if current order count is a multiple of bonus threshold
      if (partner.totalOrders > 0 && partner.totalOrders % every === 0) {
        console.log(`🎁 [PARTNER BENEFITS] Transaction bonus triggered! ${partner.totalOrders} orders (every ${every})`);
        
        // Add bonus to wallet
        try {
          let wallet = await Wallet.findOne({ user: userId });
          
          if (!wallet) {
            console.log(`⚠️ [PARTNER BENEFITS] Wallet not found, creating for user ${userId}`);
            wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
          }
          
          if (wallet) {
            wallet.balance.total += reward;
            wallet.balance.available += reward;
            wallet.statistics.totalEarned += reward;
            await wallet.save();
            console.log(`✅ [PARTNER BENEFITS] Added ₹${reward} transaction bonus to wallet`);
          }
        } catch (walletError) {
          console.error('❌ [PARTNER BENEFITS] Error adding bonus to wallet:', walletError);
        }
        
        return reward;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error checking transaction bonus:', error);
      return 0;
    }
  }
  
  /**
   * Get all partner levels with their benefits
   */
  getAllLevelBenefits(): Array<{
    level: number;
    name: string;
    requirements: { orders: number; timeframe: number };
    benefits: IPartnerBenefits;
  }> {
    return Object.values(PARTNER_LEVELS).map((levelConfig: any) => ({
      level: levelConfig.level,
      name: levelConfig.name,
      requirements: levelConfig.requirements,
      benefits: levelConfig.benefits
    }));
  }
}

// Export singleton instance
const partnerBenefitsService = new PartnerBenefitsService();
export default partnerBenefitsService;


import axios from 'axios';
import Referral from '../models/Referral';
import { Types } from 'mongoose';

interface VoucherProvider {
  name: string;
  apiEndpoint: string;
  apiKey: string;
}

interface VoucherGenerationResult {
  success: boolean;
  voucherCode: string;
  voucherType: string;
  amount: number;
  expiresAt: Date;
  redemptionUrl?: string;
  message?: string;
}

export class VoucherRedemptionService {
  private providers: Record<string, VoucherProvider> = {
    Amazon: {
      name: 'Amazon',
      apiEndpoint: process.env.AMAZON_VOUCHER_API || 'https://api.amazon.com/vouchers',
      apiKey: process.env.AMAZON_API_KEY || ''
    },
    Flipkart: {
      name: 'Flipkart',
      apiEndpoint: process.env.FLIPKART_VOUCHER_API || 'https://api.flipkart.com/vouchers',
      apiKey: process.env.FLIPKART_API_KEY || ''
    },
    // Add more providers as needed
  };

  /**
   * Generate a voucher code
   */
  async generateVoucher(
    type: string,
    amount: number,
    userId: string | Types.ObjectId
  ): Promise<VoucherGenerationResult> {
    const provider = this.providers[type];

    if (!provider) {
      // Fallback to generated code if provider not configured
      return this.generateFallbackVoucher(type, amount);
    }

    try {
      // TODO: Integrate with actual voucher provider API
      // This is a placeholder implementation
      const response = await this.callVoucherAPI(provider, amount, userId);

      return {
        success: true,
        voucherCode: response.code,
        voucherType: type,
        amount,
        expiresAt: response.expiresAt || this.getDefaultExpiry(),
        redemptionUrl: response.redemptionUrl
      };
    } catch (error) {
      console.error('Voucher generation failed:', error);
      // Fallback to generated code
      return this.generateFallbackVoucher(type, amount);
    }
  }

  /**
   * Generate fallback voucher code when API is unavailable
   */
  private generateFallbackVoucher(type: string, amount: number): VoucherGenerationResult {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `REZ-${prefix}-${amount}-${timestamp}${random}`;

    return {
      success: true,
      voucherCode,
      voucherType: type,
      amount,
      expiresAt: this.getDefaultExpiry(),
      message: 'Voucher code generated. Please contact support to activate.'
    };
  }

  /**
   * Call external voucher provider API
   */
  private async callVoucherAPI(
    provider: VoucherProvider,
    amount: number,
    userId: string | Types.ObjectId
  ): Promise<any> {
    // TODO: Implement actual API integration
    // This is a placeholder that simulates API call

    if (!provider.apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    /*
    const response = await axios.post(
      provider.apiEndpoint,
      {
        amount,
        currency: 'INR',
        userId: userId.toString(),
        source: 'REZ_REFERRAL'
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
    */

    // Placeholder response
    throw new Error('API not implemented');
  }

  /**
   * Claim a voucher reward
   */
  async claimVoucher(
    userId: string | Types.ObjectId,
    referralId: string | Types.ObjectId
  ) {
    const referral = await Referral.findById(referralId);

    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.referrer.toString() !== userId.toString()) {
      throw new Error('Unauthorized: Not your referral');
    }

    const reward = referral.rewards;

    if (!reward.voucherCode) {
      throw new Error('No voucher available for this referral');
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      throw new Error('Voucher has expired');
    }

    // TODO: Send voucher via email
    await this.sendVoucherEmail(userId, reward);

    return {
      success: true,
      voucherCode: reward.voucherCode,
      voucherType: reward.voucherType,
      description: reward.description,
      message: 'Voucher claimed successfully! Check your email for details.'
    };
  }

  /**
   * Send voucher details via email
   */
  private async sendVoucherEmail(userId: string | Types.ObjectId, reward: any) {
    // TODO: Integrate with email service
    console.log(`Sending voucher email to user ${userId}:`, {
      code: reward.voucherCode,
      type: reward.voucherType,
      amount: reward.amount
    });

    // Placeholder for email integration
    /*
    await emailService.send({
      to: user.email,
      subject: `Your ${reward.voucherType} Voucher - ₹${reward.amount}`,
      template: 'voucher-claimed',
      data: {
        voucherCode: reward.voucherCode,
        voucherType: reward.voucherType,
        amount: reward.amount,
        expiresAt: reward.expiresAt
      }
    });
    */
  }

  /**
   * Check voucher validity
   */
  async checkVoucherValidity(voucherCode: string): Promise<boolean> {
    const referral = await Referral.findOne({
      'rewards.voucherCode': voucherCode
    });

    if (!referral) return false;

    const reward = referral.rewards;

    if (!reward.voucherCode || reward.voucherCode !== voucherCode) return false;
    if (referral.expiresAt && referral.expiresAt < new Date()) return false;

    return true;
  }

  /**
   * Get default expiry date (1 year from now)
   */
  private getDefaultExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  /**
   * Get all claimable vouchers for user
   */
  async getClaimableVouchers(userId: string | Types.ObjectId) {
    const referrals = await Referral.find({
      referrer: userId
    });

    const claimableVouchers = [];

    for (const referral of referrals) {
      const reward = referral.rewards;

      // Check if voucher exists and is not expired
      if (reward.voucherCode) {
        if (!referral.expiresAt || referral.expiresAt > new Date()) {
          claimableVouchers.push({
            referralId: referral._id,
            voucherCode: reward.voucherCode,
            voucherType: reward.voucherType,
            expiresAt: referral.expiresAt,
            description: reward.description
          });
        }
      }
    }

    return claimableVouchers;
  }

  /**
   * Get claimed vouchers history
   */
  async getClaimedVouchers(userId: string | Types.ObjectId) {
    const referrals = await Referral.find({
      referrer: userId,
      'rewards.voucherCode': { $exists: true }
    });

    const claimedVouchers = [];

    for (const referral of referrals) {
      const reward = referral.rewards;

      if (reward.voucherCode) {
        claimedVouchers.push({
          voucherCode: reward.voucherCode,
          voucherType: reward.voucherType,
          expiresAt: referral.expiresAt,
          description: reward.description,
          referralId: referral._id,
          createdAt: referral.createdAt
        });
      }
    }

    return claimedVouchers.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
}

export default new VoucherRedemptionService();

/**
 * Referral Service Test Suite
 * Tests for referral business logic
 */

import { Types } from 'mongoose';
import referralService from '../services/referralService';
import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';

// Mock dependencies
jest.mock('../models/Referral');
jest.mock('../models/User');
jest.mock('../models/Wallet');
jest.mock('../models/Transaction');
jest.mock('../services/activityService');

describe('Referral Service', () => {
  const mockReferrerId = new Types.ObjectId();
  const mockRefereeId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReferral', () => {
    it('should create a new referral relationship', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        referralCode: 'REF12345678',
        status: ReferralStatus.PENDING,
      };

      (Referral.findOne as jest.Mock).mockResolvedValue(null);
      (Referral.create as jest.Mock).mockResolvedValue(mockReferral);

      const result = await referralService.createReferral({
        referrerId: mockReferrerId,
        refereeId: mockRefereeId,
        referralCode: 'REF12345678',
      });

      expect(result).toEqual(mockReferral);
      expect(Referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer: mockReferrerId,
          referee: mockRefereeId,
          referralCode: 'REF12345678',
          status: ReferralStatus.PENDING,
        })
      );
    });

    it('should throw error if referral already exists', async () => {
      (Referral.findOne as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      await expect(
        referralService.createReferral({
          referrerId: mockReferrerId,
          refereeId: mockRefereeId,
          referralCode: 'REF12345678',
        })
      ).rejects.toThrow('User already has a referral relationship');
    });
  });

  describe('getReferralStats', () => {
    it('should calculate correct referral statistics', async () => {
      const mockReferrals = [
        {
          status: ReferralStatus.PENDING,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: false,
          milestoneRewarded: false,
        },
        {
          status: ReferralStatus.ACTIVE,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: true,
          milestoneRewarded: false,
        },
        {
          status: ReferralStatus.COMPLETED,
          rewards: { referrerAmount: 50, milestoneBonus: 20 },
          referrerRewarded: true,
          milestoneRewarded: true,
        },
      ];

      (Referral.find as jest.Mock).mockResolvedValue(mockReferrals);

      const stats = await referralService.getReferralStats(mockReferrerId);

      expect(stats).toEqual({
        totalReferrals: 3,
        activeReferrals: 1,
        completedReferrals: 1,
        pendingReferrals: 1,
        totalEarnings: 120, // 50 + 50 + 20
        pendingEarnings: 50,
        milestoneEarnings: 20,
        referralBonus: 50,
      });
    });

    it('should return zero stats for user with no referrals', async () => {
      (Referral.find as jest.Mock).mockResolvedValue([]);

      const stats = await referralService.getReferralStats(mockReferrerId);

      expect(stats).toEqual({
        totalReferrals: 0,
        activeReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        milestoneEarnings: 0,
        referralBonus: 50,
      });
    });
  });

  describe('validateReferralCode', () => {
    it('should validate correct referral code', async () => {
      const mockUser = {
        _id: mockReferrerId,
        phoneNumber: '+1234567890',
        profile: { firstName: 'John' },
        referral: { referralCode: 'REF12345678' },
      };

      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await referralService.validateReferralCode('REF12345678');

      expect(result.valid).toBe(true);
      expect(result.referrer).toBeDefined();
      expect(result.referrer?.referralCode).toBe('REF12345678');
    });

    it('should reject invalid referral code', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await referralService.validateReferralCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.referrer).toBeUndefined();
    });
  });

  describe('processFirstOrder', () => {
    it('should credit referrer on referee first order', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        status: ReferralStatus.PENDING,
        rewards: { referrerAmount: 50 },
        referrerRewarded: false,
        refereeRewarded: false,
        metadata: {},
        save: jest.fn().mockResolvedValue(true),
      };

      const mockWallet = {
        balance: { total: 100, available: 100 },
        statistics: { totalEarned: 0 },
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReferral),
      });

      (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);
      (Transaction.create as jest.Mock).mockResolvedValue({});
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      expect(mockReferral.status).toBe(ReferralStatus.ACTIVE);
      expect(mockReferral.referrerRewarded).toBe(true);
      expect(mockWallet.balance.total).toBe(150);
      expect(mockReferral.save).toHaveBeenCalled();
      expect(mockWallet.save).toHaveBeenCalled();
    });

    it('should mark referral as completed when both rewarded', async () => {
      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        status: ReferralStatus.PENDING,
        rewards: { referrerAmount: 50 },
        referrerRewarded: false,
        refereeRewarded: true, // Already rewarded
        metadata: {},
        completedAt: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockWallet = {
        balance: { total: 100, available: 100 },
        statistics: { totalEarned: 0 },
        save: jest.fn().mockResolvedValue(true),
      };

      (Referral.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReferral),
      });

      (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);
      (Transaction.create as jest.Mock).mockResolvedValue({});
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await referralService.processFirstOrder({
        refereeId: mockRefereeId,
        orderId: new Types.ObjectId(),
        orderAmount: 500,
      });

      expect(mockReferral.status).toBe(ReferralStatus.COMPLETED);
      expect(mockReferral.completedAt).toBeDefined();
    });
  });

  describe('Security and Data Privacy', () => {
    it('should not log PII in referral creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const mockReferral = {
        _id: new Types.ObjectId(),
        referrer: mockReferrerId,
        referee: mockRefereeId,
        referralCode: 'REF12345678',
        status: ReferralStatus.PENDING,
      };

      (Referral.findOne as jest.Mock).mockResolvedValue(null);
      (Referral.create as jest.Mock).mockResolvedValue(mockReferral);

      await referralService.createReferral({
        referrerId: mockReferrerId,
        refereeId: mockRefereeId,
        referralCode: 'REF12345678',
      });

      // Verify logs are sanitized
      const logs = consoleSpy.mock.calls.map(call => call.join(' '));
      logs.forEach(log => {
        // Should not contain full ObjectIds
        expect(log).not.toContain(mockReferrerId.toString());
        expect(log).not.toContain(mockRefereeId.toString());
      });

      consoleSpy.mockRestore();
    });
  });
});

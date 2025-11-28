"use strict";
/**
 * Referral Service Test Suite
 * Tests for referral business logic
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const referralService_1 = __importDefault(require("../services/referralService"));
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
// Mock dependencies
jest.mock('../models/Referral');
jest.mock('../models/User');
jest.mock('../models/Wallet');
jest.mock('../models/Transaction');
jest.mock('../services/activityService');
describe('Referral Service', () => {
    const mockReferrerId = new mongoose_1.Types.ObjectId();
    const mockRefereeId = new mongoose_1.Types.ObjectId();
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createReferral', () => {
        it('should create a new referral relationship', async () => {
            const mockReferral = {
                _id: new mongoose_1.Types.ObjectId(),
                referrer: mockReferrerId,
                referee: mockRefereeId,
                referralCode: 'REF12345678',
                status: Referral_1.ReferralStatus.PENDING,
            };
            Referral_1.default.findOne.mockResolvedValue(null);
            Referral_1.default.create.mockResolvedValue(mockReferral);
            const result = await referralService_1.default.createReferral({
                referrerId: mockReferrerId,
                refereeId: mockRefereeId,
                referralCode: 'REF12345678',
            });
            expect(result).toEqual(mockReferral);
            expect(Referral_1.default.create).toHaveBeenCalledWith(expect.objectContaining({
                referrer: mockReferrerId,
                referee: mockRefereeId,
                referralCode: 'REF12345678',
                status: Referral_1.ReferralStatus.PENDING,
            }));
        });
        it('should throw error if referral already exists', async () => {
            Referral_1.default.findOne.mockResolvedValue({
                _id: new mongoose_1.Types.ObjectId(),
            });
            await expect(referralService_1.default.createReferral({
                referrerId: mockReferrerId,
                refereeId: mockRefereeId,
                referralCode: 'REF12345678',
            })).rejects.toThrow('User already has a referral relationship');
        });
    });
    describe('getReferralStats', () => {
        it('should calculate correct referral statistics', async () => {
            const mockReferrals = [
                {
                    status: Referral_1.ReferralStatus.PENDING,
                    rewards: { referrerAmount: 50, milestoneBonus: 20 },
                    referrerRewarded: false,
                    milestoneRewarded: false,
                },
                {
                    status: Referral_1.ReferralStatus.ACTIVE,
                    rewards: { referrerAmount: 50, milestoneBonus: 20 },
                    referrerRewarded: true,
                    milestoneRewarded: false,
                },
                {
                    status: Referral_1.ReferralStatus.COMPLETED,
                    rewards: { referrerAmount: 50, milestoneBonus: 20 },
                    referrerRewarded: true,
                    milestoneRewarded: true,
                },
            ];
            Referral_1.default.find.mockResolvedValue(mockReferrals);
            const stats = await referralService_1.default.getReferralStats(mockReferrerId);
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
            Referral_1.default.find.mockResolvedValue([]);
            const stats = await referralService_1.default.getReferralStats(mockReferrerId);
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
            User_1.User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });
            const result = await referralService_1.default.validateReferralCode('REF12345678');
            expect(result.valid).toBe(true);
            expect(result.referrer).toBeDefined();
            expect(result.referrer?.referralCode).toBe('REF12345678');
        });
        it('should reject invalid referral code', async () => {
            User_1.User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });
            const result = await referralService_1.default.validateReferralCode('INVALID');
            expect(result.valid).toBe(false);
            expect(result.referrer).toBeUndefined();
        });
    });
    describe('processFirstOrder', () => {
        it('should credit referrer on referee first order', async () => {
            const mockReferral = {
                _id: new mongoose_1.Types.ObjectId(),
                referrer: mockReferrerId,
                referee: mockRefereeId,
                status: Referral_1.ReferralStatus.PENDING,
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
            Referral_1.default.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockReferral),
            });
            Wallet_1.Wallet.findOne.mockResolvedValue(mockWallet);
            Transaction_1.Transaction.create.mockResolvedValue({});
            User_1.User.findByIdAndUpdate.mockResolvedValue({});
            await referralService_1.default.processFirstOrder({
                refereeId: mockRefereeId,
                orderId: new mongoose_1.Types.ObjectId(),
                orderAmount: 500,
            });
            expect(mockReferral.status).toBe(Referral_1.ReferralStatus.ACTIVE);
            expect(mockReferral.referrerRewarded).toBe(true);
            expect(mockWallet.balance.total).toBe(150);
            expect(mockReferral.save).toHaveBeenCalled();
            expect(mockWallet.save).toHaveBeenCalled();
        });
        it('should mark referral as completed when both rewarded', async () => {
            const mockReferral = {
                _id: new mongoose_1.Types.ObjectId(),
                referrer: mockReferrerId,
                referee: mockRefereeId,
                status: Referral_1.ReferralStatus.PENDING,
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
            Referral_1.default.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockReferral),
            });
            Wallet_1.Wallet.findOne.mockResolvedValue(mockWallet);
            Transaction_1.Transaction.create.mockResolvedValue({});
            User_1.User.findByIdAndUpdate.mockResolvedValue({});
            await referralService_1.default.processFirstOrder({
                refereeId: mockRefereeId,
                orderId: new mongoose_1.Types.ObjectId(),
                orderAmount: 500,
            });
            expect(mockReferral.status).toBe(Referral_1.ReferralStatus.COMPLETED);
            expect(mockReferral.completedAt).toBeDefined();
        });
    });
    describe('Security and Data Privacy', () => {
        it('should not log PII in referral creation', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            const mockReferral = {
                _id: new mongoose_1.Types.ObjectId(),
                referrer: mockReferrerId,
                referee: mockRefereeId,
                referralCode: 'REF12345678',
                status: Referral_1.ReferralStatus.PENDING,
            };
            Referral_1.default.findOne.mockResolvedValue(null);
            Referral_1.default.create.mockResolvedValue(mockReferral);
            await referralService_1.default.createReferral({
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

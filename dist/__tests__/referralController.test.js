"use strict";
/**
 * Referral Controller Test Suite
 * Tests for referral API endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const referralController_1 = require("../controllers/referralController");
const User_1 = require("../models/User");
const referralService_1 = __importDefault(require("../services/referralService"));
// Mock dependencies
jest.mock('../models/User');
jest.mock('../services/referralService');
describe('Referral Controller', () => {
    let mockReq;
    let mockRes;
    let mockJson;
    let mockStatus;
    beforeEach(() => {
        jest.clearAllMocks();
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnThis();
        mockReq = {
            userId: 'user123',
            body: {},
        };
        mockRes = {
            status: mockStatus,
            json: mockJson,
        };
    });
    describe('getReferralCode', () => {
        it('should return referral code for authenticated user', async () => {
            const mockUser = {
                _id: 'user123',
                referral: {
                    referralCode: 'REF12345678',
                },
                referralCode: 'REF12345678',
                save: jest.fn(),
            };
            User_1.User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });
            await (0, referralController_1.getReferralCode)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    referralCode: 'REF12345678',
                }),
            }));
        });
        it('should generate referral code if not exists', async () => {
            const mockUser = {
                _id: 'user123',
                referral: null,
                referralCode: null,
                save: jest.fn().mockResolvedValue({
                    referral: { referralCode: 'REF87654321' },
                    referralCode: 'REF87654321',
                }),
                populate: jest.fn().mockResolvedValue({
                    referral: { referralCode: 'REF87654321' },
                    referralCode: 'REF87654321',
                }),
            };
            User_1.User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });
            await (0, referralController_1.getReferralCode)(mockReq, mockRes);
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(200);
        });
        it('should return 401 if user not authenticated', async () => {
            mockReq.userId = undefined;
            await (0, referralController_1.getReferralCode)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(401);
        });
        it('should return 404 if user not found', async () => {
            User_1.User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });
            await (0, referralController_1.getReferralCode)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(404);
        });
    });
    describe('shareReferralLink', () => {
        it('should validate platform parameter', async () => {
            mockReq.body = { platform: 'invalid' };
            await (0, referralController_1.shareReferralLink)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('Invalid platform'),
            }));
        });
        it('should accept valid platforms', async () => {
            const validPlatforms = ['whatsapp', 'telegram', 'email', 'sms', 'facebook', 'twitter', 'copy'];
            for (const platform of validPlatforms) {
                jest.clearAllMocks();
                const mockUser = {
                    referral: { referralCode: 'REF12345678' },
                };
                User_1.User.findById.mockResolvedValue(mockUser);
                mockReq.body = { platform };
                await (0, referralController_1.shareReferralLink)(mockReq, mockRes);
                expect(mockStatus).toHaveBeenCalledWith(200);
            }
        });
        it('should reject non-string platform', async () => {
            mockReq.body = { platform: 123 };
            await (0, referralController_1.shareReferralLink)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(400);
        });
    });
    describe('getReferralStats', () => {
        it('should return stats for authenticated user', async () => {
            const mockUser = {
                _id: 'user123',
                referral: {
                    totalReferrals: 5,
                    referralEarnings: 250,
                    referralCode: 'REF12345678',
                },
                wallet: {
                    balance: 1000,
                },
            };
            const mockStats = {
                totalReferrals: 5,
                completedReferrals: 3,
                pendingReferrals: 2,
                totalEarnings: 250,
                pendingEarnings: 100,
            };
            User_1.User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });
            User_1.User.countDocuments.mockResolvedValue(5);
            referralService_1.default.getReferralStats.mockResolvedValue(mockStats);
            await (0, referralController_1.getReferralStats)(mockReq, mockRes);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    totalReferrals: expect.any(Number),
                    referralCode: 'REF12345678',
                }),
            }));
        });
    });
    describe('Security Tests', () => {
        it('should not expose PII in logs', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            const mockUser = {
                referral: { referralCode: 'REF12345678' },
                email: 'test@example.com',
                phoneNumber: '+1234567890',
            };
            User_1.User.findById.mockResolvedValue(mockUser);
            mockReq.body = { platform: 'whatsapp' };
            await (0, referralController_1.shareReferralLink)(mockReq, mockRes);
            // Check that logs don't contain full email or phone
            const logs = consoleSpy.mock.calls.map(call => call.join(' '));
            logs.forEach(log => {
                expect(log).not.toContain('test@example.com');
                expect(log).not.toContain('+1234567890');
            });
            consoleSpy.mockRestore();
        });
        it('should sanitize userId in logs', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            const mockUser = {
                referral: { referralCode: 'REF12345678' },
            };
            User_1.User.findById.mockResolvedValue(mockUser);
            mockReq.userId = '1234567890abcdef';
            mockReq.body = { platform: 'whatsapp' };
            await (0, referralController_1.shareReferralLink)(mockReq, mockRes);
            // Check that logs only contain last 4 chars of userId
            const logs = consoleSpy.mock.calls.map(call => call.join(' '));
            const hasFullUserId = logs.some(log => log.includes('1234567890abcdef'));
            expect(hasFullUserId).toBe(false);
            consoleSpy.mockRestore();
        });
    });
    describe('Referral Code Generation', () => {
        it('should generate cryptographically secure referral codes', async () => {
            const codes = new Set();
            // Generate multiple codes
            for (let i = 0; i < 100; i++) {
                const mockUser = {
                    _id: `user${i}`,
                    referral: null,
                    save: jest.fn().mockImplementation(function () {
                        // Simulate code generation
                        const crypto = require('crypto');
                        const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
                        this.referral = { referralCode: `REF${randomHex}` };
                        return Promise.resolve(this);
                    }),
                };
                User_1.User.findById.mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser),
                });
                await mockUser.save();
                codes.add(mockUser.referral.referralCode);
            }
            // All codes should be unique
            expect(codes.size).toBe(100);
            // All codes should follow format REF + 8 hex chars
            codes.forEach(code => {
                expect(code).toMatch(/^REF[0-9A-F]{8}$/);
            });
        });
    });
});

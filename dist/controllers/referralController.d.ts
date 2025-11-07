import { Request, Response } from 'express';
/**
 * @desc    Get referral data
 * @route   GET /api/referral/data
 * @access  Private
 */
export declare const getReferralData: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral history
 * @route   GET /api/referral/history
 * @access  Private
 */
export declare const getReferralHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral statistics
 * @route   GET /api/referral/statistics
 * @access  Private
 */
export declare const getReferralStatistics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Generate referral link
 * @route   POST /api/referral/generate-link
 * @access  Private
 */
export declare const generateReferralLink: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Share referral link
 * @route   POST /api/referral/share
 * @access  Private
 */
export declare const shareReferralLink: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Claim referral rewards
 * @route   POST /api/referral/claim-rewards
 * @access  Private
 */
export declare const claimReferralRewards: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
export declare const getReferralLeaderboard: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral code (frontend expects /code endpoint)
 * @route   GET /api/referral/code
 * @access  Private
 */
export declare const getReferralCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral stats (frontend expects /stats endpoint)
 * @route   GET /api/referral/stats
 * @access  Private
 */
export declare const getReferralStats: (req: Request, res: Response, next: import("express").NextFunction) => void;

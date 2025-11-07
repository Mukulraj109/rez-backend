import { Request, Response } from 'express';
/**
 * @desc    Get current tier and progress
 * @route   GET /api/referral/tier
 * @access  Private
 */
export declare const getTier: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get claimable rewards
 * @route   GET /api/referral/rewards
 * @access  Private
 */
export declare const getRewards: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Claim specific reward
 * @route   POST /api/referral/claim-reward/:rewardId
 * @access  Private
 */
export declare const claimReward: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
export declare const getLeaderboard: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Generate QR code for referral
 * @route   POST /api/referral/generate-qr
 * @access  Private
 */
export declare const generateQR: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get milestone progress
 * @route   GET /api/referral/milestones
 * @access  Private
 */
export declare const getMilestones: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get referral analytics
 * @route   GET /api/referral/analytics
 * @access  Private (Admin)
 */
export declare const getAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Check tier upgrade eligibility
 * @route   GET /api/referral/check-upgrade
 * @access  Private
 */
export declare const checkUpgrade: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Validate referral code
 * @route   POST /api/referral/validate-code
 * @access  Public
 */
export declare const validateCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Apply referral code during registration
 * @route   POST /api/referral/apply-code
 * @access  Private
 */
export declare const applyCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
declare const _default: {
    getTier: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getRewards: (req: Request, res: Response, next: import("express").NextFunction) => void;
    claimReward: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getLeaderboard: (req: Request, res: Response, next: import("express").NextFunction) => void;
    generateQR: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMilestones: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    checkUpgrade: (req: Request, res: Response, next: import("express").NextFunction) => void;
    validateCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
    applyCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
};
export default _default;

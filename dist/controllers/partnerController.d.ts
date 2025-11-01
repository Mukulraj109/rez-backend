import { Request, Response } from 'express';
/**
 * Partner Controller
 * Handles HTTP requests for partner program endpoints
 */
/**
 * @route   GET /api/partner/benefits
 * @desc    Get partner benefits for all levels
 * @access  Private
 */
export declare const getPartnerBenefits: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/dashboard
 * @desc    Get complete partner dashboard data
 * @access  Private
 */
export declare const getPartnerDashboard: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/profile
 * @desc    Get partner profile
 * @access  Private
 */
export declare const getPartnerProfile: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/earnings
 * @desc    Get partner earnings details
 * @access  Private
 */
export declare const getPartnerEarnings: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/milestones
 * @desc    Get partner milestones
 * @access  Private
 */
export declare const getPartnerMilestones: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/milestones/:milestoneId/claim
 * @desc    Claim milestone reward
 * @access  Private
 */
export declare const claimMilestoneReward: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/tasks
 * @desc    Get partner tasks
 * @access  Private
 */
export declare const getPartnerTasks: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/tasks/:taskId/claim
 * @desc    Claim task reward
 * @access  Private
 */
export declare const claimTaskReward: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/jackpot
 * @desc    Get jackpot progress
 * @access  Private
 */
export declare const getJackpotProgress: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/jackpot/:spendAmount/claim
 * @desc    Claim jackpot milestone reward
 * @access  Private
 */
export declare const claimJackpotReward: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/offers
 * @desc    Get claimable offers
 * @access  Private
 */
export declare const getPartnerOffers: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/offers/:offerId/claim
 * @desc    Claim partner offer
 * @access  Private
 */
export declare const claimPartnerOffer: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/tasks/:taskType/update
 * @desc    Update task progress
 * @access  Private
 */
export declare const updateTaskProgress: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/faqs
 * @desc    Get partner FAQs
 * @access  Private
 */
export declare const getPartnerFAQs: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/levels
 * @desc    Get all partner levels and their benefits
 * @access  Private
 */
export declare const getPartnerLevels: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/partner/payout/request
 * @desc    Request payout of earnings
 * @access  Private
 */
export declare const requestPayout: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/partner/stats
 * @desc    Get partner statistics and rankings
 * @access  Private
 */
export declare const getPartnerStats: (req: Request, res: Response) => Promise<void>;

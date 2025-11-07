import { Request, Response } from 'express';
export declare const getChallenges: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getActiveChallenge: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const claimChallengeReward: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getAchievements: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserAchievements: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const unlockAchievement: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getBadges: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserBadges: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getLeaderboard: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserRank: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCoinBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCoinTransactions: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const awardCoins: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deductCoins: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getDailyStreak: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const incrementStreak: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createSpinWheel: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const spinWheel: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSpinWheelEligibility: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSpinWheelData: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/gamification/spin-wheel/history
 * Get spin wheel history for authenticated user
 */
export declare const getSpinWheelHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createScratchCard: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const scratchCard: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const claimScratchCard: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const startQuiz: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const submitQuizAnswer: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getQuizProgress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const completeQuiz: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's challenge progress across all challenges
 * GET /api/gamification/challenges/my-progress
 * @returns User's challenge progress with stats
 */
export declare const getMyChallengeProgress: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's complete gamification statistics
 * GET /api/gamification/stats
 * @returns Complete user gamification stats including games, coins, achievements, streaks, and rank
 */
export declare const getGamificationStats: (req: Request, res: Response, next: import("express").NextFunction) => void;

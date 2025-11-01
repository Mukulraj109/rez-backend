import { Request, Response } from 'express';
/**
 * @desc    Create a new scratch card for user
 * @route   POST /api/scratch-cards
 * @access  Private
 */
export declare const createScratchCard: (req: Request, res: Response, next: Request) => void;
/**
 * @desc    Get user's scratch cards
 * @route   GET /api/scratch-cards
 * @access  Private
 */
export declare const getUserScratchCards: (req: Request, res: Response, next: Request) => void;
/**
 * @desc    Scratch a card to reveal prize
 * @route   POST /api/scratch-cards/:id/scratch
 * @access  Private
 */
export declare const scratchCard: (req: Request, res: Response, next: Request) => void;
/**
 * @desc    Claim prize from scratch card
 * @route   POST /api/scratch-cards/:id/claim
 * @access  Private
 */
export declare const claimPrize: (req: Request, res: Response, next: Request) => void;
/**
 * @desc    Check if user is eligible for scratch card
 * @route   GET /api/scratch-cards/eligibility
 * @access  Private
 */
export declare const checkEligibility: (req: Request, res: Response, next: Request) => void;

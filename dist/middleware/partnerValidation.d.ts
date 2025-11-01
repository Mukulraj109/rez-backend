import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to check validation results
 */
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => any;
/**
 * Validation for claiming milestone rewards
 */
export declare const validateClaimMilestone: any[];
/**
 * Validation for claiming task rewards
 */
export declare const validateClaimTask: any[];
/**
 * Validation for claiming jackpot rewards
 */
export declare const validateClaimJackpot: any[];
/**
 * Validation for updating task progress
 */
export declare const validateUpdateTaskProgress: any[];
/**
 * Validation for claiming partner offers
 */
export declare const validateClaimOffer: any[];
/**
 * Validation for requesting payout
 */
export declare const validateRequestPayout: any[];
/**
 * Sanitize string input (remove HTML, scripts, etc.)
 */
export declare const sanitizeString: (value: string) => string;
/**
 * Validate and sanitize user input in request body
 */
export declare const sanitizeRequestBody: (req: Request, res: Response, next: NextFunction) => void;

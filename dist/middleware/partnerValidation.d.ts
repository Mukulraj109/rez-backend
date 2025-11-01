import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to check validation results
 */
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validation for claiming milestone rewards
 */
export declare const validateClaimMilestone: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Validation for claiming task rewards
 */
export declare const validateClaimTask: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Validation for claiming jackpot rewards
 */
export declare const validateClaimJackpot: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Validation for updating task progress
 */
export declare const validateUpdateTaskProgress: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Validation for claiming partner offers
 */
export declare const validateClaimOffer: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Validation for requesting payout
 */
export declare const validateRequestPayout: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined) | import("express-validator").ValidationChain)[];
/**
 * Sanitize string input (remove HTML, scripts, etc.)
 */
export declare const sanitizeString: (value: string) => string;
/**
 * Validate and sanitize user input in request body
 */
export declare const sanitizeRequestBody: (req: Request, res: Response, next: NextFunction) => void;

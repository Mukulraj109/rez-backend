import { Request, Response } from 'express';
/**
 * Homepage Controller
 * Handles homepage data requests with caching and error handling
 */
/**
 * @route   GET /api/homepage
 * @desc    Get all homepage data in a single batch request
 * @access  Public (optionalAuth)
 * @query   {string} sections - Comma-separated list of sections to fetch (optional)
 * @query   {number} limit - Limit for each section (optional, default varies by section)
 * @query   {string} location - User location as "lat,lng" (optional)
 */
export declare const getHomepage: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @route   GET /api/homepage/sections
 * @desc    Get available sections for homepage
 * @access  Public
 */
export declare const getAvailableSections: (req: Request, res: Response, next: import("express").NextFunction) => void;

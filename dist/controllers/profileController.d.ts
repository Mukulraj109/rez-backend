import { Request, Response } from 'express';
/**
 * @desc    Get user profile data
 * @route   GET /api/user/profile
 * @access  Private
 */
export declare const getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
export declare const updateProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get profile completion status
 * @route   GET /api/user/profile/completion
 * @access  Private
 */
export declare const getProfileCompletion: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Save ring size to user profile
 * @route   POST /api/user/profile/ring-size
 * @access  Private
 */
export declare const saveRingSize: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Upload profile picture
 * @route   POST /api/user/profile/picture
 * @access  Private
 */
export declare const uploadProfilePicture: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Delete profile picture
 * @route   DELETE /api/user/profile/picture
 * @access  Private
 */
export declare const deleteProfilePicture: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Verify profile
 * @route   POST /api/user/profile/verify
 * @access  Private
 */
export declare const verifyProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;

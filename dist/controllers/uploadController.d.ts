import { Request, Response } from 'express';
/**
 * Upload project file (image or video) to Cloudinary
 * POST /api/projects/upload
 * Note: File is already uploaded to Cloudinary by multer-storage-cloudinary
 */
export declare const uploadProjectFile: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Upload multiple project files (images/videos) to Cloudinary
 * POST /api/projects/upload-multiple
 * Note: Files are already uploaded to Cloudinary by multer-storage-cloudinary
 */
export declare const uploadMultipleProjectFiles: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Upload review image to Cloudinary
 * POST /api/reviews/upload-image
 * Note: File is already uploaded to Cloudinary by multer-storage-cloudinary
 */
export declare const uploadReviewImage: (req: Request, res: Response, next: import("express").NextFunction) => void;

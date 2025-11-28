import { Request, Response, NextFunction } from 'express';
/**
 * Validate file type using magic numbers (not just extension)
 * Prevents bypass attacks using fake extensions
 */
export declare function validateFileType(file: Express.Multer.File, allowedTypes?: string[]): Promise<boolean>;
/**
 * Validate file size
 */
export declare function validateFileSize(file: Express.Multer.File, maxSize?: number): boolean;
/**
 * Generate secure filename
 * Prevents directory traversal and other filename-based attacks
 */
export declare function generateSecureFilename(originalFilename: string): string;
/**
 * Scan file for malware patterns
 * Basic pattern matching (integrate with ClamAV for production)
 */
export declare function basicMalwareScan(file: Express.Multer.File): Promise<boolean>;
/**
 * Comprehensive file validation middleware
 */
export declare const validateUploadedFile: (options: {
    allowedTypes?: string[];
    maxSize?: number;
    category?: "images" | "documents" | "videos" | "all";
    scanMalware?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Validate multiple files
 */
export declare const validateMultipleFiles: (options: {
    allowedTypes?: string[];
    maxSize?: number;
    category?: "images" | "documents" | "videos" | "all";
    maxFiles?: number;
    scanMalware?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Image-specific validation
 */
export declare const validateImageUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Document-specific validation
 */
export declare const validateDocumentUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Video-specific validation
 */
export declare const validateVideoUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {
    validateFileType: typeof validateFileType;
    validateFileSize: typeof validateFileSize;
    generateSecureFilename: typeof generateSecureFilename;
    basicMalwareScan: typeof basicMalwareScan;
    validateUploadedFile: (options: {
        allowedTypes?: string[];
        maxSize?: number;
        category?: "images" | "documents" | "videos" | "all";
        scanMalware?: boolean;
    }) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    validateMultipleFiles: (options: {
        allowedTypes?: string[];
        maxSize?: number;
        category?: "images" | "documents" | "videos" | "all";
        maxFiles?: number;
        scanMalware?: boolean;
    }) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    validateImageUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    validateDocumentUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    validateVideoUpload: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
};
export default _default;

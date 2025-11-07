"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultipleProjectFiles = exports.uploadProjectFile = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Upload project file (image or video) to Cloudinary
 * POST /api/projects/upload
 * Note: File is already uploaded to Cloudinary by multer-storage-cloudinary
 */
exports.uploadProjectFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    // Check if file is uploaded
    if (!req.file) {
        return (0, response_1.sendBadRequest)(res, 'File is required');
    }
    const userId = req.user._id;
    const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    try {
        console.log(`✅ [UPLOAD] ${fileType} uploaded successfully for user: ${userId}`);
        // When using CloudinaryStorage, req.file contains Cloudinary info
        // req.file.path is the Cloudinary URL
        // req.file.filename is the public_id
        const cloudinaryUrl = req.file.path || req.file.path;
        const publicId = req.file.filename || req.file.public_id;
        // Generate thumbnail URL for images
        let thumbnailUrl = cloudinaryUrl;
        if (fileType === 'image' && publicId) {
            const { v2: cloudinary } = require('cloudinary');
            thumbnailUrl = cloudinary.url(publicId, {
                width: 300,
                height: 300,
                crop: 'fill',
                quality: 'auto',
                format: 'jpg'
            });
        }
        (0, response_1.sendSuccess)(res, {
            url: cloudinaryUrl,
            publicId: publicId,
            thumbnailUrl: thumbnailUrl,
            format: req.file.format || req.file.mimetype.split('/')[1],
            width: req.file.width || undefined,
            height: req.file.height || undefined,
            bytes: req.file.size || req.file.size,
            type: fileType,
        }, `${fileType} uploaded successfully`);
    }
    catch (error) {
        console.error(`❌ [UPLOAD] Error processing ${fileType}:`, error);
        throw new errorHandler_1.AppError(`Failed to process ${fileType}: ${error.message}`, 500);
    }
});
/**
 * Upload multiple project files (images/videos) to Cloudinary
 * POST /api/projects/upload-multiple
 * Note: Files are already uploaded to Cloudinary by multer-storage-cloudinary
 */
exports.uploadMultipleProjectFiles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    // Check if files are uploaded
    if (!req.files) {
        return (0, response_1.sendBadRequest)(res, 'At least one file is required');
    }
    const userId = req.user._id;
    // Extract files from req.files
    // When using multer.array('files'), req.files is an array
    // But TypeScript types it as { [fieldname: string]: File[] }
    let files = [];
    if (Array.isArray(req.files)) {
        files = req.files;
    }
    else if (req.files && typeof req.files === 'object') {
        // If it's an object, extract all file arrays and flatten them
        files = Object.values(req.files).flat();
    }
    if (files.length === 0) {
        return (0, response_1.sendBadRequest)(res, 'At least one file is required');
    }
    try {
        console.log(`✅ [UPLOAD] ${files.length} file(s) uploaded successfully for user: ${userId}`);
        const { v2: cloudinary } = require('cloudinary');
        const results = files.map((file) => {
            const mimetype = file.mimetype || '';
            const fileType = mimetype.startsWith('video/') ? 'video' : 'image';
            const cloudinaryUrl = file.path || file.path;
            const publicId = file.filename || file.public_id;
            // Generate thumbnail URL for images
            let thumbnailUrl = cloudinaryUrl;
            if (fileType === 'image' && publicId) {
                thumbnailUrl = cloudinary.url(publicId, {
                    width: 300,
                    height: 300,
                    crop: 'fill',
                    quality: 'auto',
                    format: 'jpg'
                });
            }
            return {
                url: cloudinaryUrl,
                publicId: publicId,
                thumbnailUrl: thumbnailUrl,
                format: file.format || mimetype.split('/')[1] || 'jpg',
                width: file.width || undefined,
                height: file.height || undefined,
                bytes: file.size || file.size || 0,
                type: fileType,
                originalName: file.originalname || 'file',
            };
        });
        (0, response_1.sendSuccess)(res, {
            files: results,
            count: results.length,
        }, `${results.length} file(s) uploaded successfully`);
    }
    catch (error) {
        console.error('❌ [UPLOAD] Error processing files:', error);
        throw new errorHandler_1.AppError(`Failed to process files: ${error.message}`, 500);
    }
});

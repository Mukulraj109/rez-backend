"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const merchantauth_1 = require("../middleware/merchantauth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const merchantId = req.merchantId;
        const merchantDir = path_1.default.join(uploadsDir, merchantId);
        if (!fs_1.default.existsSync(merchantDir)) {
            fs_1.default.mkdirSync(merchantDir, { recursive: true });
        }
        cb(null, merchantDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});
// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
};
// Helper function to parse file size from env
function parseFileSize(sizeStr) {
    if (!sizeStr)
        return 10485760; // 10MB default
    const match = sizeStr.match(/^(\d+)(MB|KB|GB)?$/i);
    if (!match) {
        console.log('⚠️ Invalid MAX_FILE_SIZE format, using default 10MB');
        return 10485760;
    }
    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || '';
    switch (unit) {
        case 'gb': return value * 1024 * 1024 * 1024;
        case 'mb': return value * 1024 * 1024;
        case 'kb': return value * 1024;
        default: return value; // Assume bytes if no unit
    }
}
// Configure upload middleware
const upload = (0, multer_1.default)({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: parseFileSize(process.env.MAX_FILE_SIZE || '10MB'), // 10MB default
        files: 10 // Maximum 10 files per request
    }
});
// @route   POST /api/uploads/image
// @desc    Upload single image
// @access  Private
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.merchantId}/${req.file.filename}`;
        return res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: fileUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    }
    catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});
// @route   POST /api/uploads/images
// @desc    Upload multiple images
// @access  Private
router.post('/images', upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No image files provided'
            });
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadedFiles = files.map((file, index) => ({
            url: `${baseUrl}/uploads/${req.merchantId}/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            sortOrder: index
        }));
        return res.json({
            success: true,
            message: `${files.length} images uploaded successfully`,
            data: {
                files: uploadedFiles
            }
        });
    }
    catch (error) {
        console.error('Multiple image upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
});
// @route   DELETE /api/uploads/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(uploadsDir, req.merchantId, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        fs_1.default.unlinkSync(filePath);
        return res.json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        console.error('File deletion error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: error.message
        });
    }
});
// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 10 files per request.'
            });
        }
    }
    return res.status(400).json({
        success: false,
        message: error.message || 'File upload error'
    });
});
exports.default = router;

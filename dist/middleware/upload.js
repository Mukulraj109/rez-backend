"use strict";
// Upload Middleware for Cloudinary
// Handles file uploads with multer and cloudinary
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadReviewImage = exports.uploadProjectFile = exports.uploadProfileImage = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary = require('cloudinary').v2;
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configure Cloudinary with increased timeout
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 120000, // 120 seconds timeout (increased from 60)
});
console.log('☁️  [CLOUDINARY] Configuration loaded:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key_present: !!process.env.CLOUDINARY_API_KEY,
    api_secret_present: !!process.env.CLOUDINARY_API_SECRET,
});
// Test Cloudinary connection at startup
cloudinary.api.ping()
    .then(() => {
    console.log('✅ [CLOUDINARY] Connection successful!');
})
    .catch((error) => {
    console.error('❌ [CLOUDINARY] Connection failed:', error.message);
    if (error.message.includes('Invalid cloud_name')) {
        console.error('   → Check CLOUDINARY_CLOUD_NAME in .env');
    }
    else if (error.message.includes('quota')) {
        console.error('   → Your Cloudinary storage quota may be full!');
        console.error('   → Check: https://cloudinary.com/console/usage');
    }
});
// Create storage engine for profile images - MINIMAL CONFIG FOR SPEED
const profileStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        console.log(`📤 [CLOUDINARY] Uploading avatar for user: ${req.user?._id}`);
        return {
            folder: 'rez-app/profiles',
            resource_type: 'auto',
            public_id: `user_${req.user?._id}_${Date.now()}`,
            // No transformations during upload for maximum speed
            timeout: 120000,
        };
    },
});
// Create storage engine for project files (images/videos)
const projectStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        console.log(`📤 [CLOUDINARY] Uploading project file for user: ${req.user?._id}`);
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        return {
            folder: 'rez-app/projects',
            resource_type: resourceType,
            public_id: `project_${req.user?._id}_${Date.now()}`,
            timeout: 120000,
        };
    },
});
// Create multer upload instance for profile images
exports.uploadProfileImage = (0, multer_1.default)({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});
// Create storage engine for review images
const reviewStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        console.log(`📤 [CLOUDINARY] Uploading review image for user: ${req.user?._id}`);
        return {
            folder: 'rez-app/reviews',
            resource_type: 'image',
            public_id: `review_${req.user?._id}_${Date.now()}`,
            timeout: 120000,
        };
    },
});
// Create multer upload instance for project files (images/videos)
exports.uploadProjectFile = (0, multer_1.default)({
    storage: projectStorage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for videos
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only image and video files are allowed!'), false);
        }
        cb(null, true);
    },
});
// Create multer upload instance for review images
exports.uploadReviewImage = (0, multer_1.default)({
    storage: reviewStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for review images
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});

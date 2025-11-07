// Upload Middleware for Cloudinary
// Handles file uploads with multer and cloudinary

import multer from 'multer';
const cloudinary = require('cloudinary').v2;
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

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
  .catch((error: any) => {
    console.error('❌ [CLOUDINARY] Connection failed:', error.message);
    if (error.message.includes('Invalid cloud_name')) {
      console.error('   → Check CLOUDINARY_CLOUD_NAME in .env');
    } else if (error.message.includes('quota')) {
      console.error('   → Your Cloudinary storage quota may be full!');
      console.error('   → Check: https://cloudinary.com/console/usage');
    }
  });

// Create storage engine for profile images - MINIMAL CONFIG FOR SPEED
const profileStorage = new CloudinaryStorage({
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
const projectStorage = new CloudinaryStorage({
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
export const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!') as any, false);
    }
    cb(null, true);
  },
});

// Create multer upload instance for project files (images/videos)
export const uploadProjectFile = multer({
  storage: projectStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only image and video files are allowed!') as any, false);
    }
    cb(null, true);
  },
});
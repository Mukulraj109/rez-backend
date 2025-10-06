// Upload Middleware for Cloudinary
// Handles file uploads with multer and cloudinary

import multer from 'multer';
const cloudinary = require('cloudinary');
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret',
});

// Create storage engine for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'rez-app/profiles',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
      ],
      public_id: `user_${req.user?._id}_${Date.now()}`,
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

// Export cloudinary instance for direct use
export { cloudinary };
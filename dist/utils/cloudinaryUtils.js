"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCloudinaryConfig = validateCloudinaryConfig;
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.uploadMultipleToCloudinary = uploadMultipleToCloudinary;
exports.getOptimizedImageUrl = getOptimizedImageUrl;
const cloudinary_1 = require("cloudinary");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});
/**
 * Validate Cloudinary configuration
 */
function validateCloudinaryConfig() {
    const { cloud_name, api_key, api_secret } = cloudinary_1.v2.config();
    if (!cloud_name || !api_key || !api_secret) {
        console.error('❌ Cloudinary configuration missing. Please set environment variables:');
        console.error('   - CLOUDINARY_CLOUD_NAME');
        console.error('   - CLOUDINARY_API_KEY');
        console.error('   - CLOUDINARY_API_SECRET');
        return false;
    }
    console.log('✅ Cloudinary configured successfully');
    return true;
}
/**
 * Upload image to Cloudinary
 * @param filePath - Local file path or buffer
 * @param folder - Cloudinary folder (default: bills)
 * @param options - Additional upload options
 */
async function uploadToCloudinary(filePath, folder = 'bills', options = {}) {
    try {
        const uploadOptions = {
            folder: `rez/${folder}`,
            resource_type: 'auto',
            transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
            ],
            ...options
        };
        const result = await cloudinary_1.v2.uploader.upload(typeof filePath === 'string' ? filePath : `data:image/jpeg;base64,${filePath.toString('base64')}`, uploadOptions);
        // Generate thumbnail URL
        const thumbnailUrl = cloudinary_1.v2.url(result.public_id, {
            width: 300,
            height: 300,
            crop: 'fill',
            quality: 'auto',
            format: 'jpg'
        });
        return {
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes
        };
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
}
/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
async function deleteFromCloudinary(publicId) {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === 'ok';
    }
    catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
}
/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths
 * @param folder - Cloudinary folder
 */
async function uploadMultipleToCloudinary(filePaths, folder = 'bills') {
    const uploadPromises = filePaths.map(filePath => uploadToCloudinary(filePath, folder));
    return Promise.all(uploadPromises);
}
/**
 * Get optimized image URL
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 */
function getOptimizedImageUrl(publicId, options = {}) {
    return cloudinary_1.v2.url(publicId, {
        width: options.width || 800,
        height: options.height || 800,
        crop: options.crop || 'limit',
        quality: options.quality || 'auto',
        format: options.format || 'jpg',
        fetch_format: 'auto'
    });
}
exports.default = {
    validateCloudinaryConfig,
    uploadToCloudinary,
    deleteFromCloudinary,
    uploadMultipleToCloudinary,
    getOptimizedImageUrl
};

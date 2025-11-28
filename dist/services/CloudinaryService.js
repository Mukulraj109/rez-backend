"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const fs = __importStar(require("fs"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
class CloudinaryService {
    /**
     * Upload a single file to Cloudinary
     */
    static async uploadFile(filePath, options = {}) {
        try {
            const defaultOptions = {
                folder: options.folder || 'merchant-uploads',
                quality: options.quality || 'auto',
                fetch_format: 'auto',
                ...options,
            };
            const result = await cloudinary_1.v2.uploader.upload(filePath, defaultOptions);
            // Delete local file after successful upload
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
            return result;
        }
        catch (error) {
            console.error('❌ Cloudinary upload error:', error);
            throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
        }
    }
    /**
     * Upload multiple files to Cloudinary
     */
    static async uploadMultipleFiles(filePaths, options = {}) {
        const uploadPromises = filePaths.map((filePath) => this.uploadFile(filePath, options));
        return Promise.all(uploadPromises);
    }
    /**
     * Upload product image with optimization
     */
    static async uploadProductImage(filePath, merchantId, productId) {
        const folder = `merchants/${merchantId}/products${productId ? `/${productId}` : ''}`;
        return this.uploadFile(filePath, {
            folder,
            width: 800,
            height: 800,
            crop: 'fill',
            quality: 'auto',
            transformation: [
                { width: 800, height: 800, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' },
            ],
        });
    }
    /**
     * Upload product thumbnail
     */
    static async uploadProductThumbnail(filePath, merchantId, productId) {
        const folder = `merchants/${merchantId}/products${productId ? `/${productId}` : ''}/thumbnails`;
        return this.uploadFile(filePath, {
            folder,
            width: 300,
            height: 300,
            crop: 'fill',
            quality: 80,
        });
    }
    /**
     * Upload store logo
     */
    static async uploadStoreLogo(filePath, merchantId) {
        const folder = `merchants/${merchantId}/store/logo`;
        return this.uploadFile(filePath, {
            folder,
            // Removed fixed dimensions and crop: 'fill' to preserve full image
            // Use limit crop to maintain aspect ratio without cropping
            quality: 'auto',
        });
    }
    /**
     * Upload store banner
     */
    static async uploadStoreBanner(filePath, merchantId) {
        const folder = `merchants/${merchantId}/store/banner`;
        return this.uploadFile(filePath, {
            folder,
            // Removed fixed dimensions and crop: 'fill' to preserve full image
            // Use limit crop to maintain aspect ratio without cropping
            quality: 'auto',
        });
    }
    /**
     * Upload video
     */
    static async uploadVideo(filePath, merchantId, resourceType = 'product') {
        const folder = `merchants/${merchantId}/${resourceType}/videos`;
        try {
            const result = await cloudinary_1.v2.uploader.upload(filePath, {
                folder,
                resource_type: 'video',
                quality: 'auto',
            });
            // Delete local file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            console.log(`✅ Uploaded video to Cloudinary: ${result.secure_url}`);
            return result;
        }
        catch (error) {
            console.error('❌ Video upload error:', error);
            throw new Error(`Failed to upload video: ${error.message}`);
        }
    }
    /**
     * Upload store gallery image
     */
    static async uploadStoreGalleryImage(filePath, merchantId, storeId) {
        const folder = `merchants/${merchantId}/stores/${storeId}/gallery/images`;
        return this.uploadFile(filePath, {
            folder,
            width: 1200,
            height: 800,
            crop: 'limit', // Use limit to maintain aspect ratio without cropping
            quality: 'auto',
        });
    }
    /**
     * Upload store gallery video
     */
    static async uploadStoreGalleryVideo(filePath, merchantId, storeId) {
        const folder = `merchants/${merchantId}/stores/${storeId}/gallery/videos`;
        try {
            const result = await cloudinary_1.v2.uploader.upload(filePath, {
                folder,
                resource_type: 'video',
                quality: 'auto',
            });
            // Delete local file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return result;
        }
        catch (error) {
            throw new Error(`Failed to upload gallery video: ${error.message}`);
        }
    }
    /**
     * Generate thumbnail for video
     */
    static generateVideoThumbnail(publicId, options = {}) {
        const { width = 400, height = 300, time = 1 } = options;
        return cloudinary_1.v2.url(publicId, {
            resource_type: 'video',
            transformation: [
                {
                    width,
                    height,
                    crop: 'fill',
                    quality: 'auto',
                    start_offset: typeof time === 'number' ? time.toString() : time,
                },
                {
                    format: 'jpg',
                },
            ],
        });
    }
    /**
     * Delete file from Cloudinary
     */
    static async deleteFile(publicId) {
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId);
            console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
            return result;
        }
        catch (error) {
            console.error('❌ Cloudinary delete error:', error);
            throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
        }
    }
    /**
     * Delete video from Cloudinary
     */
    static async deleteVideo(publicId) {
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId, {
                resource_type: 'video',
            });
            console.log(`🗑️ Deleted video from Cloudinary: ${publicId}`);
            return result;
        }
        catch (error) {
            console.error('❌ Video delete error:', error);
            throw new Error(`Failed to delete video: ${error.message}`);
        }
    }
    /**
     * Extract public ID from Cloudinary URL
     */
    static getPublicIdFromUrl(url) {
        // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/merchants/123/products/image.jpg
        const parts = url.split('/upload/');
        if (parts.length < 2)
            return '';
        const pathParts = parts[1].split('/');
        pathParts.shift(); // Remove version
        const publicId = pathParts.join('/').split('.')[0];
        return publicId;
    }
    /**
     * Check if Cloudinary is configured
     */
    static isConfigured() {
        return !!(process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET);
    }
}
exports.CloudinaryService = CloudinaryService;
exports.default = CloudinaryService;

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  transformation?: any[];
}

export class CloudinaryService {
  /**
   * Upload a single file to Cloudinary
   */
  static async uploadFile(
    filePath: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<UploadApiResponse> {
    try {
      const defaultOptions = {
        folder: options.folder || 'merchant-uploads',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
        ...options,
      };

      const result = await cloudinary.uploader.upload(filePath, defaultOptions);

      // Delete local file after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
      return result;
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error);
      throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Cloudinary
   */
  static async uploadMultipleFiles(
    filePaths: string[],
    options: CloudinaryUploadOptions = {}
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = filePaths.map((filePath) =>
      this.uploadFile(filePath, options)
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Upload product image with optimization
   */
  static async uploadProductImage(
    filePath: string,
    merchantId: string,
    productId?: string
  ): Promise<UploadApiResponse> {
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
  static async uploadProductThumbnail(
    filePath: string,
    merchantId: string,
    productId?: string
  ): Promise<UploadApiResponse> {
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
  static async uploadStoreLogo(
    filePath: string,
    merchantId: string
  ): Promise<UploadApiResponse> {
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
  static async uploadStoreBanner(
    filePath: string,
    merchantId: string
  ): Promise<UploadApiResponse> {
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
  static async uploadVideo(
    filePath: string,
    merchantId: string,
    resourceType: 'product' | 'store' = 'product'
  ): Promise<UploadApiResponse> {
    const folder = `merchants/${merchantId}/${resourceType}/videos`;

    try {
      const result = await cloudinary.uploader.upload(filePath, {
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
    } catch (error: any) {
      console.error('❌ Video upload error:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Upload store gallery image
   */
  static async uploadStoreGalleryImage(
    filePath: string,
    merchantId: string,
    storeId: string
  ): Promise<UploadApiResponse> {
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
  static async uploadStoreGalleryVideo(
    filePath: string,
    merchantId: string,
    storeId: string
  ): Promise<UploadApiResponse> {
    const folder = `merchants/${merchantId}/stores/${storeId}/gallery/videos`;

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        quality: 'auto',
      });

      // Delete local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to upload gallery video: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail for video
   */
  static generateVideoThumbnail(publicId: string, options: {
    width?: number;
    height?: number;
    time?: string | number; // Time in seconds or format like "00:00:01"
  } = {}): string {
    const { width = 400, height = 300, time = 1 } = options;
    
    return cloudinary.url(publicId, {
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
  static async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error: any) {
      console.error('❌ Cloudinary delete error:', error);
      throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Delete video from Cloudinary
   */
  static async deleteVideo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
      });
      console.log(`🗑️ Deleted video from Cloudinary: ${publicId}`);
      return result;
    } catch (error: any) {
      console.error('❌ Video delete error:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static getPublicIdFromUrl(url: string): string {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/merchants/123/products/image.jpg
    const parts = url.split('/upload/');
    if (parts.length < 2) return '';

    const pathParts = parts[1].split('/');
    pathParts.shift(); // Remove version

    const publicId = pathParts.join('/').split('.')[0];
    return publicId;
  }

  /**
   * Check if Cloudinary is configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

export default CloudinaryService;

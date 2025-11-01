import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

/**
 * Validate Cloudinary configuration
 */
export function validateCloudinaryConfig(): boolean {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

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
export async function uploadToCloudinary(
  filePath: string | Buffer,
  folder: string = 'bills',
  options: any = {}
): Promise<{
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}> {
  try {
    const uploadOptions = {
      folder: `rez/${folder}`,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
      ],
      ...options
    };

    const result = await cloudinary.uploader.upload(
      typeof filePath === 'string' ? filePath : `data:image/jpeg;base64,${filePath.toString('base64')}`,
      uploadOptions
    );

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(result.public_id, {
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
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths
 * @param folder - Cloudinary folder
 */
export async function uploadMultipleToCloudinary(
  filePaths: string[],
  folder: string = 'bills'
): Promise<Array<{
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
}>> {
  const uploadPromises = filePaths.map(filePath =>
    uploadToCloudinary(filePath, folder)
  );

  return Promise.all(uploadPromises);
}

/**
 * Get optimized image URL
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    height: options.height || 800,
    crop: options.crop || 'limit',
    quality: options.quality || 'auto',
    format: options.format || 'jpg',
    fetch_format: 'auto'
  });
}

export default {
  validateCloudinaryConfig,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  getOptimizedImageUrl
};

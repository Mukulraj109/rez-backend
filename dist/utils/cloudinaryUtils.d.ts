/**
 * Validate Cloudinary configuration
 */
export declare function validateCloudinaryConfig(): boolean;
/**
 * Upload image to Cloudinary
 * @param filePath - Local file path or buffer
 * @param folder - Cloudinary folder (default: bills)
 * @param options - Additional upload options
 */
export declare function uploadToCloudinary(filePath: string | Buffer, folder?: string, options?: any): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    thumbnailUrl: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
}>;
/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export declare function deleteFromCloudinary(publicId: string): Promise<boolean>;
/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths
 * @param folder - Cloudinary folder
 */
export declare function uploadMultipleToCloudinary(filePaths: string[], folder?: string): Promise<Array<{
    url: string;
    secureUrl: string;
    publicId: string;
    thumbnailUrl: string;
}>>;
/**
 * Get optimized image URL
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 */
export declare function getOptimizedImageUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
}): string;
declare const _default: {
    validateCloudinaryConfig: typeof validateCloudinaryConfig;
    uploadToCloudinary: typeof uploadToCloudinary;
    deleteFromCloudinary: typeof deleteFromCloudinary;
    uploadMultipleToCloudinary: typeof uploadMultipleToCloudinary;
    getOptimizedImageUrl: typeof getOptimizedImageUrl;
};
export default _default;

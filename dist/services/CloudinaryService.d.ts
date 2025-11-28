import { UploadApiResponse } from 'cloudinary';
export interface CloudinaryUploadOptions {
    folder?: string;
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
    transformation?: any[];
}
export declare class CloudinaryService {
    /**
     * Upload a single file to Cloudinary
     */
    static uploadFile(filePath: string, options?: CloudinaryUploadOptions): Promise<UploadApiResponse>;
    /**
     * Upload multiple files to Cloudinary
     */
    static uploadMultipleFiles(filePaths: string[], options?: CloudinaryUploadOptions): Promise<UploadApiResponse[]>;
    /**
     * Upload product image with optimization
     */
    static uploadProductImage(filePath: string, merchantId: string, productId?: string): Promise<UploadApiResponse>;
    /**
     * Upload product thumbnail
     */
    static uploadProductThumbnail(filePath: string, merchantId: string, productId?: string): Promise<UploadApiResponse>;
    /**
     * Upload store logo
     */
    static uploadStoreLogo(filePath: string, merchantId: string): Promise<UploadApiResponse>;
    /**
     * Upload store banner
     */
    static uploadStoreBanner(filePath: string, merchantId: string): Promise<UploadApiResponse>;
    /**
     * Upload video
     */
    static uploadVideo(filePath: string, merchantId: string, resourceType?: 'product' | 'store'): Promise<UploadApiResponse>;
    /**
     * Upload store gallery image
     */
    static uploadStoreGalleryImage(filePath: string, merchantId: string, storeId: string): Promise<UploadApiResponse>;
    /**
     * Upload store gallery video
     */
    static uploadStoreGalleryVideo(filePath: string, merchantId: string, storeId: string): Promise<UploadApiResponse>;
    /**
     * Generate thumbnail for video
     */
    static generateVideoThumbnail(publicId: string, options?: {
        width?: number;
        height?: number;
        time?: string | number;
    }): string;
    /**
     * Delete file from Cloudinary
     */
    static deleteFile(publicId: string): Promise<any>;
    /**
     * Delete video from Cloudinary
     */
    static deleteVideo(publicId: string): Promise<any>;
    /**
     * Extract public ID from Cloudinary URL
     */
    static getPublicIdFromUrl(url: string): string;
    /**
     * Check if Cloudinary is configured
     */
    static isConfigured(): boolean;
}
export default CloudinaryService;

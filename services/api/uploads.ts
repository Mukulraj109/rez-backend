import { apiClient } from './index';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UploadedFile {
  url: string;
  filename?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  sortOrder?: number;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface UploadedVideo {
  url: string;
  publicId?: string;
  duration?: number;
  format?: string;
  thumbnailUrl?: string;
  title?: string;
  sortOrder?: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: UploadedFile | UploadedVideo | any;
}

export interface MultiUploadResponse {
  success: boolean;
  message: string;
  data: {
    files?: UploadedFile[];
    images?: UploadedFile[];
    videos?: UploadedVideo[];
  };
}

class UploadsService {
  /**
   * Get auth token for upload requests
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No token provided, authorization denied');
    }
    return token;
  }

  /**
   * Convert URI to File object for web uploads
   */
  private async uriToFile(uri: string, filename: string, mimeType: string = 'image/jpeg', fileObject?: File): Promise<File | Blob | any> {
    if (Platform.OS === 'web') {
      // If we have the File object directly, use it
      if (fileObject instanceof File) {
        return fileObject;
      }
      
      // Handle blob URLs
      if (uri.startsWith('blob:')) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          // Use the blob's mime type if available, otherwise use provided
          const finalMimeType = blob.type || mimeType;
          return new File([blob], filename, { type: finalMimeType });
        } catch (error) {
          console.error('Error converting blob URL to File:', error);
          throw new Error('Failed to process image file');
        }
      }
      
      // Handle data URIs
      if (uri.startsWith('data:')) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const finalMimeType = blob.type || mimeType;
          return new File([blob], filename, { type: finalMimeType });
        } catch (error) {
          console.error('Error converting data URI to File:', error);
          throw new Error('Failed to process image file');
        }
      }
    }
    
    // For React Native, return the object format
    return {
      uri: uri,
      type: mimeType,
      name: filename,
    } as any;
  }

  /**
   * Upload a single image
   */
  async uploadImage(imageUri: string, filename?: string, imageType?: 'logo' | 'banner' | 'general', fileObject?: File): Promise<UploadedFile> {
    try {
      console.log('📤 Starting image upload:', imageUri);
      
      // Create FormData
      const formData = new FormData();
      
      // Determine filename and mime type
      let finalFilename = filename;
      let mimeType = 'image/jpeg';
      
      if (Platform.OS === 'web' && fileObject instanceof File) {
        // Use File object properties if available
        finalFilename = filename || fileObject.name;
        mimeType = fileObject.type || mimeType;
      } else {
        finalFilename = filename || `image_${Date.now()}.jpg`;
        mimeType = finalFilename.endsWith('.png') ? 'image/png' : 
                    finalFilename.endsWith('.gif') ? 'image/gif' : 
                    finalFilename.endsWith('.webp') ? 'image/webp' : 
                    'image/jpeg';
      }
      
      // Handle file differently based on platform
      let fileToUpload: any;
      
      if (Platform.OS === 'web') {
        // For web, convert URI to File object
        fileToUpload = await this.uriToFile(imageUri, finalFilename, mimeType, fileObject);
      } else {
        // For React Native, use object format
        fileToUpload = {
          uri: imageUri,
          type: mimeType,
          name: finalFilename,
        };
      }
      
      formData.append('image', fileToUpload);
      
      // Add type parameter if provided
      if (imageType) {
        formData.append('type', imageType);
      }
      
      // Get auth token
      const token = await this.getAuthToken();

      // Upload using axios directly to handle FormData properly
      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post<UploadResponse>(
        '/merchant/uploads/image', // Remove /api prefix since it's already in base URL
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000, // 30 seconds for file upload
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      console.log('✅ Image uploaded successfully:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Image upload failed:', error);
      
      let errorMessage = 'Failed to upload image';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(imageUris: string[]): Promise<UploadedFile[]> {
    try {
      console.log('📤 Starting multiple image upload:', imageUris.length, 'images');
      
      // Create FormData
      const formData = new FormData();
      
      imageUris.forEach((uri, index) => {
        const fileToUpload = {
          uri: uri,
          type: 'image/jpeg',
          name: `image_${Date.now()}_${index}.jpg`,
        };
        
        formData.append('images', fileToUpload as any);
      });
      
      // Get auth token
      const token = await this.getAuthToken();

      // Upload using axios directly
      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post<MultiUploadResponse>(
        '/merchant/uploads/images', // Remove /api prefix since it's already in base URL
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 60000, // 60 seconds for multiple files
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      console.log('✅ Images uploaded successfully:', response.data.data.files.length, 'files');
      return response.data.data.files;
    } catch (error: any) {
      console.error('❌ Multiple image upload failed:', error);
      
      let errorMessage = 'Failed to upload images';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete an uploaded file
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      console.log('🗑️ Deleting file:', filename);
      
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/merchant/uploads/${filename}` // Remove /api prefix since it's already in base URL
      );

      if (!response.success) {
        throw new Error(response.message || 'Delete failed');
      }

      console.log('✅ File deleted successfully');
    } catch (error: any) {
      console.error('❌ File deletion failed:', error);
      
      let errorMessage = 'Failed to delete file';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get the full URL for an uploaded file
   */
  getFileUrl(filename: string, merchantId: string): string {
    const baseUrl = apiClient.getAxiosInstance().defaults.baseURL;
    return `${baseUrl}/uploads/${merchantId}/${filename}`;
  }

  /**
   * Upload image with progress callback (for React Native)
   */
  async uploadImageWithProgress(
    imageUri: string, 
    filename?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile> {
    try {
      console.log('📤 Starting image upload with progress:', imageUri);
      
      const formData = new FormData();
      const fileToUpload = {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename || `image_${Date.now()}.jpg`,
      };
      
      formData.append('image', fileToUpload as any);
      
      // Get auth token
      const token = await this.getAuthToken();

      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post<UploadResponse>(
        '/merchant/uploads/image', // Remove /api prefix since it's already in base URL
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              onProgress(Math.round(progress));
            }
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      console.log('✅ Image uploaded successfully with progress');
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Image upload with progress failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Upload failed');
    }
  }

  /**
   * Upload product images (uses Cloudinary product-images endpoint)
   */
  async uploadProductImages(
    imageUris: string[], 
    productId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile[]> {
    try {
      console.log('📤 Starting product images upload:', imageUris.length, 'images');
      
      const formData = new FormData();
      
      // Add productId if provided
      if (productId) {
        formData.append('productId', productId);
      }
      
      // Add each image
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        let fileToUpload: any;
        
        if (Platform.OS === 'web') {
          // For web, handle File objects or URIs
          if (typeof uri === 'string') {
            const mimeType = 'image/jpeg';
            const filename = `product_image_${Date.now()}_${i}.jpg`;
            fileToUpload = await this.uriToFile(uri, filename, mimeType);
          } else {
            fileToUpload = uri;
          }
        } else {
          // For React Native
          fileToUpload = {
            uri: uri,
            type: 'image/jpeg',
            name: `product_image_${Date.now()}_${i}.jpg`,
          };
        }
        
        formData.append('images', fileToUpload as any);
      }
      
      // Get auth token
      const token = await this.getAuthToken();

      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post<MultiUploadResponse>(
        '/merchant/uploads/product-images',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 120000, // 2 minutes for multiple images
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              onProgress(Math.round(progress));
            }
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      console.log('✅ Product images uploaded successfully:', response.data.data.images?.length || 0);
      return response.data.data.images || [];
    } catch (error: any) {
      console.error('❌ Product images upload failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload product images');
    }
  }

  /**
   * Upload a single video
   */
  async uploadVideo(
    videoUri: string,
    filename?: string,
    videoType?: 'product' | 'store',
    onProgress?: (progress: number) => void,
    fileObject?: File
  ): Promise<UploadedVideo> {
    try {
      console.log('📤 Starting video upload:', videoUri);
      
      const formData = new FormData();
      
      // Determine filename and mime type
      let finalFilename = filename;
      let mimeType = 'video/mp4';
      
      if (Platform.OS === 'web' && fileObject instanceof File) {
        finalFilename = filename || fileObject.name;
        mimeType = fileObject.type || mimeType;
      } else {
        finalFilename = filename || `video_${Date.now()}.mp4`;
        mimeType = finalFilename.endsWith('.mov') ? 'video/quicktime' :
                    finalFilename.endsWith('.avi') ? 'video/x-msvideo' :
                    finalFilename.endsWith('.webm') ? 'video/webm' :
                    'video/mp4';
      }
      
      // Handle file differently based on platform
      let fileToUpload: any;
      
      if (Platform.OS === 'web') {
        if (fileObject instanceof File) {
          fileToUpload = fileObject;
        } else if (videoUri.startsWith('blob:') || videoUri.startsWith('data:')) {
          const response = await fetch(videoUri);
          const blob = await response.blob();
          fileToUpload = new File([blob], finalFilename, { type: mimeType });
        } else {
          fileToUpload = videoUri;
        }
      } else {
        fileToUpload = {
          uri: videoUri,
          type: mimeType,
          name: finalFilename,
        };
      }
      
      formData.append('video', fileToUpload);
      
      if (videoType) {
        formData.append('type', videoType);
      }
      
      // Get auth token
      const token = await this.getAuthToken();

      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post<UploadResponse>(
        '/merchant/uploads/video',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 300000, // 5 minutes for video upload
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              onProgress(Math.round(progress));
            }
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      console.log('✅ Video uploaded successfully:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Video upload failed:', error);
      
      let errorMessage = 'Failed to upload video';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload multiple videos
   */
  async uploadVideos(
    videoUris: string[],
    onProgress?: (progress: number) => void
  ): Promise<UploadedVideo[]> {
    try {
      console.log('📤 Uploading', videoUris.length, 'videos sequentially');
      
      const uploadedVideos: UploadedVideo[] = [];
      
      for (let i = 0; i < videoUris.length; i++) {
        const uri = videoUris[i];
        const progressCallback = onProgress 
          ? (p: number) => onProgress(Math.round(((i + p / 100) / videoUris.length) * 100))
          : undefined;
        
        const result = await this.uploadVideo(uri, undefined, 'product', progressCallback);
        uploadedVideos.push(result);
      }
      
      console.log('✅ All videos uploaded successfully');
      return uploadedVideos;
    } catch (error: any) {
      console.error('❌ Multiple video upload failed:', error);
      throw new Error(error.message || 'Failed to upload videos');
    }
  }

  /**
   * Upload product video (uses Cloudinary video endpoint)
   */
  async uploadProductVideo(
    videoUri: string,
    productId?: string,
    onProgress?: (progress: number) => void,
    fileObject?: File
  ): Promise<UploadedVideo> {
    try {
      console.log('📤 Starting product video upload');
      
      // Use the regular video upload endpoint with product type
      const result = await this.uploadVideo(videoUri, undefined, 'product', onProgress, fileObject);
      
      return result;
    } catch (error: any) {
      console.error('❌ Product video upload failed:', error);
      throw new Error(error.message || 'Failed to upload product video');
    }
  }
}

export const uploadsService = new UploadsService();
export default uploadsService;
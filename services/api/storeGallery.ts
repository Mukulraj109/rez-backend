import { apiClient } from './index';

export interface GalleryItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: 'image' | 'video';
  category: string;
  title?: string;
  description?: string;
  tags?: string[];
  order: number;
  isVisible: boolean;
  isCover: boolean;
  views: number;
  likes: number;
  shares: number;
  uploadedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryCategory {
  name: string;
  count: number;
  coverImage?: string;
}

export interface GalleryResponse {
  items: GalleryItem[];
  categories: GalleryCategory[];
  total: number;
  limit: number;
  offset: number;
}

export interface UploadGalleryItemData {
  category: string;
  title?: string;
  description?: string;
  tags?: string[];
  order?: number;
  isVisible?: boolean;
  isCover?: boolean;
}

export interface BulkUploadData {
  category: string;
  title?: string; // Single title to apply to all items
  titles?: string[]; // Per-item titles (optional, overrides title if provided)
  description?: string;
  tags?: string[];
  isVisible?: boolean;
  isCover?: boolean;
}

export interface UpdateGalleryItemData {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  order?: number;
  isVisible?: boolean;
  isCover?: boolean;
}

export interface ReorderItem {
  id: string;
  order: number;
}

class StoreGalleryService {
  /**
   * Upload a single gallery item (image or video)
   */
  async uploadItem(
    storeId: string,
    file: File | Blob | any,
    data: UploadGalleryItemData
  ): Promise<GalleryItem> {
    const formData = new FormData();
    
    // Append file
    if (file instanceof File || file instanceof Blob) {
      formData.append('file', file);
    } else {
      // React Native format
      const fileData = {
        uri: file.uri || file,
        type: file.type || 'image/jpeg',
        name: file.name || `gallery-${Date.now()}.jpg`,
      };
      formData.append('file', fileData as any);
    }

    // Append metadata
    formData.append('category', data.category);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        formData.append('tags', JSON.stringify(data.tags));
      } else {
        formData.append('tags', data.tags);
      }
    }
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.isVisible !== undefined) formData.append('isVisible', data.isVisible.toString());
    if (data.isCover !== undefined) formData.append('isCover', data.isCover.toString());

    const response = await apiClient.post<GalleryItem>(
      `merchant/stores/${storeId}/gallery`,
      formData
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Upload multiple gallery items at once
   */
  async bulkUpload(
    storeId: string,
    files: (File | Blob | any)[],
    data: BulkUploadData
  ): Promise<{ items: GalleryItem[]; uploaded: number; failed: number; failedItems?: any[] }> {
    const formData = new FormData();

    // Append files
    files.forEach((file, index) => {
      if (file instanceof File || file instanceof Blob) {
        formData.append('files', file);
      } else {
        formData.append('files', {
          uri: file.uri || file,
          type: file.type || 'image/jpeg',
          name: file.name || `gallery-${Date.now()}-${index}.jpg`,
        } as any);
      }
    });

    // Append metadata
    formData.append('category', data.category);
    // If single title is provided, use it for all items
    if (data.title) {
      formData.append('title', data.title);
    }
    // If per-item titles array is provided, use that instead
    if (data.titles && Array.isArray(data.titles)) {
      formData.append('titles', JSON.stringify(data.titles));
    }
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        formData.append('tags', JSON.stringify(data.tags));
      } else {
        formData.append('tags', data.tags);
      }
    }
    if (data.isVisible !== undefined) {
      formData.append('isVisible', data.isVisible.toString());
    }
    if (data.isCover !== undefined) {
      formData.append('isCover', data.isCover.toString());
    }

    // Don't set Content-Type header - let axios/browser set it automatically with boundary
    const response = await apiClient.post<{ items: GalleryItem[]; uploaded: number; failed: number; failedItems?: any[] }>(
      `merchant/stores/${storeId}/gallery/bulk`,
      formData
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get gallery items for a store
   */
  async getGallery(
    storeId: string,
    options: {
      category?: string;
      type?: 'image' | 'video';
      limit?: number;
      offset?: number;
      sortBy?: 'order' | 'uploadedAt' | 'views';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<GalleryResponse> {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryString = params.toString();
    const url = `merchant/stores/${storeId}/gallery${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<GalleryResponse>(url);

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get a single gallery item
   */
  async getItem(storeId: string, itemId: string): Promise<GalleryItem> {
    const response = await apiClient.get<GalleryItem>(
      `merchant/stores/${storeId}/gallery/${itemId}`
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Update a gallery item
   */
  async updateItem(
    storeId: string,
    itemId: string,
    data: UpdateGalleryItemData
  ): Promise<GalleryItem> {
    const response = await apiClient.put<GalleryItem>(
      `merchant/stores/${storeId}/gallery/${itemId}`,
      data
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Delete a gallery item
   */
  async deleteItem(storeId: string, itemId: string): Promise<void> {
    await apiClient.delete(`merchant/stores/${storeId}/gallery/${itemId}`);
  }

  /**
   * Bulk delete gallery items
   */
  async bulkDelete(storeId: string, itemIds: string[]): Promise<{ deleted: number }> {
    const response = await apiClient.delete<{ deleted: number }>(
      `merchant/stores/${storeId}/gallery/bulk`,
      { data: { itemIds } }
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Reorder gallery items
   */
  async reorder(storeId: string, items: ReorderItem[]): Promise<void> {
    await apiClient.put(`merchant/stores/${storeId}/gallery/reorder`, { items });
  }

  /**
   * Set a gallery item as cover image for its category
   */
  async setCover(storeId: string, itemId: string, category?: string): Promise<GalleryItem> {
    const response = await apiClient.put<GalleryItem>(
      `merchant/stores/${storeId}/gallery/${itemId}/set-cover`,
      category ? { category } : {}
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get gallery categories for a store
   */
  async getCategories(storeId: string): Promise<GalleryCategory[]> {
    const response = await apiClient.get<{ categories: GalleryCategory[] }>(
      `merchant/stores/${storeId}/gallery/categories`
    );

    if (response.data && response.data.categories) {
      return response.data.categories;
    }
    return [];
  }
}

export const storeGalleryService = new StoreGalleryService();
export default storeGalleryService;


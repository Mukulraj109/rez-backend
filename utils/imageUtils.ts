import { API_CONFIG } from '@/config/api';

// Get the base URL without the /api suffix for images
const getImageBaseUrl = (): string => {
  const baseUrl = API_CONFIG.BASE_URL;
  // Remove /api suffix if present to get server base URL
  return baseUrl.replace('/api', '');
};

// Convert relative image URL to full URL
export const getFullImageUrl = (imageUrl: string): string => {
  if (!imageUrl) {
    return '';
  }
  
  // If already a full URL (starts with http), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Handle file:// URLs (from mobile file system) - these are invalid
  if (imageUrl.startsWith('file://')) {
    console.warn('⚠️ Found invalid file:// URL - image was not properly uploaded:', imageUrl);
    // Return empty string - these images need to be re-uploaded
    return '';
  }
  
  const baseUrl = getImageBaseUrl();
  
  // Handle different path formats
  if (imageUrl.startsWith('/uploads/')) {
    // Already has /uploads prefix
    return `${baseUrl}${imageUrl}`;
  } else if (imageUrl.startsWith('/')) {
    // Absolute path from server root
    return `${baseUrl}${imageUrl}`;
  } else {
    // Relative path - assume it's from uploads folder
    return `${baseUrl}/uploads/${imageUrl}`;
  }
};

// Get image URL with fallback
export const getImageUrlWithFallback = (imageUrl?: string, fallbackUrl?: string): string => {
  if (imageUrl) {
    return getFullImageUrl(imageUrl);
  }
  
  if (fallbackUrl) {
    return getFullImageUrl(fallbackUrl);
  }
  
  // Return empty string if no image available
  return '';
};

// Process product images array
export const processProductImages = (images: any[]): Array<{ url: string; thumbnailUrl?: string; altText?: string }> => {
  if (!images || !Array.isArray(images)) {
    return [];
  }
  
  return images.map((image: any, index: number) => {
    // Handle both string URLs and object formats
    let imageUrl = '';
    
    if (typeof image === 'string') {
      // Image is a string URL
      imageUrl = image;
    } else if (image && typeof image === 'object') {
      // Image is an object with url/path property
      imageUrl = image.url || image.path || '';
    }
    
    // Get full URL
    const fullUrl = getFullImageUrl(imageUrl);
    
    return {
      url: fullUrl,
      thumbnailUrl: (typeof image === 'object' && image.thumbnailUrl) ? getFullImageUrl(image.thumbnailUrl) : undefined,
      altText: (typeof image === 'object') ? (image.altText || image.alt || '') : '',
      isMain: (typeof image === 'object') ? (image.isMain || index === 0) : index === 0,
      sortOrder: (typeof image === 'object') ? (image.sortOrder || index) : index
    };
  }).filter(img => img.url && img.url.trim() !== ''); // Filter out images without URLs
};

// Debug image URLs
export const debugImageUrl = (imageUrl: string) => {
  console.log('🖼️ Image URL Debug:', {
    original: imageUrl,
    isFullUrl: imageUrl.startsWith('http'),
    baseUrl: getImageBaseUrl(),
    fullUrl: getFullImageUrl(imageUrl)
  });
  return getFullImageUrl(imageUrl);
};
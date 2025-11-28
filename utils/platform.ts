import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';

// Platform-specific utilities
export const getImagePickerOptions = () => {
  if (isWeb) {
    return {
      mediaTypes: 'Images' as const,
      allowsMultipleSelection: true,
      quality: 0.8,
    };
  }
  
  return {
    mediaTypes: 'Images' as const,
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 10,
  };
};

export const handleWebImageUpload = (): Promise<{ uri: string; file?: File }[]> => {
  if (!isWeb) {
    return Promise.resolve([]);
  }
  
  return new Promise((resolve) => {
    // Check for browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('Web image upload not available in this environment');
      resolve([]);
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      
      input.onchange = (event) => {
        try {
          const files = (event.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            const fileArray = Array.from(files);
            const results = fileArray.map(file => ({
              uri: URL.createObjectURL(file),
              file: file // Store the File object for direct upload
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        } catch (error) {
          console.error('Error processing selected files:', error);
          resolve([]);
        }
      };
      
      input.onclick = () => {
        // Clear the input value to allow selecting the same file again
        try {
          input.value = '';
        } catch (error) {
          // Ignore errors when clearing input value
        }
      };
      
      input.onerror = () => {
        console.error('Error with file input');
        resolve([]);
      };
      
      // Trigger file selection
      input.click();
    } catch (error) {
      console.error('Error creating file input:', error);
      resolve([]);
    }
  });
};

export const getWebSafeStyles = (styles: any) => {
  if (isWeb) {
    // Remove unsupported web styles
    const { elevation, ...webSafeStyles } = styles;
    return {
      ...webSafeStyles,
      boxShadow: elevation ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)` : undefined,
    };
  }
  return styles;
};
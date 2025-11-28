// PDF utility functions for client-side PDF handling

import { Platform, Alert, Share, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as WebBrowser from 'expo-web-browser';
import { DocumentType } from '../types/documents';
import { sanitizeFilename } from './documentHelpers';

/**
 * Preview PDF in browser or native viewer
 */
export const previewPDF = async (
  url: string,
  options?: {
    title?: string;
    presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet';
  }
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Open in new tab on web
      window.open(url, '_blank');
    } else {
      // Open in WebBrowser on mobile
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: options?.presentationStyle || 'pageSheet',
        toolbarColor: '#3b82f6',
        controlsColor: '#ffffff',
        showTitle: true,
        enableBarCollapsing: true
      });
    }
  } catch (error) {
    console.error('Error previewing PDF:', error);
    Alert.alert(
      'Preview Error',
      'Unable to preview the document. Please try downloading it instead.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Download PDF to device
 */
export const downloadPDF = async (
  url: string,
  filename: string,
  options?: {
    onProgress?: (progress: number) => void;
    showNotification?: boolean;
  }
): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      // Download on web using anchor tag
      return await downloadPDFWeb(url, filename);
    } else {
      // Download on mobile using FileSystem
      return await downloadPDFMobile(url, filename, options);
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    Alert.alert(
      'Download Error',
      'Unable to download the document. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Download PDF on web platform
 */
const downloadPDFWeb = async (url: string, filename: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = sanitizeFilename(filename);
    anchor.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    return blobUrl;
  } catch (error) {
    console.error('Error downloading PDF on web:', error);
    throw error;
  }
};

/**
 * Download PDF on mobile platform
 */
const downloadPDFMobile = async (
  url: string,
  filename: string,
  options?: {
    onProgress?: (progress: number) => void;
    showNotification?: boolean;
  }
): Promise<string> => {
  try {
    const sanitizedFilename = sanitizeFilename(filename);
    const fileUri = `${FileSystem.documentDirectory}${sanitizedFilename}`;

    // Create download resumable
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        options?.onProgress?.(progress * 100);
      }
    );

    // Download file
    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error('Download failed');
    }

    // Show success message
    if (options?.showNotification !== false) {
      Alert.alert(
        'Download Complete',
        `${filename} has been saved to your device.`,
        [
          {
            text: 'Open',
            onPress: () => sharePDF(result.uri, filename)
          },
          { text: 'OK' }
        ]
      );
    }

    return result.uri;
  } catch (error) {
    console.error('Error downloading PDF on mobile:', error);
    throw error;
  }
};

/**
 * Share PDF using native share sheet
 */
export const sharePDF = async (
  url: string,
  filename?: string,
  options?: {
    dialogTitle?: string;
    subject?: string;
    message?: string;
  }
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: options?.subject || 'Share Document',
          text: options?.message || 'Check out this document',
          url: url
        });
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(url);
        Alert.alert('Link Copied', 'Document link has been copied to clipboard.');
      }
    } else {
      // Check if file is local or remote
      const isLocalFile = url.startsWith('file://');

      if (isLocalFile) {
        // Share local file
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          throw new Error('Sharing is not available on this device');
        }

        await Sharing.shareAsync(url, {
          mimeType: 'application/pdf',
          dialogTitle: options?.dialogTitle || 'Share Document',
          UTI: 'com.adobe.pdf'
        });
      } else {
        // Download first, then share
        const localUri = await downloadPDFMobile(url, filename || 'document.pdf');
        await sharePDF(localUri, filename, options);
      }
    }
  } catch (error: any) {
    console.error('Error sharing PDF:', error);
    if (error.message !== 'Share dismissed') {
      Alert.alert(
        'Share Error',
        'Unable to share the document. Please try again.',
        [{ text: 'OK' }]
      );
    }
    throw error;
  }
};

/**
 * Print PDF (web only)
 */
export const printPDF = async (
  url: string,
  options?: {
    html?: string;
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      left?: number;
      right?: number;
      bottom?: number;
    };
  }
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Print on web
      if (options?.html) {
        // Print from HTML
        await Print.printAsync({
          html: options.html,
          orientation: options.orientation
        });
      } else {
        // Open print dialog for URL
        window.open(url, '_blank')?.print();
      }
    } else {
      // On mobile, use Print module
      if (options?.html) {
        await Print.printAsync({
          html: options.html,
          orientation: options.orientation
        });
      } else {
        // Download first, then print
        Alert.alert(
          'Print',
          'This will download the document first. Would you like to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: async () => {
                const localUri = await downloadPDFMobile(url, 'print.pdf');
                await Print.printAsync({ uri: localUri });
              }
            }
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error printing PDF:', error);
    Alert.alert(
      'Print Error',
      'Unable to print the document. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Generate PDF from HTML
 */
export const generatePDFFromHTML = async (
  html: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      left?: number;
      right?: number;
      bottom?: number;
    };
    base64?: boolean;
  }
): Promise<{ uri: string; base64?: string }> => {
  try {
    const result = await Print.printToFileAsync({
      html,
      orientation: options?.orientation,
      margins: options?.margins,
      base64: options?.base64
    });

    return result;
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw error;
  }
};

/**
 * Open PDF in external app
 */
export const openPDFInApp = async (
  url: string,
  filename?: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Just open in new tab on web
      window.open(url, '_blank');
    } else {
      // Check if URL is local
      const isLocalFile = url.startsWith('file://');

      if (isLocalFile) {
        // Open local file
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback to share
          await sharePDF(url, filename);
        }
      } else {
        // Download first, then open
        const localUri = await downloadPDFMobile(url, filename || 'document.pdf');
        await openPDFInApp(localUri, filename);
      }
    }
  } catch (error) {
    console.error('Error opening PDF in app:', error);
    Alert.alert(
      'Open Error',
      'Unable to open the document. Please try downloading it instead.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Get PDF file size
 */
export const getPDFFileSize = async (url: string): Promise<number> => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } else {
      // Check if local file
      if (url.startsWith('file://')) {
        const fileInfo = await FileSystem.getInfoAsync(url);
        return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      } else {
        // Fetch remote file info
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
      }
    }
  } catch (error) {
    console.error('Error getting PDF file size:', error);
    return 0;
  }
};

/**
 * Check if PDF exists locally
 */
export const checkPDFExists = async (filename: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return false; // Not applicable for web
    }

    const fileUri = `${FileSystem.documentDirectory}${sanitizeFilename(filename)}`;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error checking PDF exists:', error);
    return false;
  }
};

/**
 * Delete local PDF
 */
export const deletePDF = async (filename: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Not applicable for web
      return;
    }

    const fileUri = `${FileSystem.documentDirectory}${sanitizeFilename(filename)}`;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
};

/**
 * Get local PDF URI
 */
export const getLocalPDFUri = (filename: string): string => {
  if (Platform.OS === 'web') {
    return '';
  }
  return `${FileSystem.documentDirectory}${sanitizeFilename(filename)}`;
};

/**
 * Clear all downloaded PDFs
 */
export const clearAllPDFs = async (): Promise<number> => {
  try {
    if (Platform.OS === 'web') {
      return 0; // Not applicable for web
    }

    const directory = FileSystem.documentDirectory;
    if (!directory) return 0;

    const files = await FileSystem.readDirectoryAsync(directory);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    let deletedCount = 0;
    for (const file of pdfFiles) {
      try {
        await FileSystem.deleteAsync(`${directory}${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error clearing PDFs:', error);
    return 0;
  }
};

/**
 * Validate PDF URL
 */
export const isValidPDFUrl = (url: string): boolean => {
  try {
    if (!url) return false;

    // Check if it's a valid URL or file path
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating PDF URL:', error);
    return false;
  }
};

/**
 * Create PDF action sheet options
 */
export const createPDFActionSheet = (
  url: string,
  filename: string,
  options?: {
    includePreview?: boolean;
    includeDownload?: boolean;
    includeShare?: boolean;
    includePrint?: boolean;
  }
): Array<{
  label: string;
  icon: string;
  action: () => Promise<void>;
}> => {
  const actions = [];

  if (options?.includePreview !== false) {
    actions.push({
      label: 'Preview',
      icon: 'visibility',
      action: () => previewPDF(url)
    });
  }

  if (options?.includeDownload !== false) {
    actions.push({
      label: 'Download',
      icon: 'download',
      action: () => downloadPDF(url, filename, { showNotification: true })
    });
  }

  if (options?.includeShare !== false) {
    actions.push({
      label: 'Share',
      icon: 'share',
      action: () => sharePDF(url, filename)
    });
  }

  if (Platform.OS !== 'android' && options?.includePrint !== false) {
    actions.push({
      label: 'Print',
      icon: 'print',
      action: () => printPDF(url)
    });
  }

  return actions;
};

// Export all PDF helper functions
export default {
  previewPDF,
  downloadPDF,
  sharePDF,
  printPDF,
  generatePDFFromHTML,
  openPDFInApp,
  getPDFFileSize,
  checkPDFExists,
  deletePDF,
  getLocalPDFUri,
  clearAllPDFs,
  isValidPDFUrl,
  createPDFActionSheet
};

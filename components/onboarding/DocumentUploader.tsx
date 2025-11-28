/**
 * DocumentUploader Component
 * Document upload component with image picker and progress tracking
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/constants/Colors';
import { DocumentType, DocumentUpload } from '@/types/onboarding';

export interface DocumentUploaderProps {
  documentType: DocumentType;
  onUploadComplete: (document: DocumentUpload) => void;
  onUploadError?: (error: string) => void;
  existingDocument?: DocumentUpload;
  disabled?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documentType,
  onUploadComplete,
  onUploadError,
  existingDocument,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library permissions are required to upload documents.'
        );
        return false;
      }
    }
    return true;
  };

  const validateFile = (file: { size?: number; mimeType?: string }): boolean => {
    // Check file size (default max 10MB)
    const maxSize = (documentType.maxSize || 10) * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      Alert.alert(
        'File Too Large',
        `File size must not exceed ${documentType.maxSize || 10}MB`
      );
      return false;
    }

    // Check file type
    if (documentType.acceptedFormats && file.mimeType) {
      const isValidFormat = documentType.acceptedFormats.some((format) =>
        file.mimeType?.includes(format)
      );
      if (!isValidFormat) {
        Alert.alert(
          'Invalid File Type',
          `Accepted formats: ${documentType.acceptedFormats.join(', ')}`
        );
        return false;
      }
    }

    return true;
  };

  const uploadFile = async (uri: string, fileName: string, fileSize?: number) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // TODO: Replace with actual upload API call
      // const response = await uploadDocumentAPI(uri, documentType.type);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      const uploadedDocument: DocumentUpload = {
        type: documentType.type,
        fileUrl: uri, // In production, this would be the server URL
        fileName: fileName,
        fileSize: fileSize,
        uploadedAt: new Date().toISOString(),
        verificationStatus: 'pending',
        uploadProgress: 100,
      };

      onUploadComplete(uploadedDocument);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
      Alert.alert('Upload Failed', errorMessage);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (validateFile({ size: asset.fileSize, mimeType: asset.mimeType })) {
          await uploadFile(asset.uri, `${documentType.type}_${Date.now()}.jpg`, asset.fileSize);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleChooseFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (validateFile({ size: asset.fileSize, mimeType: asset.mimeType })) {
          await uploadFile(asset.uri, `${documentType.type}_${Date.now()}.jpg`, asset.fileSize);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleChooseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: documentType.acceptedFormats || ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (validateFile({ size: asset.size, mimeType: asset.mimeType })) {
          await uploadFile(asset.uri, asset.name, asset.size);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Document',
      `Choose how to upload your ${documentType.label.toLowerCase()}`,
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handleChooseFromGallery,
        },
        {
          text: 'Browse Files',
          onPress: handleChooseDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (uploading) {
    return (
      <View style={[styles.container, { borderColor: colors.borderMedium }]}>
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.uploadingText, { color: colors.text }]}>
            Uploading...
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarBackground,
                { backgroundColor: colors.borderLight },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${uploadProgress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {uploadProgress}%
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (existingDocument) {
    return null; // DocumentCard will handle displaying existing documents
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: documentType.isRequired ? colors.primary : colors.borderMedium,
          backgroundColor: colors.backgroundSecondary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={showUploadOptions}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: documentType.isRequired ? colors.primary : colors.borderDark },
          ]}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={32}
            color={documentType.isRequired ? '#FFFFFF' : colors.textMuted}
          />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {documentType.label}
            </Text>
            {documentType.isRequired && (
              <View style={[styles.requiredBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {documentType.description}
          </Text>

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tap to upload • Max {documentType.maxSize || 10}MB
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    marginBottom: 4,
  },
  hint: {
    fontSize: 11,
  },
  uploadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default DocumentUploader;

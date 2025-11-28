import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { uploadsService } from '@/services';

export interface ProductImage {
  uri: string;
  url?: string;
  altText?: string;
  isMain: boolean;
  sortOrder: number;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

interface ImageUploaderProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  autoUpload?: boolean;
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  autoUpload = true,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload images.'
        );
        return;
      }

      // Pick images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const remainingSlots = maxImages - images.length;
        const selectedImages = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Too Many Images',
            `You can only add ${remainingSlots} more image(s). Maximum is ${maxImages} images per product.`
          );
        }

        // Create new image objects
        const newImages: ProductImage[] = selectedImages.map((asset, index) => ({
          uri: asset.uri,
          altText: '',
          isMain: images.length === 0 && index === 0, // First image is main if no images exist
          sortOrder: images.length + index,
          uploading: autoUpload,
          uploadProgress: 0,
        }));

        // Add to images array
        const updatedImages = [...images, ...newImages];
        onImagesChange(updatedImages);

        // Auto upload if enabled
        if (autoUpload) {
          uploadImages(newImages, updatedImages);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const uploadImages = async (imagesToUpload: ProductImage[], allImages: ProductImage[]) => {
    setUploading(true);

    for (const image of imagesToUpload) {
      try {
        console.log('📤 Uploading image:', image.uri);
        
        // Update progress
        updateImageProgress(image.uri, 0);

        // Upload to Cloudinary
        const result = await uploadsService.uploadProductImages(
          [image.uri],
          undefined,
          (progress) => {
            updateImageProgress(image.uri, progress);
          }
        );

        console.log('📥 Upload result:', result);

        if (result && result.length > 0 && result[0].url) {
          // Update with URL
          console.log('✅ Image uploaded successfully, updating UI with URL:', result[0].url);
          updateImageUrl(image.uri, result[0].url, false);
        } else {
          console.error('❌ Invalid upload result:', result);
          updateImageError(image.uri, 'Upload completed but no URL received');
        }
      } catch (error: any) {
        console.error('❌ Upload error:', error);
        updateImageError(image.uri, error.message || 'Upload failed');
      }
    }

    setUploading(false);
  };

  const updateImageProgress = (uri: string, progress: number) => {
    onImagesChange(prevImages => 
      prevImages.map(img =>
        img.uri === uri ? { ...img, uploadProgress: progress } : img
      )
    );
  };

  const updateImageUrl = (uri: string, url: string, uploading: boolean) => {
    console.log('🖼️ Updating image URL:', { uri, url, uploading });
    onImagesChange(prevImages => {
      const updated = prevImages.map(img =>
        img.uri === uri ? { ...img, url, uploading, uploadProgress: 100, error: undefined } : img
      );
      console.log('🖼️ Updated images array:', updated);
      return updated;
    });
  };

  const updateImageError = (uri: string, error: string) => {
    console.error('❌ Image upload error:', { uri, error });
    onImagesChange(prevImages =>
      prevImages.map(img =>
        img.uri === uri ? { ...img, error, uploading: false } : img
      )
    );
  };

  const retryUpload = async (image: ProductImage) => {
    const updatedImages = images.map(img =>
      img.uri === image.uri ? { ...img, uploading: true, error: undefined, uploadProgress: 0 } : img
    );
    onImagesChange(updatedImages);

    await uploadImages([image], updatedImages);
  };

  const removeImage = (index: number) => {
    if (index < 0 || index >= images.length) {
      console.error('🗑️ [IMAGE] Invalid index for removal:', index);
      return;
    }
    
    const imageToRemove = images[index];
    
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ [IMAGE] Removing image at index:', index, { 
              uri: imageToRemove.uri, 
              url: imageToRemove.url 
            });
            console.log('🗑️ [IMAGE] Images before removal:', images.length);
            
            // Remove image by index
            let updatedImages = images.filter((_, i) => i !== index);
            
            console.log('🗑️ [IMAGE] Images after removal:', updatedImages.length);
            
            // If removed image was main, make first image main
            if (updatedImages.length > 0 && !updatedImages.some(img => img.isMain)) {
              updatedImages[0].isMain = true;
            }
            
            // Update sort order
            updatedImages = updatedImages.map((img, i) => ({
              ...img,
              sortOrder: i,
            }));
            
            onImagesChange(updatedImages);
          },
        },
      ]
    );
  };

  const setMainImage = (uri: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isMain: img.uri === uri,
    }));
    onImagesChange(updatedImages);
  };

  const updateAltText = (uri: string, altText: string) => {
    const updatedImages = images.map(img =>
      img.uri === uri ? { ...img, altText } : img
    );
    onImagesChange(updatedImages);
  };

  const moveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= images.length) return;

    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);

    // Update sort order
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      sortOrder: index,
    }));

    onImagesChange(reorderedImages);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagesScrollContent}
      >
        {images.map((image, index) => (
          <View key={`${image.uri || image.url || index}-${index}`} style={styles.imageCard}>
            {/* Image Preview */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              
              {/* Upload Progress Overlay */}
              {image.uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color={Colors.light.background} />
                  {image.uploadProgress !== undefined && (
                    <ThemedText style={styles.uploadProgressText}>
                      {Math.round(image.uploadProgress)}%
                    </ThemedText>
                  )}
                </View>
              )}

              {/* Error Overlay */}
              {image.error && (
                <View style={styles.errorOverlay}>
                  <Ionicons name="alert-circle" size={32} color={Colors.light.background} />
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => retryUpload(image)}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.light.background} />
                    <ThemedText style={styles.retryText}>Retry</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Main Image Badge */}
              {image.isMain && (
                <View style={styles.mainBadge}>
                  <Ionicons name="star" size={16} color={Colors.light.background} />
                  <ThemedText style={styles.mainBadgeText}>Main</ThemedText>
                </View>
              )}

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  console.log('🗑️ [IMAGE] Remove button clicked for image:', { 
                    uri: image.uri, 
                    url: image.url, 
                    index 
                  });
                  // Use index for more reliable removal
                  removeImage(index);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color={Colors.light.error} />
              </TouchableOpacity>

              {/* Reorder Buttons */}
              <View style={styles.reorderButtons}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveImage(index, 'left')}
                  >
                    <Ionicons name="chevron-back" size={20} color={Colors.light.background} />
                  </TouchableOpacity>
                )}
                {index < images.length - 1 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveImage(index, 'right')}
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.background} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Alt Text Input */}
            <TextInput
              style={styles.altTextInput}
              placeholder="Alt text (optional)"
              placeholderTextColor={Colors.light.textSecondary}
              value={image.altText}
              onChangeText={(text) => updateAltText(image.uri, text)}
              maxLength={100}
            />

            {/* Set as Main Button */}
            {!image.isMain && (
              <TouchableOpacity
                style={styles.setMainButton}
                onPress={() => setMainImage(image.uri)}
              >
                <Ionicons name="star-outline" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.setMainText}>Set as Main</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add Image Button */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={pickImages}
            disabled={uploading}
          >
            <Ionicons name="add-circle-outline" size={48} color={Colors.light.primary} />
            <ThemedText style={styles.addImageText}>Add Image</ThemedText>
            <ThemedText style={styles.addImageSubtext}>
              {images.length}/{maxImages}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {images.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyStateText}>No images added yet</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Tap 'Add Image' to upload product photos
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 200,
  },
  imagesScrollContent: {
    paddingVertical: 8,
    gap: 16,
  },
  imageCard: {
    width: 280,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.light.border,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadProgressText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  mainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainBadgeText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  reorderButtons: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reorderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  altTextInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  setMainButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 8,
  },
  setMainText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  addImageButton: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addImageText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  addImageSubtext: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});


import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { uploadsService } from '@/services';

export interface ProductVideo {
  uri: string;
  url?: string;
  title?: string;
  duration?: number;
  sortOrder: number;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
  thumbnailUrl?: string;
}

interface VideoUploaderProps {
  videos: ProductVideo[];
  onVideosChange: (videos: ProductVideo[]) => void;
  maxVideos?: number;
  autoUpload?: boolean;
}

export default function VideoUploader({
  videos,
  onVideosChange,
  maxVideos = 5,
  autoUpload = true,
}: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const pickVideos = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload videos.'
        );
        return;
      }

      // Pick videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false, // Videos are large, do one at a time
        quality: 0.9,
      });

      if (!result.canceled && result.assets) {
        const remainingSlots = maxVideos - videos.length;
        
        if (remainingSlots <= 0) {
          Alert.alert(
            'Maximum Videos Reached',
            `You can only add ${maxVideos} videos per product.`
          );
          return;
        }

        const asset = result.assets[0];

        // Check video duration (max 2 minutes = 120 seconds)
        if (asset.duration && asset.duration > 120000) {
          Alert.alert(
            'Video Too Long',
            'Please select a video that is 2 minutes or less.'
          );
          return;
        }

        // Create new video object
        const newVideo: ProductVideo = {
          uri: asset.uri,
          title: '',
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          sortOrder: videos.length,
          uploading: autoUpload,
          uploadProgress: 0,
        };

        // Add to videos array
        const updatedVideos = [...videos, newVideo];
        onVideosChange(updatedVideos);

        // Auto upload if enabled
        if (autoUpload) {
          uploadVideo(newVideo, updatedVideos);
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const uploadVideo = async (videoToUpload: ProductVideo, allVideos: ProductVideo[]) => {
    setUploading(true);

    try {
      // Update progress
      updateVideoProgress(videoToUpload.uri, 0);

      // Upload to Cloudinary
      const result = await uploadsService.uploadProductVideo(
        videoToUpload.uri,
        undefined,
        (progress) => {
          updateVideoProgress(videoToUpload.uri, progress);
        }
      );

      if (result) {
        // Update with URL and additional info
        updateVideoData(videoToUpload.uri, {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration || videoToUpload.duration,
          uploading: false,
          uploadProgress: 100,
          error: undefined,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      updateVideoError(videoToUpload.uri, error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const updateVideoProgress = (uri: string, progress: number) => {
    const updatedVideos = videos.map(video =>
      video.uri === uri ? { ...video, uploadProgress: progress } : video
    );
    onVideosChange(updatedVideos);
  };

  const updateVideoData = (uri: string, data: Partial<ProductVideo>) => {
    const updatedVideos = videos.map(video =>
      video.uri === uri ? { ...video, ...data } : video
    );
    onVideosChange(updatedVideos);
  };

  const updateVideoError = (uri: string, error: string) => {
    const updatedVideos = videos.map(video =>
      video.uri === uri ? { ...video, error, uploading: false } : video
    );
    onVideosChange(updatedVideos);
  };

  const retryUpload = async (video: ProductVideo) => {
    const updatedVideos = videos.map(v =>
      v.uri === video.uri ? { ...v, uploading: true, error: undefined, uploadProgress: 0 } : v
    );
    onVideosChange(updatedVideos);

    await uploadVideo(video, updatedVideos);
  };

  const removeVideo = (uri: string) => {
    Alert.alert(
      'Remove Video',
      'Are you sure you want to remove this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            let updatedVideos = videos.filter(video => video.uri !== uri);
            
            // Update sort order
            updatedVideos = updatedVideos.map((video, index) => ({
              ...video,
              sortOrder: index,
            }));
            
            onVideosChange(updatedVideos);
          },
        },
      ]
    );
  };

  const updateTitle = (uri: string, title: string) => {
    const updatedVideos = videos.map(video =>
      video.uri === uri ? { ...video, title } : video
    );
    onVideosChange(updatedVideos);
  };

  const moveVideo = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= videos.length) return;

    const updatedVideos = [...videos];
    const [movedVideo] = updatedVideos.splice(fromIndex, 1);
    updatedVideos.splice(toIndex, 0, movedVideo);

    // Update sort order
    const reorderedVideos = updatedVideos.map((video, index) => ({
      ...video,
      sortOrder: index,
    }));

    onVideosChange(reorderedVideos);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.videosScrollContent}
      >
        {videos.map((video, index) => (
          <View key={video.uri} style={styles.videoCard}>
            {/* Video Preview */}
            <View style={styles.videoContainer}>
              {!video.uploading && !video.error ? (
                <Video
                  source={{ uri: video.uri }}
                  style={styles.video}
                  useNativeControls={false}
                  resizeMode="cover"
                  shouldPlay={false}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="videocam" size={48} color={Colors.light.textSecondary} />
                </View>
              )}
              
              {/* Upload Progress Overlay */}
              {video.uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color={Colors.light.background} />
                  {video.uploadProgress !== undefined && (
                    <ThemedText style={styles.uploadProgressText}>
                      {Math.round(video.uploadProgress)}%
                    </ThemedText>
                  )}
                  <ThemedText style={styles.uploadingText}>Uploading video...</ThemedText>
                </View>
              )}

              {/* Error Overlay */}
              {video.error && (
                <View style={styles.errorOverlay}>
                  <Ionicons name="alert-circle" size={32} color={Colors.light.background} />
                  <ThemedText style={styles.errorText}>{video.error}</ThemedText>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => retryUpload(video)}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.light.background} />
                    <ThemedText style={styles.retryText}>Retry</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Duration Badge */}
              {video.duration && !video.uploading && !video.error && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={14} color={Colors.light.background} />
                  <ThemedText style={styles.durationText}>
                    {formatDuration(video.duration)}
                  </ThemedText>
                </View>
              )}

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeVideo(video.uri)}
              >
                <Ionicons name="close-circle" size={28} color={Colors.light.error} />
              </TouchableOpacity>

              {/* Reorder Buttons */}
              <View style={styles.reorderButtons}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveVideo(index, 'left')}
                  >
                    <Ionicons name="chevron-back" size={20} color={Colors.light.background} />
                  </TouchableOpacity>
                )}
                {index < videos.length - 1 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveVideo(index, 'right')}
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.background} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Play Icon Overlay */}
              {!video.uploading && !video.error && (
                <View style={styles.playIconOverlay}>
                  <Ionicons name="play-circle" size={48} color="rgba(255, 255, 255, 0.8)" />
                </View>
              )}
            </View>

            {/* Video Title Input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Video title (optional)"
              placeholderTextColor={Colors.light.textSecondary}
              value={video.title}
              onChangeText={(text) => updateTitle(video.uri, text)}
              maxLength={100}
            />

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="videocam-outline" size={16} color={Colors.light.textSecondary} />
                <ThemedText style={styles.infoText}>
                  {video.url ? 'Uploaded' : 'Pending'}
                </ThemedText>
              </View>
            </View>
          </View>
        ))}

        {/* Add Video Button */}
        {videos.length < maxVideos && (
          <TouchableOpacity
            style={styles.addVideoButton}
            onPress={pickVideos}
            disabled={uploading}
          >
            <Ionicons name="add-circle-outline" size={48} color={Colors.light.primary} />
            <ThemedText style={styles.addVideoText}>Add Video</ThemedText>
            <ThemedText style={styles.addVideoSubtext}>
              {videos.length}/{maxVideos}
            </ThemedText>
            <ThemedText style={styles.addVideoHint}>Max 2 min each</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {videos.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyStateText}>No videos added yet</ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Tap 'Add Video' to upload product videos
          </ThemedText>
          <ThemedText style={styles.emptyStateHint}>
            Videos help customers see your product in action
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
  videosScrollContent: {
    paddingVertical: 8,
    gap: 16,
  },
  videoCard: {
    width: 280,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.light.border,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadProgressText: {
    color: Colors.light.background,
    fontSize: 18,
    fontWeight: '700',
  },
  uploadingText: {
    color: Colors.light.background,
    fontSize: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  errorText: {
    color: Colors.light.background,
    fontSize: 12,
    textAlign: 'center',
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
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
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
    flexDirection: 'row',
    gap: 8,
  },
  reorderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  videoInfo: {
    marginTop: 8,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  addVideoButton: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addVideoText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  addVideoSubtext: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  addVideoHint: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
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
  emptyStateHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});


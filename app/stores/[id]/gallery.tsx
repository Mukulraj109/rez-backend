import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { storeGalleryService, GalleryItem, GalleryCategory } from '@/services/api/storeGallery';
import { useStore } from '@/contexts/StoreContext';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';
import { isWeb, handleWebImageUpload } from '@/utils/platform';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';
import ConfirmModal from '@/components/common/ConfirmModal';

// Helper function to show success/error messages
const showSuccess = (title: string, message: string, setSuccess: any, setShow: any) => {
  setSuccess({ title, message });
  setShow(true);
};

const showError = (title: string, message: string, setError: any, setShow: any) => {
  setError({ title, message });
  setShow(true);
};

// Conditional import for drag functionality
let DraggableFlatList: any = null;
let RenderItemParams: any = null;

if (Platform.OS !== 'web') {
  try {
    const DragModule = require('react-native-draggable-flatlist');
    DraggableFlatList = DragModule.default;
    RenderItemParams = DragModule.RenderItemParams;
  } catch (e) {
    console.log('Draggable FlatList not available for this platform');
  }
}

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 columns with padding

const GALLERY_CATEGORIES = [
  'interior',
  'exterior',
  'products',
  'events',
  'team',
  'behind-scenes',
  'menu',
  'general',
];

export default function StoreGalleryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Phase 3: Advanced features state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dragEnabled, setDragEnabled] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cross-platform modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  // Upload form state
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');

  useEffect(() => {
    loadGallery();
    loadCategories();
  }, [storeId, selectedCategory, selectedType]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await storeGalleryService.getGallery(storeId, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        limit: 100,
        sortBy: 'order',
        sortOrder: 'asc',
      });
      setGalleryItems(response.items);
    } catch (err: any) {
      console.error('Error loading gallery:', err);
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await storeGalleryService.getCategories(storeId);
      setCategories(cats);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadGallery(), loadCategories()]);
    setRefreshing(false);
  };

  const handleSelectImages = async (multiple: boolean = false) => {
    try {
      // Close the upload modal first
      setShowUploadModal(false);
      
      let result;
      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          result = {
            assets: webImages.map(img => ({
              uri: img.uri,
              file: img.file,
            })),
            canceled: false,
          };
        } else {
          return;
        }
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsMultipleSelection: multiple,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (multiple && result.assets.length > 1) {
          // Bulk upload
          await handleBulkUpload(result.assets);
        } else {
          // Single upload
          await handleSingleUpload(result.assets[0]);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      showError('Error', error.message || 'Failed to select images', setErrorMessage, setShowErrorModal);
      setUploading(false);
    }
  };

  const handleSingleUpload = async (asset: any) => {
    try {
      setUploading(true);
      const file = isWeb && asset.file ? asset.file : asset;

      const uploadedItem = await storeGalleryService.uploadItem(storeId, file, {
        category: uploadCategory,
        title: uploadTitle || undefined,
        description: uploadDescription || undefined,
        tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : undefined,
        isVisible: true,
      });

      // Reset form
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadCategory('general');
      setShowUploadModal(false);

      // Reload gallery
      await loadGallery();
      await loadCategories();

      showSuccess('Success', 'Image uploaded successfully!', setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Upload error:', error);
      showError('Upload Error', error.message || 'Failed to upload image', setErrorMessage, setShowErrorModal);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (assets: any[]) => {
    try {
      setUploading(true);
      const files = assets.map(asset => (isWeb && asset.file ? asset.file : asset));

      const result = await storeGalleryService.bulkUpload(storeId, files, {
        category: uploadCategory,
        title: uploadTitle || undefined, // Apply same title to all items
        description: uploadDescription || undefined,
        tags: uploadTags ? uploadTags.split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined,
        isVisible: true,
      });

      // Reset form
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadCategory('general');
      setShowUploadModal(false);

      // Reload gallery
      await loadGallery();
      await loadCategories();

      showSuccess(
        'Upload Complete',
        `${result.uploaded} images uploaded successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        setSuccessMessage,
        setShowSuccessModal
      );
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      showError('Upload Error', error.message || 'Failed to upload images', setErrorMessage, setShowErrorModal);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setSelectedItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category,
      tags: item.tags?.join(', ') || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUploading(true);
      await storeGalleryService.updateItem(storeId, selectedItem.id, {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        category: editForm.category,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()) : undefined,
      });

      setShowEditModal(false);
      setSelectedItem(null);
      await loadGallery();
      await loadCategories();

      showSuccess('Success', 'Gallery item updated successfully!', setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Update error:', error);
      showError('Error', error.message || 'Failed to update gallery item', setErrorMessage, setShowErrorModal);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item: GalleryItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    try {
      setDeleting(true);
      await storeGalleryService.deleteItem(storeId, selectedItem.id);

      setShowDeleteModal(false);
      setSelectedItem(null);
      await loadGallery();
      await loadCategories();

      showSuccess('Success', 'Gallery item deleted successfully!', setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Delete error:', error);
      showError('Error', error.message || 'Failed to delete gallery item', setErrorMessage, setShowErrorModal);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetCover = async (item: GalleryItem) => {
    try {
      setUploading(true);
      await storeGalleryService.setCover(storeId, item.id, item.category);
      await loadGallery();
      await loadCategories();
      showSuccess('Success', 'Cover image set successfully!', setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Set cover error:', error);
      showError('Error', error.message || 'Failed to set cover image', setErrorMessage, setShowErrorModal);
    } finally {
      setUploading(false);
    }
  };

  // Phase 3: Drag & Drop Reordering
  const handleDragEnd = async ({ data }: { data: GalleryItem[] }) => {
    try {
      setGalleryItems(data);
      // Update orders based on new positions
      const reorderItems = data.map((item, index) => ({
        id: item.id,
        order: index + 1,
      }));
      await storeGalleryService.reorder(storeId, reorderItems);
    } catch (error: any) {
      console.error('Reorder error:', error);
      showError('Error', 'Failed to reorder items. Reloading...', setErrorMessage, setShowErrorModal);
      await loadGallery();
    }
  };

  // Phase 3: Bulk Selection
  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(galleryItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      setDeleting(true);
      const itemIds = Array.from(selectedItems);
      await storeGalleryService.bulkDelete(storeId, itemIds);
      setShowBulkDeleteModal(false);
      clearSelection();
      await loadGallery();
      await loadCategories();
      showSuccess('Success', `${itemIds.length} items deleted successfully!`, setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      showError('Error', error.message || 'Failed to delete items', setErrorMessage, setShowErrorModal);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkVisibilityToggle = async (isVisible: boolean) => {
    if (selectedItems.size === 0) return;

    try {
      setUploading(true);
      const updatePromises = Array.from(selectedItems).map(itemId => {
        const item = galleryItems.find(i => i.id === itemId);
        if (item) {
          return storeGalleryService.updateItem(storeId, itemId, { isVisible });
        }
        return Promise.resolve();
      });
      await Promise.all(updatePromises);
      clearSelection();
      await loadGallery();
      showSuccess('Success', `${selectedItems.size} items ${isVisible ? 'shown' : 'hidden'} successfully!`, setSuccessMessage, setShowSuccessModal);
    } catch (error: any) {
      console.error('Bulk visibility toggle error:', error);
      showError('Error', error.message || 'Failed to update visibility', setErrorMessage, setShowErrorModal);
    } finally {
      setUploading(false);
    }
  };

  // Phase 3: Quick Visibility Toggle
  const handleQuickVisibilityToggle = async (item: GalleryItem) => {
    try {
      await storeGalleryService.updateItem(storeId, item.id, {
        isVisible: !item.isVisible,
      });
      await loadGallery();
    } catch (error: any) {
      console.error('Visibility toggle error:', error);
      showError('Error', error.message || 'Failed to toggle visibility', setErrorMessage, setShowErrorModal);
    }
  };

  // Phase 3: Analytics Calculation
  const calculateAnalytics = () => {
    const totalItems = galleryItems.length;
    const visibleItems = galleryItems.filter(item => item.isVisible).length;
    const hiddenItems = totalItems - visibleItems;
    const images = galleryItems.filter(item => item.type === 'image').length;
    const videos = galleryItems.filter(item => item.type === 'video').length;
    const totalViews = galleryItems.reduce((sum, item) => sum + item.views, 0);
    const totalLikes = galleryItems.reduce((sum, item) => sum + item.likes, 0);
    const totalShares = galleryItems.reduce((sum, item) => sum + item.shares, 0);
    const categoryCounts = galleryItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostViewed = [...galleryItems].sort((a, b) => b.views - a.views)[0];
    const mostLiked = [...galleryItems].sort((a, b) => b.likes - a.likes)[0];

    return {
      totalItems,
      visibleItems,
      hiddenItems,
      images,
      videos,
      totalViews,
      totalLikes,
      totalShares,
      categoryCounts,
      mostViewed,
      mostLiked,
    };
  };

  // Phase 3: Create Custom Category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showError('Error', 'Please enter a category name', setErrorMessage, setShowErrorModal);
      return;
    }

    const categoryName = newCategoryName.trim().toLowerCase();
    
    // Check if category already exists
    if (GALLERY_CATEGORIES.includes(categoryName) || categories.some(c => c.name === categoryName)) {
      showError('Error', 'Category already exists', setErrorMessage, setShowErrorModal);
      return;
    }

    // Category will be created when first item is uploaded to it
    // For now, just close modal and set as selected
    setUploadCategory(categoryName);
    setNewCategoryName('');
    setShowCategoryModal(false);
    showSuccess('Success', `Category "${categoryName}" will be created when you upload the first item to it.`, setSuccessMessage, setShowSuccessModal);
  };

  const renderGalleryItem = ({ item, drag, isActive }: { item: GalleryItem; drag?: () => void; isActive?: boolean }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.galleryItem,
          isSelected && styles.galleryItemSelected,
          isActive && styles.galleryItemDragging,
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            handleEdit(item);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            toggleSelection(item.id);
          }
        }}
        disabled={isActive}
      >
        {isSelectionMode && (
          <View style={styles.selectionCheckbox}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
        )}
        {dragEnabled && !isSelectionMode && drag && (
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={drag}
            disabled={isActive}
          >
            <Ionicons name="reorder-three-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
        <Image
          source={{ uri: item.type === 'video' ? (item.thumbnail || item.url) : item.url }}
          style={styles.galleryImage}
          resizeMode="cover"
        />
        {item.type === 'video' && (
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={20} color="#FFF" />
          </View>
        )}
        {item.isCover && (
          <View style={styles.coverBadge}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.coverText}>Cover</Text>
          </View>
        )}
        {!item.isVisible && (
          <View style={styles.hiddenBadge}>
            <Ionicons name="eye-off" size={16} color="#FFF" />
          </View>
        )}
        {item.title && (
          <View style={styles.titleOverlay}>
            <Text style={styles.titleText} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        )}
        {/* Quick actions overlay */}
        {!isSelectionMode && !dragEnabled && (
          <View style={styles.quickActionsOverlay}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickVisibilityToggle(item)}
            >
              <Ionicons
                name={item.isVisible ? 'eye' : 'eye-off'}
                size={16}
                color="#FFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleSetCover(item)}
            >
              <Ionicons
                name={item.isCover ? 'star' : 'star-outline'}
                size={16}
                color="#FFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionButtonDanger]}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store Gallery</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Gallery</Text>
        <TouchableOpacity
          onPress={() => setShowUploadModal(true)}
          style={styles.uploadButton}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeSubtext}>
            {galleryItems.length} {galleryItems.length === 1 ? 'item' : 'items'} in gallery
          </Text>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          {['all', ...GALLERY_CATEGORIES].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory === cat && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.typeFilter}>
          {(['all', 'image', 'video'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeFilterButton,
                selectedType === type && styles.typeFilterButtonActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Ionicons
                name={type === 'image' ? 'image' : type === 'video' ? 'videocam' : 'grid'}
                size={18}
                color={selectedType === type ? '#3B82F6' : '#6B7280'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gallery Grid */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadGallery} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {galleryItems.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No gallery items yet</Text>
          <Text style={styles.emptySubtext}>Upload images or videos to showcase your store</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.emptyButtonText}>Upload First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {Platform.OS === 'web' || !DraggableFlatList || !dragEnabled ? (
            <FlatList
              data={galleryItems}
              renderItem={({ item }) => renderGalleryItem({ item, drag: undefined, isActive: false })}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 3 : 1}
              contentContainerStyle={styles.galleryGrid}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListFooterComponent={
                uploading ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={styles.uploadingText}>Processing...</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <DraggableFlatList
              data={galleryItems}
              renderItem={renderGalleryItem}
              keyExtractor={(item: GalleryItem) => item.id}
              onDragEnd={handleDragEnd}
              numColumns={3}
              contentContainerStyle={styles.galleryGrid}
              scrollEnabled={!dragEnabled}
              activationDistance={dragEnabled ? 10 : 100}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          )}
          {isSelectionMode && selectedItems.size > 0 && (
            <View style={styles.bulkActionsBar}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkVisibilityToggle(true)}
              >
                <Ionicons name="eye" size={20} color="#3B82F6" />
                <Text style={styles.bulkActionText}>Show</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkVisibilityToggle(false)}
              >
                <Ionicons name="eye-off" size={20} color="#6B7280" />
                <Text style={styles.bulkActionText}>Hide</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.bulkActionButtonDanger]}
                onPress={() => setShowBulkDeleteModal(true)}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={[styles.bulkActionText, styles.bulkActionTextDanger]}>
                  Delete ({selectedItems.size})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Gallery Item</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[...GALLERY_CATEGORIES, ...categories.map(c => c.name)].filter((cat, index, self) => self.indexOf(cat) === index).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        uploadCategory === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setUploadCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          uploadCategory === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.categoryChip, styles.categoryChipAdd]}
                    onPress={() => setShowCategoryModal(true)}
                  >
                    <Ionicons name="add" size={16} color="#3B82F6" />
                    <Text style={[styles.categoryChipText, { color: '#3B82F6', marginLeft: 4 }]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  placeholder="Enter title"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={uploadDescription}
                  onChangeText={setUploadDescription}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags (optional, comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  value={uploadTags}
                  onChangeText={setUploadTags}
                  placeholder="e.g., interior, modern, store"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary, uploading && styles.modalButtonDisabled]}
                  onPress={() => handleSelectImages(false)}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Ionicons name="image" size={20} color="#3B82F6" />
                  )}
                  <Text style={styles.modalButtonTextSecondary}>
                    {uploading ? 'Uploading...' : 'Single Upload'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, uploading && styles.modalButtonDisabled]}
                  onPress={() => handleSelectImages(true)}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="images" size={20} color="#FFF" />
                  )}
                  <Text style={styles.modalButtonTextPrimary}>
                    {uploading ? 'Uploading...' : 'Bulk Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Gallery Item</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedItem && (
                <Image
                  source={{ uri: selectedItem.type === 'video' ? (selectedItem.thumbnail || selectedItem.url) : selectedItem.url }}
                  style={styles.editPreview}
                  resizeMode="cover"
                />
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.title}
                  onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  placeholder="Enter title"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[...GALLERY_CATEGORIES, ...categories.map(c => c.name)]
                    .filter((cat, index, self) => self.indexOf(cat) === index)
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          editForm.category === cat && styles.categoryChipActive,
                        ]}
                        onPress={() => setEditForm({ ...editForm, category: cat })}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            editForm.category === cat && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  <TouchableOpacity
                    style={[styles.categoryChip, styles.categoryChipAdd]}
                    onPress={() => {
                      setShowEditModal(false);
                      setShowCategoryModal(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color="#3B82F6" />
                    <Text style={[styles.categoryChipText, { color: '#3B82F6', marginLeft: 4 }]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.tags}
                  onChangeText={(text) => setEditForm({ ...editForm, tags: text })}
                  placeholder="e.g., interior, modern, store"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDanger]}
                  onPress={() => {
                    setShowEditModal(false);
                    handleDelete(selectedItem!);
                  }}
                  disabled={uploading}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                  <Text style={[styles.modalButtonTextPrimary, { marginLeft: 8 }]}>Delete</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary, { flex: 1 }]}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary, { flex: 1 }]}
                    onPress={handleSaveEdit}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.modalButtonTextPrimary}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Gallery Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#EF4444"
        loading={deleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        visible={showBulkDeleteModal}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${selectedItems.size} item(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setShowBulkDeleteModal(false);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#EF4444"
        loading={deleting}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setShowSuccessModal(false)}
        autoCloseDelay={3000}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        title={errorMessage.title}
        message={errorMessage.message}
        onClose={() => setShowErrorModal(false)}
      />

      {/* Analytics Modal */}
      <Modal
        visible={showAnalytics}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnalytics(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.analyticsModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gallery Analytics</Text>
              <TouchableOpacity onPress={() => setShowAnalytics(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {(() => {
                const analytics = calculateAnalytics();
                return (
                  <>
                    <View style={styles.analyticsSection}>
                      <Text style={styles.analyticsSectionTitle}>Overview</Text>
                      <View style={styles.analyticsGrid}>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="images" size={24} color="#3B82F6" />
                          <Text style={styles.analyticsValue}>{analytics.totalItems}</Text>
                          <Text style={styles.analyticsLabel}>Total Items</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="eye" size={24} color="#10B981" />
                          <Text style={styles.analyticsValue}>{analytics.visibleItems}</Text>
                          <Text style={styles.analyticsLabel}>Visible</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="eye-off" size={24} color="#6B7280" />
                          <Text style={styles.analyticsValue}>{analytics.hiddenItems}</Text>
                          <Text style={styles.analyticsLabel}>Hidden</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="image" size={24} color="#8B5CF6" />
                          <Text style={styles.analyticsValue}>{analytics.images}</Text>
                          <Text style={styles.analyticsLabel}>Images</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="videocam" size={24} color="#EF4444" />
                          <Text style={styles.analyticsValue}>{analytics.videos}</Text>
                          <Text style={styles.analyticsLabel}>Videos</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.analyticsSection}>
                      <Text style={styles.analyticsSectionTitle}>Engagement</Text>
                      <View style={styles.analyticsGrid}>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="eye-outline" size={24} color="#3B82F6" />
                          <Text style={styles.analyticsValue}>{analytics.totalViews.toLocaleString()}</Text>
                          <Text style={styles.analyticsLabel}>Total Views</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="heart" size={24} color="#EF4444" />
                          <Text style={styles.analyticsValue}>{analytics.totalLikes.toLocaleString()}</Text>
                          <Text style={styles.analyticsLabel}>Total Likes</Text>
                        </View>
                        <View style={styles.analyticsCard}>
                          <Ionicons name="share-social" size={24} color="#10B981" />
                          <Text style={styles.analyticsValue}>{analytics.totalShares.toLocaleString()}</Text>
                          <Text style={styles.analyticsLabel}>Total Shares</Text>
                        </View>
                      </View>
                    </View>

                    {analytics.mostViewed && (
                      <View style={styles.analyticsSection}>
                        <Text style={styles.analyticsSectionTitle}>Most Viewed</Text>
                        <View style={styles.analyticsItemCard}>
                          <Image
                            source={{ uri: analytics.mostViewed.type === 'video' ? (analytics.mostViewed.thumbnail || analytics.mostViewed.url) : analytics.mostViewed.url }}
                            style={styles.analyticsItemImage}
                            resizeMode="cover"
                          />
                          <View style={styles.analyticsItemInfo}>
                            <Text style={styles.analyticsItemTitle}>
                              {analytics.mostViewed.title || 'Untitled'}
                            </Text>
                            <Text style={styles.analyticsItemStats}>
                              {analytics.mostViewed.views} views
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={styles.analyticsSection}>
                      <Text style={styles.analyticsSectionTitle}>Categories</Text>
                      {Object.entries(analytics.categoryCounts).map(([category, count]) => (
                        <View key={category} style={styles.analyticsCategoryRow}>
                          <Text style={styles.analyticsCategoryName}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Text>
                          <Text style={styles.analyticsCategoryCount}>{count} items</Text>
                        </View>
                      ))}
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Custom Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g., special-offers, new-arrivals"
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>
                  Use lowercase letters, numbers, and hyphens only
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                  }}
                >
                  <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Text style={styles.modalButtonTextPrimary}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Progress Overlay */}
      {uploading && (
        <Modal
          visible={uploading}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.uploadOverlay}>
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.uploadProgressText}>Uploading...</Text>
              <Text style={styles.uploadProgressSubtext}>Please wait while we upload your files</Text>
            </View>
          </View>
        </Modal>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  uploadButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  storeInfo: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  storeSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryFilter: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  typeFilter: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  typeFilterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  typeFilterButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryGrid: {
    padding: 16,
  },
  galleryItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  coverBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  coverText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  hiddenBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  titleText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  uploadingContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonDanger: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalButtonTextPrimary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  editPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  // Phase 3: Advanced features styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
  },
  galleryItemSelected: {
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  galleryItemDragging: {
    opacity: 0.5,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 2,
  },
  dragHandle: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  quickActionsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  quickActionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 6,
  },
  quickActionButtonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  bulkActionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  bulkActionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bulkActionTextDanger: {
    color: '#EF4444',
  },
  // Analytics modal styles
  analyticsModalContent: {
    maxHeight: '90%',
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  analyticsItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  analyticsItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  analyticsItemInfo: {
    flex: 1,
  },
  analyticsItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  analyticsItemStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  analyticsCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  analyticsCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  analyticsCategoryCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipAdd: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    gap: 16,
  },
  uploadProgressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  uploadProgressSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});


import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/shared/types';
import { getApiUrl } from '@/config/api';
import { processProductImages, debugImageUrl } from '@/utils/imageUtils';
import { productsService } from '@/services';
import '@/utils/testApi';
const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id && token) fetchProduct();
  }, [id, token]);

  const fetchProduct = async () => {
    if (!token || !id) return;

    try {
      setLoading(true);
      const url = getApiUrl(`merchant/products/${id}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        const productData = {
          ...data.data,
          images: processProductImages(data.data.images),
        };
        console.log('📦 [PRODUCT] Product loaded:', {
          id: productData.id,
          name: productData.name,
          pricing: (productData as any).pricing,
          inventory: (productData as any).inventory,
          isActive: (productData as any).isActive,
          images: productData.images,
          rawImages: data.data.images,
        });
        
        setProduct(productData);
      } else {
        throw new Error(data.message || 'Invalid response structure');
      }
    } catch (error: any) {
      console.error('❌ [PRODUCT] Failed to load product:', error);
      Alert.alert('Error', `Failed to load product details: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    console.log('🗑️ [DELETE] handleDeleteProduct called');
    console.log('🗑️ [DELETE] Token exists:', !!token);
    console.log('🗑️ [DELETE] Product exists:', !!product);
    console.log('🗑️ [DELETE] Product data:', product ? {
      id: product.id,
      _id: (product as any)._id,
      name: product.name
    } : null);
    
    if (!token) {
      console.error('❌ [DELETE] No token available');
      Alert.alert('Error', 'Authentication required. Please log in again.');
      return;
    }
    
    if (!product) {
      console.error('❌ [DELETE] No product available');
      Alert.alert('Error', 'Product not found.');
      return;
    }

    const productId = product.id || (product as any)._id;
    console.log('🗑️ [DELETE] Product ID to delete:', productId);
    console.log('🗑️ [DELETE] Platform:', Platform.OS);
    
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      console.log('🗑️ [DELETE] Using window.confirm for web');
      const confirmed = window.confirm('Are you sure you want to delete this product? This action cannot be undone.');
      if (confirmed) {
        console.log('🗑️ [DELETE] User confirmed deletion via window.confirm');
        handleDeleteConfirmed(productId);
      } else {
        console.log('🗑️ [DELETE] User cancelled deletion via window.confirm');
      }
    } else {
      console.log('🗑️ [DELETE] Using Alert.alert for native');
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product? This action cannot be undone.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('🗑️ [DELETE] User cancelled deletion');
            }
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('🗑️ [DELETE] User confirmed deletion via Alert');
              handleDeleteConfirmed(productId);
            },
          },
        ]
      );
    }
  };

  const handleDeleteConfirmed = async (productId: string) => {
    console.log('🗑️ [DELETE] handleDeleteConfirmed called with ID:', productId);
    console.log('🗑️ [DELETE] Starting deletion process...');
    
    try {
      console.log('🗑️ [DELETE] Calling productsService.deleteProduct with ID:', productId);
      
      await productsService.deleteProduct(productId);
      
      console.log('✅ [DELETE] Product deleted successfully via productsService');
      
      // Show success message and redirect to products list
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Product and all related data deleted successfully');
        console.log('🗑️ [DELETE] Redirecting to products list page');
        router.replace('/products');
      } else {
        Alert.alert('Success', 'Product and all related data deleted successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('🗑️ [DELETE] Redirecting to products list page');
              router.replace('/products');
            }
          }
        ]);
      }
    } catch (error: any) {
      console.error('❌ [DELETE] Error caught:', error);
      console.error('❌ [DELETE] Error message:', error?.message);
      console.error('❌ [DELETE] Error stack:', error?.stack);
      console.error('❌ [DELETE] Full error object:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || 'Failed to delete product. Please try again.';
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const renderImageGallery = () => {
    // Check for images array first, then fallback to single image field
    // Images are already processed by processProductImages, so they should be objects with url property
    const validImages =
      product?.images?.filter((img: any) => {
        const url = typeof img === 'string' ? img : img.url;
        return url && !url.startsWith('file://') && url.trim() !== '';
      }) || [];
    
    // If no images in array, check for single image field
    const singleImage = (product as any)?.image;
    const hasImages = validImages.length > 0 || singleImage;
    
    if (!hasImages) {
      return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.imageContainer}>
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={64} color={Colors.light.textSecondary} />
            <ThemedText style={styles.placeholderText}>No image available</ThemedText>
          </View>
        </Animated.View>
      );
    }
    
    // Use single image if no array images
    if (validImages.length === 0 && singleImage) {
      return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.imageContainer}>
          <Image
            source={{ uri: singleImage }}
            style={styles.productImage}
            resizeMode="cover"
          />
        </Animated.View>
      );
    }
    
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={screenWidth}
          snapToAlignment="start"
          onMomentumScrollEnd={event => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentImageIndex(index);
          }}
          onScroll={event => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            if (index !== currentImageIndex && index >= 0 && index < validImages.length) {
              setCurrentImageIndex(index);
            }
          }}
          scrollEventThrottle={16}>
          {validImages.map((image, index) => {
            // Handle both string URLs and object formats
            const imageUrl = typeof image === 'string' 
              ? debugImageUrl(image) 
              : debugImageUrl(image.url || '');
            return (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            );
          })}
        </ScrollView>
        {validImages.length > 1 && (
          <>
            {/* Dot Indicators */}
            <View style={styles.imageIndicator}>
              {validImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    currentImageIndex === index && styles.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
            {/* Image Counter (e.g., "1/3") */}
            <View style={styles.imageCounter}>
              <ThemedText style={styles.imageCounterText}>
                {currentImageIndex + 1} / {validImages.length}
              </ThemedText>
            </View>
          </>
        )}
      </Animated.View>
    );
  };

  const renderStatusBadge = () => {
    // Use isActive field instead of status
    const isActive = (product as any)?.isActive ?? false;
    const statusConfig = {
      active: { color: '#155724', backgroundColor: '#D4EDDA', icon: 'checkmark-circle' },
      inactive: { color: '#721C24', backgroundColor: '#F8D7DA', icon: 'close-circle' },
    };
    const config = isActive ? statusConfig.active : statusConfig.inactive;
    return (
      <Animated.View 
        entering={FadeInDown.delay(200).springify()}
        style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}
      >
        <Ionicons name={config.icon as any} size={14} color={config.color} />
        <ThemedText style={[styles.statusText, { color: config.color }]}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </ThemedText>
      </Animated.View>
    );
  };

  const renderStockStatus = () => {
    if (!product || !product.inventory) return null;
    const { stock = 0, lowStockThreshold = 5 } = product.inventory;
    const isOutOfStock = stock === 0;
    const isLowStock = stock <= lowStockThreshold && stock > 0;
    if (isOutOfStock) {
      return (
        <View style={[styles.stockBadge, styles.outOfStockBadge]}>
          <Ionicons name="close-circle" size={16} color="#721C24" />
          <ThemedText style={[styles.stockText, styles.outOfStockText]}>Out of Stock</ThemedText>
        </View>
      );
    }
    if (isLowStock) {
      return (
        <View style={[styles.stockBadge, styles.lowStockBadge]}>
          <Ionicons name="warning" size={16} color="#856404" />
          <ThemedText style={[styles.stockText, styles.lowStockText]}>Low Stock</ThemedText>
        </View>
      );
    }
    return (
      <View style={[styles.stockBadge, styles.inStockBadge]}>
        <Ionicons name="checkmark-circle" size={16} color="#155724" />
        <ThemedText style={[styles.stockText, styles.inStockText]}>In Stock</ThemedText>
      </View>
    );
  };

  // --- SAFE AREA SCREENS ---

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>Product Details</ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading product...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>Product Details</ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={Colors.light.destructive} />
            <ThemedText style={styles.errorTitle}>Product not found</ThemedText>
            <ThemedText style={styles.errorSubtitle}>
              The product you're looking for doesn't exist or has been deleted.
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Product Details</ThemedText>
          <TouchableOpacity
            onPress={() => {
              const productId = product.id || (product as any)._id;
              console.log('✏️ [EDIT] Header edit button pressed');
              console.log('✏️ [EDIT] Product ID:', productId);
              console.log('✏️ [EDIT] Product object:', { id: product.id, _id: (product as any)._id });
              if (!productId) {
                console.error('❌ [EDIT] No product ID available');
                Alert.alert('Error', 'Product ID not found. Cannot edit product.');
                return;
              }
              const editRoute = `/products/edit/${productId}`;
              console.log('✏️ [EDIT] Navigating to:', editRoute);
              console.log('✏️ [EDIT] Router state before navigation');
              // Use simple string format like other routes
              router.push(editRoute as any);
              console.log('✏️ [EDIT] Router push called');
            }}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Image Gallery */}
          {renderImageGallery()}

          {/* Basic Information */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.section}>
            <View style={styles.productHeader}>
              <View style={styles.productTitleRow}>
                <ThemedText style={styles.productName}>{product.name}</ThemedText>
                {renderStatusBadge()}
              </View>
              <ThemedText style={styles.productSku}>SKU: {product.sku}</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={styles.price}>
                  ₹{(Number((product as any).pricing?.selling) || Number((product as any).price?.current) || 0).toFixed(2)}
                </ThemedText>
                {((product as any).pricing?.original && 
                  Number((product as any).pricing.original) > Number((product as any).pricing?.selling || 0)) && (
                  <ThemedText style={styles.comparePrice}>
                    ₹{Number((product as any).pricing.original).toFixed(2)}
                  </ThemedText>
                )}
                {((product as any).pricing?.discount && Number((product as any).pricing.discount) > 0) && (
                  <View style={styles.discountBadge}>
                    <ThemedText style={styles.discountText}>
                      {Number((product as any).pricing.discount)}% OFF
                    </ThemedText>
                  </View>
                )}
              </View>
              {product.shortDescription && (
                <ThemedText style={styles.shortDescription}>{product.shortDescription}</ThemedText>
              )}
            </View>
          </Animated.View>

          {/* Stock Information */}
          {product.inventory && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Inventory</ThemedText>
            <View style={styles.inventoryGrid}>
              <View style={styles.inventoryItem}>
                <ThemedText style={styles.inventoryLabel}>Stock Quantity</ThemedText>
                <ThemedText style={styles.inventoryValue}>{product.inventory.stock || 0}</ThemedText>
              </View>
              <View style={styles.inventoryItem}>
                <ThemedText style={styles.inventoryLabel}>Low Stock Threshold</ThemedText>
                <ThemedText style={styles.inventoryValue}>{product.inventory.lowStockThreshold || 5}</ThemedText>
              </View>
              <View style={styles.inventoryItem}>
                <ThemedText style={styles.inventoryLabel}>Available</ThemedText>
                <ThemedText style={styles.inventoryValue}>
                  {(product.inventory as any).isAvailable ? 'Yes' : 'No'}
                </ThemedText>
              </View>
              <View style={styles.inventoryItem}>
                <ThemedText style={styles.inventoryLabel}>Allow Backorder</ThemedText>
                <ThemedText style={styles.inventoryValue}>
                  {(product.inventory as any).allowBackorder ? 'Yes' : 'No'}
                </ThemedText>
              </View>
            </View>
            {renderStockStatus()}
          </Animated.View>
          )}

          {/* Ratings & Analytics */}
          {(product as any).ratings && (
          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color={Colors.light.primary} />
              <ThemedText style={styles.sectionTitle}>Ratings & Analytics</ThemedText>
            </View>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <ThemedText style={styles.analyticsLabel}>Average Rating</ThemedText>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={20} color="#FFB800" />
                  <ThemedText style={styles.analyticsValue}>
                    {((product as any).ratings?.average || 0).toFixed(1)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.analyticsSubtext}>
                  {((product as any).ratings?.count || 0)} reviews
                </ThemedText>
              </View>
              {(product as any).analytics && (
                <>
                  <View style={styles.analyticsCard}>
                    <ThemedText style={styles.analyticsLabel}>Views</ThemedText>
                    <ThemedText style={styles.analyticsValue}>
                      {((product as any).analytics?.views || 0).toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.analyticsCard}>
                    <ThemedText style={styles.analyticsLabel}>Purchases</ThemedText>
                    <ThemedText style={styles.analyticsValue}>
                      {((product as any).analytics?.purchases || 0).toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.analyticsCard}>
                    <ThemedText style={styles.analyticsLabel}>Conversion</ThemedText>
                    <ThemedText style={styles.analyticsValue}>
                      {(((product as any).analytics?.conversions || 0) * 100).toFixed(1)}%
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
          )}

          {/* Product Details */}
          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Product Details</ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Category</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(product.category as any)?.name || (typeof product.category === 'string' ? 'N/A' : 'N/A')}
              </ThemedText>
            </View>
            {product.subcategory && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Subcategory</ThemedText>
                <ThemedText style={styles.detailValue}>{product.subcategory}</ThemedText>
              </View>
            )}
            {product.brand && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Brand</ThemedText>
                <ThemedText style={styles.detailValue}>{product.brand}</ThemedText>
              </View>
            )}
            {product.barcode && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Barcode</ThemedText>
                <ThemedText style={styles.detailValue}>{product.barcode}</ThemedText>
              </View>
            )}
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Featured</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(product as any).isFeatured ? 'Yes' : 'No'}
              </ThemedText>
            </View>
            {(product as any).productType && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Product Type</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {(product as any).productType}
                </ThemedText>
              </View>
            )}
          </Animated.View>

          {/* Delivery Info */}
          {(product as any).deliveryInfo && (
          <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car" size={20} color={Colors.light.primary} />
              <ThemedText style={styles.sectionTitle}>Delivery Information</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Estimated Days</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(product as any).deliveryInfo?.estimatedDays || 'N/A'}
              </ThemedText>
            </View>
            {(product as any).deliveryInfo?.freeShippingThreshold && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Free Shipping Above</ThemedText>
                <ThemedText style={styles.detailValue}>
                  ₹{((product as any).deliveryInfo?.freeShippingThreshold || 0).toFixed(2)}
                </ThemedText>
              </View>
            )}
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Express Available</ThemedText>
              <ThemedText style={styles.detailValue}>
                {(product as any).deliveryInfo?.expressAvailable ? 'Yes' : 'No'}
              </ThemedText>
            </View>
          </Animated.View>
          )}

          {/* Cashback */}
          {(product as any).cashback && (
          <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift" size={20} color={Colors.light.primary} />
              <ThemedText style={styles.sectionTitle}>Cashback</ThemedText>
            </View>
            <View style={styles.cashbackContainer}>
              <View style={styles.cashbackRow}>
                <ThemedText style={styles.detailLabel}>Cashback Rate</ThemedText>
                <ThemedText style={styles.cashbackRate}>
                  {((product as any).cashback?.percentage || 0)}%
                </ThemedText>
              </View>
              {((product as any).cashback?.minPurchase) && (
                <View style={styles.cashbackRow}>
                  <ThemedText style={styles.detailLabel}>Min Purchase</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    ₹{((product as any).cashback?.minPurchase || 0).toFixed(2)}
                  </ThemedText>
                </View>
              )}
              {((product as any).cashback?.maxAmount) && (
                <View style={styles.cashbackRow}>
                  <ThemedText style={styles.detailLabel}>Max Amount</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    ₹{((product as any).cashback?.maxAmount || 0).toFixed(2)}
                  </ThemedText>
                </View>
              )}
            </View>
          </Animated.View>
          )}

          {/* Description */}
          <Animated.View entering={FadeInUp.delay(700).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
            <ThemedText style={styles.description}>{product.description}</ThemedText>
          </Animated.View>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
              <View style={styles.tagsContainer}>
                {product.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Metadata */}
          <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Metadata</ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Created</ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(product.createdAt).toLocaleDateString()}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Last Updated</ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(product.updatedAt).toLocaleDateString()}
              </ThemedText>
            </View>
            {product.publishedAt && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Published</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date(product.publishedAt).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInUp.delay(1000).springify()} style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editActionButton}
              onPress={() => {
                const productId = product.id || (product as any)._id;
                console.log('✏️ [EDIT] Bottom edit button pressed');
                console.log('✏️ [EDIT] Product ID:', productId);
                console.log('✏️ [EDIT] Product object:', { id: product.id, _id: (product as any)._id });
                if (!productId) {
                  console.error('❌ [EDIT] No product ID available');
                  Alert.alert('Error', 'Product ID not found. Cannot edit product.');
                  return;
                }
                const editRoute = `/products/edit/${productId}`;
                console.log('✏️ [EDIT] Navigating to:', editRoute);
                console.log('✏️ [EDIT] Router state before navigation');
                // Use simple string format like other routes
                router.push(editRoute as any);
                console.log('✏️ [EDIT] Router push called');
              }}
            >
              <Ionicons name="pencil" size={20} color={Colors.light.background} />
              <ThemedText style={styles.editActionText}>Edit Product</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteActionButton}
              onPress={(e) => {
                console.log('🗑️ [DELETE] Delete button pressed');
                console.log('🗑️ [DELETE] Event:', e);
                e?.stopPropagation?.();
                handleDeleteProduct();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color={Colors.light.background} />
              <ThemedText style={styles.deleteActionText}>Delete Product</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: Colors.light.text,
  },
  editButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  errorSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  imageContainer: {
    height: 350,
    backgroundColor: Colors.light.background,
    position: 'relative',
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  productImage: {
    width: screenWidth,
    height: 350,
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    gap: 12,
    height: 350,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  indicatorDotActive: {
    width: 24,
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.light.background,
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  productHeader: {
    gap: 16,
    paddingBottom: 8,
  },
  productTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    lineHeight: 28,
  },
  productSku: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  comparePrice: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
    lineHeight: 24,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shortDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexShrink: 0,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  analyticsSubtext: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  inventoryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inventoryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  inventoryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  inStockBadge: {
    backgroundColor: '#D4EDDA',
  },
  lowStockBadge: {
    backgroundColor: '#FFF3CD',
  },
  outOfStockBadge: {
    backgroundColor: '#F8D7DA',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inStockText: {
    color: '#155724',
  },
  lowStockText: {
    color: '#856404',
  },
  outOfStockText: {
    color: '#721C24',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  cashbackContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cashbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cashbackRate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  description: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tagText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
  },
  editActionButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  editActionText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteActionButton: {
    flex: 1,
    backgroundColor: Colors.light.destructive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.light.destructive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteActionText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

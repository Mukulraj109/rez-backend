import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { productsService } from '@/services';
import FormSelect from '@/components/forms/FormSelect';
import CollapsibleSection from '@/components/forms/CollapsibleSection';
import ImageUploader, { ProductImage } from '@/components/products/ImageUploader';
import VideoUploader, { ProductVideo } from '@/components/products/VideoUploader';
import CurrencySelector from '@/components/forms/CurrencySelector';

interface ProductFormData {
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  barcode: string;
  category: string;
  subcategory: string;
  brand: string;
  price: string;
  costPrice: string;
  compareAtPrice: string;
  currency: string;
  stock: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  allowBackorders: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: 'cm' | 'inch';
  };
  metaTitle: string;
  metaDescription: string;
  searchKeywords: string;
  tags: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  visibility: 'public' | 'hidden' | 'featured';
  cashbackPercentage: string;
  cashbackMaxAmount: string;
  cashbackActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function EditProductScreen() {
  const params = useLocalSearchParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { token } = useAuth();
  const { stores } = useStore();
  
  console.log('✏️ [EDIT PAGE] EditProductScreen mounted');
  console.log('✏️ [EDIT PAGE] Params:', params);
  console.log('✏️ [EDIT PAGE] Product ID:', id);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    shortDescription: '',
    sku: '',
    barcode: '',
    category: '',
    subcategory: '',
    brand: '',
    price: '',
    costPrice: '',
    compareAtPrice: '',
    currency: 'INR',
    stock: '0',
    lowStockThreshold: '5',
    trackInventory: true,
    allowBackorders: false,
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
      unit: 'cm',
    },
    metaTitle: '',
    metaDescription: '',
    searchKeywords: '',
    tags: '',
    status: 'draft',
    visibility: 'public',
    cashbackPercentage: '5',
    cashbackMaxAmount: '',
    cashbackActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Array<{ label: string; value: string; id?: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const fetchedCategories = await productsService.getCategories();
        setCategories(fetchedCategories);
      } catch (error: any) {
        console.error('Failed to load categories:', error);
        // Fallback to empty array if API fails
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, []);

  // Load product data
  useEffect(() => {
    console.log('✏️ [EDIT PAGE] useEffect triggered, id:', id);
    if (id) {
      console.log('✏️ [EDIT PAGE] ID exists, calling loadProduct');
      loadProduct();
    } else {
      console.warn('✏️ [EDIT PAGE] No ID provided, cannot load product');
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      console.log('✏️ [EDIT PAGE] loadProduct called with id:', id);
      setLoading(true);
      console.log('✏️ [EDIT PAGE] Loading product from API...');
      const product = await productsService.getProduct(id as string);
      console.log('✏️ [EDIT PAGE] Product loaded:', product);
      console.log('✏️ [EDIT PAGE] Product inventory:', (product as any).inventory);
      console.log('✏️ [EDIT PAGE] Stock:', (product as any).inventory?.stock, 'Low threshold:', (product as any).inventory?.lowStockThreshold);

      if (product) {

        // Populate form data - matching the actual API response structure
        const productData = product as any;
        
        setFormData({
          name: product.name || '',
          description: product.description || '',
          shortDescription: productData.shortDescription || '',
          sku: productData.sku || '',
          barcode: productData.barcode || '',
          category: typeof product.category === 'string' ? product.category : (product.category as any)?._id || (product.category as any)?.id || '',
          subcategory: productData.subcategory || '',
          brand: productData.brand || '',
          // Use pricing.selling and pricing.original instead of price and compareAtPrice
          price: productData.pricing?.selling?.toString() || productData.price?.current?.toString() || productData.price?.toString() || '',
          costPrice: productData.pricing?.cost?.toString() || productData.costPrice?.toString() || '',
          compareAtPrice: productData.pricing?.original?.toString() || productData.price?.original?.toString() || productData.compareAtPrice?.toString() || '',
          currency: productData.pricing?.currency || productData.currency || 'INR',
          // Inventory fields - matching actual structure
          stock: productData.inventory?.stock?.toString() || '0',
          lowStockThreshold: productData.inventory?.lowStockThreshold?.toString() || '5',
          trackInventory: productData.inventory?.isAvailable !== false, // Use isAvailable instead of trackInventory
          allowBackorders: productData.inventory?.allowBackorder === true, // Note: singular 'allowBackorder'
          weight: productData.weight?.toString() || '',
          dimensions: {
            length: productData.dimensions?.length?.toString() || '',
            width: productData.dimensions?.width?.toString() || '',
            height: productData.dimensions?.height?.toString() || '',
            unit: productData.dimensions?.unit || 'cm',
          },
          // Use seo object instead of metaTitle/metaDescription/searchKeywords
          metaTitle: productData.seo?.title || productData.metaTitle || '',
          metaDescription: productData.seo?.description || productData.metaDescription || '',
          searchKeywords: productData.seo?.keywords?.join(', ') || productData.searchKeywords?.join(', ') || '',
          tags: product.tags?.join(', ') || '',
          // Use isActive instead of status
          status: productData.isActive ? 'active' : 'inactive',
          // Use isFeatured instead of visibility
          visibility: productData.isFeatured ? 'featured' : 'public',
          // Cashback fields - matching actual structure
          cashbackPercentage: productData.cashback?.percentage?.toString() || '0',
          cashbackMaxAmount: productData.cashback?.maxAmount?.toString() || '',
          cashbackActive: productData.cashback?.percentage !== undefined && productData.cashback?.percentage > 0,
        });
        
        console.log('✏️ [EDIT PAGE] Form data populated:', {
          pricing: productData.pricing,
          inventory: productData.inventory,
          isActive: productData.isActive,
          isFeatured: productData.isFeatured,
          cashback: productData.cashback,
          seo: productData.seo,
        });

        // Populate images - check both images array and single image field
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          const productImages: ProductImage[] = product.images.map((img: any, index: number) => ({
            uri: typeof img === 'string' ? img : img.url,
            url: typeof img === 'string' ? img : img.url,
            altText: typeof img === 'object' ? img.altText : '',
            isMain: typeof img === 'object' ? img.isMain : index === 0,
            sortOrder: typeof img === 'object' ? img.sortOrder : index,
            uploading: false,
          }));
          setImages(productImages);
        } else if (productData.image) {
          // Fallback to single image field if images array is empty
          setImages([{
            uri: productData.image,
            url: productData.image,
            altText: '',
            isMain: true,
            sortOrder: 0,
            uploading: false,
          }]);
        }

        // Populate videos
        if ((product as any).videos && Array.isArray((product as any).videos)) {
          const productVideos: ProductVideo[] = (product as any).videos.map((video: any, index: number) => ({
            uri: video.url,
            url: video.url,
            title: video.title || '',
            duration: video.duration,
            thumbnailUrl: video.thumbnailUrl,
            sortOrder: video.sortOrder || index,
            uploading: false,
          }));
          setVideos(productVideos);
        }

        // Set store ID - check both storeId and store (ObjectId)
        if (productData.storeId) {
          setSelectedStoreId(productData.storeId);
        } else if (productData.store) {
          // Store might be an ObjectId or populated object
          const storeId = typeof productData.store === 'string' 
            ? productData.store 
            : productData.store._id || productData.store.id;
          if (storeId) {
            setSelectedStoreId(storeId);
          }
        }
        console.log('✏️ [EDIT PAGE] Product loaded successfully, setting loading to false');
        setLoading(false);
      } else {
        console.error('✏️ [EDIT PAGE] Product is null or undefined');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Error: Failed to load product. Please try again.');
          router.back();
        } else {
          Alert.alert('Error', 'Failed to load product. Please try again.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('✏️ [EDIT PAGE] Error loading product:', error);
      console.error('✏️ [EDIT PAGE] Error details:', JSON.stringify(error, null, 2));
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Error: Failed to load product. Please try again.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to load product. Please try again.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
      setLoading(false);
    } finally {
      console.log('✏️ [EDIT PAGE] Setting loading to false');
      // Don't set loading to false here if we already set it above
    }
  };

  const updateFormData = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const updateDimensions = (key: keyof ProductFormData['dimensions'], value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 2 || formData.name.length > 200) {
      newErrors.name = 'Name must be between 2 and 200 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.shortDescription && formData.shortDescription.length > 300) {
      newErrors.shortDescription = 'Short description must be less than 300 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a positive number';
    }

    if (formData.costPrice && (isNaN(Number(formData.costPrice)) || Number(formData.costPrice) < 0)) {
      newErrors.costPrice = 'Cost price must be a positive number';
    }

    if (formData.compareAtPrice && (isNaN(Number(formData.compareAtPrice)) || Number(formData.compareAtPrice) < 0)) {
      newErrors.compareAtPrice = 'Compare at price must be a positive number';
    }

    if (!formData.stock) {
      newErrors.stock = 'Stock quantity is required';
    } else if (isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      newErrors.stock = 'Stock must be a positive number';
    }

    if (formData.lowStockThreshold && (isNaN(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0)) {
      newErrors.lowStockThreshold = 'Low stock threshold must be a positive number';
    }

    if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) < 0)) {
      newErrors.weight = 'Weight must be a positive number';
    }

    if (formData.dimensions.length && (isNaN(Number(formData.dimensions.length)) || Number(formData.dimensions.length) < 0)) {
      newErrors['dimensions.length'] = 'Length must be a positive number';
    }

    if (formData.dimensions.width && (isNaN(Number(formData.dimensions.width)) || Number(formData.dimensions.width) < 0)) {
      newErrors['dimensions.width'] = 'Width must be a positive number';
    }

    if (formData.dimensions.height && (isNaN(Number(formData.dimensions.height)) || Number(formData.dimensions.height) < 0)) {
      newErrors['dimensions.height'] = 'Height must be a positive number';
    }

    if (formData.metaTitle && formData.metaTitle.length > 60) {
      newErrors.metaTitle = 'Meta title must be less than 60 characters';
    }

    if (formData.metaDescription && formData.metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta description must be less than 160 characters';
    }

    if (formData.cashbackPercentage) {
      const percentage = Number(formData.cashbackPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.cashbackPercentage = 'Cashback percentage must be between 0 and 100';
      }
    }

    if (formData.cashbackMaxAmount && (isNaN(Number(formData.cashbackMaxAmount)) || Number(formData.cashbackMaxAmount) < 0)) {
      newErrors.cashbackMaxAmount = 'Max cashback amount must be a positive number';
    }

    if (images.length === 0) {
      newErrors.images = 'At least one product image is required';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Missing Images: Please add at least one product image.');
      } else {
        Alert.alert('Missing Images', 'Please add at least one product image.');
      }
    }

    const uploadingImages = images.filter(img => img.uploading);
    if (uploadingImages.length > 0) {
      newErrors.images = 'Please wait for all images to finish uploading';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Upload in Progress: Please wait for all images to finish uploading.');
      } else {
        Alert.alert('Upload in Progress', 'Please wait for all images to finish uploading.');
      }
    }

    const imageErrors = images.filter(img => img.error);
    if (imageErrors.length > 0) {
      newErrors.images = 'Some images failed to upload. Please retry or remove them.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Upload Error: Some images failed to upload. Please retry or remove them.');
      } else {
        Alert.alert('Upload Error', 'Some images failed to upload. Please retry or remove them.');
      }
    }

    const uploadingVideos = videos.filter(video => video.uploading);
    if (uploadingVideos.length > 0) {
      newErrors.videos = 'Please wait for all videos to finish uploading';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Upload in Progress: Please wait for all videos to finish uploading.');
      } else {
        Alert.alert('Upload in Progress', 'Please wait for all videos to finish uploading.');
      }
    }

    const videoErrors = videos.filter(video => video.error);
    if (videoErrors.length > 0) {
      newErrors.videos = 'Some videos failed to upload. Please retry or remove them.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Upload Error: Some videos failed to upload. Please retry or remove them.');
      } else {
        Alert.alert('Upload Error', 'Some videos failed to upload. Please retry or remove them.');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Validation Error: Please fix all errors before submitting.');
      } else {
        Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      }
      return;
    }

    setSaving(true);

    try {
      const productRequest: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription?.trim() || undefined,
        sku: formData.sku?.trim() || undefined,
        barcode: formData.barcode?.trim() || undefined,
        // Use category id if available, otherwise use the value (slug)
        category: categories.find(c => c.value === formData.category)?.id || formData.category,
        subcategory: formData.subcategory?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        store: selectedStoreId || undefined, // Use 'store' instead of 'storeId'
        // Use pricing object instead of price/compareAtPrice
        pricing: {
          selling: Number(formData.price) || 0,
          original: formData.compareAtPrice ? Number(formData.compareAtPrice) : Number(formData.price) || 0,
          cost: formData.costPrice ? Number(formData.costPrice) : undefined,
          currency: formData.currency,
          discount: formData.compareAtPrice && Number(formData.compareAtPrice) > Number(formData.price)
            ? Math.round(((Number(formData.compareAtPrice) - Number(formData.price)) / Number(formData.compareAtPrice)) * 100)
            : undefined,
        },
        inventory: {
          stock: Number(formData.stock),
          lowStockThreshold: Number(formData.lowStockThreshold),
          isAvailable: formData.trackInventory, // Use isAvailable instead of trackInventory
          allowBackorder: formData.allowBackorders, // Use singular 'allowBackorder'
        },
        images: images
          .filter(img => img.url)
          .map((img) => ({
            url: img.url!,
            altText: img.altText || undefined,
            isMain: img.isMain,
            sortOrder: img.sortOrder,
          })),
        videos: videos
          .filter(video => video.url)
          .map((video) => ({
            url: video.url!,
            title: video.title || undefined,
            duration: video.duration || undefined,
            thumbnailUrl: video.thumbnailUrl || undefined,
            sortOrder: video.sortOrder,
          })),
        weight: formData.weight ? Number(formData.weight) : undefined,
        dimensions: (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height)
          ? {
              length: formData.dimensions.length ? Number(formData.dimensions.length) : undefined,
              width: formData.dimensions.width ? Number(formData.dimensions.width) : undefined,
              height: formData.dimensions.height ? Number(formData.dimensions.height) : undefined,
              unit: formData.dimensions.unit,
            }
          : undefined,
        tags: formData.tags 
          ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
          : [],
        // Use seo object instead of metaTitle/metaDescription/searchKeywords
        seo: {
          title: formData.metaTitle?.trim() || undefined,
          description: formData.metaDescription?.trim() || undefined,
          keywords: formData.searchKeywords 
            ? formData.searchKeywords.split(',').map(kw => kw.trim()).filter(Boolean) 
            : undefined,
        },
        // Use isActive instead of status
        isActive: formData.status === 'active',
        // Use isFeatured instead of visibility
        isFeatured: formData.visibility === 'featured',
        cashback: {
          percentage: Number(formData.cashbackPercentage) || 0,
          maxAmount: formData.cashbackMaxAmount ? Number(formData.cashbackMaxAmount) : undefined,
          minPurchase: undefined, // Add if needed
        },
      };

      console.log('Updating product with payload:', JSON.stringify(productRequest, null, 2));

      // updateProduct returns the Product directly, not a response object
      const updatedProduct = await productsService.updateProduct(id as string, productRequest);
      
      console.log('✏️ [EDIT PAGE] Product updated successfully:', updatedProduct);
      
      // Success - show message and navigate
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('✅ Product updated successfully!');
        // Navigate to products list page
        router.push('/products');
      } else {
        Alert.alert(
          'Success',
          'Product updated successfully!',
          [
            {
              text: 'View Products',
              onPress: () => router.push('/products'),
            },
            {
              text: 'Back to Details',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error: any) {
      console.error('✏️ [EDIT PAGE] Product update error:', error);
      console.error('✏️ [EDIT PAGE] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.response?.data
      });
      
      // Extract error message from various possible error formats
      let errorMessage = 'Failed to update product';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('✏️ [EDIT PAGE] Showing error to user:', errorMessage);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const getSectionErrors = (fields: string[]): number => {
    return fields.filter(field => errors[field]).length;
  };

  const basicInfoErrors = getSectionErrors(['name', 'description', 'shortDescription', 'sku', 'barcode', 'category', 'subcategory', 'brand']);
  const pricingErrors = getSectionErrors(['price', 'costPrice', 'compareAtPrice', 'currency', 'cashbackPercentage', 'cashbackMaxAmount']);
  const inventoryErrors = getSectionErrors(['stock', 'lowStockThreshold']);
  const mediaErrors = getSectionErrors(['images', 'videos']);
  const physicalErrors = getSectionErrors(['weight', 'dimensions.length', 'dimensions.width', 'dimensions.height']);
  const seoErrors = getSectionErrors(['metaTitle', 'metaDescription', 'searchKeywords', 'tags']);

  if (loading) {
    console.log('✏️ [EDIT PAGE] Rendering loading state');
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Loading product...</ThemedText>
          <ThemedText style={styles.loadingText}>Product ID: {id}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }
  
  console.log('✏️ [EDIT PAGE] Rendering edit form (not loading)');

  console.log('✏️ [EDIT PAGE] About to render main edit form');
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('✏️ [EDIT PAGE] Back button pressed');
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Product</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All sections remain the same as add.tsx */}
        {/* Section 1: Basic Information */}
        <CollapsibleSection
          title="Basic Information"
          icon="information-circle"
          defaultExpanded={true}
          required
          hasError={basicInfoErrors > 0}
          errorCount={basicInfoErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Product Name *</ThemedText>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder="Enter product name"
              placeholderTextColor={Colors.light.textSecondary}
              maxLength={200}
            />
            {errors.name && <ThemedText style={styles.errorText}>{errors.name}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Description *</ThemedText>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Enter detailed product description"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <ThemedText style={styles.errorText}>{errors.description}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Short Description</ThemedText>
            <TextInput
              style={[styles.textArea, errors.shortDescription && styles.inputError]}
              value={formData.shortDescription}
              onChangeText={(value) => updateFormData('shortDescription', value)}
              placeholder="Brief product summary (max 300 characters)"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={2}
              maxLength={300}
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>
              {formData.shortDescription.length}/300
            </ThemedText>
            {errors.shortDescription && <ThemedText style={styles.errorText}>{errors.shortDescription}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>SKU</ThemedText>
            <TextInput
              style={[styles.input, errors.sku && styles.inputError]}
              value={formData.sku}
              onChangeText={(value) => updateFormData('sku', value.toUpperCase())}
              placeholder="Product SKU"
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="characters"
            />
            {errors.sku && <ThemedText style={styles.errorText}>{errors.sku}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Barcode</ThemedText>
            <TextInput
              style={[styles.input, errors.barcode && styles.inputError]}
              value={formData.barcode}
              onChangeText={(value) => updateFormData('barcode', value)}
              placeholder="Enter product barcode (optional)"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="number-pad"
            />
            {errors.barcode && <ThemedText style={styles.errorText}>{errors.barcode}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <FormSelect
              label="Category"
              value={formData.category}
              onValueChange={(value) => updateFormData('category', value)}
              options={categories}
              placeholder="Select category"
              required
              error={errors.category}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Subcategory</ThemedText>
            <TextInput
              style={[styles.input, errors.subcategory && styles.inputError]}
              value={formData.subcategory}
              onChangeText={(value) => updateFormData('subcategory', value)}
              placeholder="Enter subcategory (optional)"
              placeholderTextColor={Colors.light.textSecondary}
            />
            {errors.subcategory && <ThemedText style={styles.errorText}>{errors.subcategory}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Brand</ThemedText>
            <TextInput
              style={[styles.input, errors.brand && styles.inputError]}
              value={formData.brand}
              onChangeText={(value) => updateFormData('brand', value)}
              placeholder="Enter brand name (optional)"
              placeholderTextColor={Colors.light.textSecondary}
            />
            {errors.brand && <ThemedText style={styles.errorText}>{errors.brand}</ThemedText>}
          </View>
        </CollapsibleSection>

        {/* Section 2: Pricing */}
        <CollapsibleSection
          title="Pricing"
          icon="cash"
          defaultExpanded={true}
          required
          hasError={pricingErrors > 0}
          errorCount={pricingErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Selling Price *</ThemedText>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              value={formData.price}
              onChangeText={(value) => updateFormData('price', value)}
              placeholder="0.00"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.price && <ThemedText style={styles.errorText}>{errors.price}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Cost Price</ThemedText>
            <ThemedText style={styles.helpText}>Your cost (for profit margin calculation)</ThemedText>
            <TextInput
              style={[styles.input, errors.costPrice && styles.inputError]}
              value={formData.costPrice}
              onChangeText={(value) => updateFormData('costPrice', value)}
              placeholder="0.00"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.costPrice && <ThemedText style={styles.errorText}>{errors.costPrice}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Compare at Price</ThemedText>
            <ThemedText style={styles.helpText}>Original price (to show discount)</ThemedText>
            <TextInput
              style={[styles.input, errors.compareAtPrice && styles.inputError]}
              value={formData.compareAtPrice}
              onChangeText={(value) => updateFormData('compareAtPrice', value)}
              placeholder="0.00"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.compareAtPrice && <ThemedText style={styles.errorText}>{errors.compareAtPrice}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <CurrencySelector
              value={formData.currency}
              onValueChange={(value) => updateFormData('currency', value)}
              error={errors.currency}
            />
          </View>

          <View style={styles.sectionDivider} />
          <ThemedText style={styles.sectionSubtitle}>Cashback Settings</ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Cashback Percentage</ThemedText>
            <TextInput
              style={[styles.input, errors.cashbackPercentage && styles.inputError]}
              value={formData.cashbackPercentage}
              onChangeText={(value) => updateFormData('cashbackPercentage', value)}
              placeholder="0-100"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.cashbackPercentage && <ThemedText style={styles.errorText}>{errors.cashbackPercentage}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Max Cashback Amount</ThemedText>
            <TextInput
              style={[styles.input, errors.cashbackMaxAmount && styles.inputError]}
              value={formData.cashbackMaxAmount}
              onChangeText={(value) => updateFormData('cashbackMaxAmount', value)}
              placeholder="Optional maximum cap"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.cashbackMaxAmount && <ThemedText style={styles.errorText}>{errors.cashbackMaxAmount}</ThemedText>}
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.label}>Cashback Active</ThemedText>
            <Switch
              value={formData.cashbackActive}
              onValueChange={(value) => updateFormData('cashbackActive', value)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            />
          </View>
        </CollapsibleSection>

        {/* Section 3: Inventory */}
        <CollapsibleSection
          title="Inventory"
          icon="cube"
          defaultExpanded={true}
          required
          hasError={inventoryErrors > 0}
          errorCount={inventoryErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Stock Quantity *</ThemedText>
            <TextInput
              style={[styles.input, errors.stock && styles.inputError]}
              value={formData.stock}
              onChangeText={(value) => updateFormData('stock', value)}
              placeholder="0"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="number-pad"
            />
            {errors.stock && <ThemedText style={styles.errorText}>{errors.stock}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Low Stock Threshold</ThemedText>
            <ThemedText style={styles.helpText}>Get notified when stock falls below this</ThemedText>
            <TextInput
              style={[styles.input, errors.lowStockThreshold && styles.inputError]}
              value={formData.lowStockThreshold}
              onChangeText={(value) => updateFormData('lowStockThreshold', value)}
              placeholder="5"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="number-pad"
            />
            {errors.lowStockThreshold && <ThemedText style={styles.errorText}>{errors.lowStockThreshold}</ThemedText>}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <ThemedText style={styles.label}>Track Inventory</ThemedText>
              <ThemedText style={styles.helpText}>Automatically reduce stock on orders</ThemedText>
            </View>
            <Switch
              value={formData.trackInventory}
              onValueChange={(value) => updateFormData('trackInventory', value)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <ThemedText style={styles.label}>Allow Backorders</ThemedText>
              <ThemedText style={styles.helpText}>Accept orders when out of stock</ThemedText>
            </View>
            <Switch
              value={formData.allowBackorders}
              onValueChange={(value) => updateFormData('allowBackorders', value)}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            />
          </View>
        </CollapsibleSection>

        {/* Section 4: Media */}
        <CollapsibleSection
          title="Product Media"
          icon="images"
          defaultExpanded={true}
          required
          hasError={mediaErrors > 0}
          errorCount={mediaErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.sectionSubtitle}>Product Images *</ThemedText>
            <ThemedText style={styles.helpText}>
              Add high-quality images of your product. First image will be the main image.
            </ThemedText>
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={10}
              autoUpload={true}
            />
            {errors.images && <ThemedText style={styles.errorText}>{errors.images}</ThemedText>}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.formGroup}>
            <ThemedText style={styles.sectionSubtitle}>Product Videos</ThemedText>
            <ThemedText style={styles.helpText}>
              Show your product in action (optional, max 2 minutes each)
            </ThemedText>
            <VideoUploader
              videos={videos}
              onVideosChange={setVideos}
              maxVideos={5}
              autoUpload={true}
            />
            {errors.videos && <ThemedText style={styles.errorText}>{errors.videos}</ThemedText>}
          </View>
        </CollapsibleSection>

        {/* Section 5: Physical Properties */}
        <CollapsibleSection
          title="Physical Properties"
          icon="resize"
          defaultExpanded={false}
          hasError={physicalErrors > 0}
          errorCount={physicalErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Weight (kg/lbs)</ThemedText>
            <TextInput
              style={[styles.input, errors.weight && styles.inputError]}
              value={formData.weight}
              onChangeText={(value) => updateFormData('weight', value)}
              placeholder="0.0"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="decimal-pad"
            />
            {errors.weight && <ThemedText style={styles.errorText}>{errors.weight}</ThemedText>}
          </View>

          <View style={styles.sectionDivider} />
          <ThemedText style={styles.sectionSubtitle}>Dimensions</ThemedText>

          <View style={styles.dimensionsRow}>
            <View style={styles.dimensionInput}>
              <ThemedText style={styles.label}>Length</ThemedText>
              <TextInput
                style={[styles.input, errors['dimensions.length'] && styles.inputError]}
                value={formData.dimensions.length}
                onChangeText={(value) => updateDimensions('length', value)}
                placeholder="0"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.dimensionInput}>
              <ThemedText style={styles.label}>Width</ThemedText>
              <TextInput
                style={[styles.input, errors['dimensions.width'] && styles.inputError]}
                value={formData.dimensions.width}
                onChangeText={(value) => updateDimensions('width', value)}
                placeholder="0"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.dimensionInput}>
              <ThemedText style={styles.label}>Height</ThemedText>
              <TextInput
                style={[styles.input, errors['dimensions.height'] && styles.inputError]}
                value={formData.dimensions.height}
                onChangeText={(value) => updateDimensions('height', value)}
                placeholder="0"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <FormSelect
              label="Unit"
              value={formData.dimensions.unit}
              onValueChange={(value) => updateDimensions('unit', value as 'cm' | 'inch')}
              options={[
                { label: 'Centimeters (cm)', value: 'cm' },
                { label: 'Inches (inch)', value: 'inch' },
              ]}
            />
          </View>
        </CollapsibleSection>

        {/* Section 6: SEO & Search */}
        <CollapsibleSection
          title="SEO & Search"
          icon="search"
          defaultExpanded={false}
          hasError={seoErrors > 0}
          errorCount={seoErrors}
        >
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Meta Title</ThemedText>
            <ThemedText style={styles.helpText}>Optimized for search engines (max 60 chars)</ThemedText>
            <TextInput
              style={[styles.input, errors.metaTitle && styles.inputError]}
              value={formData.metaTitle}
              onChangeText={(value) => updateFormData('metaTitle', value)}
              placeholder="SEO-friendly title"
              placeholderTextColor={Colors.light.textSecondary}
              maxLength={60}
            />
            <ThemedText style={styles.charCount}>
              {formData.metaTitle.length}/60
            </ThemedText>
            {errors.metaTitle && <ThemedText style={styles.errorText}>{errors.metaTitle}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Meta Description</ThemedText>
            <ThemedText style={styles.helpText}>Brief description for search results (max 160 chars)</ThemedText>
            <TextInput
              style={[styles.textArea, errors.metaDescription && styles.inputError]}
              value={formData.metaDescription}
              onChangeText={(value) => updateFormData('metaDescription', value)}
              placeholder="SEO-friendly description"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={160}
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>
              {formData.metaDescription.length}/160
            </ThemedText>
            {errors.metaDescription && <ThemedText style={styles.errorText}>{errors.metaDescription}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Search Keywords</ThemedText>
            <ThemedText style={styles.helpText}>Comma-separated keywords for search</ThemedText>
            <TextInput
              style={[styles.input, errors.searchKeywords && styles.inputError]}
              value={formData.searchKeywords}
              onChangeText={(value) => updateFormData('searchKeywords', value)}
              placeholder="keyword1, keyword2, keyword3"
              placeholderTextColor={Colors.light.textSecondary}
            />
            {errors.searchKeywords && <ThemedText style={styles.errorText}>{errors.searchKeywords}</ThemedText>}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Tags</ThemedText>
            <ThemedText style={styles.helpText}>Comma-separated tags for categorization</ThemedText>
            <TextInput
              style={[styles.input, errors.tags && styles.inputError]}
              value={formData.tags}
              onChangeText={(value) => updateFormData('tags', value)}
              placeholder="tag1, tag2, tag3"
              placeholderTextColor={Colors.light.textSecondary}
            />
            {errors.tags && <ThemedText style={styles.errorText}>{errors.tags}</ThemedText>}
          </View>
        </CollapsibleSection>

        {/* Section 7: Visibility & Status */}
        <CollapsibleSection
          title="Visibility & Status"
          icon="eye"
          defaultExpanded={true}
          required
        >
          <View style={styles.formGroup}>
            <FormSelect
              label="Status"
              value={formData.status}
              onValueChange={(value) => updateFormData('status', value as any)}
              options={[
                { label: 'Draft', value: 'draft' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Archived', value: 'archived' },
              ]}
              required
            />
          </View>

          <View style={styles.formGroup}>
            <FormSelect
              label="Visibility"
              value={formData.visibility}
              onValueChange={(value) => updateFormData('visibility', value as any)}
              options={[
                { label: 'Public', value: 'public' },
                { label: 'Hidden', value: 'hidden' },
                { label: 'Featured', value: 'featured' },
              ]}
              required
            />
          </View>

          {stores && stores.length > 1 && (
            <View style={styles.formGroup}>
              <FormSelect
                label="Store Assignment"
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
                options={stores.map(store => ({
                  label: store.name,
                  value: store._id,
                }))}
                placeholder="Select store"
              />
            </View>
          )}
        </CollapsibleSection>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.light.background} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.light.background} />
                <ThemedText style={styles.submitText}>Update Product</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Use the same styles from add.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  inputError: {
    borderColor: Colors.light.error,
    borderWidth: 2,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dimensionInput: {
    flex: 1,
  },
  submitContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.textSecondary,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.background,
  },
});

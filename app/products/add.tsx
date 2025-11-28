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

// Comprehensive FormData interface matching backend model
interface ProductFormData {
  // Basic Info
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  barcode: string;
  category: string;
  categoryType?: 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';
  subcategory: string;
  brand: string;
  
  // Pricing
  price: string;
  costPrice: string;
  compareAtPrice: string;
  currency: string;
  
  // Inventory
  stock: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  allowBackorders: boolean;
  
  // Physical
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: 'cm' | 'inch';
  };
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  searchKeywords: string;
  tags: string;
  
  // Status
  status: 'active' | 'inactive' | 'draft' | 'archived';
  visibility: 'public' | 'hidden' | 'featured';
  
  // Cashback
  cashbackPercentage: string;
  cashbackMaxAmount: string;
  cashbackActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function AddProductScreen() {
  const { token } = useAuth();
  const { activeStore, stores } = useStore();
  const params = useLocalSearchParams<{ storeId?: string }>();
  const [loading, setLoading] = useState(false);
  
  // Store selection
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    params.storeId || activeStore?._id || ''
  );

  // Update selectedStoreId when params change
  useEffect(() => {
    if (params.storeId) {
      setSelectedStoreId(params.storeId);
    } else if (activeStore?._id) {
      setSelectedStoreId(activeStore._id);
    }
  }, [params.storeId, activeStore?._id]);

  // Media state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<ProductFormData>({
    // Basic Info
    name: '',
    description: '',
    shortDescription: '',
    sku: '',
    barcode: '',
    category: '',
    categoryType: 'general',
    subcategory: '',
    brand: '',
    
    // Pricing
    price: '',
    costPrice: '',
    compareAtPrice: '',
    currency: 'INR',
    
    // Inventory
    stock: '0',
    lowStockThreshold: '5',
    trackInventory: true,
    allowBackorders: false,
    
    // Physical
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
      unit: 'cm',
    },
    
    // SEO
    metaTitle: '',
    metaDescription: '',
    searchKeywords: '',
    tags: '',
    
    // Status
    status: 'draft',
    visibility: 'public',
    
    // Cashback
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
        console.log('📋 [ADD PRODUCT] Loading categories from API...');
        const fetchedCategories = await productsService.getCategories();
        console.log('📋 [ADD PRODUCT] Categories loaded:', fetchedCategories.length, 'categories');
        console.log('📋 [ADD PRODUCT] Categories data:', fetchedCategories);
        setCategories(fetchedCategories);
      } catch (error: any) {
        console.error('❌ [ADD PRODUCT] Failed to load categories:', error);
        console.error('❌ [ADD PRODUCT] Error details:', error.message, error.stack);
        // Fallback to empty array if API fails
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, []);

  const updateFormData = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user types
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

  const generateSKU = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase() || 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const sku = `${prefix}${timestamp}`;
    updateFormData('sku', sku);
    Alert.alert('SKU Generated', `Auto-generated SKU: ${sku}`);
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Basic Info validation
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

    // Pricing validation
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

    // Inventory validation
    if (!formData.stock) {
      newErrors.stock = 'Stock quantity is required';
    } else if (isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      newErrors.stock = 'Stock must be a positive number';
    }

    if (formData.lowStockThreshold && (isNaN(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0)) {
      newErrors.lowStockThreshold = 'Low stock threshold must be a positive number';
    }

    // Physical properties validation
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

    // SEO validation
    if (formData.metaTitle && formData.metaTitle.length > 60) {
      newErrors.metaTitle = 'Meta title must be less than 60 characters';
    }

    if (formData.metaDescription && formData.metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta description must be less than 160 characters';
    }

    // Cashback validation
    if (formData.cashbackPercentage) {
      const percentage = Number(formData.cashbackPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.cashbackPercentage = 'Cashback percentage must be between 0 and 100';
      }
    }

    if (formData.cashbackMaxAmount && (isNaN(Number(formData.cashbackMaxAmount)) || Number(formData.cashbackMaxAmount) < 0)) {
      newErrors.cashbackMaxAmount = 'Max cashback amount must be a positive number';
    }

    // Media validation
    if (images.length === 0) {
      newErrors.images = 'At least one product image is required';
      Alert.alert('Missing Images', 'Please add at least one product image.');
    }

    // Check if any images are still uploading
    const uploadingImages = images.filter(img => img.uploading);
    if (uploadingImages.length > 0) {
      newErrors.images = 'Please wait for all images to finish uploading';
      Alert.alert('Upload in Progress', 'Please wait for all images to finish uploading.');
    }

    // Check for image upload errors
    const imageErrors = images.filter(img => img.error);
    if (imageErrors.length > 0) {
      newErrors.images = 'Some images failed to upload. Please retry or remove them.';
      Alert.alert('Upload Error', 'Some images failed to upload. Please retry or remove them.');
    }

    // Check if any videos are still uploading
    const uploadingVideos = videos.filter(video => video.uploading);
    if (uploadingVideos.length > 0) {
      newErrors.videos = 'Please wait for all videos to finish uploading';
      Alert.alert('Upload in Progress', 'Please wait for all videos to finish uploading.');
    }

    // Check for video upload errors
    const videoErrors = videos.filter(video => video.error);
    if (videoErrors.length > 0) {
      newErrors.videos = 'Some videos failed to upload. Please retry or remove them.';
      Alert.alert('Upload Error', 'Some videos failed to upload. Please retry or remove them.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    setLoading(true);

    try {
      // Build product request payload
      const productRequest: any = {
        // Basic Information
        name: formData.name.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription?.trim() || undefined,
        sku: formData.sku?.trim() || undefined,
        barcode: formData.barcode?.trim() || undefined,
        // Use category id if available, otherwise use the value (slug)
        category: categories.find(c => c.value === formData.category)?.id || formData.category,
        categoryType: formData.categoryType,
        subcategory: formData.subcategory?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        storeId: selectedStoreId || undefined,

        // Pricing
        price: Number(formData.price),
        costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
        compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : undefined,
        currency: formData.currency,

        // Inventory
        inventory: {
          stock: Number(formData.stock),
          lowStockThreshold: Number(formData.lowStockThreshold),
          trackInventory: formData.trackInventory,
          allowBackorders: formData.allowBackorders,
        },

        // Media - Images
        images: images
          .filter(img => img.url)
          .map((img, index) => ({
            url: img.url!,
            altText: img.altText || undefined,
            isMain: img.isMain,
            sortOrder: img.sortOrder,
          })),

        // Media - Videos
        videos: videos
          .filter(video => video.url)
          .map((video, index) => ({
            url: video.url!,
            title: video.title || undefined,
            duration: video.duration || undefined,
            thumbnailUrl: video.thumbnailUrl || undefined,
            sortOrder: video.sortOrder,
          })),

        // Physical Properties
        weight: formData.weight ? Number(formData.weight) : undefined,
        dimensions: (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height)
          ? {
              length: formData.dimensions.length ? Number(formData.dimensions.length) : undefined,
              width: formData.dimensions.width ? Number(formData.dimensions.width) : undefined,
              height: formData.dimensions.height ? Number(formData.dimensions.height) : undefined,
              unit: formData.dimensions.unit,
            }
          : undefined,

        // SEO & Search
        tags: formData.tags 
          ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
          : [],
        metaTitle: formData.metaTitle?.trim() || undefined,
        metaDescription: formData.metaDescription?.trim() || undefined,
        searchKeywords: formData.searchKeywords 
          ? formData.searchKeywords.split(',').map(kw => kw.trim()).filter(Boolean) 
          : [],

        // Status & Visibility
        status: formData.status,
        visibility: formData.visibility,

        // Cashback
        cashback: {
          percentage: Number(formData.cashbackPercentage) || 0,
          maxAmount: formData.cashbackMaxAmount ? Number(formData.cashbackMaxAmount) : undefined,
          isActive: formData.cashbackActive,
        },
      };

      console.log('Creating product with payload:', JSON.stringify(productRequest, null, 2));

      const response = await productsService.createProduct(productRequest);

      // If we get here, the product was created successfully
      // The service throws an error if it fails, so response is the product data
      if (response) {
        Alert.alert(
          'Success',
          'Product created successfully!',
          [
            {
              text: 'View Products',
              onPress: () => {
                router.push('/products');
              },
            },
            {
              text: 'Create Another',
              onPress: () => {
                // Reset form
                const resetData: ProductFormData = {
                  name: '',
                  description: '',
                  shortDescription: '',
                  sku: '',
                  barcode: '',
                  category: '',
                  categoryType: 'general',
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
                  dimensions: { length: '', width: '', height: '', unit: 'cm' },
                  metaTitle: '',
                  metaDescription: '',
                  searchKeywords: '',
                  tags: '',
                  status: 'draft',
                  visibility: 'public',
                  cashbackPercentage: '5',
                  cashbackMaxAmount: '',
                  cashbackActive: true,
                };
                setFormData(resetData);
                setImages([]);
                setVideos([]);
                setErrors({});
              },
            },
          ],
          { cancelable: false }
        );
        
        // Auto-redirect to products page after 2 seconds if user doesn't choose
        setTimeout(() => {
          router.push('/products');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Product creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  // Calculate section error counts
  const getSectionErrors = (fields: string[]): number => {
    return fields.filter(field => errors[field]).length;
  };

  const basicInfoErrors = getSectionErrors(['name', 'description', 'shortDescription', 'sku', 'barcode', 'category', 'subcategory', 'brand']);
  const pricingErrors = getSectionErrors(['price', 'costPrice', 'compareAtPrice', 'currency', 'cashbackPercentage', 'cashbackMaxAmount']);
  const inventoryErrors = getSectionErrors(['stock', 'lowStockThreshold']);
  const mediaErrors = getSectionErrors(['images', 'videos']);
  const physicalErrors = getSectionErrors(['weight', 'dimensions.length', 'dimensions.width', 'dimensions.height']);
  const seoErrors = getSectionErrors(['metaTitle', 'metaDescription', 'searchKeywords', 'tags']);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add Product</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
            <View style={styles.labelRow}>
              <ThemedText style={styles.label}>SKU</ThemedText>
              <TouchableOpacity onPress={generateSKU} style={styles.generateButton}>
                <Ionicons name="refresh" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.generateButtonText}>Generate</ThemedText>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, errors.sku && styles.inputError]}
              value={formData.sku}
              onChangeText={(value) => updateFormData('sku', value.toUpperCase())}
              placeholder="Auto-generated if empty"
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
            <FormSelect
              label="Category Type"
              value={formData.categoryType}
              onValueChange={(value) => updateFormData('categoryType', value as any)}
              options={[
                { label: 'General', value: 'general' },
                { label: 'Going Out', value: 'going_out' },
                { label: 'Home Delivery', value: 'home_delivery' },
                { label: 'Earn', value: 'earn' },
                { label: 'Play', value: 'play' },
              ]}
              placeholder="Select category type"
              required
              helperText="Determines where this product appears on the user app"
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
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.light.background} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.light.background} />
                <ThemedText style={styles.submitText}>Create Product</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
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

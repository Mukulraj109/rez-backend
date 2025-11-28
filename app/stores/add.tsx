import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useStore } from '@/contexts/StoreContext';
import { apiClient } from '@/services/api';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';
import { uploadsService } from '@/services/api/uploads';
import { isWeb, handleWebImageUpload } from '@/utils/platform';
import ErrorModal from '@/components/common/ErrorModal';
import SuccessModal from '@/components/common/SuccessModal';

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional().or(z.literal('')),
  pincode: z.union([
    z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    z.literal('')
  ]).optional(),
  landmark: z.string().optional().or(z.literal('')),
  deliveryRadius: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.union([
    z.string().email('Invalid email'),
    z.literal('')
  ]).optional(),
  website: z.union([
    z.string().url('Invalid URL'),
    z.literal('')
  ]).optional(),
  whatsapp: z.string().optional().or(z.literal('')),
  deliveryTime: z.string().optional().or(z.literal('')),
  minimumOrder: z.string().optional().or(z.literal('')),
  deliveryFee: z.string().optional().or(z.literal('')),
  freeDeliveryAbove: z.string().optional().or(z.literal('')),
  cashback: z.string().optional().or(z.literal('')),
  minOrderAmount: z.string().optional().or(z.literal('')),
  isPartner: z.boolean().optional(),
  partnerLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  isFeatured: z.boolean().optional(),
  tags: z.string().optional().or(z.literal('')),
  // Delivery categories
  fastDelivery: z.boolean().optional(),
  budgetFriendly: z.boolean().optional(),
  ninetyNineStore: z.boolean().optional(),
  premium: z.boolean().optional(),
  organic: z.boolean().optional(),
  alliance: z.boolean().optional(),
  lowestPrice: z.boolean().optional(),
  mall: z.boolean().optional(),
  cashStore: z.boolean().optional(),
  // Store hours for each day
  mondayOpen: z.string().optional().or(z.literal('')),
  mondayClose: z.string().optional().or(z.literal('')),
  mondayClosed: z.boolean().optional(),
  tuesdayOpen: z.string().optional().or(z.literal('')),
  tuesdayClose: z.string().optional().or(z.literal('')),
  tuesdayClosed: z.boolean().optional(),
  wednesdayOpen: z.string().optional().or(z.literal('')),
  wednesdayClose: z.string().optional().or(z.literal('')),
  wednesdayClosed: z.boolean().optional(),
  thursdayOpen: z.string().optional().or(z.literal('')),
  thursdayClose: z.string().optional().or(z.literal('')),
  thursdayClosed: z.boolean().optional(),
  fridayOpen: z.string().optional().or(z.literal('')),
  fridayClose: z.string().optional().or(z.literal('')),
  fridayClosed: z.boolean().optional(),
  saturdayOpen: z.string().optional().or(z.literal('')),
  saturdayClose: z.string().optional().or(z.literal('')),
  saturdayClosed: z.boolean().optional(),
  sundayOpen: z.string().optional().or(z.literal('')),
  sundayClose: z.string().optional().or(z.literal('')),
  sundayClosed: z.boolean().optional(),
});

type StoreFormData = z.infer<typeof storeSchema>;

export default function AddStoreScreen() {
  const router = useRouter();
  const { createStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ label: string; value: string }>>([]);
  
  // Image states
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Multiple banner images support
  const [bannerUris, setBannerUris] = useState<string[]>([]);
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState<number | null>(null);
  
  // Modal states
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  
  // Helper functions for modals
  const showError = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };
  
  const showSuccess = (title: string, message: string) => {
    setSuccessModal({ visible: true, title, message });
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      deliveryRadius: '',
      phone: '',
      email: '',
      website: '',
      whatsapp: '',
      deliveryTime: '30-45 mins',
      minimumOrder: '0',
      deliveryFee: '0',
      freeDeliveryAbove: '500',
      cashback: '5',
      minOrderAmount: '',
      isPartner: false,
      partnerLevel: undefined,
      isFeatured: false,
      tags: '',
      mondayOpen: '09:00',
      mondayClose: '21:00',
      mondayClosed: false,
      tuesdayOpen: '09:00',
      tuesdayClose: '21:00',
      tuesdayClosed: false,
      wednesdayOpen: '09:00',
      wednesdayClose: '21:00',
      wednesdayClosed: false,
      thursdayOpen: '09:00',
      thursdayClose: '21:00',
      thursdayClosed: false,
      fridayOpen: '09:00',
      fridayClose: '21:00',
      fridayClosed: false,
      saturdayOpen: '09:00',
      saturdayClose: '21:00',
      saturdayClosed: false,
      sundayOpen: '09:00',
      sundayClose: '21:00',
      sundayClosed: false,
      // Delivery categories
      fastDelivery: false,
      budgetFriendly: false,
      ninetyNineStore: false,
      premium: false,
      organic: false,
      alliance: false,
      lowestPrice: false,
      mall: false,
      cashStore: false,
    },
  });

  const isPartner = watch('isPartner');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get<any>('categories');
      let categoriesArray: any[] = [];
      
      // Handle different response structures
      if (response.data) {
        if (Array.isArray(response.data)) {
          categoriesArray = response.data;
        } else if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            categoriesArray = response.data.data;
          } else if (response.data.data.categories && Array.isArray(response.data.data.categories)) {
            categoriesArray = response.data.data.categories;
          }
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categoriesArray = response.data.categories;
        }
      }
      
      if (categoriesArray.length > 0) {
        setCategories(
          categoriesArray.map((cat: any) => ({
            label: cat.name || cat,
            value: cat._id || cat,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Image upload handlers
  const uploadImage = async (imageUri: string, type: 'logo' | 'banner' = 'general', fileObject?: File): Promise<string | null> => {
    try {
      const result = await uploadsService.uploadImage(imageUri, undefined, type, fileObject);
      return result.url;
    } catch (error: any) {
      showError('Upload Error', error.message || 'Failed to upload image');
      return null;
    }
  };

  const handleSelectLogo = async () => {
    try {
      let result;
      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          result = { 
            assets: [{ 
              uri: webImages[0].uri,
              file: webImages[0].file
            }], 
            canceled: false 
          };
        } else {
          result = { canceled: true };
        }
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // Changed to false to allow full image upload without cropping
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setLogoUri(asset.uri);
        setUploadingLogo(true);
        
        const fileObject = isWeb && 'file' in asset ? asset.file : undefined;
        const uploadedUrl = await uploadImage(asset.uri, 'logo', fileObject);
        
        if (uploadedUrl) {
          setLogoUrl(uploadedUrl);
        }
        setUploadingLogo(false);
      }
    } catch (error: any) {
      setUploadingLogo(false);
      showError('Error', error.message || 'Failed to select image');
    }
  };

  const handleSelectBanner = async () => {
    try {
      let assets: Array<{ uri: string; file?: File }> = [];

      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          assets = webImages.map(img => ({ uri: img.uri, file: img.file }));
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true, // Enable multiple selection
          selectionLimit: 10 - bannerUris.length, // Limit to remaining slots
          quality: 0.8,
        });

        if (!result.canceled && result.assets) {
          assets = result.assets.map(asset => ({ uri: asset.uri }));
        }
      }

      if (assets.length === 0) return;

      // Check if adding these would exceed the limit
      const availableSlots = 10 - bannerUris.length;
      const imagesToAdd = assets.slice(0, availableSlots);

      if (imagesToAdd.length === 0) {
        showError('Limit Reached', 'You can only add up to 10 banner images.');
        return;
      }

      // Add all local URIs first for immediate preview
      const startIndex = bannerUris.length;
      setBannerUris(prev => [...prev, ...imagesToAdd.map(a => a.uri)]);
      setUploadingBanner(true);

      // Upload all images
      const uploadResults: { index: number; url: string | null }[] = [];

      for (let i = 0; i < imagesToAdd.length; i++) {
        const asset = imagesToAdd[i];
        setUploadingBannerIndex(startIndex + i);

        const uploadedUrl = await uploadImage(asset.uri, 'banner', asset.file);
        uploadResults.push({ index: startIndex + i, url: uploadedUrl });
      }

      // Update URLs for successful uploads and remove failed ones
      const successfulUploads = uploadResults.filter(r => r.url !== null);
      const failedIndices = uploadResults.filter(r => r.url === null).map(r => r.index);

      if (successfulUploads.length > 0) {
        setBannerUrls(prev => [...prev, ...successfulUploads.map(r => r.url!)]);
      }

      if (failedIndices.length > 0) {
        // Remove failed uploads from URIs
        setBannerUris(prev => prev.filter((_, idx) => !failedIndices.includes(idx)));
        showError('Upload Error', `${failedIndices.length} image(s) failed to upload.`);
      }

      setUploadingBanner(false);
      setUploadingBannerIndex(null);
    } catch (error: any) {
      setUploadingBanner(false);
      setUploadingBannerIndex(null);
      showError('Error', error.message || 'Failed to select images');
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri(null);
    setLogoUrl(null);
  };

  const handleRemoveBanner = (index: number) => {
    setBannerUris(prev => prev.filter((_, idx) => idx !== index));
    setBannerUrls(prev => prev.filter((_, idx) => idx !== index));
  };

  const toOptional = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  const toOptionalNumber = (value: string | undefined): number | undefined => {
    if (!value || !value.trim()) return undefined;
    const num = parseFloat(value.trim());
    return isNaN(num) ? undefined : num;
  };

  const onSubmit = async (data: StoreFormData) => {
    try {
      setLoading(true);
      
      const createPayload: any = {
        name: data.name.trim(),
        description: toOptional(data.description),
        category: data.category,
        location: {
          address: data.address.trim(),
          city: data.city.trim(),
          state: toOptional(data.state),
          pincode: toOptional(data.pincode),
          landmark: toOptional(data.landmark),
        },
        operationalInfo: {
          deliveryTime: toOptional(data.deliveryTime),
          minimumOrder: toOptionalNumber(data.minimumOrder) || 0,
          deliveryFee: toOptionalNumber(data.deliveryFee) || 0,
          freeDeliveryAbove: toOptionalNumber(data.freeDeliveryAbove),
        },
      };

      // Add images if uploaded
      if (logoUrl) {
        createPayload.logo = logoUrl;
      }
      // Send banner as array (or single string if only one for backward compatibility)
      if (bannerUrls.length > 0) {
        createPayload.banner = bannerUrls.length === 1 ? bannerUrls[0] : bannerUrls;
      }

      // Delivery radius
      const deliveryRadius = toOptionalNumber(data.deliveryRadius);
      if (deliveryRadius !== undefined) {
        createPayload.location.deliveryRadius = deliveryRadius;
      }

      // Contact info
      const contactFields: any = {};
      if (data.phone) contactFields.phone = data.phone.trim();
      if (data.email) contactFields.email = data.email.trim();
      if (data.website) contactFields.website = data.website.trim();
      if (data.whatsapp) contactFields.whatsapp = data.whatsapp.trim();
      if (Object.keys(contactFields).length > 0) {
        createPayload.contact = contactFields;
      }

      // Store hours
      const buildDayHours = (open: string, close: string, closed: boolean) => {
        if (closed) return { closed: true };
        if (open && close) {
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (timeRegex.test(open) && timeRegex.test(close)) {
            return { open, close, closed: false };
          }
        }
        return undefined;
      };

      const hours: any = {};
      const mondayHours = buildDayHours(data.mondayOpen || '', data.mondayClose || '', data.mondayClosed || false);
      if (mondayHours) hours.monday = mondayHours;
      const tuesdayHours = buildDayHours(data.tuesdayOpen || '', data.tuesdayClose || '', data.tuesdayClosed || false);
      if (tuesdayHours) hours.tuesday = tuesdayHours;
      const wednesdayHours = buildDayHours(data.wednesdayOpen || '', data.wednesdayClose || '', data.wednesdayClosed || false);
      if (wednesdayHours) hours.wednesday = wednesdayHours;
      const thursdayHours = buildDayHours(data.thursdayOpen || '', data.thursdayClose || '', data.thursdayClosed || false);
      if (thursdayHours) hours.thursday = thursdayHours;
      const fridayHours = buildDayHours(data.fridayOpen || '', data.fridayClose || '', data.fridayClosed || false);
      if (fridayHours) hours.friday = fridayHours;
      const saturdayHours = buildDayHours(data.saturdayOpen || '', data.saturdayClose || '', data.saturdayClosed || false);
      if (saturdayHours) hours.saturday = saturdayHours;
      const sundayHours = buildDayHours(data.sundayOpen || '', data.sundayClose || '', data.sundayClosed || false);
      if (sundayHours) hours.sunday = sundayHours;

      if (Object.keys(hours).length > 0) {
        createPayload.operationalInfo.hours = hours;
      }

      // Offers
      const offersFields: any = {};
      const cashback = toOptionalNumber(data.cashback);
      if (cashback !== undefined) {
        offersFields.cashback = cashback;
      }
      const minOrderAmount = toOptionalNumber(data.minOrderAmount);
      if (minOrderAmount !== undefined) {
        offersFields.minOrderAmount = minOrderAmount;
      }
      if (data.isPartner !== undefined) {
        offersFields.isPartner = data.isPartner;
        if (data.isPartner && data.partnerLevel) {
          offersFields.partnerLevel = data.partnerLevel;
        }
      }
      if (Object.keys(offersFields).length > 0) {
        createPayload.offers = offersFields;
      }

      // Tags
      if (data.tags && data.tags.trim()) {
        createPayload.tags = data.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      // Featured status
      if (data.isFeatured !== undefined) {
        createPayload.isFeatured = data.isFeatured;
      }

      // Delivery categories
      const deliveryCategories: any = {};
      if (data.fastDelivery) deliveryCategories.fastDelivery = true;
      if (data.budgetFriendly) deliveryCategories.budgetFriendly = true;
      if (data.ninetyNineStore) deliveryCategories.ninetyNineStore = true;
      if (data.premium) deliveryCategories.premium = true;
      if (data.organic) deliveryCategories.organic = true;
      if (data.alliance) deliveryCategories.alliance = true;
      if (data.lowestPrice) deliveryCategories.lowestPrice = true;
      if (data.mall) deliveryCategories.mall = true;
      if (data.cashStore) deliveryCategories.cashStore = true;
      
      if (Object.keys(deliveryCategories).length > 0) {
        createPayload.deliveryCategories = deliveryCategories;
      }

      await createStore(createPayload);

      showSuccess('Success', 'Store created successfully');
      setTimeout(() => {
        router.push('/stores');
      }, 2000);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'web' ? undefined : 'height'}
        style={styles.keyboardView}
        enabled={Platform.OS !== 'web'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Store</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 20 }}
        >
          <Text style={styles.sectionTitle}>Store Images (Optional)</Text>
          
          {/* Banner Images - Multiple Support */}
          <View style={styles.imageSection}>
            <Text style={styles.imageLabel}>Store Banners</Text>
            <Text style={styles.imageHint}>Recommended: 1200x400px (16:9 ratio). You can add up to 10 images.</Text>
            
            {/* Display existing banner images */}
            {bannerUris.length > 0 && (
              <View style={styles.bannerGrid}>
                {bannerUris.map((uri, index) => (
                  <View key={index} style={styles.bannerItemContainer}>
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri }} style={styles.bannerPreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveBanner(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                      {uploadingBanner && uploadingBannerIndex === index && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Add Banner Button */}
            {bannerUris.length < 10 && (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handleSelectBanner}
                disabled={uploadingBanner}
              >
                {uploadingBanner && uploadingBannerIndex === null ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
                    <Text style={styles.imagePickerText}>
                      {bannerUris.length === 0 ? 'Add Banner Image' : 'Add Another Banner'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Logo Image */}
          <View style={styles.imageSection}>
            <Text style={styles.imageLabel}>Store Logo</Text>
            <Text style={styles.imageHint}>Recommended: 400x400px (1:1 ratio)</Text>
            {logoUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveLogo}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                {uploadingLogo && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handleSelectLogo}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={24} color="#3B82F6" />
                    <Text style={styles.imagePickerText}>Select Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <FormInput
            name="name"
            control={control}
            label="Store Name *"
            placeholder="Enter store name"
            error={errors.name?.message}
          />

          <FormInput
            name="description"
            control={control}
            label="Description"
            placeholder="Enter store description"
            multiline
            numberOfLines={4}
            error={errors.description?.message}
          />

          <FormSelect
            name="category"
            control={control}
            label="Category *"
            placeholder="Select category"
            options={categories}
          />

          <Text style={styles.sectionTitle}>Location</Text>

          <FormInput
            name="address"
            control={control}
            label="Address *"
            placeholder="Enter street address"
            error={errors.address?.message}
          />

          <FormInput
            name="city"
            control={control}
            label="City *"
            placeholder="Enter city"
            error={errors.city?.message}
          />

          <FormInput
            name="state"
            control={control}
            label="State"
            placeholder="Enter state"
            error={errors.state?.message}
          />

          <FormInput
            name="pincode"
            control={control}
            label="Pincode"
            placeholder="Enter 6-digit pincode"
            keyboardType="numeric"
            maxLength={6}
            error={errors.pincode?.message}
          />

          <FormInput
            name="landmark"
            control={control}
            label="Landmark"
            placeholder="Enter nearby landmark"
            error={errors.landmark?.message}
          />

          <FormInput
            name="deliveryRadius"
            control={control}
            label="Delivery Radius (km)"
            placeholder="5"
            keyboardType="numeric"
            error={errors.deliveryRadius?.message}
          />

          <Text style={styles.sectionTitle}>Contact</Text>

          <FormInput
            name="phone"
            control={control}
            label="Phone"
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            error={errors.phone?.message}
          />

          <FormInput
            name="email"
            control={control}
            label="Email"
            placeholder="Enter email address"
            keyboardType="email-address"
            error={errors.email?.message}
          />

          <FormInput
            name="website"
            control={control}
            label="Website"
            placeholder="https://example.com"
            keyboardType="url"
            error={errors.website?.message}
          />

          <FormInput
            name="whatsapp"
            control={control}
            label="WhatsApp"
            placeholder="Enter WhatsApp number"
            keyboardType="phone-pad"
            error={errors.whatsapp?.message}
          />

          <Text style={styles.sectionTitle}>Store Hours</Text>
          <Text style={styles.sectionHint}>Format: HH:MM (e.g., 09:00, 21:00). Leave empty if closed.</Text>
          
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
            const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
            return (
              <View key={day} style={styles.hoursRow}>
                <View style={styles.hoursDayContainer}>
                  <Text style={styles.hoursDayLabel}>{dayCapitalized}</Text>
                  <View style={styles.hoursInputsContainer}>
                    <FormInput
                      name={`${day}Open` as any}
                      control={control}
                      label=""
                      placeholder="09:00"
                      keyboardType="default"
                      containerStyle={styles.hoursInput}
                    />
                    <Text style={styles.hoursSeparator}>-</Text>
                    <FormInput
                      name={`${day}Close` as any}
                      control={control}
                      label=""
                      placeholder="21:00"
                      keyboardType="default"
                      containerStyle={styles.hoursInput}
                    />
                  </View>
                  <Controller
                    name={`${day}Closed` as any}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <TouchableOpacity
                        style={styles.closedToggle}
                        onPress={() => onChange(!value)}
                      >
                        <Ionicons
                          name={value ? "checkbox" : "checkbox-outline"}
                          size={24}
                          color={value ? "#3B82F6" : "#9CA3AF"}
                        />
                        <Text style={styles.closedToggleText}>Closed</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Delivery Settings</Text>

          <FormInput
            name="deliveryTime"
            control={control}
            label="Delivery Time"
            placeholder="30-45 mins"
            error={errors.deliveryTime?.message}
          />

          <FormInput
            name="minimumOrder"
            control={control}
            label="Minimum Order (₹)"
            placeholder="0"
            keyboardType="numeric"
            error={errors.minimumOrder?.message}
          />

          <FormInput
            name="deliveryFee"
            control={control}
            label="Delivery Fee (₹)"
            placeholder="0"
            keyboardType="numeric"
            error={errors.deliveryFee?.message}
          />

          <FormInput
            name="freeDeliveryAbove"
            control={control}
            label="Free Delivery Above (₹)"
            placeholder="500"
            keyboardType="numeric"
            error={errors.freeDeliveryAbove?.message}
          />

          <Text style={styles.sectionTitle}>Offers</Text>

          <FormInput
            name="cashback"
            control={control}
            label="Cashback Percentage (%)"
            placeholder="5"
            keyboardType="numeric"
            error={errors.cashback?.message}
          />

          <FormInput
            name="minOrderAmount"
            control={control}
            label="Minimum Order Amount for Cashback (₹)"
            placeholder="100"
            keyboardType="numeric"
            error={errors.minOrderAmount?.message}
          />

          <Text style={styles.sectionTitle}>Partner Status</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Partner Store</Text>
            <Controller
              name="isPartner"
              control={control}
              render={({ field: { value, onChange } }) => (
                <TouchableOpacity
                  style={styles.switchContainer}
                  onPress={() => onChange(!value)}
                >
                  <Ionicons
                    name={value ? "toggle" : "toggle-outline"}
                    size={32}
                    color={value ? "#3B82F6" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              )}
            />
          </View>

          {isPartner && (
            <FormSelect
              name="partnerLevel"
              control={control}
              label="Partner Level"
              placeholder="Select partner level"
              options={[
                { label: 'Bronze', value: 'bronze' },
                { label: 'Silver', value: 'silver' },
                { label: 'Gold', value: 'gold' },
                { label: 'Platinum', value: 'platinum' },
              ]}
            />
          )}

          <Text style={styles.sectionTitle}>Store Categories</Text>
          <Text style={styles.sectionHint}>Select the categories your store belongs to. This helps customers find your store more easily.</Text>
          
          {[
            { key: 'fastDelivery', label: '30 min delivery', description: 'Fast food delivery in 30 minutes or less' },
            { key: 'budgetFriendly', label: '1 rupees store', description: 'Ultra-budget items starting from 1 rupee' },
            { key: 'ninetyNineStore', label: '99 Rupees store', description: 'Budget friendly shopping' },
            { key: 'premium', label: 'Luxury store', description: 'Premium brands and luxury products' },
            { key: 'organic', label: 'Organic Store', description: '100% organic and natural products' },
            { key: 'alliance', label: 'Alliance Store', description: 'Trusted neighborhood supermarkets' },
            { key: 'lowestPrice', label: 'Lowest Price', description: 'Guaranteed lowest prices with price match' },
            { key: 'mall', label: 'Rez Mall', description: 'One-stop shopping destination' },
            { key: 'cashStore', label: 'Cash Store', description: 'Cash-only transactions with exclusive discounts' },
          ].map((category) => (
            <View key={category.key} style={styles.switchRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.switchLabel}>{category.label}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Controller
                name={category.key as any}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <TouchableOpacity
                    style={styles.switchContainer}
                    onPress={() => onChange(!value)}
                  >
                    <Ionicons
                      name={value ? "toggle" : "toggle-outline"}
                      size={32}
                      color={value ? "#3B82F6" : "#9CA3AF"}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          ))}

          <Text style={styles.sectionTitle}>Additional Settings</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Featured Store</Text>
            <Controller
              name="isFeatured"
              control={control}
              render={({ field: { value, onChange } }) => (
                <TouchableOpacity
                  style={styles.switchContainer}
                  onPress={() => onChange(!value)}
                >
                  <Ionicons
                    name={value ? "toggle" : "toggle-outline"}
                    size={32}
                    color={value ? "#3B82F6" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              )}
            />
          </View>

          <FormInput
            name="tags"
            control={control}
            label="Tags"
            placeholder="tag1, tag2, tag3"
            error={errors.tags?.message}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Store</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav />
      
      {/* Modals */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ visible: false, title: '', message: '' })}
      />
      <SuccessModal
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ visible: false, title: '', message: '' })}
        autoCloseDelay={2000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  imageSection: {
    marginBottom: 16,
  },
  bannerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  bannerItemContainer: {
    width: '48%', // Two columns with gap
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  imagePickerText: {
    marginLeft: 8,
    color: '#3B82F6',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12, // Increased for modern look
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC', // Background for container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center', // Center logo preview
    justifyContent: 'center', // Center logo preview
  },
  bannerPreview: {
    width: '100%',
    height: 200, // Increased height for better display
    borderRadius: 8,
    resizeMode: 'contain', // Show full image without cropping
    backgroundColor: '#F8FAFC', // Light background for better visibility
  },
  logoPreview: {
    width: 150, // Increased size for better visibility
    height: 150, // Increased size for better visibility
    borderRadius: 8,
    resizeMode: 'contain', // Show full image without cropping
    backgroundColor: '#F8FAFC', // Light background for better visibility
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 12,
  },
  hoursRow: {
    marginBottom: 12,
  },
  hoursDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursDayLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  hoursInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hoursInput: {
    flex: 1,
    marginBottom: 0,
  },
  hoursSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  closedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  closedToggleText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  switchContainer: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

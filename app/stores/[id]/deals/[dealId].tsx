import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { offersService, StoreOffer } from '@/services/api/offers';
import { useStore } from '@/contexts/StoreContext';
import { uploadsService } from '@/services/api/uploads';
import { isWeb, handleWebImageUpload } from '@/utils/platform';
import { showAlert } from '@/utils/alert';

const dealSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  subtitle: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  image: z.string().url('Image URL is required'),
  category: z.enum(['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general']).default('general'),
  type: z.enum(['cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in']).default('walk_in'),
  cashbackPercentage: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').refine(
    (val) => parseFloat(val) >= 0 && parseFloat(val) <= 100,
    'Must be between 0 and 100'
  ),
  originalPrice: z.string().optional().or(z.literal('')),
  discountedPrice: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean().default(true),
  minOrderValue: z.string().optional().or(z.literal('')),
  maxDiscountAmount: z.string().optional().or(z.literal('')),
  usageLimitPerUser: z.string().optional().or(z.literal('')),
  usageLimit: z.string().optional().or(z.literal('')),
  priority: z.string().regex(/^\d+$/, 'Must be a number').optional().or(z.literal('')),
  featured: z.boolean().default(false),
});

type DealFormData = z.infer<typeof dealSchema>;

export default function EditDealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const dealId = params.dealId as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deal, setDeal] = useState<StoreOffer | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
  });

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  const loadDeal = async () => {
    try {
      setLoading(true);
      const response = await offersService.getOfferById(dealId);
      if (response.success && response.data) {
        const dealData = response.data;
        setDeal(dealData);
        setImageUrl(dealData.image);
        setImageUri(dealData.image); // Set preview URI

        // Populate form
        reset({
          title: dealData.title,
          subtitle: dealData.subtitle || '',
          description: dealData.description || '',
          image: dealData.image,
          category: dealData.category,
          type: dealData.type as any,
          cashbackPercentage: dealData.cashbackPercentage.toString(),
          originalPrice: dealData.originalPrice?.toString() || '',
          discountedPrice: dealData.discountedPrice?.toString() || '',
          startDate: new Date(dealData.validity.startDate).toISOString().split('T')[0],
          endDate: new Date(dealData.validity.endDate).toISOString().split('T')[0],
          isActive: dealData.validity.isActive,
          minOrderValue: dealData.restrictions?.minOrderValue?.toString() || '',
          maxDiscountAmount: dealData.restrictions?.maxDiscountAmount?.toString() || '',
          usageLimitPerUser: dealData.restrictions?.usageLimitPerUser?.toString() || '',
          usageLimit: dealData.restrictions?.usageLimit?.toString() || '',
          priority: dealData.metadata?.priority?.toString() || '0',
          featured: dealData.metadata?.featured || false,
        });
      } else {
        showAlert('Error', response.message || 'Failed to load deal');
        router.back();
      }
    } catch (error: any) {
      console.error('Error loading deal:', error);
      showAlert('Error', error.message || 'Failed to load deal');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      let result;
      if (isWeb) {
        const webImages = await handleWebImageUpload();
        if (webImages.length > 0) {
          result = { 
            assets: [{ 
              uri: webImages[0].uri,
              file: webImages[0].file // Pass File object for direct upload
            }], 
            canceled: false 
          };
        } else {
          return;
        }
      } else {
                result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaType.Images,
                  allowsEditing: true,
                  aspect: [16, 9],
                  quality: 0.8,
                });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileObject = isWeb && 'file' in asset ? asset.file : undefined;
        setImageUri(asset.uri);
        setUploadingImage(true);

        try {
          // Upload to Cloudinary using uploadsService
          // Note: imageType accepts 'logo' | 'banner' | 'general', backend will handle folder organization
          const uploadResult = await uploadsService.uploadImage(asset.uri, undefined, 'general', fileObject);
          // The uploadResult is the UploadedFile directly, not wrapped in success/data
          if (uploadResult && uploadResult.url) {
            const uploadedUrl = uploadResult.url;
            setImageUrl(uploadedUrl);
            setValue('image', uploadedUrl);
          } else {
            throw new Error('Failed to upload image: No URL returned');
          }
        } catch (error: any) {
          console.error('Image upload error:', error);
          showAlert('Upload Error', error.message || 'Failed to upload image');
          setImageUri(imageUrl); // Revert to previous image
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      showAlert('Error', error.message || 'Failed to pick image');
    }
  };

  const onSubmit = async (data: DealFormData) => {
    try {
      setSaving(true);

      if (!imageUrl && !data.image) {
        showAlert('Error', 'Please upload an image for the deal');
        return;
      }

      const updateData: Partial<any> = {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || undefined,
        description: data.description?.trim() || undefined,
        image: imageUrl || data.image,
        category: data.category,
        type: data.type,
        cashbackPercentage: parseFloat(data.cashbackPercentage),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
        discountedPrice: data.discountedPrice ? parseFloat(data.discountedPrice) : undefined,
        validity: {
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
          isActive: data.isActive,
        },
        restrictions: {
          minOrderValue: data.minOrderValue ? parseFloat(data.minOrderValue) : undefined,
          maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
          usageLimitPerUser: data.usageLimitPerUser ? parseInt(data.usageLimitPerUser) : undefined,
          usageLimit: data.usageLimit ? parseInt(data.usageLimit) : undefined,
        },
        metadata: {
          priority: data.priority ? parseInt(data.priority) : 0,
          featured: data.featured,
        },
      };

      const response = await offersService.updateOffer(dealId, updateData);

      if (response.success) {
        showAlert('Success', 'Deal updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        showAlert('Error', response.message || 'Failed to update deal');
      }
    } catch (error: any) {
      console.error('Error updating deal:', error);
      showAlert('Error', error.message || 'Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading deal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Deal</Text>
        <View style={{ width: 24 }} />
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <FormInput
          name="title"
          control={control}
          label="Deal Title *"
          placeholder="e.g., 50% Off on All Items"
          error={errors.title?.message}
        />

        <FormInput
          name="subtitle"
          control={control}
          label="Subtitle"
          placeholder="Short description"
          error={errors.subtitle?.message}
        />

        <FormInput
          name="description"
          control={control}
          label="Description"
          placeholder="Detailed description of the deal"
          multiline
          numberOfLines={4}
          error={errors.description?.message}
        />

        <Text style={styles.sectionTitle}>Deal Image *</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={handleImagePicker}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : imageUrl ? (
            <View style={styles.imagePreview}>
              <Text style={styles.imagePreviewText}>Image selected</Text>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color="#3B82F6" />
              <Text style={styles.imagePickerText}>Tap to select image</Text>
            </>
          )}
        </TouchableOpacity>

        <FormSelect
          name="category"
          control={control}
          label="Category"
          options={[
            { label: 'General', value: 'general' },
            { label: 'Mega', value: 'mega' },
            { label: 'Student', value: 'student' },
            { label: 'New Arrival', value: 'new_arrival' },
            { label: 'Trending', value: 'trending' },
            { label: 'Food', value: 'food' },
            { label: 'Fashion', value: 'fashion' },
            { label: 'Electronics', value: 'electronics' },
          ]}
        />

        <FormSelect
          name="type"
          control={control}
          label="Deal Type"
          options={[
            { label: 'Walk-In', value: 'walk_in' },
            { label: 'Cashback', value: 'cashback' },
            { label: 'Discount', value: 'discount' },
            { label: 'Voucher', value: 'voucher' },
            { label: 'Combo', value: 'combo' },
            { label: 'Special', value: 'special' },
          ]}
        />

        <FormInput
          name="cashbackPercentage"
          control={control}
          label="Cashback Percentage (%) *"
          placeholder="10"
          keyboardType="numeric"
          error={errors.cashbackPercentage?.message}
        />

        <FormInput
          name="originalPrice"
          control={control}
          label="Original Price (₹)"
          placeholder="1000"
          keyboardType="numeric"
          error={errors.originalPrice?.message}
        />

        <FormInput
          name="discountedPrice"
          control={control}
          label="Discounted Price (₹)"
          placeholder="500"
          keyboardType="numeric"
          error={errors.discountedPrice?.message}
        />

        <Text style={styles.sectionTitle}>Validity Period *</Text>
        <FormInput
          name="startDate"
          control={control}
          label="Start Date"
          placeholder="YYYY-MM-DD"
          error={errors.startDate?.message}
        />

        <FormInput
          name="endDate"
          control={control}
          label="End Date"
          placeholder="YYYY-MM-DD"
          error={errors.endDate?.message}
        />

        <Text style={styles.sectionTitle}>Restrictions (Optional)</Text>
        <FormInput
          name="minOrderValue"
          control={control}
          label="Minimum Order Value (₹)"
          placeholder="500"
          keyboardType="numeric"
          error={errors.minOrderValue?.message}
        />

        <FormInput
          name="maxDiscountAmount"
          control={control}
          label="Maximum Discount Amount (₹)"
          placeholder="1000"
          keyboardType="numeric"
          error={errors.maxDiscountAmount?.message}
        />

        <FormInput
          name="usageLimitPerUser"
          control={control}
          label="Usage Limit Per User"
          placeholder="1"
          keyboardType="numeric"
          error={errors.usageLimitPerUser?.message}
        />

        <FormInput
          name="usageLimit"
          control={control}
          label="Total Usage Limit"
          placeholder="100"
          keyboardType="numeric"
          error={errors.usageLimit?.message}
        />

        <FormInput
          name="priority"
          control={control}
          label="Priority (0-100)"
          placeholder="0"
          keyboardType="numeric"
          error={errors.priority?.message}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Featured Deal</Text>
          <Controller
            name="featured"
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

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Update Deal</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  storeInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imagePreviewText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
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
    borderRadius: 12,
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


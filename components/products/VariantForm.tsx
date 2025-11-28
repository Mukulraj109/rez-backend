/**
 * VariantForm Component
 * Reusable variant add/edit form with validation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../forms/FormInput';
import FormSelect from '../forms/FormSelect';
import { ProductVariant } from '../../types/products';

interface VariantFormProps {
  variant?: ProductVariant;
  baseProductSku?: string;
  onSubmit: (data: VariantFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export interface VariantFormData {
  name: string;
  sku: string;
  price?: number;
  salePrice?: number;
  attributes: Array<{ name: string; value: string }>;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
  };
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  status: 'active' | 'inactive';
  image?: string;
}

const VariantForm: React.FC<VariantFormProps> = ({
  variant,
  baseProductSku,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<VariantFormData>({
    defaultValues: variant
      ? {
          name: variant.name,
          sku: variant.sku || '',
          price: variant.price,
          salePrice: variant.salePrice,
          attributes: variant.attributes,
          inventory: variant.inventory,
          weight: variant.weight,
          dimensions: variant.dimensions,
          status: variant.status,
          image: variant.image,
        }
      : {
          name: '',
          sku: '',
          price: undefined,
          salePrice: undefined,
          attributes: [],
          inventory: {
            quantity: 0,
            trackQuantity: true,
          },
          status: 'active',
        },
  });

  const [selectedImage, setSelectedImage] = useState<string | undefined>(variant?.image);
  const trackQuantity = watch('inventory.trackQuantity');
  const price = watch('price');
  const salePrice = watch('salePrice');

  useEffect(() => {
    // Auto-generate SKU if base SKU is provided and no existing SKU
    if (baseProductSku && !variant?.sku) {
      const timestamp = Date.now().toString().slice(-6);
      setValue('sku', `${baseProductSku}-V${timestamp}`);
    }
  }, [baseProductSku, variant, setValue]);

  const handleImageSelect = () => {
    // TODO: Implement image picker
    console.log('Image picker');
  };

  const handleFormSubmit = (data: VariantFormData) => {
    onSubmit({
      ...data,
      image: selectedImage,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <FormInput
            name="name"
            control={control}
            label="Variant Name"
            placeholder="e.g., Red - Medium"
            rules={{
              required: 'Variant name is required',
              minLength: {
                value: 3,
                message: 'Name must be at least 3 characters',
              },
            }}
            icon="pricetag-outline"
          />

          <FormInput
            name="sku"
            control={control}
            label="SKU (Stock Keeping Unit)"
            placeholder="Auto-generated or custom"
            description="Unique identifier for this variant"
            rules={{
              required: 'SKU is required',
              pattern: {
                value: /^[A-Z0-9-_]+$/i,
                message: 'SKU can only contain letters, numbers, hyphens, and underscores',
              },
            }}
            icon="barcode-outline"
            autoCapitalize="characters"
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <FormInput
                name="price"
                control={control}
                label="Regular Price"
                placeholder="0.00"
                keyboardType="decimal-pad"
                rules={{
                  validate: (value) =>
                    value === undefined ||
                    value >= 0 ||
                    'Price must be a positive number',
                }}
                icon="cash-outline"
              />
            </View>

            <View style={styles.halfWidth}>
              <FormInput
                name="salePrice"
                control={control}
                label="Sale Price (Optional)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                rules={{
                  validate: (value) => {
                    if (!value) return true;
                    if (value < 0) return 'Sale price must be positive';
                    if (price && value >= price) {
                      return 'Sale price must be less than regular price';
                    }
                    return true;
                  },
                }}
                icon="pricetag-outline"
              />
            </View>
          </View>

          {salePrice && price && salePrice < price && (
            <View style={styles.discountBadge}>
              <Ionicons name="trending-down" size={16} color="#10B981" />
              <Text style={styles.discountText}>
                {Math.round(((price - salePrice) / price) * 100)}% off
              </Text>
            </View>
          )}
        </View>

        {/* Inventory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Track Quantity</Text>
            <TouchableOpacity
              onPress={() =>
                setValue('inventory.trackQuantity', !trackQuantity)
              }
              style={[
                styles.switch,
                { backgroundColor: trackQuantity ? '#3B82F6' : '#D1D5DB' },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  { transform: [{ translateX: trackQuantity ? 20 : 0 }] },
                ]}
              />
            </TouchableOpacity>
          </View>

          {trackQuantity && (
            <FormInput
              name="inventory.quantity"
              control={control}
              label="Stock Quantity"
              placeholder="0"
              keyboardType="number-pad"
              rules={{
                required: 'Quantity is required when tracking inventory',
                validate: (value) =>
                  value >= 0 || 'Quantity must be zero or positive',
              }}
              icon="cube-outline"
            />
          )}
        </View>

        {/* Dimensions & Weight */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dimensions & Weight (Optional)</Text>

          <FormInput
            name="weight"
            control={control}
            label="Weight (kg)"
            placeholder="0.0"
            keyboardType="decimal-pad"
            icon="barbell-outline"
          />

          <View style={styles.row}>
            <View style={styles.thirdWidth}>
              <FormInput
                name="dimensions.length"
                control={control}
                label="Length (cm)"
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.thirdWidth}>
              <FormInput
                name="dimensions.width"
                control={control}
                label="Width (cm)"
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.thirdWidth}>
              <FormInput
                name="dimensions.height"
                control={control}
                label="Height (cm)"
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variant Image (Optional)</Text>
          <Text style={styles.sectionDescription}>
            Upload a specific image for this variant
          </Text>

          <TouchableOpacity
            style={styles.imageUploadContainer}
            onPress={handleImageSelect}
          >
            {selectedImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(undefined)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                <Text style={styles.uploadText}>Tap to upload image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.section}>
          <FormSelect
            name="status"
            control={control}
            label="Status"
            options={[
              { label: 'Active', value: 'active', description: 'Variant is available' },
              {
                label: 'Inactive',
                value: 'inactive',
                description: 'Variant is hidden',
              },
            ]}
            rules={{ required: 'Status is required' }}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit(handleFormSubmit)}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {variant ? 'Update Variant' : 'Add Variant'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  imageUploadContainer: {
    marginTop: 8,
  },
  imagePreview: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  uploadPlaceholder: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VariantForm;

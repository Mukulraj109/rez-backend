/**
 * Edit Product Variant Screen
 * Form to edit an existing product variant
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services';

// Validation schema
const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  price: z.string().optional(),
  salePrice: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  trackQuantity: z.boolean(),
  isDefault: z.boolean(),
  status: z.enum(['active', 'inactive']),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface Variant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  salePrice?: number;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
  };
  attributes: Array<{
    name: string;
    value: string;
  }>;
  image?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  productId: string;
}

export default function EditVariantScreen() {
  const params = useLocalSearchParams();
  const { variantId } = params;
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attributes, setAttributes] = useState<Array<{ name: string; value: string }>>([]);

  const canEdit = hasPermission('products:edit');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: '',
      sku: '',
      price: '',
      salePrice: '',
      quantity: '0',
      trackQuantity: true,
      isDefault: false,
      status: 'active',
    },
  });

  const trackQuantity = watch('trackQuantity');

  useEffect(() => {
    loadVariant();
  }, [variantId]);

  const loadVariant = async () => {
    try {
      setLoading(true);
      const variantIdStr = Array.isArray(variantId) ? variantId[0] : variantId;
      const variantData = await productsService.getVariant(variantIdStr);

      setVariant(variantData);
      setAttributes(variantData.attributes || []);
      setVariantImage(variantData.image || null);

      // Populate form
      reset({
        name: variantData.name || '',
        sku: variantData.sku || '',
        price: variantData.price?.toString() || '',
        salePrice: variantData.salePrice?.toString() || '',
        quantity: variantData.inventory?.quantity?.toString() || '0',
        trackQuantity: variantData.inventory?.trackQuantity !== false,
        isDefault: variantData.isDefault || false,
        status: variantData.status || 'active',
      });
    } catch (error: any) {
      console.error('Error loading variant:', error);
      Alert.alert('Error', error.message || 'Failed to load variant');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setVariantImage(result.assets[0].uri);
        // TODO: Upload to server
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const updateAttributeValue = (index: number, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index].value = value;
    setAttributes(newAttributes);
  };

  const handleUpdateInventory = async () => {
    if (!variant || !canEdit) return;

    Alert.alert(
      'Update Inventory',
      'This will update the inventory for this variant only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const quantity = watch('quantity');
              await productsService.updateVariant(variant.id, {
                inventory: {
                  quantity: parseInt(quantity),
                  trackQuantity: watch('trackQuantity'),
                },
              });
              Alert.alert('Success', 'Inventory updated successfully');
              loadVariant();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update inventory');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!variant || !canEdit) return;

    Alert.alert(
      'Delete Variant',
      'Are you sure you want to delete this variant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await productsService.deleteVariant(variant.id);
              Alert.alert('Success', 'Variant deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete variant');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const onSubmit = async (data: VariantFormData) => {
    if (!canEdit || !variant) {
      Alert.alert('Permission Denied', 'You do not have permission to edit variants');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: data.name,
        sku: data.sku || undefined,
        price: data.price ? parseFloat(data.price) : undefined,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : undefined,
        inventory: {
          quantity: parseInt(data.quantity),
          trackQuantity: data.trackQuantity,
        },
        attributes: attributes.filter((attr) => attr.value),
        image: variantImage || undefined,
        isDefault: data.isDefault,
        status: data.status,
      };

      await productsService.updateVariant(variant.id, updateData);

      Alert.alert('Success', 'Variant updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating variant:', error);
      Alert.alert('Error', error.message || 'Failed to update variant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Edit Variant
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading variant...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!variant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Edit Variant
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={Colors.light.destructive} />
            <ThemedText style={styles.errorTitle}>Variant Not Found</ThemedText>
            <ThemedText style={styles.errorSubtitle}>
              The variant you're trying to edit doesn't exist
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Edit Variant
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="lock-closed-outline" size={64} color={Colors.light.destructive} />
            <ThemedText style={styles.errorTitle}>Permission Denied</ThemedText>
            <ThemedText style={styles.errorSubtitle}>
              You do not have permission to edit product variants
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.title}>
              Edit Variant
            </ThemedText>
            <ThemedText style={styles.variantName}>{variant.name}</ThemedText>
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteIconButton}>
            <Ionicons name="trash-outline" size={24} color={Colors.light.destructive} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Variant Image */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Variant Image</ThemedText>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {variantImage ? (
                <Image source={{ uri: variantImage }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={Colors.light.textSecondary} />
                  <ThemedText style={styles.imagePlaceholderText}>Add Image</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>

            <FormInput
              name="name"
              control={control}
              label="Variant Name *"
              placeholder="e.g., Red Large Cotton"
            />

            <FormInput
              name="sku"
              control={control}
              label="SKU (Optional)"
              placeholder="e.g., PRD-RED-L"
              autoCapitalize="characters"
            />
          </View>

          {/* Attributes */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Attributes</ThemedText>

            {attributes.length === 0 ? (
              <View style={styles.emptyAttributes}>
                <ThemedText style={styles.emptyAttributesText}>
                  No attributes defined for this variant
                </ThemedText>
              </View>
            ) : (
              <View style={styles.attributesList}>
                {attributes.map((attr, index) => (
                  <View key={index} style={styles.attributeItem}>
                    <ThemedText style={styles.attributeLabel}>{attr.name}</ThemedText>
                    <View style={styles.attributeValueContainer}>
                      <ThemedText style={styles.attributeValue}>{attr.value}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Pricing (Optional)</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Leave empty to use product's default price
            </ThemedText>

            <FormInput
              name="price"
              control={control}
              label="Regular Price"
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="pricetag-outline"
            />

            <FormInput
              name="salePrice"
              control={control}
              label="Sale Price"
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="flash-outline"
            />
          </View>

          {/* Inventory */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Inventory</ThemedText>
              <TouchableOpacity
                style={styles.updateInventoryButton}
                onPress={handleUpdateInventory}
              >
                <Ionicons name="refresh" size={16} color={Colors.light.primary} />
                <ThemedText style={styles.updateInventoryText}>Update Only Inventory</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <ThemedText style={styles.switchLabel}>Track Quantity</ThemedText>
              <Switch
                value={trackQuantity}
                onValueChange={(value) => {
                  control._formValues.trackQuantity = value;
                }}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
            </View>

            {trackQuantity && (
              <FormInput
                name="quantity"
                control={control}
                label="Stock Quantity *"
                placeholder="0"
                keyboardType="number-pad"
                icon="cube-outline"
              />
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Settings</ThemedText>

            <View style={styles.switchRow}>
              <View>
                <ThemedText style={styles.switchLabel}>Set as Default Variant</ThemedText>
                <ThemedText style={styles.switchDescription}>
                  This variant will be selected by default
                </ThemedText>
              </View>
              <Switch
                value={watch('isDefault')}
                onValueChange={(value) => {
                  control._formValues.isDefault = value;
                }}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
            </View>

            <FormSelect
              name="status"
              control={control}
              label="Status"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={Colors.light.background} />
                  <ThemedText style={styles.deleteButtonText}>Delete Variant</ThemedText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <ThemedText style={styles.submitText}>Save Changes</ThemedText>
              )}
            </TouchableOpacity>
          </View>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: Colors.light.text,
  },
  variantName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  deleteIconButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
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
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  updateInventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  updateInventoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  imagePicker: {
    alignItems: 'center',
    marginTop: 8,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  emptyAttributes: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  emptyAttributesText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  attributesList: {
    gap: 12,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  attributeValueContainer: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  attributeValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  actionSection: {
    backgroundColor: Colors.light.background,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.destructive,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

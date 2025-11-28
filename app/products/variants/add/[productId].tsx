/**
 * Add Product Variant Screen
 * Form to create a new product variant
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
import { Product } from '@/shared/types';

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
  // Attribute fields
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  weight: z.string().optional(),
  style: z.string().optional(),
  pattern: z.string().optional(),
  finish: z.string().optional(),
  capacity: z.string().optional(),
  fragrance: z.string().optional(),
  flavor: z.string().optional(),
});

type VariantFormData = z.infer<typeof variantSchema>;

// Attribute type options
const ATTRIBUTE_TYPES = [
  { label: 'Color', value: 'color' },
  { label: 'Size', value: 'size' },
  { label: 'Material', value: 'material' },
  { label: 'Weight', value: 'weight' },
  { label: 'Style', value: 'style' },
  { label: 'Pattern', value: 'pattern' },
  { label: 'Finish', value: 'finish' },
  { label: 'Capacity', value: 'capacity' },
  { label: 'Fragrance', value: 'fragrance' },
  { label: 'Flavor', value: 'flavor' },
];

export default function AddVariantScreen() {
  const params = useLocalSearchParams();
  const { productId } = params;
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [addAnother, setAddAnother] = useState(false);

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
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const productIdStr = Array.isArray(productId) ? productId[0] : productId;
      const productData = await productsService.getProduct(productIdStr);
      setProduct(productData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      Alert.alert('Error', error.message || 'Failed to load product');
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

  const addAttribute = (attributeType: string) => {
    if (!selectedAttributes.includes(attributeType)) {
      setSelectedAttributes([...selectedAttributes, attributeType]);
    }
  };

  const removeAttribute = (attributeType: string) => {
    setSelectedAttributes(selectedAttributes.filter((attr) => attr !== attributeType));
  };

  const onSubmit = async (data: VariantFormData) => {
    if (!canEdit) {
      Alert.alert('Permission Denied', 'You do not have permission to add variants');
      return;
    }

    try {
      setSaving(true);

      // Build attributes array from selected attributes
      const attributes = selectedAttributes
        .map((attrType) => ({
          name: attrType,
          value: data[attrType as keyof VariantFormData] as string || '',
        }))
        .filter((attr) => attr.value);

      // Generate variant name from attributes if not provided
      let variantName = data.name;
      if (!variantName && attributes.length > 0) {
        variantName = attributes.map((attr) => attr.value).join(' / ');
      }

      const variantData = {
        name: variantName,
        sku: data.sku || undefined,
        price: data.price ? parseFloat(data.price) : undefined,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : undefined,
        inventory: {
          quantity: parseInt(data.quantity),
          trackQuantity: data.trackQuantity,
        },
        attributes,
        image: variantImage || undefined,
        isDefault: data.isDefault,
        status: data.status,
      };

      const productIdStr = Array.isArray(productId) ? productId[0] : productId;
      await productsService.createVariant(productIdStr, variantData);

      Alert.alert('Success', 'Variant created successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (addAnother) {
              reset();
              setVariantImage(null);
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating variant:', error);
      Alert.alert('Error', error.message || 'Failed to create variant');
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
              Add Variant
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
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
              Add Variant
            </ThemedText>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="lock-closed-outline" size={64} color={Colors.light.destructive} />
            <ThemedText style={styles.errorTitle}>Permission Denied</ThemedText>
            <ThemedText style={styles.errorSubtitle}>
              You do not have permission to add product variants
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
              Add Variant
            </ThemedText>
            {product && (
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
            )}
          </View>
          <View style={styles.placeholder} />
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
              label="Variant Name"
              placeholder="e.g., Red Large Cotton"
              helperText="Auto-generated from attributes if left empty"
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
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Attributes</ThemedText>
              <FormSelect
                name="addAttribute"
                control={control}
                placeholder="Add Attribute"
                options={ATTRIBUTE_TYPES.filter(
                  (attr) => !selectedAttributes.includes(attr.value)
                )}
                onSelect={(value) => value && addAttribute(value)}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
            </View>

            {selectedAttributes.length === 0 ? (
              <View style={styles.emptyAttributes}>
                <ThemedText style={styles.emptyAttributesText}>
                  No attributes added. Select attributes above to define this variant.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.attributesList}>
                {selectedAttributes.map((attrType) => (
                  <View key={attrType} style={styles.attributeItem}>
                    <View style={styles.attributeInputContainer}>
                      <FormInput
                        name={attrType as any}
                        control={control}
                        label={ATTRIBUTE_TYPES.find((a) => a.value === attrType)?.label}
                        placeholder={`Enter ${attrType}`}
                        containerStyle={{ flex: 1, marginBottom: 0 }}
                      />
                      <TouchableOpacity
                        style={styles.removeAttributeButton}
                        onPress={() => removeAttribute(attrType)}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.light.destructive} />
                      </TouchableOpacity>
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
            <ThemedText style={styles.sectionTitle}>Inventory</ThemedText>

            <View style={styles.switchRow}>
              <ThemedText style={styles.switchLabel}>Track Quantity</ThemedText>
              <Switch
                value={trackQuantity}
                onValueChange={(value) =>
                  control._formValues.trackQuantity = value
                }
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
            </View>

            {trackQuantity && (
              <FormInput
                name="quantity"
                control={control}
                label="Stock Quantity"
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
                onValueChange={(value) =>
                  control._formValues.isDefault = value
                }
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

          {/* Submit Buttons */}
          <View style={styles.submitSection}>
            <View style={styles.addAnotherRow}>
              <Switch
                value={addAnother}
                onValueChange={setAddAnother}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
              <ThemedText style={styles.addAnotherText}>Save and add another</ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <ThemedText style={styles.submitText}>Create Variant</ThemedText>
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
  productName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
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
    gap: 12,
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
    marginBottom: 8,
  },
  attributeInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  removeAttributeButton: {
    padding: 4,
    marginTop: 28,
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
  submitSection: {
    backgroundColor: Colors.light.background,
    padding: 16,
    marginBottom: 16,
  },
  addAnotherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  addAnotherText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

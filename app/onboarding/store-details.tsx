/**
 * Store Details Screen - Onboarding Step 2/5
 * Collects store information including name, address, operating hours, and delivery options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../../components/forms/FormInput';
import { onboardingService } from '../../services/api/onboarding';
import { StoreDetailsStep } from '../../types/onboarding';
import { Colors } from '../../constants/Colors';

// Define validation schema matching StoreDetailsStep
const storeDetailsSchema = z.object({
  storeName: z
    .string()
    .min(1, 'Store name is required')
    .min(3, 'Store name must be at least 3 characters'),
  storeType: z.enum(['online', 'offline', 'both'], {
    errorMap: () => ({ message: 'Please select a store type' }),
  }),
  street: z
    .string()
    .min(1, 'Street address is required')
    .min(5, 'Please enter a complete address'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z
    .string()
    .min(1, 'Pincode is required')
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().default('India'),
  storePhone: z
    .string()
    .min(1, 'Store phone is required')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  storeEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  deliveryAvailable: z.boolean().default(false),
  deliveryRadius: z.number().min(0, 'Delivery radius cannot be negative').optional(),
  homeDeliveryCharges: z.number().min(0, 'Charges cannot be negative').optional(),
  pickupAvailable: z.boolean().default(false),
});

type StoreDetailsFormData = z.infer<typeof storeDetailsSchema>;

const storeTypes = [
  { value: 'online', label: 'Online Only', icon: 'globe-outline' },
  { value: 'offline', label: 'Physical Store', icon: 'storefront-outline' },
  { value: 'both', label: 'Both', icon: 'albums-outline' },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

export default function StoreDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStoreType, setSelectedStoreType] = useState<string>('offline');
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreDetailsFormData>({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues: {
      storeName: '',
      storeType: 'offline',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      storePhone: '',
      storeEmail: '',
      deliveryAvailable: false,
      deliveryRadius: 0,
      homeDeliveryCharges: 0,
      pickupAvailable: false,
    },
  });

  const watchState = watch('state');

  // Load existing data if available
  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const status = await onboardingService.getOnboardingStatus();
      if (status.data.storeDetails) {
        const storeDetails = status.data.storeDetails;
        setValue('storeName', storeDetails.storeName);
        setValue('storeType', storeDetails.storeType);
        setValue('street', storeDetails.storeAddress.street);
        setValue('city', storeDetails.storeAddress.city);
        setValue('state', storeDetails.storeAddress.state);
        setValue('zipCode', storeDetails.storeAddress.zipCode);
        setValue('country', storeDetails.storeAddress.country);
        setValue('storePhone', storeDetails.storePhone);
        setValue('storeEmail', storeDetails.storeEmail || '');
        setValue('deliveryAvailable', storeDetails.deliveryAvailable || false);
        setValue('deliveryRadius', storeDetails.deliveryRadius || 0);
        setValue('homeDeliveryCharges', storeDetails.homeDeliveryCharges || 0);
        setValue('pickupAvailable', storeDetails.pickupAvailable || false);

        setSelectedStoreType(storeDetails.storeType);
        setDeliveryEnabled(storeDetails.deliveryAvailable || false);
        setPickupEnabled(storeDetails.pickupAvailable || false);
      }
    } catch (error) {
      console.error('Error loading store details:', error);
    }
  };

  const onSubmit = async (data: StoreDetailsFormData) => {
    try {
      setLoading(true);

      // Convert form data to StoreDetailsStep
      const stepData: StoreDetailsStep = {
        storeName: data.storeName,
        storeType: data.storeType,
        storeAddress: {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
        },
        storePhone: data.storePhone,
        storeEmail: data.storeEmail || undefined,
        deliveryAvailable: data.deliveryAvailable,
        deliveryRadius: data.deliveryRadius || undefined,
        homeDeliveryCharges: data.homeDeliveryCharges || undefined,
        pickupAvailable: data.pickupAvailable,
      };

      // Submit step to API
      await onboardingService.submitStep(2, stepData);

      // Navigate to next step
      router.push('/onboarding/bank-details');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save store details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepBar}>
        <View style={[styles.stepProgress, { width: '40%' }]} />
      </View>
      <Text style={styles.stepText}>Step 2 of 5</Text>
    </View>
  );

  const renderStoreTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.label}>Store Type *</Text>
      <View style={styles.optionsRow}>
        {storeTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              selectedStoreType === type.value && styles.typeCardSelected,
            ]}
            onPress={() => {
              setSelectedStoreType(type.value);
              setValue('storeType', type.value as any);
            }}
          >
            <Ionicons
              name={type.icon as any}
              size={28}
              color={
                selectedStoreType === type.value
                  ? Colors.light.primary
                  : Colors.light.textSecondary
              }
            />
            <Text
              style={[
                styles.typeText,
                selectedStoreType === type.value && styles.typeTextSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.storeType && (
        <Text style={styles.errorText}>{errors.storeType.message}</Text>
      )}
    </View>
  );

  const renderStateSelector = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>State *</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowStateDropdown(!showStateDropdown)}
      >
        <Text style={watchState ? styles.dropdownText : styles.dropdownPlaceholder}>
          {watchState || 'Select state'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.light.textSecondary} />
      </TouchableOpacity>
      {showStateDropdown && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {indianStates.map((state) => (
              <TouchableOpacity
                key={state}
                style={styles.dropdownItem}
                onPress={() => {
                  setValue('state', state);
                  setShowStateDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{state}</Text>
                {watchState === state && (
                  <Ionicons name="checkmark" size={20} color={Colors.light.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {errors.state && (
        <Text style={styles.errorText}>{errors.state.message}</Text>
      )}
    </View>
  );

  const renderDeliveryOptions = () => (
    <View style={styles.optionsSection}>
      <Text style={styles.sectionTitle}>Delivery & Pickup Options</Text>

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons name="bicycle-outline" size={24} color={Colors.light.primary} />
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>Home Delivery</Text>
            <Text style={styles.switchDescription}>Offer delivery to customers</Text>
          </View>
        </View>
        <Switch
          value={deliveryEnabled}
          onValueChange={(value) => {
            setDeliveryEnabled(value);
            setValue('deliveryAvailable', value);
          }}
          trackColor={{ false: Colors.light.borderMedium, true: Colors.light.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {deliveryEnabled && (
        <View style={styles.deliveryFields}>
          <FormInput
            name="deliveryRadius"
            control={control}
            label="Delivery Radius (km)"
            placeholder="10"
            keyboardType="numeric"
            icon="locate-outline"
          />
          <FormInput
            name="homeDeliveryCharges"
            control={control}
            label="Delivery Charges (₹)"
            placeholder="50"
            keyboardType="numeric"
            icon="cash-outline"
          />
        </View>
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons name="bag-handle-outline" size={24} color={Colors.light.primary} />
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>Pickup Available</Text>
            <Text style={styles.switchDescription}>Allow in-store pickup</Text>
          </View>
        </View>
        <Switch
          value={pickupEnabled}
          onValueChange={(value) => {
            setPickupEnabled(value);
            setValue('pickupAvailable', value);
          }}
          trackColor={{ false: Colors.light.borderMedium, true: Colors.light.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Details</Text>
        <View style={styles.placeholder} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Tell us about your store</Text>
        <Text style={styles.pageDescription}>
          Provide details about your store location and contact information
        </Text>

        <FormInput
          name="storeName"
          control={control}
          label="Store Name *"
          placeholder="Enter store name"
          icon="storefront-outline"
          autoCapitalize="words"
        />

        {renderStoreTypeSelector()}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Store Address</Text>

        <FormInput
          name="street"
          control={control}
          label="Street Address *"
          placeholder="Building, Street, Landmark"
          icon="location-outline"
          autoCapitalize="words"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              name="city"
              control={control}
              label="City *"
              placeholder="City"
              icon="business-outline"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              name="zipCode"
              control={control}
              label="Pincode *"
              placeholder="110001"
              keyboardType="numeric"
              icon="pin-outline"
              maxLength={6}
            />
          </View>
        </View>

        {renderStateSelector()}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Contact Information</Text>

        <FormInput
          name="storePhone"
          control={control}
          label="Store Phone Number *"
          placeholder="9876543210"
          keyboardType="phone-pad"
          icon="call-outline"
          maxLength={10}
        />

        <FormInput
          name="storeEmail"
          control={control}
          label="Store Email (Optional)"
          placeholder="store@business.com"
          keyboardType="email-address"
          icon="mail-outline"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.divider} />

        {renderDeliveryOptions()}

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 48,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  stepIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
  },
  stepBar: {
    height: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stepProgress: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.borderLight,
    marginVertical: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.borderMedium,
    backgroundColor: Colors.light.background,
  },
  typeCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}10`,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
    marginTop: 8,
  },
  typeTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.borderMedium,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.borderMedium,
    backgroundColor: Colors.light.background,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  optionsSection: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 12,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  deliveryFields: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 6,
  },
  spacer: {
    height: 40,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

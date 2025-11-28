/**
 * StoreDetailsForm Component
 * Reusable store details form for Step 2 of onboarding
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, Switch } from 'react-native';
import { useForm } from 'react-hook-form';
import FormInput from '@/components/forms/FormInput';
import FormSelect, { SelectOption } from '@/components/forms/FormSelect';
import { StoreDetailsStep } from '@/types/onboarding';
import { Colors } from '@/constants/Colors';

export interface StoreDetailsFormProps {
  initialData?: Partial<StoreDetailsStep>;
  onSubmit: (data: StoreDetailsStep) => void;
  onValidate?: (data: Partial<StoreDetailsStep>) => void;
  isLoading?: boolean;
}

const STORE_TYPES: SelectOption[] = [
  { label: 'Online Only', value: 'online', description: 'E-commerce store only' },
  { label: 'Physical Store', value: 'offline', description: 'Brick and mortar store' },
  { label: 'Both', value: 'both', description: 'Online and physical presence' },
];

const INDIAN_STATES: SelectOption[] = [
  { label: 'Andhra Pradesh', value: 'AP' },
  { label: 'Arunachal Pradesh', value: 'AR' },
  { label: 'Assam', value: 'AS' },
  { label: 'Bihar', value: 'BR' },
  { label: 'Chhattisgarh', value: 'CG' },
  { label: 'Delhi', value: 'DL' },
  { label: 'Goa', value: 'GA' },
  { label: 'Gujarat', value: 'GJ' },
  { label: 'Haryana', value: 'HR' },
  { label: 'Himachal Pradesh', value: 'HP' },
  { label: 'Jharkhand', value: 'JH' },
  { label: 'Karnataka', value: 'KA' },
  { label: 'Kerala', value: 'KL' },
  { label: 'Madhya Pradesh', value: 'MP' },
  { label: 'Maharashtra', value: 'MH' },
  { label: 'Manipur', value: 'MN' },
  { label: 'Meghalaya', value: 'ML' },
  { label: 'Mizoram', value: 'MZ' },
  { label: 'Nagaland', value: 'NL' },
  { label: 'Odisha', value: 'OR' },
  { label: 'Punjab', value: 'PB' },
  { label: 'Rajasthan', value: 'RJ' },
  { label: 'Sikkim', value: 'SK' },
  { label: 'Tamil Nadu', value: 'TN' },
  { label: 'Telangana', value: 'TG' },
  { label: 'Tripura', value: 'TR' },
  { label: 'Uttar Pradesh', value: 'UP' },
  { label: 'Uttarakhand', value: 'UK' },
  { label: 'West Bengal', value: 'WB' },
];

const StoreDetailsForm: React.FC<StoreDetailsFormProps> = ({
  initialData,
  onSubmit,
  onValidate,
  isLoading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreDetailsStep>({
    defaultValues: {
      storeName: initialData?.storeName || '',
      storeType: initialData?.storeType || 'both',
      storeAddress: initialData?.storeAddress || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
      },
      storePhone: initialData?.storePhone || '',
      storeEmail: initialData?.storeEmail || '',
      deliveryAvailable: initialData?.deliveryAvailable ?? true,
      deliveryRadius: initialData?.deliveryRadius || 5,
      homeDeliveryCharges: initialData?.homeDeliveryCharges || 0,
      pickupAvailable: initialData?.pickupAvailable ?? true,
    },
  });

  const deliveryAvailable = watch('deliveryAvailable');
  const pickupAvailable = watch('pickupAvailable');

  // Watch all fields for validation
  React.useEffect(() => {
    const subscription = watch((value) => {
      onValidate?.(value as Partial<StoreDetailsStep>);
    });
    return () => subscription.unsubscribe();
  }, [watch, onValidate]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Store Basic Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Store Information
        </Text>

        <FormInput
          name="storeName"
          control={control}
          label="Store Name"
          placeholder="Enter store name"
          rules={{
            required: 'Store name is required',
            minLength: {
              value: 3,
              message: 'Store name must be at least 3 characters',
            },
          }}
          icon="storefront"
          autoCapitalize="words"
          testID="store-name-input"
        />

        <FormSelect
          name="storeType"
          control={control}
          label="Store Type"
          placeholder="Select store type"
          options={STORE_TYPES}
          rules={{ required: 'Store type is required' }}
          testID="store-type-select"
        />

        <FormInput
          name="storePhone"
          control={control}
          label="Store Phone"
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
          rules={{
            required: 'Store phone is required',
            pattern: {
              value: /^[+]?[0-9]{10,15}$/,
              message: 'Invalid phone number',
            },
          }}
          icon="call"
          testID="store-phone-input"
        />

        <FormInput
          name="storeEmail"
          control={control}
          label="Store Email (Optional)"
          placeholder="store@business.com"
          keyboardType="email-address"
          autoCapitalize="none"
          rules={{
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          }}
          icon="mail"
          testID="store-email-input"
        />
      </View>

      {/* Store Address */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Store Address
        </Text>

        <FormInput
          name="storeAddress.street"
          control={control}
          label="Street Address"
          placeholder="Enter street address"
          rules={{ required: 'Street address is required' }}
          icon="location"
          autoCapitalize="words"
          testID="street-input"
        />

        <FormInput
          name="storeAddress.city"
          control={control}
          label="City"
          placeholder="Enter city"
          rules={{ required: 'City is required' }}
          icon="business"
          autoCapitalize="words"
          testID="city-input"
        />

        <FormSelect
          name="storeAddress.state"
          control={control}
          label="State"
          placeholder="Select state"
          options={INDIAN_STATES}
          rules={{ required: 'State is required' }}
          searchable
          testID="state-select"
        />

        <FormInput
          name="storeAddress.zipCode"
          control={control}
          label="ZIP Code"
          placeholder="Enter ZIP code"
          keyboardType="numeric"
          rules={{
            required: 'ZIP code is required',
            pattern: {
              value: /^[0-9]{6}$/,
              message: 'ZIP code must be 6 digits',
            },
          }}
          icon="navigate"
          maxLength={6}
          testID="zipcode-input"
        />

        <FormInput
          name="storeAddress.country"
          control={control}
          label="Country"
          placeholder="Country"
          editable={false}
          testID="country-input"
        />
      </View>

      {/* Delivery Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Delivery & Pickup Options
        </Text>

        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              Delivery Available
            </Text>
            <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
              Offer home delivery service
            </Text>
          </View>
          <Switch
            value={deliveryAvailable}
            onValueChange={(value) => setValue('deliveryAvailable', value)}
            trackColor={{ false: colors.borderMedium, true: colors.primary }}
            thumbColor="#FFFFFF"
            testID="delivery-available-switch"
          />
        </View>

        {deliveryAvailable && (
          <>
            <FormInput
              name="deliveryRadius"
              control={control}
              label="Delivery Radius (km)"
              placeholder="Enter delivery radius"
              keyboardType="numeric"
              rules={{
                required: 'Delivery radius is required',
                min: { value: 1, message: 'Must be at least 1 km' },
              }}
              icon="navigate-circle"
              testID="delivery-radius-input"
            />

            <FormInput
              name="homeDeliveryCharges"
              control={control}
              label="Delivery Charges (₹)"
              placeholder="Enter delivery charges"
              keyboardType="numeric"
              rules={{
                required: 'Delivery charges are required',
                min: { value: 0, message: 'Cannot be negative' },
              }}
              icon="cash"
              testID="delivery-charges-input"
            />
          </>
        )}

        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              Pickup Available
            </Text>
            <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
              Allow customers to pick up orders
            </Text>
          </View>
          <Switch
            value={pickupAvailable}
            onValueChange={(value) => setValue('pickupAvailable', value)}
            trackColor={{ false: colors.borderMedium, true: colors.primary }}
            thumbColor="#FFFFFF"
            testID="pickup-available-switch"
          />
        </View>
      </View>

      {/* Operating Hours Note */}
      <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Operating hours can be configured later in the store settings.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default StoreDetailsForm;

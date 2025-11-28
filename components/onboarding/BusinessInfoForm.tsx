/**
 * BusinessInfoForm Component
 * Reusable business information form for Step 1 of onboarding
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { useForm } from 'react-hook-form';
import FormInput from '@/components/forms/FormInput';
import FormSelect, { SelectOption } from '@/components/forms/FormSelect';
import { BusinessInfoStep } from '@/types/onboarding';
import { Colors } from '@/constants/Colors';

export interface BusinessInfoFormProps {
  initialData?: Partial<BusinessInfoStep>;
  onSubmit: (data: BusinessInfoStep) => void;
  onValidate?: (data: Partial<BusinessInfoStep>) => void;
  isLoading?: boolean;
}

const BUSINESS_TYPES: SelectOption[] = [
  { label: 'Sole Proprietorship', value: 'sole_proprietor' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'Private Limited', value: 'pvt_ltd' },
  { label: 'Limited Liability Partnership', value: 'llp' },
  { label: 'Other', value: 'other' },
];

const BUSINESS_CATEGORIES: SelectOption[] = [
  { label: 'Retail', value: 'retail' },
  { label: 'Food & Beverage', value: 'food_beverage' },
  { label: 'Fashion & Apparel', value: 'fashion' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Health & Beauty', value: 'health_beauty' },
  { label: 'Home & Garden', value: 'home_garden' },
  { label: 'Services', value: 'services' },
  { label: 'Other', value: 'other' },
];

const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
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
    formState: { errors },
  } = useForm<BusinessInfoStep>({
    defaultValues: {
      businessName: initialData?.businessName || '',
      ownerName: initialData?.ownerName || '',
      ownerEmail: initialData?.ownerEmail || '',
      ownerPhone: initialData?.ownerPhone || '',
      businessType: initialData?.businessType || 'sole_proprietor',
      businessCategory: initialData?.businessCategory || '',
      businessSubcategory: initialData?.businessSubcategory || '',
      yearsInBusiness: initialData?.yearsInBusiness || 0,
      businessDescription: initialData?.businessDescription || '',
      website: initialData?.website || '',
      socialMediaLinks: initialData?.socialMediaLinks || {},
    },
  });

  // Watch all fields for validation
  React.useEffect(() => {
    const subscription = watch((value) => {
      onValidate?.(value as Partial<BusinessInfoStep>);
    });
    return () => subscription.unsubscribe();
  }, [watch, onValidate]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Business Information Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Business Information
        </Text>

        <FormInput
          name="businessName"
          control={control}
          label="Business Name"
          placeholder="Enter your business name"
          rules={{
            required: 'Business name is required',
            minLength: {
              value: 3,
              message: 'Business name must be at least 3 characters',
            },
          }}
          icon="business"
          autoCapitalize="words"
          testID="business-name-input"
        />

        <FormSelect
          name="businessType"
          control={control}
          label="Business Type"
          placeholder="Select business type"
          options={BUSINESS_TYPES}
          rules={{ required: 'Business type is required' }}
          testID="business-type-select"
        />

        <FormSelect
          name="businessCategory"
          control={control}
          label="Business Category"
          placeholder="Select business category"
          options={BUSINESS_CATEGORIES}
          rules={{ required: 'Business category is required' }}
          testID="business-category-select"
        />

        <FormInput
          name="businessSubcategory"
          control={control}
          label="Business Subcategory (Optional)"
          placeholder="e.g., Organic Food, Women's Fashion"
          autoCapitalize="words"
          testID="business-subcategory-input"
        />

        <FormInput
          name="yearsInBusiness"
          control={control}
          label="Years in Business"
          placeholder="Enter number of years"
          keyboardType="numeric"
          rules={{
            required: 'Years in business is required',
            min: { value: 0, message: 'Cannot be negative' },
          }}
          icon="calendar"
          testID="years-in-business-input"
        />

        <FormInput
          name="businessDescription"
          control={control}
          label="Business Description (Optional)"
          placeholder="Briefly describe your business"
          multiline
          numberOfLines={4}
          maxLength={500}
          showCharCount
          testID="business-description-input"
        />
      </View>

      {/* Owner Information Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Owner Information
        </Text>

        <FormInput
          name="ownerName"
          control={control}
          label="Owner Name"
          placeholder="Enter owner's full name"
          rules={{
            required: 'Owner name is required',
            minLength: {
              value: 3,
              message: 'Name must be at least 3 characters',
            },
          }}
          icon="person"
          autoCapitalize="words"
          testID="owner-name-input"
        />

        <FormInput
          name="ownerEmail"
          control={control}
          label="Owner Email"
          placeholder="owner@business.com"
          keyboardType="email-address"
          autoCapitalize="none"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          }}
          icon="mail"
          testID="owner-email-input"
        />

        <FormInput
          name="ownerPhone"
          control={control}
          label="Owner Phone"
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
          rules={{
            required: 'Phone number is required',
            pattern: {
              value: /^[+]?[0-9]{10,15}$/,
              message: 'Invalid phone number',
            },
          }}
          icon="call"
          testID="owner-phone-input"
        />
      </View>

      {/* Online Presence Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Online Presence (Optional)
        </Text>

        <FormInput
          name="website"
          control={control}
          label="Website"
          placeholder="https://www.yourbusiness.com"
          keyboardType="url"
          autoCapitalize="none"
          rules={{
            pattern: {
              value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
              message: 'Invalid website URL',
            },
          }}
          icon="globe"
          testID="website-input"
        />

        <FormInput
          name="socialMediaLinks.facebook"
          control={control}
          label="Facebook Page"
          placeholder="https://facebook.com/yourpage"
          keyboardType="url"
          autoCapitalize="none"
          icon="logo-facebook"
          testID="facebook-input"
        />

        <FormInput
          name="socialMediaLinks.instagram"
          control={control}
          label="Instagram Profile"
          placeholder="https://instagram.com/yourprofile"
          keyboardType="url"
          autoCapitalize="none"
          icon="logo-instagram"
          testID="instagram-input"
        />

        <FormInput
          name="socialMediaLinks.linkedin"
          control={control}
          label="LinkedIn Profile"
          placeholder="https://linkedin.com/company/yourcompany"
          keyboardType="url"
          autoCapitalize="none"
          icon="logo-linkedin"
          testID="linkedin-input"
        />

        <FormInput
          name="socialMediaLinks.twitter"
          control={control}
          label="Twitter Profile"
          placeholder="https://twitter.com/yourprofile"
          keyboardType="url"
          autoCapitalize="none"
          icon="logo-twitter"
          testID="twitter-input"
        />
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
});

export default BusinessInfoForm;

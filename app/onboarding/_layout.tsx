/**
 * Onboarding Layout
 * Wraps all onboarding screens with OnboardingProvider
 * Provides stack navigation for the merchant onboarding wizard
 */

import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { Colors } from '@/constants/Colors';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackVisible: false,
          gestureEnabled: false, // Prevent swipe back to ensure data is saved properly
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Entry point - determines where to redirect */}
        <Stack.Screen
          name="index"
          options={{
            title: 'Merchant Onboarding',
            headerShown: false,
          }}
        />

        {/* Welcome Screen */}
        <Stack.Screen
          name="welcome"
          options={{
            title: 'Welcome',
            headerShown: false,
          }}
        />

        {/* Step 1: Business Information */}
        <Stack.Screen
          name="business-info"
          options={{
            title: 'Business Information',
          }}
        />

        {/* Step 2: Store Details */}
        <Stack.Screen
          name="store-details"
          options={{
            title: 'Store Details',
          }}
        />

        {/* Step 3: Bank Details */}
        <Stack.Screen
          name="bank-details"
          options={{
            title: 'Bank Details',
          }}
        />

        {/* Step 4: Documents Upload */}
        <Stack.Screen
          name="documents"
          options={{
            title: 'Upload Documents',
          }}
        />

        {/* Step 5: Review & Submit */}
        <Stack.Screen
          name="review-submit"
          options={{
            title: 'Review & Submit',
          }}
        />

        {/* Pending Approval Screen */}
        <Stack.Screen
          name="pending-approval"
          options={{
            title: 'Pending Approval',
            headerShown: false,
          }}
        />
      </Stack>
    </OnboardingProvider>
  );
}

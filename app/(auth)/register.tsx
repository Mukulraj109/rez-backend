import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Shadows, BorderRadius } from '@/constants/DesignTokens';
import { Card, Button, Heading1, Heading3, BodyText } from '@/components/ui/DesignSystemComponents';
import FormInput from '@/components/forms/FormInput';
import Animated, { FadeInDown } from 'react-native-reanimated';

const registerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().default('USA'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { state, register, clearError } = useAuth();

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'USA',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const registrationData = {
        email: data.email,
        password: data.password,
        ownerName: data.ownerName,
        businessName: data.businessName,
        phone: data.phone,
        businessAddress: {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country
        }
      };

      await register(registrationData);

      Alert.alert(
        'Success',
        'Account created successfully! Let\'s complete your merchant profile.',
        [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/onboarding');
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary[500], Colors.primary[800]]}
        style={styles.backgroundGradient}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
                <View style={styles.header}>
                    <Heading1 style={styles.title}>Join Rez Merchant</Heading1>
                    <BodyText style={styles.subtitle}>
                        Create your merchant account
                    </BodyText>
                </View>

                <Card style={styles.formContainer} variant="elevated">
                    <View style={styles.form}>
                        
                        <View style={styles.section}>
                            <Heading3 style={styles.sectionTitle}>Business Information</Heading3>
                            <FormInput
                                name="businessName"
                                control={control}
                                label="Business Name"
                                placeholder="Enter your business name"
                                icon="storefront-outline"
                            />
                            <FormInput
                                name="ownerName"
                                control={control}
                                label="Owner Name"
                                placeholder="Enter owner's full name"
                                icon="person-outline"
                            />
                            <FormInput
                                name="phone"
                                control={control}
                                label="Phone Number"
                                placeholder="Enter business phone"
                                keyboardType="phone-pad"
                                icon="call-outline"
                            />
                        </View>

                        <View style={styles.section}>
                            <Heading3 style={styles.sectionTitle}>Account Information</Heading3>
                            <FormInput
                                name="email"
                                control={control}
                                label="Email"
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoComplete="email"
                                autoCapitalize="none"
                                icon="mail-outline"
                            />
                            <FormInput
                                name="password"
                                control={control}
                                label="Password"
                                placeholder="Create password (min 6 chars)"
                                secureTextEntry
                                icon="lock-closed-outline"
                            />
                            <FormInput
                                name="confirmPassword"
                                control={control}
                                label="Confirm Password"
                                placeholder="Confirm your password"
                                secureTextEntry
                                icon="lock-closed-outline"
                            />
                        </View>

                        <View style={styles.section}>
                            <Heading3 style={styles.sectionTitle}>Business Address</Heading3>
                            <FormInput
                                name="street"
                                control={control}
                                label="Street Address"
                                placeholder="Enter street address"
                                icon="location-outline"
                            />
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <FormInput
                                        name="city"
                                        control={control}
                                        label="City"
                                        placeholder="City"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <FormInput
                                        name="state"
                                        control={control}
                                        label="State"
                                        placeholder="State"
                                    />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <FormInput
                                        name="zipCode"
                                        control={control}
                                        label="ZIP Code"
                                        placeholder="ZIP"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <FormInput
                                        name="country"
                                        control={control}
                                        label="Country"
                                        placeholder="Country"
                                    />
                                </View>
                            </View>
                        </View>

                        <Button
                            title={state.isLoading ? 'Creating Account...' : 'Create Account'}
                            onPress={handleSubmit(onSubmit)}
                            loading={state.isLoading}
                            fullWidth
                            style={styles.registerButton}
                        />

                        <View style={styles.footer}>
                            <BodyText>Already have an account? </BodyText>
                            <Button
                                title="Sign In"
                                variant="ghost"
                                onPress={() => router.push('/(auth)/login')}
                                size="small"
                                style={{ height: 'auto', paddingHorizontal: 4 }}
                            />
                        </View>
                    </View>
                </Card>
            </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '40%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.primary[100],
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    ...Shadows.xl,
  },
  form: {
    gap: Spacing.lg,
  },
  section: {
      gap: Spacing.sm,
  },
  sectionTitle: {
      marginBottom: Spacing.xs,
      color: Colors.primary[600],
  },
  row: {
      flexDirection: 'row',
  },
  registerButton: {
      marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});

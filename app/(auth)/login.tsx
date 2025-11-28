import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Shadows, BorderRadius } from '@/constants/DesignTokens';
import { Card, Button, Heading1, BodyText, Heading3 } from '@/components/ui/DesignSystemComponents';
import FormInput from '@/components/forms/FormInput';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { state, login, clearError } = useAuth();
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: __DEV__ ? 'mukulraj756@gmail.com' : '',
      password: __DEV__ ? 'test123456' : '',
    },
  });

  useEffect(() => {
    if (state.isAuthenticated) {
      router.replace('/(dashboard)');
    }
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (state.error) {
      Alert.alert('Login Error', state.error);
      clearError();
    }
  }, [state.error]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
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
                    <Heading1 style={styles.title}>Rez Merchant</Heading1>
                    <BodyText style={styles.subtitle}>
                        Sign in to manage your store
                    </BodyText>
                </View>

                <Card style={styles.formContainer} variant="elevated">
                    <View style={styles.form}>
                        <FormInput
                            name="email"
                            control={control}
                            label="Email Address"
                            placeholder="your@email.com"
                            keyboardType="email-address"
                            autoComplete="email"
                            autoCapitalize="none"
                            icon="mail-outline"
                        />

                        <FormInput
                            name="password"
                            control={control}
                            label="Password"
                            placeholder="Enter your password"
                            secureTextEntry
                            autoComplete="current-password"
                            icon="lock-closed-outline"
                        />

                        <Button
                            title={state.isLoading ? 'Signing In...' : 'Sign In'}
                            onPress={handleSubmit(onSubmit)}
                            loading={state.isLoading}
                            fullWidth
                            style={styles.loginButton}
                        />

                        <View style={styles.footer}>
                            <BodyText>Don't have an account? </BodyText>
                            <Button
                                title="Sign Up"
                                variant="ghost"
                                onPress={() => router.push('/(auth)/register')}
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
    height: '50%',
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
    gap: Spacing.sm,
  },
  loginButton: {
      marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});

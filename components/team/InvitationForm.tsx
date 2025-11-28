import React, { useState } from 'react';
import { View, Text, TextInput, ViewStyle, Alert } from 'react-native';
import { InviteTeamMemberRequest, MerchantRole } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';
import { Button } from '../ui/DesignSystemComponents';
import { RoleSelector } from './RoleSelector';

interface InvitationFormProps {
  onSubmit: (data: InviteTeamMemberRequest) => void;
  isLoading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

interface FormData {
  email: string;
  name: string;
  role: Exclude<MerchantRole, 'owner'>;
}

interface FormErrors {
  email?: string;
  name?: string;
  role?: string;
}

export const InvitationForm: React.FC<InvitationFormProps> = ({
  onSubmit,
  isLoading = false,
  style,
  testID,
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    role: 'staff',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    email: false,
    name: false,
    role: false,
  });

  const styles = useThemedStyles((theme) => ({
    container: {
      gap: theme.spacing.base,
    } as ViewStyle,
    fieldContainer: {
      gap: theme.spacing.xs,
    } as ViewStyle,
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    requiredStar: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      minHeight: 48,
    } as ViewStyle,
    inputError: {
      borderColor: theme.colors.error,
    } as ViewStyle,
    inputNormal: {
      borderColor: theme.colors.border,
    } as ViewStyle,
    inputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    } as ViewStyle,
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    helperText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    submitButton: {
      marginTop: theme.spacing.base,
    } as ViewStyle,
  }));

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return undefined;
  };

  const validateRole = (role: string): string | undefined => {
    if (!role) {
      return 'Please select a role';
    }
    return undefined;
  };

  // Handle field change
  const handleChange = (field: keyof FormData, value: string | MerchantRole) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (touched[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  // Handle field blur
  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field on blur
    let error: string | undefined;
    if (field === 'email') {
      error = validateEmail(formData.email);
    } else if (field === 'name') {
      error = validateName(formData.name);
    } else if (field === 'role') {
      error = validateRole(formData.role);
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(formData.email),
      name: validateName(formData.name),
      role: validateRole(formData.role),
    };

    // Remove undefined errors
    Object.keys(newErrors).forEach((key) => {
      if (!newErrors[key as keyof FormErrors]) {
        delete newErrors[key as keyof FormErrors];
      }
    });

    setErrors(newErrors);
    setTouched({ email: true, name: true, role: true });

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    onSubmit({
      email: formData.email.trim(),
      name: formData.name.trim(),
      role: formData.role,
    });
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Name Field */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Name <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            errors.name && touched.name ? styles.inputError : styles.inputNormal,
          ]}
          value={formData.name}
          onChangeText={(value) => handleChange('name', value)}
          onBlur={() => handleBlur('name')}
          placeholder="Enter team member's full name"
          placeholderTextColor="#9CA3AF"
          editable={!isLoading}
          autoCapitalize="words"
          testID={`${testID}-name-input`}
        />
        {errors.name && touched.name && (
          <Text style={styles.errorText}>{errors.name}</Text>
        )}
      </View>

      {/* Email Field */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Email <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            errors.email && touched.email ? styles.inputError : styles.inputNormal,
          ]}
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          onBlur={() => handleBlur('email')}
          placeholder="Enter email address"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          testID={`${testID}-email-input`}
        />
        {errors.email && touched.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
        {!errors.email && (
          <Text style={styles.helperText}>
            An invitation will be sent to this email address
          </Text>
        )}
      </View>

      {/* Role Selector */}
      <RoleSelector
        value={formData.role}
        onChange={(role) => handleChange('role', role)}
        disabled={isLoading}
        error={errors.role && touched.role ? errors.role : undefined}
        testID={`${testID}-role-selector`}
      />

      {/* Submit Button */}
      <Button
        title={isLoading ? 'Sending Invitation...' : 'Send Invitation'}
        onPress={handleSubmit}
        variant="primary"
        size="large"
        fullWidth
        disabled={isLoading}
        loading={isLoading}
        style={styles.submitButton}
      />
    </View>
  );
};

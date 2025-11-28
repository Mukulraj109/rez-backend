/**
 * FormInput Component
 * Reusable controlled input component with validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  KeyboardTypeOptions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Controller, FieldValues, Path, Control, RegisterOptions } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Layout, Shadows } from '../../constants/DesignTokens';

export interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  rules?: RegisterOptions;
  description?: string;
  helperText?: string;
  disabled?: boolean;
  editable?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  showCharCount?: boolean;
  testID?: string;
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'tel' | 'postal-code' | 'street-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const FormInput = React.forwardRef<TextInput, FormInputProps<any>>(
  (
    {
      name,
      control,
      label,
      placeholder,
      keyboardType = 'default',
      secureTextEntry = false,
      multiline = false,
      numberOfLines = 1,
      maxLength,
      rules,
      description,
      helperText,
      disabled = false,
      editable = true,
      onBlur,
      onFocus,
      icon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      showCharCount = false,
      testID,
      autoComplete = 'off',
      autoCapitalize = 'sentences',
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    
    const focusProgress = useSharedValue(0);

    useEffect(() => {
        focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused]);

    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { value, onChange, onBlur: fieldOnBlur }, fieldState: { error } }) => {
            
            const animatedStyle = useAnimatedStyle(() => {
                const borderColor = interpolateColor(
                    focusProgress.value,
                    [0, 1],
                    [error ? Colors.error[500] : Colors.border.default, error ? Colors.error[500] : Colors.primary[500]]
                );
                
                return {
                    borderColor,
                    borderWidth: 1, // thinner border
                    backgroundColor: disabled ? Colors.gray[50] : Colors.background.primary,
                    // Add subtle shadow on focus
                    shadowColor: Colors.primary[500],
                    shadowOpacity: focusProgress.value * 0.1,
                    shadowRadius: 4,
                    elevation: focusProgress.value * 2,
                };
            });

            return (
          <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}

            {description && <Text style={styles.description}>{description}</Text>}

            <Animated.View
              style={[
                styles.inputWrapper,
                animatedStyle,
              ]}
            >
              {icon && (
                <Ionicons
                  name={icon as any}
                  size={20}
                  color={error ? Colors.error[500] : isFocused ? Colors.primary[500] : Colors.gray[400]}
                  style={styles.leftIcon}
                />
              )}

              <TextInput
                ref={ref}
                value={String(value || '')}
                onChangeText={onChange}
                onBlur={() => {
                  fieldOnBlur();
                  setIsFocused(false);
                  onBlur?.();
                }}
                onFocus={() => {
                  setIsFocused(true);
                  onFocus?.();
                }}
                placeholder={placeholder}
                placeholderTextColor={Colors.gray[400]}
                keyboardType={keyboardType}
                secureTextEntry={isSecure}
                multiline={multiline}
                numberOfLines={numberOfLines}
                maxLength={maxLength}
                editable={editable && !disabled}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                autoCorrect={false}
                spellCheck={false}
                testID={testID}
                style={[
                  styles.input,
                  inputStyle,
                  {
                    minHeight: multiline ? numberOfLines * 24 : Layout.input.height,
                    paddingLeft: icon ? 8 : 16,
                    paddingRight: rightIcon || (secureTextEntry && isSecure) ? 40 : 16,
                  },
                ]}
              />

              {secureTextEntry && (
                <TouchableOpacity
                  onPress={() => setIsSecure(!isSecure)}
                  style={styles.rightIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isSecure ? 'eye-off' : 'eye'}
                    size={20}
                    color={isFocused ? Colors.primary[500] : Colors.gray[400]}
                  />
                </TouchableOpacity>
              )}

              {rightIcon && !secureTextEntry && (
                <TouchableOpacity
                  onPress={onRightIconPress}
                  style={styles.rightIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={rightIcon as any}
                    size={20}
                    color={error ? Colors.error[500] : isFocused ? Colors.primary[500] : Colors.gray[400]}
                  />
                </TouchableOpacity>
              )}

              {showCharCount && maxLength && (
                <Text style={styles.charCount}>
                  {String(value || '').length}/{maxLength}
                </Text>
              )}
            </Animated.View>

            {helperText && !error && (
              <Text style={styles.helperText}>{helperText}</Text>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={Colors.error[500]}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}
          </View>
        )}}
      />
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl, // More rounded
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background.primary,
    overflow: 'hidden', // For ripple/border containment
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  leftIcon: {
    marginRight: 8,
    marginLeft: 8,
  },
  rightIcon: {
    padding: 8,
    marginLeft: 4,
  },
  charCount: {
    marginLeft: 8,
    marginRight: 8,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginLeft: 4,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error[500],
    flex: 1,
  },
});

export default FormInput;

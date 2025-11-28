import React, { useCallback } from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useHapticFeedback, HapticFeedbackType } from '../../utils/hapticFeedback';
import { useThemeColor } from '@/hooks/useThemeColor';

interface HapticButtonProps extends Omit<TouchableOpacityProps, 'onPress' | 'onLongPress'> {
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  hapticType?: HapticFeedbackType;
  hapticOnPress?: boolean;
  hapticOnLongPress?: boolean;
  hapticEnabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  title,
  children,
  variant = 'primary',
  size = 'medium',
  hapticType = 'medium',
  hapticOnPress = true,
  hapticOnLongPress = true,
  hapticEnabled = true,
  onPress,
  onLongPress,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const { trigger } = useHapticFeedback();
  
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 52,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: primaryColor,
      },
      secondary: {
        backgroundColor: borderColor + '20',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: primaryColor,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: '#EF4444',
      },
    };

    // Full width
    const widthStyles: ViewStyle = fullWidth ? { alignSelf: 'stretch' } : {};

    // Disabled styles
    const disabledStyles: ViewStyle = disabled || loading ? {
      opacity: 0.6,
    } : {};

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...widthStyles,
      ...disabledStyles,
    };
  };

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size styles
    const sizeStyles: Record<string, TextStyle> = {
      small: {
        fontSize: 14,
      },
      medium: {
        fontSize: 16,
      },
      large: {
        fontSize: 18,
      },
    };

    // Variant styles
    const variantStyles: Record<string, TextStyle> = {
      primary: {
        color: '#FFFFFF',
      },
      secondary: {
        color: textColor,
      },
      outline: {
        color: primaryColor,
      },
      ghost: {
        color: primaryColor,
      },
      danger: {
        color: '#FFFFFF',
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    if (hapticOnPress && hapticEnabled) {
      await trigger(hapticType);
    }

    if (onPress) {
      onPress();
    }
  }, [disabled, loading, hapticOnPress, hapticEnabled, trigger, hapticType, onPress]);

  const handleLongPress = useCallback(async () => {
    if (disabled || loading) return;

    if (hapticOnLongPress && hapticEnabled) {
      await trigger('heavy');
    }

    if (onLongPress) {
      onLongPress();
    }
  }, [disabled, loading, hapticOnLongPress, hapticEnabled, trigger, onLongPress]);

  const renderContent = () => {
    if (loading) {
      return (
        <ThemedText style={[getTextStyles(), textStyle]}>
          Loading...
        </ThemedText>
      );
    }

    if (children) {
      return children;
    }

    if (!title && !icon) {
      return null;
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <ThemedView style={{ marginRight: title ? 8 : 0 }}>
            {icon}
          </ThemedView>
        )}
        {title && (
          <ThemedText style={[getTextStyles(), textStyle]}>
            {title}
          </ThemedText>
        )}
        {icon && iconPosition === 'right' && (
          <ThemedView style={{ marginLeft: title ? 8 : 0 }}>
            {icon}
          </ThemedView>
        )}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

// Specialized button variants with pre-configured haptic feedback
export const ActionButton: React.FC<Omit<HapticButtonProps, 'hapticType'>> = (props) => (
  <HapticButton {...props} hapticType="medium" />
);

export const PrimaryButton: React.FC<Omit<HapticButtonProps, 'variant' | 'hapticType'>> = (props) => (
  <HapticButton {...props} variant="primary" hapticType="medium" />
);

export const SecondaryButton: React.FC<Omit<HapticButtonProps, 'variant' | 'hapticType'>> = (props) => (
  <HapticButton {...props} variant="secondary" hapticType="light" />
);

export const DangerButton: React.FC<Omit<HapticButtonProps, 'variant' | 'hapticType'>> = (props) => (
  <HapticButton {...props} variant="danger" hapticType="heavy" />
);

export const GhostButton: React.FC<Omit<HapticButtonProps, 'variant' | 'hapticType'>> = (props) => (
  <HapticButton {...props} variant="ghost" hapticType="light" />
);

// Specialized business logic buttons
interface ApprovalButtonProps extends Omit<HapticButtonProps, 'hapticType' | 'variant'> {
  onApprove: () => void;
}

export const ApprovalButton: React.FC<ApprovalButtonProps> = ({ onApprove, ...props }) => (
  <HapticButton
    {...props}
    variant="primary"
    hapticType="success"
    onPress={onApprove}
    title="Approve"
  />
);

interface RejectionButtonProps extends Omit<HapticButtonProps, 'hapticType' | 'variant'> {
  onReject: () => void;
}

export const RejectionButton: React.FC<RejectionButtonProps> = ({ onReject, ...props }) => (
  <HapticButton
    {...props}
    variant="danger"
    hapticType="error"
    onPress={onReject}
    title="Reject"
  />
);

interface SubmitButtonProps extends Omit<HapticButtonProps, 'hapticType'> {
  onSubmit: () => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ onSubmit, ...props }) => (
  <HapticButton
    {...props}
    hapticType="medium"
    onPress={onSubmit}
    title="Submit"
  />
);

interface RefreshButtonProps extends Omit<HapticButtonProps, 'hapticType' | 'variant'> {
  onRefresh: () => void;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onRefresh, ...props }) => (
  <HapticButton
    {...props}
    variant="ghost"
    hapticType="light"
    onPress={onRefresh}
    title="Refresh"
  />
);

// Button with custom haptic patterns
interface PatternButtonProps extends Omit<HapticButtonProps, 'hapticType' | 'hapticOnPress'> {
  pattern: 'success' | 'error' | 'loading';
  onPress: () => void;
}

export const PatternButton: React.FC<PatternButtonProps> = ({ pattern, onPress, ...props }) => {
  const { successPattern, errorPattern, loadingPattern } = useHapticFeedback();

  const handlePress = useCallback(async () => {
    switch (pattern) {
      case 'success':
        await successPattern();
        break;
      case 'error':
        await errorPattern();
        break;
      case 'loading':
        await loadingPattern();
        break;
    }
    onPress();
  }, [pattern, onPress, successPattern, errorPattern, loadingPattern]);

  return (
    <HapticButton
      {...props}
      hapticOnPress={false} // We handle haptics manually
      onPress={handlePress}
    />
  );
};
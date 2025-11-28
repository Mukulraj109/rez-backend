import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Switch, 
  ScrollView,
  ViewStyle, 
  TextStyle,
  AccessibilityInfo
} from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useAccessibility, AccessibilityHelpers, ScreenReaderUtils } from '../../utils/accessibility';
import { useThemeColor } from '@/hooks/useThemeColor';

// Accessible Button Component
interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  hint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  hint,
  style,
  textStyle,
  testID,
}) => {
  const { screenReaderEnabled, announce } = useAccessibility();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'tint');

  const accessibilityProps = AccessibilityHelpers.createButtonProps(
    title,
    hint,
    disabled
  );

  const handlePress = async () => {
    if (!disabled) {
      onPress();
      if (screenReaderEnabled) {
        await announce(`${title} activated`, 'polite');
      }
    }
  };

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      padding: size === 'small' ? 8 : size === 'large' ? 16 : 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 44, // Minimum touch target size
      minWidth: 44,
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: { backgroundColor: primaryColor },
      secondary: { backgroundColor: backgroundColor, borderWidth: 1, borderColor: primaryColor },
      danger: { backgroundColor: '#EF4444' },
    };

    const disabledStyle: ViewStyle = disabled ? { opacity: 0.6 } : {};

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...disabledStyle,
    };
  };

  const getTextStyles = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
      fontWeight: '600',
    };

    const variantTextStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: primaryColor },
      danger: { color: '#FFFFFF' },
    };

    return {
      ...baseStyle,
      ...variantTextStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      accessible={accessibilityProps.accessible}
      accessibilityRole={accessibilityProps.accessibilityRole}
      accessibilityLabel={accessibilityProps.accessibilityLabel}
      accessibilityHint={accessibilityProps.accessibilityHint}
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
    >
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={[getTextStyles(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

// Accessible Text Input Component
interface AccessibleTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  multiline?: boolean;
  maxLength?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  error,
  type = 'text',
  multiline = false,
  maxLength,
  style,
  textStyle,
  testID,
}) => {
  const { screenReaderEnabled, announce } = useAccessibility();
  const inputRef = useRef<TextInput>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const accessibilityProps = AccessibilityHelpers.createFormFieldProps(
    label,
    value,
    error,
    required,
    type
  );

  const handleFocus = async () => {
    if (screenReaderEnabled) {
      const message = `${label}${required ? ' required' : ''} text field${error ? `, error: ${error}` : ''}`;
      await announce(message, 'polite');
    }
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (error && text.length > 0) {
      // Clear error when user starts typing
    }
  };

  const inputContainerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: error ? '#EF4444' : borderColor,
    borderRadius: 8,
    padding: 12,
    backgroundColor,
    minHeight: 44,
  };

  const inputTextStyle: TextStyle = {
    fontSize: 16,
    color: textColor,
  };

  return (
    <View style={style}>
      <ThemedText style={{ marginBottom: 4, fontWeight: '500' }}>
        {label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </ThemedText>
      
      <View style={inputContainerStyle}>
        <TextInput
          ref={inputRef}
          accessible={accessibilityProps.accessible}
          accessibilityLabel={accessibilityProps.accessibilityLabel}
          accessibilityHint={accessibilityProps.accessibilityHint}
          style={[inputTextStyle, textStyle, multiline && { height: 100, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          secureTextEntry={type === 'password'}
          keyboardType={
            type === 'email' ? 'email-address' :
            type === 'number' ? 'numeric' : 'default'
          }
          multiline={multiline}
          maxLength={maxLength}
          testID={testID}
        />
      </View>
      
      {error && (
        <ThemedText 
          style={{ 
            color: '#EF4444', 
            fontSize: 12, 
            marginTop: 4 
          }}
          accessible={true}
          accessibilityLiveRegion="assertive"
        >
          {error}
        </ThemedText>
      )}
      
      {maxLength && (
        <ThemedText style={{ fontSize: 12, opacity: 0.6, marginTop: 2, textAlign: 'right' }}>
          {value.length}/{maxLength}
        </ThemedText>
      )}
    </View>
  );
};

// Accessible Switch Component
interface AccessibleSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleSwitch: React.FC<AccessibleSwitchProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
  description,
  style,
  testID,
}) => {
  const { screenReaderEnabled, announce } = useAccessibility();
  const tintColor = useThemeColor({}, 'tint');

  const accessibilityProps = AccessibilityHelpers.createSwitchProps(
    label,
    value,
    disabled
  );

  const handleValueChange = async (newValue: boolean) => {
    onValueChange(newValue);
    if (screenReaderEnabled) {
      await announce(`${label} ${newValue ? 'enabled' : 'disabled'}`, 'polite');
    }
  };

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, style]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: '500' }}>
          {label}
        </ThemedText>
        {description && (
          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 2 }}>
            {description}
          </ThemedText>
        )}
      </View>
      
      <Switch
        accessible={accessibilityProps.accessible}
        accessibilityLabel={accessibilityProps.accessibilityLabel}
        accessibilityHint={accessibilityProps.accessibilityHint}
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        trackColor={{ false: '#E5E7EB', true: tintColor + '60' }}
        thumbColor={value ? tintColor : '#FFFFFF'}
        testID={testID}
      />
    </View>
  );
};

// Accessible List Component
interface AccessibleListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  title: string;
  emptyMessage?: string;
  loading?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function AccessibleList<T>({
  data,
  renderItem,
  title,
  emptyMessage = 'No items found',
  loading = false,
  onRefresh,
  style,
  testID,
}: AccessibleListProps<T>) {
  const { screenReaderEnabled, announce } = useAccessibility();

  const listAccessibilityProps = AccessibilityHelpers.createListProps(title, data.length);

  useEffect(() => {
    if (screenReaderEnabled) {
      announce(`${title} loaded with ${data.length} items`, 'polite');
    }
  }, [data.length, screenReaderEnabled, announce, title]);

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
      if (screenReaderEnabled) {
        await announce(`Refreshing ${title}`, 'polite');
      }
    }
  };

  if (loading) {
    return (
      <View style={[{ padding: 16, alignItems: 'center' }, style]}>
        <ThemedText accessible={true} accessibilityLiveRegion="polite">
          Loading {title}...
        </ThemedText>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={[{ padding: 16, alignItems: 'center' }, style]}>
        <ThemedText 
          style={{ fontSize: 16, opacity: 0.7 }}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          {emptyMessage}
        </ThemedText>
        {onRefresh && (
          <AccessibleButton
            title="Refresh"
            onPress={handleRefresh}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      accessible={listAccessibilityProps.accessible}
      accessibilityLabel={listAccessibilityProps.accessibilityLabel}
      style={style}
      testID={testID}
      refreshControl={onRefresh ? {
        refreshing: loading,
        onRefresh: handleRefresh,
        accessibilityLabel: `Pull to refresh ${title}`,
      } as any : undefined}
    >
      {data.map((item, index) => (
        <View
          key={index}
          accessible={true}
          accessibilityLabel={`Item ${index + 1} of ${data.length}`}
        >
          {renderItem(item, index)}
        </View>
      ))}
    </ScrollView>
  );
}

// Accessible Modal Component
interface AccessibleModalProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  visible,
  title,
  children,
  onClose,
  dismissible = true,
  style,
  testID,
}) => {
  const { screenReaderEnabled, announce } = useAccessibility();
  const backgroundColor = useThemeColor({}, 'background');

  const modalAccessibilityProps = AccessibilityHelpers.createModalProps(title, dismissible);

  useEffect(() => {
    if (visible && screenReaderEnabled) {
      // Announce modal opening
      const timer = setTimeout(async () => {
        await announce(`${title} dialog opened`, 'polite');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [visible, screenReaderEnabled, announce, title]);

  const handleClose = async () => {
    if (dismissible) {
      onClose();
      if (screenReaderEnabled) {
        await announce(`${title} dialog closed`, 'polite');
      }
    }
  };

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <View
        accessible={modalAccessibilityProps.accessible}
        accessibilityRole={modalAccessibilityProps.accessibilityRole}
        accessibilityLabel={modalAccessibilityProps.accessibilityLabel}
        accessibilityHint={modalAccessibilityProps.accessibilityHint}
        style={[
          {
            backgroundColor,
            borderRadius: 12,
            padding: 20,
            margin: 20,
            maxWidth: '90%',
            maxHeight: '80%',
            minWidth: 280,
          },
          style,
        ]}
        testID={testID}
      >
        {/* Modal Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <ThemedText style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>
            {title}
          </ThemedText>
          
          {dismissible && (
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              accessibilityHint="Double tap to close"
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 12,
              }}
            >
              <ThemedText style={{ fontSize: 20, fontWeight: 'bold' }}>×</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Modal Content */}
        <ScrollView style={{ flex: 1 }}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
};

// Accessible Card Component
interface AccessibleCardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  title,
  subtitle,
  children,
  onPress,
  disabled = false,
  style,
  testID,
}) => {
  const { screenReaderEnabled, announce } = useAccessibility();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const cardAccessibilityProps = AccessibilityHelpers.createCardProps(
    title,
    subtitle,
    !!onPress
  );

  const handlePress = async () => {
    if (onPress && !disabled) {
      onPress();
      if (screenReaderEnabled) {
        await announce(`${title} selected`, 'polite');
      }
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    opacity: disabled ? 0.6 : 1,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        accessible={cardAccessibilityProps.accessible}
        accessibilityRole={cardAccessibilityProps.accessibilityRole}
        accessibilityLabel={cardAccessibilityProps.accessibilityLabel}
        accessibilityHint={cardAccessibilityProps.accessibilityHint}
        style={[cardStyle, style]}
        onPress={handlePress}
        disabled={disabled}
        testID={testID}
    >
        <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
          {title}
        </ThemedText>
        
        {subtitle && (
          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>
            {subtitle}
          </ThemedText>
        )}
        
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessible={cardAccessibilityProps.accessible}
      accessibilityRole={cardAccessibilityProps.accessibilityRole}
      accessibilityLabel={cardAccessibilityProps.accessibilityLabel}
      style={[cardStyle, style]}
      testID={testID}
    >
      <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
        {title}
      </ThemedText>
      
      {subtitle && (
        <ThemedText style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>
          {subtitle}
        </ThemedText>
      )}
      
      {children}
    </View>
  );
};

// Accessible Progress Indicator
interface AccessibleProgressProps {
  label: string;
  current: number;
  total: number;
  showPercentage?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  label,
  current,
  total,
  showPercentage = true,
  style,
  testID,
}) => {
  const { announce, screenReaderEnabled } = useAccessibility();
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const percentage = Math.round((current / total) * 100);
  const progressAccessibilityProps = AccessibilityHelpers.createProgressProps(label, current, total);

  useEffect(() => {
    if (screenReaderEnabled) {
      announce(`${label} ${percentage}% complete`, 'polite');
    }
  }, [percentage, label, screenReaderEnabled, announce]);

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <ThemedText style={{ fontSize: 14, fontWeight: '500' }}>{label}</ThemedText>
        {showPercentage && (
          <ThemedText style={{ fontSize: 14 }}>{percentage}%</ThemedText>
        )}
      </View>
      
      <View
        accessible={progressAccessibilityProps.accessible}
        accessibilityRole={progressAccessibilityProps.accessibilityRole}
        accessibilityLabel={progressAccessibilityProps.accessibilityLabel}
        accessibilityValue={progressAccessibilityProps.accessibilityValue}
        style={{
          height: 8,
          backgroundColor: backgroundColor,
          borderRadius: 4,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
        testID={testID}
      >
        <View
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: primaryColor,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
};
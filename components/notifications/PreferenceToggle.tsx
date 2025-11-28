import React, { useState } from 'react';
import { View, Text, Switch, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../ui/ThemeProvider';

interface PreferenceToggleProps {
  title: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<void> | void;
  disabled?: boolean;
  isPremium?: boolean;
  testID?: string;
}

export const PreferenceToggle: React.FC<PreferenceToggleProps> = ({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
  isPremium = false,
  testID,
}) => {
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles((theme) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      opacity: disabled ? 0.5 : 1,
    } as ViewStyle,
    content: {
      flex: 1,
      marginRight: theme.spacing.sm,
      gap: 4,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    title: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: '#FEF3C7',
      gap: 2,
    } as ViewStyle,
    premiumText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: '#D97706',
      textTransform: 'uppercase' as const,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,
  }));

  const handleToggle = async (value: boolean) => {
    if (disabled) return;

    setLoading(true);
    try {
      await onChange(value);
    } catch (error) {
      console.error('Error toggling preference:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={10} color="#D97706" />
              <Text style={styles.premiumText}>Pro</Text>
            </View>
          )}
        </View>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>

      <View style={styles.toggleContainer}>
        {loading && <ActivityIndicator size="small" color="#7C3AED" />}
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={disabled || loading}
          trackColor={{ false: '#E5E7EB', true: '#A855F7' }}
          thumbColor={enabled ? '#7C3AED' : '#F3F4F6'}
          testID={`${testID}-switch`}
        />
      </View>
    </View>
  );
};

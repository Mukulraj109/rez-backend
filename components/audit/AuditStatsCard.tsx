import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../ui/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

interface AuditStatsCardProps {
  title: string;
  value: string | number;
  trend?: number; // Percentage change, positive or negative
  icon: IconName;
  color: string;
  testID?: string;
}

export const AuditStatsCard: React.FC<AuditStatsCardProps> = ({
  title,
  value,
  trend,
  icon,
  color,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      minHeight: 120,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    } as ViewStyle,
    titleContainer: {
      flex: 1,
    } as ViewStyle,
    title: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    valueContainer: {
      marginBottom: theme.spacing.xs,
    } as ViewStyle,
    value: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.sm,
      gap: 2,
    } as ViewStyle,
    trendPositive: {
      backgroundColor: '#D1FAE515',
    } as ViewStyle,
    trendNegative: {
      backgroundColor: '#FEE2E215',
    } as ViewStyle,
    trendText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semiBold,
    },
    trendPositiveText: {
      color: '#059669',
    },
    trendNegativeText: {
      color: '#DC2626',
    },
    trendLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
  }));

  // Format value for display
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      // Format large numbers
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const isPositiveTrend = trend !== undefined && trend >= 0;
  const hasTrend = trend !== undefined && trend !== 0;

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${color}15`,
            },
          ]}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.value}>{formatValue(value)}</Text>
      </View>

      {hasTrend && (
        <View style={styles.trendContainer}>
          <View
            style={[
              styles.trendBadge,
              isPositiveTrend ? styles.trendPositive : styles.trendNegative,
            ]}
          >
            <Ionicons
              name={isPositiveTrend ? 'trending-up' : 'trending-down'}
              size={12}
              color={isPositiveTrend ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.trendText,
                isPositiveTrend
                  ? styles.trendPositiveText
                  : styles.trendNegativeText,
              ]}
            >
              {Math.abs(trend!).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.trendLabel}>vs previous period</Text>
        </View>
      )}
    </View>
  );
};

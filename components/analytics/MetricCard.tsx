import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { TrendIndicator } from './TrendIndicator';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  loading?: boolean;
  onPress?: () => void;
  subtitle?: string;
  formatValue?: (value: string | number) => string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  iconColor,
  loading = false,
  onPress,
  subtitle,
  formatValue,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const displayValue = formatValue ? formatValue(value) : value.toString();

  // Render loading skeleton
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.skeletonIcon,
              {
                backgroundColor: theme.borderLight,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonTrend,
              {
                backgroundColor: theme.borderLight,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.skeletonTitle,
            {
              backgroundColor: theme.borderLight,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonValue,
            {
              backgroundColor: theme.borderLight,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: (iconColor || theme.primary) + '20',
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || theme.primary}
            />
          </View>
        )}

        {trend && change !== undefined && (
          <TrendIndicator trend={trend} value={change} size="small" />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Value */}
      <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
        {displayValue}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* Click indicator */}
      {onPress && (
        <View style={styles.clickIndicator}>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
  },
  clickIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  // Loading skeleton styles
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  skeletonTrend: {
    width: 60,
    height: 24,
    borderRadius: 6,
  },
  skeletonTitle: {
    width: '70%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonValue: {
    width: '90%',
    height: 28,
    borderRadius: 4,
    marginBottom: 4,
  },
});

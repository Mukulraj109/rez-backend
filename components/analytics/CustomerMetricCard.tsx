import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { TrendIndicator } from './TrendIndicator';

type MetricType = 'clv' | 'retention' | 'churn' | 'satisfaction' | 'engagement';

interface CustomerMetricCardProps {
  type: MetricType;
  value: number;
  previousValue?: number;
  percentageChange?: number;
  trend?: 'up' | 'down' | 'flat';
  currency?: string;
  showGauge?: boolean;
  maxValue?: number;
  onPress?: () => void;
}

export const CustomerMetricCard: React.FC<CustomerMetricCardProps> = ({
  type,
  value,
  previousValue,
  percentageChange,
  trend,
  currency = '$',
  showGauge = true,
  maxValue = 100,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Get metric configuration
  const getMetricConfig = () => {
    switch (type) {
      case 'clv':
        return {
          title: 'Customer Lifetime Value',
          icon: 'wallet' as const,
          color: theme.primary,
          format: (val: number) => `${currency}${val.toLocaleString()}`,
          description: 'Average revenue per customer',
        };
      case 'retention':
        return {
          title: 'Retention Rate',
          icon: 'repeat' as const,
          color: theme.secondary,
          format: (val: number) => `${val.toFixed(1)}%`,
          description: 'Customers returning within 30 days',
        };
      case 'churn':
        return {
          title: 'Churn Rate',
          icon: 'exit-outline' as const,
          color: theme.warning,
          format: (val: number) => `${val.toFixed(1)}%`,
          description: 'Customers lost in the period',
          invertTrend: true, // Lower is better
        };
      case 'satisfaction':
        return {
          title: 'Customer Satisfaction',
          icon: 'happy-outline' as const,
          color: theme.info,
          format: (val: number) => `${val.toFixed(1)}/5`,
          description: 'Average customer rating',
        };
      case 'engagement':
        return {
          title: 'Engagement Score',
          icon: 'flash' as const,
          color: theme.tertiary,
          format: (val: number) => `${val.toFixed(0)}`,
          description: 'Customer activity level',
        };
    }
  };

  const config = getMetricConfig();

  // Calculate gauge percentage
  const gaugePercentage = type === 'clv'
    ? Math.min(100, (value / maxValue) * 100)
    : type === 'satisfaction'
    ? (value / 5) * 100
    : value;

  // Determine color based on value and type
  const getValueColor = () => {
    if (type === 'churn') {
      // For churn, lower is better
      if (value > 10) return theme.danger;
      if (value > 5) return theme.warning;
      return theme.secondary;
    } else {
      // For other metrics, higher is better
      if (type === 'retention' || type === 'satisfaction' || type === 'engagement') {
        if (value < 50) return theme.danger;
        if (value < 75) return theme.warning;
        return theme.secondary;
      }
      return config.color;
    }
  };

  const valueColor = getValueColor();

  // Calculate if trend is positive (considering inverted metrics)
  const isPositiveTrend = () => {
    if (!trend) return null;
    if (config.invertTrend) {
      return trend === 'down'; // For churn, down is good
    }
    return trend === 'up'; // For others, up is good
  };

  const isTrendPositive = isPositiveTrend();

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
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: config.color + '20',
            },
          ]}
        >
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>

        {trend && percentageChange !== undefined && (
          <TrendIndicator
            trend={trend}
            value={percentageChange}
            isPositive={isTrendPositive}
          />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textSecondary }]}>{config.title}</Text>

      {/* Value */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: theme.text }]}>{config.format(value)}</Text>

        {previousValue !== undefined && (
          <Text style={[styles.previousValue, { color: theme.textMuted }]}>
            from {config.format(previousValue)}
          </Text>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {config.description}
      </Text>

      {/* Gauge/Progress Bar */}
      {showGauge && (
        <View style={styles.gaugeContainer}>
          <View
            style={[
              styles.gaugeTrack,
              {
                backgroundColor: theme.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${Math.min(100, Math.max(0, gaugePercentage))}%`,
                  backgroundColor: valueColor,
                },
              ]}
            />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeLabel, { color: theme.textMuted }]}>0</Text>
            <Text style={[styles.gaugeLabel, { color: theme.textMuted }]}>
              {type === 'satisfaction' ? '5' : '100'}
            </Text>
          </View>
        </View>
      )}

      {/* Additional Metrics */}
      {type === 'clv' && previousValue !== undefined && (
        <View style={styles.additionalMetrics}>
          <View style={styles.additionalMetric}>
            <Text style={[styles.additionalLabel, { color: theme.textSecondary }]}>
              Growth
            </Text>
            <Text
              style={[
                styles.additionalValue,
                { color: value > previousValue ? theme.secondary : theme.danger },
              ]}
            >
              {currency}
              {(value - previousValue).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* View Details Link */}
      {onPress && (
        <View style={styles.footer}>
          <Text style={[styles.viewDetails, { color: config.color }]}>
            View Details
          </Text>
          <Ionicons name="chevron-forward" size={16} color={config.color} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    marginBottom: 8,
  },
  valueContainer: {
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previousValue: {
    fontSize: 12,
  },
  description: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  gaugeContainer: {
    marginBottom: 12,
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeLabel: {
    fontSize: 10,
  },
  additionalMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  additionalMetric: {
    flex: 1,
  },
  additionalLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  additionalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '600',
  },
});

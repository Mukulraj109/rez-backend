import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'flat';
  value?: number;
  isPositive?: boolean | null;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  showIcon?: boolean;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  value,
  isPositive = null,
  size = 'medium',
  showPercentage = true,
  showIcon = true,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Determine color based on trend and whether it's positive
  const getColor = () => {
    if (trend === 'flat') return theme.textMuted;

    // If isPositive is explicitly set, use it
    if (isPositive !== null) {
      return isPositive ? theme.secondary : theme.danger;
    }

    // Default: up is green, down is red
    return trend === 'up' ? theme.secondary : theme.danger;
  };

  // Get icon based on trend
  const getIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up' as const;
      case 'down':
        return 'trending-down' as const;
      case 'flat':
        return 'remove' as const;
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 14,
          fontSize: 11,
          padding: 4,
          gap: 3,
        };
      case 'medium':
        return {
          iconSize: 16,
          fontSize: 13,
          padding: 6,
          gap: 4,
        };
      case 'large':
        return {
          iconSize: 20,
          fontSize: 15,
          padding: 8,
          gap: 5,
        };
    }
  };

  const color = getColor();
  const icon = getIcon();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: color + '15',
          padding: sizeStyles.padding,
          gap: sizeStyles.gap,
        },
      ]}
    >
      {showIcon && <Ionicons name={icon} size={sizeStyles.iconSize} color={color} />}
      {value !== undefined && showPercentage && (
        <Text
          style={[
            styles.text,
            {
              color,
              fontSize: sizeStyles.fontSize,
            },
          ]}
        >
          {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
          {Math.abs(value).toFixed(1)}%
        </Text>
      )}
      {value !== undefined && !showPercentage && (
        <Text
          style={[
            styles.text,
            {
              color,
              fontSize: sizeStyles.fontSize,
            },
          ]}
        >
          {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
          {Math.abs(value).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
  },
  text: {
    fontWeight: '600',
  },
});

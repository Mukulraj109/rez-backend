import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ViewStyle } from 'react-native';
import { useThemedStyles } from '../ui/ThemeProvider';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  position = 'top-right',
  size = 'medium',
  testID,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  const styles = useThemedStyles((theme) => {
    const sizeConfig = {
      small: {
        minWidth: 16,
        height: 16,
        fontSize: theme.typography.fontSize.xs,
        borderWidth: 1,
      },
      medium: {
        minWidth: 20,
        height: 20,
        fontSize: theme.typography.fontSize.sm,
        borderWidth: 2,
      },
      large: {
        minWidth: 24,
        height: 24,
        fontSize: theme.typography.fontSize.base,
        borderWidth: 2,
      },
    };

    const config = sizeConfig[size];
    const halfHeight = config.height / 2;

    // Position styles
    const positionStyles: Record<typeof position, ViewStyle> = {
      'top-right': {
        position: 'absolute',
        top: -halfHeight / 2,
        right: -halfHeight / 2,
      },
      'top-left': {
        position: 'absolute',
        top: -halfHeight / 2,
        left: -halfHeight / 2,
      },
      'bottom-right': {
        position: 'absolute',
        bottom: -halfHeight / 2,
        right: -halfHeight / 2,
      },
      'bottom-left': {
        position: 'absolute',
        bottom: -halfHeight / 2,
        left: -halfHeight / 2,
      },
    };

    return {
      badge: {
        ...positionStyles[position],
        minWidth: config.minWidth,
        height: config.height,
        borderRadius: config.height / 2,
        backgroundColor: theme.colors.error || '#EF4444',
        borderWidth: config.borderWidth,
        borderColor: theme.colors.surface || '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
      } as ViewStyle,
      text: {
        fontSize: config.fontSize,
        fontWeight: theme.typography.fontWeight.bold,
        color: '#FFFFFF',
        textAlign: 'center' as const,
      },
    };
  });

  // Pulse animation when count increases
  useEffect(() => {
    if (count > prevCount.current) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, pulseAnim]);

  // Don't render if count is 0
  if (count === 0) {
    return null;
  }

  // Format count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
      testID={testID}
    >
      <Text style={styles.text}>{displayCount}</Text>
    </Animated.View>
  );
};

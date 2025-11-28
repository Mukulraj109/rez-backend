import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FadeInAnimation, SlideInAnimation, ScaleInAnimation } from '../animations/FadeInAnimation';

interface DashboardMetric {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
}

interface AnimatedDashboardCardProps {
  metric: DashboardMetric;
  index: number;
  style?: any;
  onPress?: () => void;
}

export const AnimatedDashboardCard: React.FC<AnimatedDashboardCardProps> = ({
  metric,
  index,
  style,
  onPress
}) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;
  
  const cardColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  
  const getChangeColor = () => {
    switch (metric.changeType) {
      case 'increase':
        return '#10B981'; // Green
      case 'decrease':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  useEffect(() => {
    // Animate number counting effect
    if (typeof metric.value === 'number') {
      Animated.timing(numberAnim, {
        toValue: metric.value,
        duration: 1500,
        delay: index * 100,
        useNativeDriver: false,
      }).start();
    }

    // Animate progress bar if there's a change
    if (metric.change !== undefined) {
      Animated.timing(progressAnim, {
        toValue: Math.min(Math.abs(metric.change) / 100, 1),
        duration: 1000,
        delay: index * 100 + 500,
        useNativeDriver: false,
      }).start();
    }
  }, [metric.value, metric.change, index, numberAnim, progressAnim]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const animatedValue = numberAnim.interpolate({
    inputRange: [0, typeof metric.value === 'number' ? metric.value : 1],
    outputRange: [0, typeof metric.value === 'number' ? metric.value : 1],
    extrapolate: 'clamp',
  });

  return (
    <SlideInAnimation
      direction="up"
      delay={index * 100}
      distance={30}
      style={StyleSheet.flatten([styles.container, style])}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: cardColor, transform: [{ scale: pressScale }] }
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
      >
        <TouchableOpacity style={styles.cardContent} onPress={handlePress} activeOpacity={1}>
          {/* Header with icon and title */}
          <View style={styles.header}>
            {metric.icon && (
              <ScaleInAnimation delay={index * 100 + 200}>
                <View style={[styles.iconContainer, { backgroundColor: tintColor + '20' }]}>
                  {metric.icon}
                </View>
              </ScaleInAnimation>
            )}
            <FadeInAnimation delay={index * 100 + 300}>
              <ThemedText style={styles.title}>{metric.title}</ThemedText>
            </FadeInAnimation>
          </View>

          {/* Main value */}
          <FadeInAnimation delay={index * 100 + 400}>
            <View style={styles.valueContainer}>
              {typeof metric.value === 'number' ? (
                <Animated.Text style={[styles.value, { color: textColor }]}>
                  {animatedValue}
                </Animated.Text>
              ) : (
                <ThemedText style={styles.value}>{metric.value}</ThemedText>
              )}
            </View>
          </FadeInAnimation>

          {/* Change indicator */}
          {metric.change !== undefined && (
            <FadeInAnimation delay={index * 100 + 600}>
              <View style={styles.changeContainer}>
                <View style={styles.changeTextContainer}>
                  <ThemedText
                    style={[
                      styles.changeText,
                      { color: getChangeColor() }
                    ]}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </ThemedText>
                  <ThemedText style={styles.changeLabel}>vs last month</ThemedText>
                </View>
                
                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={[styles.progressTrack, { backgroundColor: getChangeColor() + '20' }]}>
                    <Animated.View
                      style={[
                        styles.progressBar,
                        {
                          backgroundColor: getChangeColor(),
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </FadeInAnimation>
          )}

          {/* Subtitle */}
          {metric.subtitle && (
            <FadeInAnimation delay={index * 100 + 700}>
              <ThemedText style={styles.subtitle}>{metric.subtitle}</ThemedText>
            </FadeInAnimation>
          )}

          {/* Pulse effect for active cards */}
          <PulseEffect delay={index * 100 + 1000} />
        </TouchableOpacity>
      </Animated.View>
    </SlideInAnimation>
  );
};

interface PulseEffectProps {
  delay?: number;
}

const PulseEffect: React.FC<PulseEffectProps> = ({ delay = 0 }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse, { iterations: 3 }).start();
  }, [delay, pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.1, 0],
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: tintColor,
          borderRadius: 12,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

interface DashboardGridProps {
  metrics: DashboardMetric[];
  onCardPress?: (metric: DashboardMetric, index: number) => void;
}

export const AnimatedDashboardGrid: React.FC<DashboardGridProps> = ({
  metrics,
  onCardPress
}) => {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 16px margins on each side, 16px gap

  return (
    <View style={styles.grid}>
      {metrics.map((metric, index) => (
        <AnimatedDashboardCard
          key={`${metric.title}-${index}`}
          metric={metric}
          index={index}
          style={[styles.gridCard, { width: cardWidth }]}
          onPress={() => onCardPress?.(metric, index)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    flex: 1,
  },
  valueContainer: {
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  changeContainer: {
    marginBottom: 8,
  },
  changeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  changeLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridCard: {
    marginBottom: 16,
  },
});
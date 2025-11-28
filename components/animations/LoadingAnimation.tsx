import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const PulseLoadingAnimation: React.FC<LoadingAnimationProps> = ({
  size = 'medium',
  color,
  style
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const themeColor = useThemeColor({}, 'tint');
  const animationColor = color || themeColor;

  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60
  };

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: sizeMap[size] / 2,
          backgroundColor: animationColor,
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    />
  );
};

export const SpinLoadingAnimation: React.FC<LoadingAnimationProps> = ({
  size = 'medium',
  color,
  style
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const themeColor = useThemeColor({}, 'tint');
  const animationColor = color || themeColor;

  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60
  };

  useEffect(() => {
    const spin = Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });

    Animated.loop(spin).start();

    return () => spin.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: sizeMap[size],
          height: sizeMap[size],
          borderWidth: 3,
          borderColor: 'transparent',
          borderTopColor: animationColor,
          borderRadius: sizeMap[size] / 2,
          transform: [{ rotate }],
        },
        style,
      ]}
    />
  );
};

interface DotsLoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const DotsLoadingAnimation: React.FC<DotsLoadingAnimationProps> = ({
  size = 'medium',
  color,
  style
}) => {
  const themeColor = useThemeColor({}, 'tint');
  const animationColor = color || themeColor;

  const sizeMap = {
    small: 6,
    medium: 10,
    large: 14
  };

  const dotSize = sizeMap[size];
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
    };

    const animations = dots.map((dot, index) => animateDot(dot, index * 200));
    
    const sequence = Animated.sequence(animations);
    Animated.loop(sequence).start();

    return () => sequence.stop();
  }, [dots]);

  return (
    <View style={[styles.dotsContainer, style]}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: animationColor,
              marginHorizontal: dotSize / 4,
              opacity: dot,
            },
          ]}
        />
      ))}
    </View>
  );
};

interface SkeletonLoadingProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const backgroundColor = useThemeColor({}, 'background');
  const skeletonColor = useThemeColor({}, 'tabIconDefault');

  useEffect(() => {
    const shimmer = Animated.timing(shimmerAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    });

    Animated.loop(shimmer).start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius,
          backgroundColor: skeletonColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: backgroundColor,
            opacity: 0.5,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  type?: 'pulse' | 'spin' | 'dots';
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  type = 'spin',
  children
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) {
    return null;
  }

  const renderLoadingAnimation = () => {
    switch (type) {
      case 'pulse':
        return <PulseLoadingAnimation size="large" />;
      case 'dots':
        return <DotsLoadingAnimation size="large" />;
      case 'spin':
      default:
        return <SpinLoadingAnimation size="large" />;
    }
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <ThemedView style={styles.loadingContainer}>
        {renderLoadingAnimation()}
        {message && (
          <ThemedText style={styles.loadingMessage}>{message}</ThemedText>
        )}
        {children}
      </ThemedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  loadingMessage: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
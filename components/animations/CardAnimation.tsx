import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle, TouchableOpacity } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ThemedView } from '../ThemedView';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  enableSwipe?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  animateOnMount?: boolean;
  mountAnimation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  mountDelay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  enableSwipe = false,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  animateOnMount = true,
  mountAnimation = 'fadeIn',
  mountDelay = 0
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;

  useEffect(() => {
    if (animateOnMount) {
      const animations = [];
      
      switch (mountAnimation) {
        case 'fadeIn':
          animations.push(
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              delay: mountDelay,
              useNativeDriver: true,
            })
          );
          break;
        case 'slideUp':
          translateY.setValue(50);
          animations.push(
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                delay: mountDelay,
                useNativeDriver: true,
              }),
              Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: mountDelay,
                useNativeDriver: true,
              }),
            ])
          );
          break;
        case 'scaleIn':
          scale.setValue(0.8);
          animations.push(
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                delay: mountDelay,
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 1,
                duration: 400,
                delay: mountDelay,
                useNativeDriver: true,
              }),
            ])
          );
          break;
      }

      if (animations.length > 0) {
        Animated.sequence(animations).start();
      }
    }
  }, [animateOnMount, mountAnimation, mountDelay, opacity, translateY, scale]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (!enableSwipe) return;

    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (Math.abs(translationX) > swipeThreshold) {
        // Complete the swipe
        Animated.timing(translateX, {
          toValue: translationX > 0 ? 300 : -300,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (translationX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (translationX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
          // Reset position
          translateX.setValue(0);
        });
      } else {
        // Snap back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
    opacity,
  };

  if (enableSwipe) {
    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[style, animatedStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  }

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  pressAnimation?: 'scale' | 'opacity' | 'both';
  pressScale?: number;
  pressOpacity?: number;
  hapticFeedback?: boolean;
}

export const PressableCard: React.FC<PressableCardProps> = ({
  children,
  onPress,
  style,
  pressAnimation = 'scale',
  pressScale = 0.95,
  pressOpacity = 0.7,
  hapticFeedback = true
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animatePress = (pressed: boolean) => {
    const animations = [];

    if (pressAnimation === 'scale' || pressAnimation === 'both') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: pressed ? pressScale : 1,
          duration: 100,
          useNativeDriver: true,
        })
      );
    }

    if (pressAnimation === 'opacity' || pressAnimation === 'both') {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: pressed ? pressOpacity : 1,
          duration: 100,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  };

  const handlePressIn = () => {
    if (hapticFeedback) {
      // Haptic feedback would be implemented here
      // For now, we'll just trigger the animation
    }
    animatePress(true);
  };

  const handlePressOut = () => {
    animatePress(false);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <ThemedView style={{ flex: 1 }}>
          {children}
        </ThemedView>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  style?: ViewStyle;
  duration?: number;
}

export const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  isFlipped = false,
  onFlip,
  style,
  duration = 600
}) => {
  const flipAnim = useRef(new Animated.Value(isFlipped ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, duration, flipAnim]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handlePress = () => {
    if (onFlip) {
      onFlip(!isFlipped);
    }
  };

  return (
    <TouchableOpacity style={style} onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          { position: 'absolute', width: '100%', height: '100%' },
          {
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
          },
        ]}
      >
        {frontContent}
      </Animated.View>
      <Animated.View
        style={[
          { width: '100%', height: '100%' },
          {
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
          },
        ]}
      >
        {backContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface ExpandableCardProps {
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  style?: ViewStyle;
  expandedHeight?: number;
  duration?: number;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  children,
  expandedContent,
  isExpanded = false,
  onToggle,
  style,
  expandedHeight = 200,
  duration = 300
}) => {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: isExpanded ? expandedHeight : 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded, expandedHeight, duration, heightAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isExpanded);
    }
  };

  return (
    <ThemedView style={style}>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
        {children}
        <Animated.View
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: [{ rotate }, { translateY: -12 }],
          }}
        >
          {/* This would be a chevron icon */}
          <ThemedView style={{
            width: 24,
            height: 24,
            backgroundColor: 'transparent',
          }} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View
        style={{
          height: heightAnim,
          overflow: 'hidden',
        }}
      >
        {expandedContent}
      </Animated.View>
    </ThemedView>
  );
};
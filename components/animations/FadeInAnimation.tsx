import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInAnimationProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  onComplete?: () => void;
}

export const FadeInAnimation: React.FC<FadeInAnimationProps> = ({
  children,
  duration = 300,
  delay = 0,
  style,
  onComplete
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    });

    animation.start(onComplete);

    return () => animation.stop();
  }, [fadeAnim, duration, delay, onComplete]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

interface SlideInAnimationProps {
  children: React.ReactNode;
  direction: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
  onComplete?: () => void;
}

export const SlideInAnimation: React.FC<SlideInAnimationProps> = ({
  children,
  direction,
  duration = 400,
  delay = 0,
  distance = 50,
  style,
  onComplete
}) => {
  const slideAnim = useRef(new Animated.ValueXY()).current;

  const getInitialOffset = () => {
    switch (direction) {
      case 'left':
        return { x: -distance, y: 0 };
      case 'right':
        return { x: distance, y: 0 };
      case 'up':
        return { x: 0, y: -distance };
      case 'down':
        return { x: 0, y: distance };
      default:
        return { x: 0, y: 0 };
    }
  };

  useEffect(() => {
    slideAnim.setValue(getInitialOffset());

    const animation = Animated.timing(slideAnim, {
      toValue: { x: 0, y: 0 },
      duration,
      delay,
      useNativeDriver: true,
    });

    animation.start(onComplete);

    return () => animation.stop();
  }, [slideAnim, direction, distance, duration, delay, onComplete]);

  return (
    <Animated.View
      style={[
        {
          transform: slideAnim.getTranslateTransform(),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface ScaleInAnimationProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
  onComplete?: () => void;
}

export const ScaleInAnimation: React.FC<ScaleInAnimationProps> = ({
  children,
  duration = 300,
  delay = 0,
  initialScale = 0.8,
  style,
  onComplete
}) => {
  const scaleAnim = useRef(new Animated.Value(initialScale)).current;

  useEffect(() => {
    const animation = Animated.timing(scaleAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    });

    animation.start(onComplete);

    return () => animation.stop();
  }, [scaleAnim, duration, delay, initialScale, onComplete]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface SequentialAnimationProps {
  children: React.ReactNode[];
  animationType: 'fadeIn' | 'slideIn' | 'scaleIn';
  staggerDelay?: number;
  duration?: number;
  slideDirection?: 'left' | 'right' | 'up' | 'down';
  style?: ViewStyle;
}

export const SequentialAnimation: React.FC<SequentialAnimationProps> = ({
  children,
  animationType,
  staggerDelay = 100,
  duration = 300,
  slideDirection = 'up',
  style
}) => {
  const renderAnimatedChild = (child: React.ReactNode, index: number) => {
    const delay = index * staggerDelay;
    const key = `animated-child-${index}`;

    switch (animationType) {
      case 'fadeIn':
        return (
          <FadeInAnimation key={key} duration={duration} delay={delay}>
            {child}
          </FadeInAnimation>
        );
      case 'slideIn':
        return (
          <SlideInAnimation
            key={key}
            direction={slideDirection}
            duration={duration}
            delay={delay}
          >
            {child}
          </SlideInAnimation>
        );
      case 'scaleIn':
        return (
          <ScaleInAnimation key={key} duration={duration} delay={delay}>
            {child}
          </ScaleInAnimation>
        );
      default:
        return child;
    }
  };

  return (
    <Animated.View style={style}>
      {children.map(renderAnimatedChild)}
    </Animated.View>
  );
};
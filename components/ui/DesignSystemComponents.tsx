import React from 'react';
import { View, Text, ViewStyle, TextStyle, TouchableOpacity, Pressable } from 'react-native';
import { useTheme, useThemedStyles } from './ThemeProvider';
import { Typography, Spacing, BorderRadius, Shadows, Layout } from '../../constants/DesignTokens';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Typography Components
interface TypographyProps {
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
}

export const Heading1: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const styles = useThemedStyles((theme) => ({
    text: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight['3xl'],
      color: theme.colors.text,
    },
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

export const Heading2: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const styles = useThemedStyles((theme) => ({
    text: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight['2xl'],
      color: theme.colors.text,
    },
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

export const Heading3: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const styles = useThemedStyles((theme) => ({
    text: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semiBold,
      lineHeight: theme.typography.lineHeight.xl,
      color: theme.colors.text,
    },
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

export const BodyText: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const styles = useThemedStyles((theme) => ({
    text: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.lineHeight.base,
      color: theme.colors.textSecondary,
    },
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

export const Caption: React.FC<TypographyProps> = ({ children, style, ...props }) => {
  const styles = useThemedStyles((theme) => ({
    text: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.lineHeight.sm,
      color: theme.colors.textSecondary,
      opacity: 0.8,
    },
  }));

  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

// Layout Components
interface ContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  margin?: keyof typeof Spacing;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  padding = 'base',
  margin = 'none'
}) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing[padding as keyof typeof theme.spacing],
      margin: margin !== 'none' ? theme.spacing[margin as keyof typeof theme.spacing] : 0,
    },
  }));

  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof Spacing;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'base',
  style,
  onPress
}) => {
  const { theme } = useTheme();
  const cardTheme = theme.colors;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle: ViewStyle = {
    backgroundColor: cardTheme.background || '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[padding as keyof typeof theme.spacing],
    ...Shadows.base, // Use base shadow instead of hardcoded
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: cardTheme.border || '#E5E7EB',
  };
  
  if (variant === 'elevated') {
      Object.assign(cardStyle, Shadows.md);
  }

  if (onPress) {
    return (
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={onPress}
      >
        <Animated.View style={[cardStyle, style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[cardStyle, style]}>
      {children}
    </Animated.View>
  );
};

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  style
}) => {
  const styles = useThemedStyles((theme) => ({
    section: {
      marginBottom: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    headerContent: {
      flex: 1,
    },
  }));

  return (
    <View style={[styles.section, style]}>
      {(title || subtitle || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {title && <Heading3>{title}</Heading3>}
            {subtitle && <Caption style={{ marginTop: 4 }}>{subtitle}</Caption>}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
};

// Button Components
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle
}) => {
  const { theme } = useTheme();
  const buttonTheme = theme.colors;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles = {
    small: {
      height: 36,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
    },
    medium: {
      height: 48, // Updated to 48 as per prompt
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
    },
    large: {
      height: 56,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.fontSize.lg,
    },
  };

  const currentSize = sizeStyles[size];

  const baseButtonStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    height: currentSize.height,
    paddingHorizontal: currentSize.paddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: disabled || loading ? 0.6 : 1,
    ...(fullWidth && { alignSelf: 'stretch' }),
    ...Shadows.sm,
  };

  // Text Style
  const textStyleFinal: TextStyle = {
      color: variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary,
      fontSize: currentSize.fontSize,
      fontWeight: '600' as const,
      ...textStyle,
    };

  const renderContent = () => (
      <>
          {loading ? (
            <Text style={textStyleFinal}>Loading...</Text>
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <View style={{ marginRight: 8 }}>{icon}</View>
              )}
              <Text style={textStyleFinal}>{title}</Text>
              {icon && iconPosition === 'right' && (
                <View style={{ marginLeft: 8 }}>{icon}</View>
              )}
            </>
          )}
      </>
  )

  if (variant === 'primary') {
      return (
          <Pressable
            onPressIn={() => (scale.value = withSpring(0.96))}
            onPressOut={() => (scale.value = withSpring(1))}
            onPress={onPress}
            disabled={disabled || loading}
          >
              <Animated.View style={[animatedStyle, style, { width: fullWidth ? '100%' : undefined }]}>
                <LinearGradient
                    colors={[theme.colors.primary, '#2B77CB']} // Gradient from primary to slightly darker
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[baseButtonStyle, { width: '100%' }]}
                >
                    {renderContent()}
                </LinearGradient>
              </Animated.View>
          </Pressable>
      )
  }

  const otherButtonStyle: ViewStyle = {
    ...baseButtonStyle,
    backgroundColor: variant === 'danger' ? theme.colors.error : 'transparent',
    borderColor: variant === 'secondary' ? theme.colors.primary : 'transparent',
    borderWidth: variant === 'secondary' ? 1 : 0,
  };

  return (
    <Pressable
        onPressIn={() => (scale.value = withSpring(0.96))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={onPress}
        disabled={disabled || loading}
    >
        <Animated.View style={[otherButtonStyle, style, animatedStyle]}>
            {renderContent()}
        </Animated.View>
    </Pressable>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style
}) => {
  const styles = useThemedStyles((theme) => {
    const variants = {
      default: {
        backgroundColor: theme.colors.gray[theme.isDark ? 700 : 100],
        color: theme.colors.gray[theme.isDark ? 200 : 800],
      },
      primary: {
        backgroundColor: `${theme.colors.primary}20`,
        color: theme.colors.primary,
      },
      success: {
        backgroundColor: `${theme.colors.success}20`,
        color: theme.colors.success,
      },
      warning: {
        backgroundColor: `${theme.colors.warning[500]}20`,
        color: theme.colors.warning[500],
      },
      error: {
        backgroundColor: `${theme.colors.error}20`,
        color: theme.colors.error,
      },
    };

    const sizes = {
      small: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        fontSize: theme.typography.fontSize.xs,
        borderRadius: theme.borderRadius.sm,
      },
      medium: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        fontSize: theme.typography.fontSize.sm,
        borderRadius: theme.borderRadius.base,
      },
    };

    return {
      badge: {
        ...variants[variant],
        ...sizes[size],
        alignSelf: 'flex-start',
        fontWeight: theme.typography.fontWeight.medium,
      },
    };
  });

  return (
    <View style={[styles.badge, style]}>
      <Text style={{ color: styles.badge.color, fontSize: styles.badge.fontSize }}>
        {children}
      </Text>
    </View>
  );
};

// Divider Component
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  thickness = 1,
  style
}) => {
  const styles = useThemedStyles((theme) => ({
    divider: {
      backgroundColor: theme.colors.border,
      ...(orientation === 'horizontal'
        ? { height: thickness, width: '100%' }
        : { width: thickness, height: '100%' }
      ),
    },
  }));

  return <View style={[styles.divider, style]} />;
};

// Spacer Component
interface SpacerProps {
  size: keyof typeof Spacing;
  direction?: 'horizontal' | 'vertical';
}

export const Spacer: React.FC<SpacerProps> = ({
  size,
  direction = 'vertical'
}) => {
  const { theme } = useTheme();
  const space = theme.spacing[size];

  const style = direction === 'horizontal'
    ? { width: space, height: 1 }
    : { height: space, width: 1 };

  return <View style={style} />;
};

// Status Indicator Component
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: number;
  style?: ViewStyle;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 8,
  style
}) => {
  const styles = useThemedStyles((theme) => {
    const colors = {
      success: theme.colors.success,
      warning: theme.colors.warning[500],
      error: theme.colors.error,
      info: theme.colors.primary,
      neutral: theme.colors.gray[500],
    };

    return {
      indicator: {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[status],
      },
    };
  });

  return <View style={[styles.indicator, style]} />;
};

// Avatar Component
interface AvatarProps {
  size?: 'small' | 'medium' | 'large';
  initials?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 'medium',
  initials = '?',
  backgroundColor,
  textColor,
  style
}) => {
  const styles = useThemedStyles((theme) => {
    const sizes = {
      small: { width: 32, height: 32, fontSize: theme.typography.fontSize.sm },
      medium: { width: 40, height: 40, fontSize: theme.typography.fontSize.base },
      large: { width: 48, height: 48, fontSize: theme.typography.fontSize.lg },
    };

    const currentSize = sizes[size];

    return {
      avatar: {
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: currentSize.width / 2,
        backgroundColor: backgroundColor || theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      },
      text: {
        color: textColor || theme.colors.text,
        fontSize: currentSize.fontSize,
        fontWeight: theme.typography.fontWeight.semiBold,
      },
    };
  });

  return (
    <View style={[styles.avatar, style]}>
      <Text style={styles.text}>{initials.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
};

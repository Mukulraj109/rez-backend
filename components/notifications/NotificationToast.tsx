import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../../types/notifications';
import { useThemedStyles } from '../ui/ThemeProvider';
import { NotificationTypeIcon } from './NotificationTypeIcon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOAST_HEIGHT = 80;

interface NotificationToastProps {
  notification: Notification;
  duration?: number; // Auto-dismiss duration in ms, 0 = no auto-dismiss
  onPress?: () => void;
  onDismiss: () => void;
  testID?: string;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  duration = 5000,
  onPress,
  onDismiss,
  testID,
}) => {
  const slideAnim = useRef(new Animated.Value(-TOAST_HEIGHT)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const styles = useThemedStyles((theme) => ({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    } as ViewStyle,
    toast: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.base,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    } as ViewStyle,
    progressBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: `${theme.colors.primary}30`,
    } as ViewStyle,
    progress: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    } as ViewStyle,
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    content: {
      flex: 1,
      gap: 2,
    } as ViewStyle,
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
    },
    message: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    closeButton: {
      padding: 4,
    } as ViewStyle,
  }));

  // Get notification type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order':
        return '#3B82F6';
      case 'product':
        return '#10B981';
      case 'cashback':
        return '#F59E0B';
      case 'team':
        return '#7C3AED';
      case 'system':
        return '#6B7280';
      case 'alert':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const typeColor = getTypeColor(notification.type);

  // Slide in animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // Auto-dismiss timer and progress animation
  useEffect(() => {
    if (duration > 0) {
      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();

      // Auto-dismiss timer
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [duration, progressAnim]);

  // Handle dismiss with slide out animation
  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    Animated.timing(slideAnim, {
      toValue: -TOAST_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // Swipe up to dismiss
          handleDismiss();
        } else {
          // Snap back to position
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={onPress}
        activeOpacity={onPress ? 0.9 : 1}
        disabled={!onPress}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${typeColor}15` },
          ]}
        >
          <NotificationTypeIcon
            type={notification.type}
            size={24}
            color={typeColor}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>

        {/* Progress bar */}
        {duration > 0 && (
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progress,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

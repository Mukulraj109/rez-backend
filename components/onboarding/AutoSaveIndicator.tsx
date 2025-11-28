/**
 * AutoSaveIndicator Component
 * Shows auto-save status with timestamp
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string;
  errorMessage?: string;
  position?: 'top' | 'bottom';
  showTimestamp?: boolean;
  autoHide?: boolean;
  autoHideDuration?: number; // milliseconds
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSavedAt,
  errorMessage,
  position = 'bottom',
  showTimestamp = true,
  autoHide = true,
  autoHideDuration = 3000,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [visible, setVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (status === 'saving' || status === 'saved' || status === 'error') {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (autoHide && status === 'saved') {
        const timer = setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [status, autoHide, autoHideDuration]);

  if (!visible && status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: 'cloud-upload-outline' as const,
          text: 'Saving...',
          color: colors.primary,
          backgroundColor: colors.backgroundSecondary,
        };
      case 'saved':
        return {
          icon: 'checkmark-circle' as const,
          text: 'Saved',
          color: colors.success,
          backgroundColor: colors.backgroundSecondary,
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          text: 'Save Failed',
          color: colors.danger,
          backgroundColor: colors.backgroundSecondary,
        };
      default:
        return {
          icon: 'cloud-outline' as const,
          text: '',
          color: colors.textMuted,
          backgroundColor: colors.backgroundSecondary,
        };
    }
  };

  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const config = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.color,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {status === 'saving' ? (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name={config.icon} size={16} color={config.color} />
            </Animated.View>
          ) : (
            <Ionicons name={config.icon} size={16} color={config.color} />
          )}
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>

          {showTimestamp && lastSavedAt && status === 'saved' && (
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(lastSavedAt)}
            </Text>
          )}

          {status === 'error' && errorMessage && (
            <Text style={[styles.errorMessage, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          )}
        </View>

        {/* Close button for errors */}
        {status === 'error' && (
          <View style={styles.iconContainer}>
            <Ionicons name="close" size={16} color={config.color} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  positionTop: {
    top: 16,
  },
  positionBottom: {
    bottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  errorMessage: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default AutoSaveIndicator;

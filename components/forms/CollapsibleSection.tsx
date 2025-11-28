import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  hasError?: boolean;
  errorCount?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  hasError = false,
  errorCount = 0,
  icon,
  required = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, hasError && styles.containerError]}>
      <TouchableOpacity
        style={[styles.header, hasError && styles.headerError]}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons
              name={icon}
              size={24}
              color={hasError ? Colors.light.error : Colors.light.primary}
              style={styles.headerIcon}
            />
          )}
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <ThemedText style={[styles.title, hasError && styles.titleError]}>
                {title}
              </ThemedText>
              {required && (
                <ThemedText style={styles.requiredIndicator}> *</ThemedText>
              )}
            </View>
            {hasError && errorCount > 0 && (
              <ThemedText style={styles.errorText}>
                {errorCount} error{errorCount > 1 ? 's' : ''} found
              </ThemedText>
            )}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {hasError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle" size={20} color={Colors.light.background} />
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
              name="chevron-down"
              size={24}
              color={hasError ? Colors.light.error : Colors.light.textSecondary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerError: {
    borderColor: Colors.light.error,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.card,
  },
  headerError: {
    backgroundColor: '#FFF5F5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  titleError: {
    color: Colors.light.error,
  },
  requiredIndicator: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    backgroundColor: Colors.light.background,
  },
});


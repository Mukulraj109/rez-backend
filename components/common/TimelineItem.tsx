/**
 * TimelineItem Component
 *
 * Single timeline item component
 * - Animated appearance
 * - Expandable for more details
 * - Supports audit logs and notifications
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TimelineEntry } from '../../types/audit';
import {
  getActionIcon,
  getActionColor,
  formatRelativeTime,
  formatChange,
} from '../../utils/audit/auditHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineItemProps {
  entry: TimelineEntry;
  onPress?: (entry: TimelineEntry) => void;
  isLast?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TimelineItem: React.FC<TimelineItemProps> = ({
  entry,
  onPress,
  isLast = false,
}) => {
  // ========================================
  // STATE
  // ========================================
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // ========================================
  // EFFECTS
  // ========================================
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Expand/collapse animation
    Animated.timing(animatedHeight, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // ========================================
  // HELPERS
  // ========================================
  const getIcon = () => {
    if (entry.icon) return entry.icon;
    return getActionIcon(entry.action);
  };

  const getColor = () => {
    if (entry.color) return entry.color;
    return getActionColor(entry.action);
  };

  const getRelativeTime = () => {
    if (entry.relativeTime) return entry.relativeTime;
    return formatRelativeTime(entry.timestamp);
  };

  const hasDetails = () => {
    return (
      entry.details?.changes?.length ||
      entry.details?.metadata ||
      entry.details?.before ||
      entry.details?.after
    );
  };

  // ========================================
  // HANDLERS
  // ========================================
  const handlePress = () => {
    if (hasDetails()) {
      setExpanded(!expanded);
    }
    onPress?.(entry);
  };

  // ========================================
  // RENDER FUNCTIONS
  // ========================================
  const renderDot = () => {
    const color = getColor();

    return (
      <View style={styles.dotContainer}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Ionicons name={getIcon() as any} size={14} color="#fff" />
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: color + '30' }]} />}
      </View>
    );
  };

  const renderUser = () => {
    if (!entry.user) return null;

    return (
      <View style={styles.userContainer}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {entry.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{entry.user.name}</Text>
          {entry.user.role && (
            <Text style={styles.userRole}>{entry.user.role}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const color = getColor();

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{entry.action}</Text>
          {entry.resourceType && (
            <View style={[styles.resourceBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.resourceBadgeText, { color }]}>
                {entry.resourceType}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.timestamp}>{getRelativeTime()}</Text>
      </View>
    );
  };

  const renderDetails = () => {
    if (!hasDetails()) return null;

    const detailsHeight = animatedHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200], // Adjust based on content
    });

    return (
      <Animated.View style={[styles.detailsContainer, { maxHeight: detailsHeight }]}>
        {/* Changes */}
        {entry.details?.changes && entry.details.changes.length > 0 && (
          <View style={styles.changesContainer}>
            <Text style={styles.detailsTitle}>Changes:</Text>
            {entry.details.changes.map((change, index) => (
              <View key={index} style={styles.changeItem}>
                <Text style={styles.changeText}>{formatChange(change)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Metadata */}
        {entry.details?.metadata && Object.keys(entry.details.metadata).length > 0 && (
          <View style={styles.metadataContainer}>
            <Text style={styles.detailsTitle}>Additional Details:</Text>
            {Object.entries(entry.details.metadata).map(([key, value]) => (
              <View key={key} style={styles.metadataItem}>
                <Text style={styles.metadataKey}>{key}:</Text>
                <Text style={styles.metadataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* IP Address & User Agent */}
        {(entry.ipAddress || entry.userAgent) && (
          <View style={styles.technicalContainer}>
            {entry.ipAddress && (
              <Text style={styles.technicalText}>IP: {entry.ipAddress}</Text>
            )}
            {entry.userAgent && (
              <Text style={styles.technicalText} numberOfLines={1}>
                {entry.userAgent}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderExpandButton = () => {
    if (!hasDetails()) return null;

    return (
      <TouchableOpacity style={styles.expandButton} onPress={handlePress}>
        <Text style={styles.expandButtonText}>
          {expanded ? 'Show Less' : 'Show More'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#007AFF"
        />
      </TouchableOpacity>
    );
  };

  const renderSeverityBadge = () => {
    if (!entry.severity || entry.severity === 'info') return null;

    const severityColors = {
      warning: '#FF9500',
      error: '#FF3B30',
      critical: '#D70015',
    };

    const color = severityColors[entry.severity];

    return (
      <View style={[styles.severityBadge, { backgroundColor: color + '20' }]}>
        <Ionicons
          name={
            entry.severity === 'critical'
              ? 'alert-circle'
              : entry.severity === 'error'
              ? 'close-circle'
              : 'warning'
          }
          size={14}
          color={color}
        />
        <Text style={[styles.severityText, { color }]}>
          {entry.severity.toUpperCase()}
        </Text>
      </View>
    );
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <Animated.View style={[styles.container, { opacity: animatedOpacity }]}>
      <View style={styles.timeline}>
        {renderDot()}
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            {renderSeverityBadge()}
            {renderHeader()}
            {renderUser()}
            {renderDetails()}
            {renderExpandButton()}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  timeline: {
    flexDirection: 'row',
  },

  // Dot & Line
  dotContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },

  // Content
  content: {
    flex: 1,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  // Resource badge
  resourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Severity badge
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  // User
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Details
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    overflow: 'hidden',
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },

  // Changes
  changesContainer: {
    marginBottom: 12,
  },
  changeItem: {
    paddingLeft: 12,
    paddingVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
    marginBottom: 4,
  },
  changeText: {
    fontSize: 13,
    color: '#333',
  },

  // Metadata
  metadataContainer: {
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  metadataKey: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginRight: 8,
  },
  metadataValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },

  // Technical
  technicalContainer: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 6,
  },
  technicalText: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
  },
});

export default TimelineItem;

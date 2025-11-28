import React from 'react';
import { View, Text, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeamActivity } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';

interface ActivityTimelineProps {
  activities: TeamActivity[];
  maxItems?: number;
  style?: ViewStyle;
  testID?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  maxItems,
  style,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
    } as ViewStyle,
    scrollView: {
      flex: 1,
    } as ViewStyle,
    content: {
      padding: theme.spacing.base,
      gap: theme.spacing.base,
    } as ViewStyle,
    timelineItem: {
      flexDirection: 'row',
      gap: theme.spacing.base,
    } as ViewStyle,
    iconContainer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    } as ViewStyle,
    timeline: {
      flex: 1,
      width: 2,
      backgroundColor: theme.colors.borderLight,
      marginHorizontal: 19,
    } as ViewStyle,
    timelineItemContent: {
      flex: 1,
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.base,
    } as ViewStyle,
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    } as ViewStyle,
    actionText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
      flex: 1,
    },
    timestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textMuted,
    },
    performedBy: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    detailsCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    } as ViewStyle,
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    } as ViewStyle,
    detailLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textMuted,
    },
    detailValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    emptyState: {
      padding: theme.spacing['2xl'],
      alignItems: 'center',
      gap: theme.spacing.base,
    } as ViewStyle,
    emptyStateText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  }));

  // Action icons and colors
  const getActionConfig = (action: TeamActivity['action']) => {
    const configs = {
      invite: {
        icon: 'mail-outline' as const,
        color: '#3B82F6',
        label: 'Invitation Sent',
      },
      accept: {
        icon: 'checkmark-circle-outline' as const,
        color: '#10B981',
        label: 'Invitation Accepted',
      },
      role_change: {
        icon: 'swap-horizontal-outline' as const,
        color: '#F59E0B',
        label: 'Role Changed',
      },
      status_change: {
        icon: 'toggle-outline' as const,
        color: '#6366F1',
        label: 'Status Changed',
      },
      remove: {
        icon: 'trash-outline' as const,
        color: '#EF4444',
        label: 'Member Removed',
      },
      resend_invite: {
        icon: 'reload-outline' as const,
        color: '#8B5CF6',
        label: 'Invitation Resent',
      },
    };

    return configs[action] || configs.invite;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Get display items
  const displayActivities = maxItems
    ? activities.slice(0, maxItems)
    : activities;

  if (activities.length === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No activity yet</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {displayActivities.map((activity, index) => {
        const config = getActionConfig(activity.action);
        const isLast = index === displayActivities.length - 1;

        return (
          <View key={activity.id} style={styles.timelineItem}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: `${config.color}20`,
                    borderColor: config.color,
                  },
                ]}
              >
                <Ionicons name={config.icon} size={20} color={config.color} />
              </View>
              {!isLast && <View style={styles.timeline} />}
            </View>

            <View style={styles.timelineItemContent}>
              <View style={styles.actionHeader}>
                <Text style={styles.actionText}>{config.label}</Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(activity.timestamp)}
                </Text>
              </View>

              <Text style={styles.performedBy}>
                by {activity.performedByName} • {activity.targetUserEmail}
              </Text>

              {activity.details && Object.keys(activity.details).length > 0 && (
                <View style={styles.detailsCard}>
                  {Object.entries(activity.details).map(([key, value]) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {key
                          .split('_')
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(' ')}
                        :
                      </Text>
                      <Text style={styles.detailValue}>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuditLog } from '../../types/audit';
import { useThemedStyles } from '../ui/ThemeProvider';
import { Avatar } from '../ui/DesignSystemComponents';
import { ActionTypeBadge } from './ActionTypeBadge';
import { SeverityBadge } from './SeverityBadge';

interface AuditLogCardProps {
  log: AuditLog;
  onPress?: () => void;
  compact?: boolean;
  testID?: string;
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({
  log,
  onPress,
  compact = false,
  testID,
}) => {
  const [expanded, setExpanded] = useState(false);

  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: compact ? theme.spacing.sm : theme.spacing.base,
      borderWidth: 1,
      borderColor: getSeverityBorderColor(log.severity, theme),
      borderLeftWidth: 4,
      borderLeftColor: getSeverityColor(log.severity, theme),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,
    avatarSection: {
      position: 'relative',
    } as ViewStyle,
    infoSection: {
      flex: 1,
      gap: theme.spacing.xs,
    } as ViewStyle,
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    } as ViewStyle,
    actionRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    userName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    resourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    resourceType: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}15`,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },
    resourceId: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    } as ViewStyle,
    timestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    metadataSection: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.xs,
    } as ViewStyle,
    metadataRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    } as ViewStyle,
    metadataLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      minWidth: 80,
    },
    metadataValue: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text,
      fontFamily: 'monospace',
    },
    expandButton: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.xs,
      alignItems: 'center',
    } as ViewStyle,
    expandButtonText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
  }));

  // Get initials from user name
  const getInitials = (name?: string) => {
    if (!name) return 'SY';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name.slice(0, 2);
  };

  // Get action type from audit action
  const getActionType = (action: string): 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' => {
    if (action.includes('created')) return 'CREATE';
    if (action.includes('updated') || action.includes('changed')) return 'UPDATE';
    if (action.includes('deleted')) return 'DELETE';
    if (action.includes('login')) return 'LOGIN';
    if (action.includes('logout')) return 'LOGOUT';
    if (action.includes('export')) return 'EXPORT';
    if (action.includes('import')) return 'IMPORT';
    return 'READ';
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
    return date.toLocaleDateString();
  };

  // Format action text
  const formatAction = (action: string) => {
    return action.split('.').join(' ').replace(/_/g, ' ');
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const cardContent = (
    <>
      <View style={styles.header}>
        <View style={styles.avatarSection}>
          <Avatar
            size="small"
            initials={getInitials(log.user?.name)}
            backgroundColor={theme => theme.colors.primary}
            textColor="#FFFFFF"
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.topRow}>
            <View style={styles.actionRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {log.user?.name || 'System'}
              </Text>
              <ActionTypeBadge actionType={getActionType(log.action)} size="small" />
            </View>
            <SeverityBadge severity={log.severity} showIcon={false} />
          </View>

          <Text style={styles.actionText} numberOfLines={compact ? 1 : 2}>
            {formatAction(log.action)}
          </Text>

          {log.resourceType && (
            <View style={styles.resourceRow}>
              <Text style={styles.resourceType}>{log.resourceType}</Text>
              {log.resourceId && (
                <Text style={styles.resourceId} numberOfLines={1}>
                  #{log.resourceId.slice(0, 8)}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.timestamp}>{formatTimestamp(log.timestamp)}</Text>
        {(log.ipAddress || log.userAgent || log.details.metadata) && !compact && (
          <TouchableOpacity onPress={handleToggleExpand}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (
        <View style={styles.metadataSection}>
          {log.ipAddress && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>IP Address:</Text>
              <Text style={styles.metadataValue}>{log.ipAddress}</Text>
            </View>
          )}
          {log.userAgent && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>User Agent:</Text>
              <Text style={styles.metadataValue} numberOfLines={2}>
                {log.userAgent}
              </Text>
            </View>
          )}
          {log.details.metadata && Object.keys(log.details.metadata).length > 0 && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Metadata:</Text>
              <Text style={styles.metadataValue} numberOfLines={3}>
                {JSON.stringify(log.details.metadata, null, 2)}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        testID={testID}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card} testID={testID}>
      {cardContent}
    </View>
  );
};

// Helper function to get severity color
const getSeverityColor = (severity: string, theme: any) => {
  switch (severity) {
    case 'critical':
      return theme.colors.error || '#EF4444';
    case 'error':
      return theme.colors.error || '#EF4444';
    case 'warning':
      return theme.colors.warning || '#F59E0B';
    case 'info':
    default:
      return theme.colors.gray[400] || '#9CA3AF';
  }
};

// Helper function to get severity border color
const getSeverityBorderColor = (severity: string, theme: any) => {
  switch (severity) {
    case 'critical':
      return `${theme.colors.error}30` || '#EF444430';
    case 'error':
      return `${theme.colors.error}20` || '#EF444420';
    case 'warning':
      return `${theme.colors.warning}20` || '#F59E0B20';
    case 'info':
    default:
      return theme.colors.border || '#E5E7EB';
  }
};

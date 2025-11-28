import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeamMemberSummary } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';
import { Avatar } from '../ui/DesignSystemComponents';
import { RoleBadge } from './RoleBadge';
import { MemberStatusBadge } from './MemberStatusBadge';

interface TeamMemberCardProps {
  member: TeamMemberSummary;
  onPress?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  showActions?: boolean;
  testID?: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onPress,
  onEdit,
  onRemove,
  showActions = true,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    } as ViewStyle,
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
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
    nameRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    name: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
      flex: 1,
    },
    email: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    } as ViewStyle,
    lastLogin: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textMuted,
      flex: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    } as ViewStyle,
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.backgroundSecondary,
      gap: theme.spacing.xs,
    } as ViewStyle,
    removeButton: {
      backgroundColor: `${theme.colors.error}10`,
    } as ViewStyle,
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    removeText: {
      color: theme.colors.error,
    },
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.card,
    } as ViewStyle,
  }));

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name.slice(0, 2);
  };

  // Format last login
  const formatLastLogin = (date?: string) => {
    if (!date) return 'Never logged in';
    const loginDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - loginDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return loginDate.toLocaleDateString();
  };

  // Determine if invitation is pending
  const isPending = !member.acceptedAt && member.invitedAt;

  const cardContent = (
    <>
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar
            size="medium"
            initials={getInitials(member.name)}
            backgroundColor={
              member.role === 'owner'
                ? '#7C3AED'
                : member.role === 'admin'
                ? '#3B82F6'
                : member.role === 'manager'
                ? '#10B981'
                : '#6B7280'
            }
            textColor="#FFFFFF"
          />
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor:
                  member.status === 'active'
                    ? '#10B981'
                    : member.status === 'inactive'
                    ? '#6B7280'
                    : '#EF4444',
              },
            ]}
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {member.name}
              </Text>
            </View>
            <RoleBadge role={member.role} size="small" showIcon />
          </View>

          <Text style={styles.email} numberOfLines={1}>
            {member.email}
          </Text>

          <View style={styles.bottomRow}>
            {isPending ? (
              <MemberStatusBadge status="pending" size="small" />
            ) : (
              <MemberStatusBadge status={member.status} size="small" />
            )}
            <Text style={styles.lastLogin}>
              {formatLastLogin(member.lastLoginAt)}
            </Text>
          </View>
        </View>
      </View>

      {showActions && (onEdit || onRemove) && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              activeOpacity={0.7}
              testID={`${testID}-edit-button`}
            >
              <Ionicons name="pencil" size={16} color="#6B7280" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={onRemove}
              activeOpacity={0.7}
              testID={`${testID}-remove-button`}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
            </TouchableOpacity>
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

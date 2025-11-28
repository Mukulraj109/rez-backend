/**
 * Team Dashboard Overview Screen
 * Shows team statistics, recent activities, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TeamMemberSummary } from '@/types/team';
import {
  canInviteMembers,
  canViewTeam,
  getTeamStats,
  formatRoleName,
  getRoleColor,
  formatStatusName,
  getStatusColor,
  getRelativeTime,
  getInitials,
  getAvatarColor
} from '@/utils/teamHelpers';

export default function TeamScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { permissions, role } = useAuth();

  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  const hasTeamViewPermission = canViewTeam(permissions);
  const canInvite = role ? canInviteMembers(role, permissions) : false;

  useEffect(() => {
    if (hasTeamViewPermission) {
      loadTeamMembers();
    } else {
      setIsLoading(false);
    }
  }, [hasTeamViewPermission]);

  const loadTeamMembers = async () => {
    try {
      setError(null);
      const response = await teamService.getTeamMembers();
      setTeamMembers(response.data.teamMembers);
    } catch (err: any) {
      console.error('Failed to load team members:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTeamMembers();
  };

  const handleInviteMember = () => {
    router.push('/team/invite');
  };

  const handleViewAllMembers = () => {
    router.push('/team/list');
  };

  const handleViewMember = (memberId: string) => {
    router.push(`/team/${memberId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading team...
          </Text>
        </View>
      </View>
    );
  }

  // Show permission error
  if (!hasTeamViewPermission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Access Denied
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            You don't have permission to view team members.
          </Text>
        </View>
      </View>
    );
  }

  const stats = getTeamStats(teamMembers);
  const recentMembers = teamMembers.slice(0, 5); // Show 5 most recent

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header with Quick Actions */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team Overview</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats.total} member{stats.total !== 1 ? 's' : ''}
          </Text>
        </View>

        {canInvite && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={handleInviteMember}
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="people" size={32} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="time" size={32} color={colors.pending} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>

        {stats.suspended > 0 && (
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="ban" size={32} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.suspended}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Suspended</Text>
          </View>
        )}
      </View>

      {/* Role Breakdown */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Team by Role</Text>
        </View>

        <View style={styles.roleBreakdown}>
          {stats.roleBreakdown.owner > 0 && (
            <View style={styles.roleItem}>
              <View style={styles.roleLeft}>
                <View style={[styles.roleIcon, { backgroundColor: getRoleColor('owner') + '20' }]}>
                  <Ionicons name="shield-checkmark" size={20} color={getRoleColor('owner')} />
                </View>
                <Text style={[styles.roleLabel, { color: colors.text }]}>
                  {formatRoleName('owner')}
                </Text>
              </View>
              <Text style={[styles.roleCount, { color: colors.textSecondary }]}>
                {stats.roleBreakdown.owner}
              </Text>
            </View>
          )}

          {stats.roleBreakdown.admin > 0 && (
            <View style={styles.roleItem}>
              <View style={styles.roleLeft}>
                <View style={[styles.roleIcon, { backgroundColor: getRoleColor('admin') + '20' }]}>
                  <Ionicons name="key" size={20} color={getRoleColor('admin')} />
                </View>
                <Text style={[styles.roleLabel, { color: colors.text }]}>
                  {formatRoleName('admin')}
                </Text>
              </View>
              <Text style={[styles.roleCount, { color: colors.textSecondary }]}>
                {stats.roleBreakdown.admin}
              </Text>
            </View>
          )}

          {stats.roleBreakdown.manager > 0 && (
            <View style={styles.roleItem}>
              <View style={styles.roleLeft}>
                <View style={[styles.roleIcon, { backgroundColor: getRoleColor('manager') + '20' }]}>
                  <Ionicons name="briefcase" size={20} color={getRoleColor('manager')} />
                </View>
                <Text style={[styles.roleLabel, { color: colors.text }]}>
                  {formatRoleName('manager')}
                </Text>
              </View>
              <Text style={[styles.roleCount, { color: colors.textSecondary }]}>
                {stats.roleBreakdown.manager}
              </Text>
            </View>
          )}

          {stats.roleBreakdown.staff > 0 && (
            <View style={styles.roleItem}>
              <View style={styles.roleLeft}>
                <View style={[styles.roleIcon, { backgroundColor: getRoleColor('staff') + '20' }]}>
                  <Ionicons name="person" size={20} color={getRoleColor('staff')} />
                </View>
                <Text style={[styles.roleLabel, { color: colors.text }]}>
                  {formatRoleName('staff')}
                </Text>
              </View>
              <Text style={[styles.roleCount, { color: colors.textSecondary }]}>
                {stats.roleBreakdown.staff}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Recent Team Members */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Members</Text>
          {teamMembers.length > 5 && (
            <TouchableOpacity onPress={handleViewAllMembers}>
              <Text style={[styles.viewAllButton, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No team members yet
            </Text>
            {canInvite && (
              <TouchableOpacity
                style={[styles.emptyActionButton, { borderColor: colors.primary }]}
                onPress={handleInviteMember}
              >
                <Text style={[styles.emptyActionText, { color: colors.primary }]}>
                  Invite Your First Member
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.membersList}>
            {recentMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberItem}
                onPress={() => handleViewMember(member.id)}
              >
                <View style={styles.memberLeft}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: getAvatarColor(member.name) }
                    ]}
                  >
                    <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                      {member.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.memberRight}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(member.role) + '20' }
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(member.role) }]}>
                      {formatRoleName(member.role)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(member.status) + '20' }
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                      {formatStatusName(member.status)}
                    </Text>
                  </View>

                  {member.lastLoginAt && (
                    <Text style={[styles.lastLogin, { color: colors.textMuted }]}>
                      {getRelativeTime(member.lastLoginAt)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleViewAllMembers}
          >
            <Ionicons name="list" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>View All</Text>
          </TouchableOpacity>

          {canInvite && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleInviteMember}
            >
              <Ionicons name="person-add" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Invite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push('/team/roles')}
          >
            <Ionicons name="key" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Roles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => router.push('/team/activity')}
          >
            <Ionicons name="time" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Activity</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleBreakdown: {
    gap: 12,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 16,
  },
  roleCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  lastLogin: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

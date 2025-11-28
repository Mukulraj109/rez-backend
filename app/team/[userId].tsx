/**
 * Team Management - Team Member Detail Screen
 * Displays detailed information about a team member with management actions
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import {
  TeamMemberWithDescription,
  MerchantRole,
  TeamMemberStatus,
  Permission,
} from '@/types/team';

export default function TeamMemberDetailScreen() {
  const { userId } = useLocalSearchParams();
  const { token } = useAuth();
  const [member, setMember] = useState<TeamMemberWithDescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<MerchantRole>('staff');
  const [canEdit, setCanEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (token && userId) {
      fetchMemberDetails();
      checkPermissions();
    }
  }, [token, userId]);

  const checkPermissions = async () => {
    try {
      const permissions = await teamService.getCurrentUserPermissions();
      setCurrentUserRole(permissions.role);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await teamService.getTeamMember(userId as string);
      setMember(response.data.teamMember);

      // Check if current user can edit this member
      const permissions = await teamService.getCurrentUserPermissions();
      const canEditMember = teamService.canEditTeamMember(
        permissions.role,
        response.data.teamMember.role
      );
      setCanEdit(canEditMember);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load team member details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (newRole: Exclude<MerchantRole, 'owner'>) => {
    if (!member || !canEdit) return;

    Alert.alert(
      'Change Role',
      `Are you sure you want to change ${member.name}'s role to ${teamService.formatRoleLabel(newRole)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              setActionLoading(true);
              await teamService.updateTeamMemberRole(member.id, { role: newRole });
              Alert.alert('Success', 'Role updated successfully');
              fetchMemberDetails();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update role');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeStatus = async (newStatus: TeamMemberStatus) => {
    if (!member || !canEdit) return;

    const statusLabel = teamService.getStatusLabel(newStatus);
    Alert.alert(
      'Change Status',
      `Are you sure you want to change ${member.name}'s status to ${statusLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              setActionLoading(true);
              await teamService.updateTeamMemberStatus(member.id, { status: newStatus });
              Alert.alert('Success', 'Status updated successfully');
              fetchMemberDetails();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update status');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResendInvitation = async () => {
    if (!member) return;

    try {
      setActionLoading(true);
      await teamService.resendInvitation(member.id);
      Alert.alert('Success', 'Invitation resent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!member || !canEdit) return;

    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name} from your team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await teamService.removeTeamMember(member.id);
              Alert.alert('Success', 'Team member removed successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove team member');
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: MerchantRole): string => {
    const colors: Record<MerchantRole, string> = {
      owner: Colors.light.primary,
      admin: '#3B82F6',
      manager: '#10B981',
      staff: '#6B7280',
    };
    return colors[role];
  };

  const getStatusBadgeColor = (status: TeamMemberStatus): string => {
    const colors: Record<TeamMemberStatus, string> = {
      active: Colors.light.success,
      inactive: Colors.light.warning,
      suspended: Colors.light.destructive,
    };
    return colors[status];
  };

  const getAvatarInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const groupPermissionsByCategory = (permissions: Permission[]) => {
    const categories: Record<string, Permission[]> = {};

    permissions.forEach((permission) => {
      const [category] = permission.split(':');
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(permission);
    });

    return categories;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Team Member
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading member details...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Team Member
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={Colors.light.destructive} />
            <ThemedText style={styles.errorTitle}>Member not found</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const permissionsByCategory = groupPermissionsByCategory(member.permissions);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Team Member
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Member Header */}
          <View style={styles.memberHeader}>
            <View
              style={[styles.avatar, { backgroundColor: getRoleBadgeColor(member.role) + '20' }]}
            >
              <ThemedText style={[styles.avatarText, { color: getRoleBadgeColor(member.role) }]}>
                {getAvatarInitials(member.name)}
              </ThemedText>
            </View>

            <ThemedText style={styles.memberName}>{member.name}</ThemedText>
            <ThemedText style={styles.memberEmail}>{member.email}</ThemedText>

            <View style={styles.badgesContainer}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) }]}>
                <ThemedText style={styles.roleBadgeText}>
                  {teamService.formatRoleLabel(member.role)}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadgeColor(member.status) + '20' },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: getStatusBadgeColor(member.status) }]}
                />
                <ThemedText
                  style={[styles.statusText, { color: getStatusBadgeColor(member.status) }]}
                >
                  {teamService.getStatusLabel(member.status)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Member Information */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Information</ThemedText>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Role</ThemedText>
              <ThemedText style={styles.infoValue}>
                {teamService.formatRoleLabel(member.role)}
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Status</ThemedText>
              <ThemedText style={styles.infoValue}>
                {teamService.getStatusLabel(member.status)}
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Invited</ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(member.invitedAt).toLocaleDateString()}
              </ThemedText>
            </View>

            {member.acceptedAt && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Joined</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {new Date(member.acceptedAt).toLocaleDateString()}
                </ThemedText>
              </View>
            )}

            {member.lastLoginAt && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Last Login</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {new Date(member.lastLoginAt).toLocaleDateString()}
                </ThemedText>
              </View>
            )}

            {member.invitedBy && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Invited By</ThemedText>
                <ThemedText style={styles.infoValue}>{member.invitedBy.name}</ThemedText>
              </View>
            )}
          </View>

          {/* Role Description */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Role Description</ThemedText>
            <ThemedText style={styles.descriptionText}>{member.roleDescription}</ThemedText>
          </View>

          {/* Permissions */}
          <View style={styles.section}>
            <View style={styles.permissionsHeader}>
              <ThemedText style={styles.sectionTitle}>Permissions</ThemedText>
              <View style={styles.permissionsCount}>
                <ThemedText style={styles.permissionsCountText}>
                  {member.permissions.length} permissions
                </ThemedText>
              </View>
            </View>

            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <View key={category} style={styles.permissionCategory}>
                <ThemedText style={styles.permissionCategoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </ThemedText>
                <View style={styles.permissionsList}>
                  {permissions.map((permission) => (
                    <View key={permission} style={styles.permissionItem}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                      <ThemedText style={styles.permissionText}>
                        {teamService.getPermissionDescription(permission)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Actions (Owner Only) */}
          {canEdit && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Actions</ThemedText>

              {/* Change Role */}
              {currentUserRole === 'owner' && member.role !== 'owner' && (
                <View style={styles.actionGroup}>
                  <ThemedText style={styles.actionGroupTitle}>Change Role</ThemedText>
                  <View style={styles.roleButtons}>
                    {(['admin', 'manager', 'staff'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleButton,
                          member.role === role && styles.roleButtonActive,
                        ]}
                        onPress={() => member.role !== role && handleChangeRole(role)}
                        disabled={actionLoading || member.role === role}
                      >
                        <ThemedText
                          style={[
                            styles.roleButtonText,
                            member.role === role && styles.roleButtonTextActive,
                          ]}
                        >
                          {teamService.formatRoleLabel(role)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Change Status */}
              <View style={styles.actionGroup}>
                <ThemedText style={styles.actionGroupTitle}>Change Status</ThemedText>
                <View style={styles.statusButtons}>
                  {member.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonWarning]}
                      onPress={() => handleChangeStatus('suspended')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="pause-circle-outline" size={20} color={Colors.light.warning} />
                      <ThemedText style={styles.actionButtonTextWarning}>Suspend Member</ThemedText>
                    </TouchableOpacity>
                  )}

                  {member.status === 'suspended' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonSuccess]}
                      onPress={() => handleChangeStatus('active')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="play-circle-outline" size={20} color={Colors.light.success} />
                      <ThemedText style={styles.actionButtonTextSuccess}>
                        Reactivate Member
                      </ThemedText>
                    </TouchableOpacity>
                  )}

                  {member.status === 'inactive' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonInfo]}
                      onPress={handleResendInvitation}
                      disabled={actionLoading}
                    >
                      <Ionicons name="mail-outline" size={20} color={Colors.light.info} />
                      <ThemedText style={styles.actionButtonTextInfo}>
                        Resend Invitation
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Remove Member */}
              <View style={styles.actionGroup}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={handleRemoveMember}
                  disabled={actionLoading}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.light.destructive} />
                  <ThemedText style={styles.actionButtonTextDanger}>Remove from Team</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  memberHeader: {
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionsCount: {
    backgroundColor: Colors.light.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  permissionCategory: {
    marginBottom: 16,
  },
  permissionCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  permissionsList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  actionGroup: {
    marginBottom: 20,
  },
  actionGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  roleButtonTextActive: {
    color: 'white',
  },
  statusButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonWarning: {
    borderColor: Colors.light.warning,
    backgroundColor: Colors.light.warning + '10',
  },
  actionButtonTextWarning: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  actionButtonSuccess: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success + '10',
  },
  actionButtonTextSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
  },
  actionButtonInfo: {
    borderColor: Colors.light.info,
    backgroundColor: Colors.light.info + '10',
  },
  actionButtonTextInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.info,
  },
  actionButtonDanger: {
    borderColor: Colors.light.destructive,
    backgroundColor: Colors.light.destructive + '10',
  },
  actionButtonTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.destructive,
  },
  bottomSpacing: {
    height: 40,
  },
});

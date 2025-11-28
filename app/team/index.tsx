/**
 * Team Management - Team Members List Screen
 * Displays all team members with search, filter, and invite functionality
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
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import {
  TeamMemberSummary,
  MerchantRole,
  TeamMemberStatus,
} from '@/types/team';

export default function TeamMembersScreen() {
  const { token } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<MerchantRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TeamMemberStatus | 'all'>('all');
  const [canInvite, setCanInvite] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<MerchantRole>('staff');

  useEffect(() => {
    if (token) {
      fetchTeamMembers();
      checkPermissions();
    }
  }, [token]);

  useEffect(() => {
    filterTeamMembers();
  }, [teamMembers, searchQuery, filterRole, filterStatus]);

  const checkPermissions = async () => {
    try {
      const permissions = await teamService.getCurrentUserPermissions();
      setCurrentUserRole(permissions.role);
      setCanInvite(permissions.permissions.includes('team:invite'));
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await teamService.getTeamMembers();
      setTeamMembers(response.data.teamMembers);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamMembers();
    setRefreshing(false);
  };

  const filterTeamMembers = () => {
    let filtered = [...teamMembers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query) ||
          member.role.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter((member) => member.role === filterRole);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((member) => member.status === filterStatus);
    }

    setFilteredMembers(filtered);
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

  const renderMemberCard = (member: TeamMemberSummary) => {
    return (
      <TouchableOpacity
        key={member.id}
        style={styles.memberCard}
        onPress={() => router.push(`/team/${member.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.memberHeader}>
          <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(member.role) + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: getRoleBadgeColor(member.role) }]}>
              {getAvatarInitials(member.name)}
            </ThemedText>
          </View>

          <View style={styles.memberInfo}>
            <ThemedText style={styles.memberName}>{member.name}</ThemedText>
            <ThemedText style={styles.memberEmail}>{member.email}</ThemedText>
          </View>

          <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
        </View>

        <View style={styles.memberFooter}>
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
            <ThemedText style={[styles.statusText, { color: getStatusBadgeColor(member.status) }]}>
              {teamService.getStatusLabel(member.status)}
            </ThemedText>
          </View>

          {member.lastLoginAt && (
            <ThemedText style={styles.lastLogin}>
              Last login: {new Date(member.lastLoginAt).toLocaleDateString()}
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery || filterRole !== 'all' || filterStatus !== 'all') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyTitle}>No members found</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </ThemedText>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setFilterRole('all');
              setFilterStatus('all');
            }}
          >
            <ThemedText style={styles.clearFiltersText}>Clear Filters</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={Colors.light.textSecondary} />
        <ThemedText style={styles.emptyTitle}>No team members yet</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Invite team members to collaborate on your merchant account
        </ThemedText>
        {canInvite && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => router.push('/team/invite')}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.inviteButtonText}>Invite Team Member</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
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
              Team Management
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading team members...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Team Management
          </ThemedText>
          {currentUserRole === 'owner' && (
            <TouchableOpacity
              onPress={() => router.push('/team/roles')}
              style={styles.rolesButton}
            >
              <Ionicons name="shield-outline" size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, email, or role..."
              placeholderTextColor={Colors.light.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContainer}
          >
            {/* Role Filters */}
            <TouchableOpacity
              style={[styles.filterChip, filterRole === 'all' && styles.filterChipActive]}
              onPress={() => setFilterRole('all')}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  filterRole === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Roles
              </ThemedText>
            </TouchableOpacity>

            {(['owner', 'admin', 'manager', 'staff'] as MerchantRole[]).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
                onPress={() => setFilterRole(role)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    filterRole === role && styles.filterChipTextActive,
                  ]}
                >
                  {teamService.formatRoleLabel(role)}
                </ThemedText>
              </TouchableOpacity>
            ))}

            {/* Status Filters */}
            <View style={styles.filterDivider} />

            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
              onPress={() => setFilterStatus('all')}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  filterStatus === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Status
              </ThemedText>
            </TouchableOpacity>

            {(['active', 'inactive', 'suspended'] as TeamMemberStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}
                >
                  {teamService.getStatusLabel(status)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{teamMembers.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Members</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {teamMembers.filter((m) => m.status === 'active').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {teamMembers.filter((m) => m.status === 'inactive').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </View>
        </View>

        {/* Team Members List */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
            />
          }
        >
          {filteredMembers.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.membersList}>
              {filteredMembers.map((member) => renderMemberCard(member))}
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Invite Button (FAB) */}
        {canInvite && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/team/invite')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="white" />
            <ThemedText style={styles.fabText}>Invite</ThemedText>
          </TouchableOpacity>
        )}
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
  rolesButton: {
    padding: 4,
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
  searchContainer: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  filtersScroll: {
    marginHorizontal: -16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: 'white',
  },
  filterDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  content: {
    flex: 1,
  },
  membersList: {
    padding: 16,
    gap: 12,
  },
  memberCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  memberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
    fontSize: 12,
    fontWeight: '600',
  },
  lastLogin: {
    fontSize: 11,
    color: Colors.light.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.light.primary,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 80,
  },
});

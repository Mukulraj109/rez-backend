/**
 * Team Management - Roles Overview Screen
 * Displays all available roles with their capabilities (Owner only)
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
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { MerchantRole, RoleCapabilities } from '@/types/team';

export default function RolesScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<MerchantRole>('staff');
  const [selectedRole, setSelectedRole] = useState<MerchantRole>('owner');

  useEffect(() => {
    if (token) {
      checkPermissions();
    }
  }, [token]);

  const checkPermissions = async () => {
    try {
      setLoading(true);
      const permissions = await teamService.getCurrentUserPermissions();
      setCurrentUserRole(permissions.role);

      // Only owner can access this screen
      if (permissions.role !== 'owner') {
        Alert.alert(
          'Access Denied',
          'Only the account owner can view role management.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check permissions');
      router.back();
    } finally {
      setLoading(false);
    }
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

  const renderRoleCard = (role: MerchantRole) => {
    const capabilities = teamService.getRoleCapabilities(role);
    const isSelected = selectedRole === role;
    const roleColor = getRoleBadgeColor(role);

    return (
      <TouchableOpacity
        key={role}
        style={[
          styles.roleCard,
          isSelected && { borderColor: roleColor, borderWidth: 2 },
        ]}
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.7}
      >
        <View style={styles.roleCardHeader}>
          <View style={styles.roleCardLeft}>
            <View style={[styles.roleIcon, { backgroundColor: roleColor + '20' }]}>
              <Ionicons
                name={
                  role === 'owner'
                    ? 'shield'
                    : role === 'admin'
                    ? 'star'
                    : role === 'manager'
                    ? 'briefcase'
                    : 'person'
                }
                size={24}
                color={roleColor}
              />
            </View>

            <View style={styles.roleCardInfo}>
              <ThemedText style={styles.roleCardTitle}>
                {teamService.formatRoleLabel(role)}
              </ThemedText>
              <ThemedText style={styles.roleCardSubtitle}>
                {capabilities.permissionCount} permissions
              </ThemedText>
            </View>
          </View>

          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <ThemedText style={styles.roleBadgeText}>
              {teamService.formatRoleLabel(role)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.roleCardDivider} />

        <ThemedText style={styles.roleDescription}>{capabilities.description}</ThemedText>

        <View style={styles.capabilitiesGrid}>
          {capabilities.canManageProducts && (
            <View style={styles.capabilityChip}>
              <Ionicons name="cube" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Products</ThemedText>
            </View>
          )}
          {capabilities.canManageOrders && (
            <View style={styles.capabilityChip}>
              <Ionicons name="receipt" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Orders</ThemedText>
            </View>
          )}
          {capabilities.canManageTeam && (
            <View style={styles.capabilityChip}>
              <Ionicons name="people" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Team</ThemedText>
            </View>
          )}
          {capabilities.canViewAnalytics && (
            <View style={styles.capabilityChip}>
              <Ionicons name="analytics" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Analytics</ThemedText>
            </View>
          )}
          {capabilities.canManageSettings && (
            <View style={styles.capabilityChip}>
              <Ionicons name="settings" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Settings</ThemedText>
            </View>
          )}
          {capabilities.canManageBilling && (
            <View style={styles.capabilityChip}>
              <Ionicons name="card" size={16} color={Colors.light.success} />
              <ThemedText style={styles.capabilityText}>Billing</ThemedText>
            </View>
          )}
        </View>

        {isSelected && (
          <TouchableOpacity
            style={[styles.viewPermissionsButton, { backgroundColor: roleColor }]}
            onPress={() => router.push({ pathname: '/team/permissions', params: { role } })}
          >
            <ThemedText style={styles.viewPermissionsText}>
              View All Permissions
            </ThemedText>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
              Role Management
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading roles...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (currentUserRole !== 'owner') {
    return null;
  }

  const roles: MerchantRole[] = ['owner', 'admin', 'manager', 'staff'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Role Management
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.push('/team/permissions')}
            style={styles.permissionsButton}
          >
            <Ionicons name="list-outline" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={Colors.light.info} />
            <View style={styles.infoBannerContent}>
              <ThemedText style={styles.infoBannerTitle}>Role-Based Access Control</ThemedText>
              <ThemedText style={styles.infoBannerText}>
                Each role has specific permissions that control what team members can access and
                manage in your merchant account.
              </ThemedText>
            </View>
          </View>

          {/* Roles Grid */}
          <View style={styles.rolesSection}>
            <ThemedText style={styles.sectionTitle}>Available Roles</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Tap a role card to view details and permissions
            </ThemedText>

            <View style={styles.rolesGrid}>
              {roles.map((role) => renderRoleCard(role))}
            </View>
          </View>

          {/* Role Hierarchy */}
          <View style={styles.hierarchySection}>
            <ThemedText style={styles.sectionTitle}>Role Hierarchy</ThemedText>
            <View style={styles.hierarchyCard}>
              <View style={styles.hierarchyItem}>
                <View style={styles.hierarchyLevel}>
                  <View
                    style={[
                      styles.hierarchyDot,
                      { backgroundColor: getRoleBadgeColor('owner') },
                    ]}
                  />
                  <View style={styles.hierarchyLine} />
                </View>
                <View style={styles.hierarchyContent}>
                  <ThemedText style={styles.hierarchyTitle}>Owner</ThemedText>
                  <ThemedText style={styles.hierarchyDescription}>
                    Full control of the merchant account
                  </ThemedText>
                </View>
              </View>

              <View style={styles.hierarchyItem}>
                <View style={styles.hierarchyLevel}>
                  <View
                    style={[
                      styles.hierarchyDot,
                      { backgroundColor: getRoleBadgeColor('admin') },
                    ]}
                  />
                  <View style={styles.hierarchyLine} />
                </View>
                <View style={styles.hierarchyContent}>
                  <ThemedText style={styles.hierarchyTitle}>Admin</ThemedText>
                  <ThemedText style={styles.hierarchyDescription}>
                    Manage products, orders, and team
                  </ThemedText>
                </View>
              </View>

              <View style={styles.hierarchyItem}>
                <View style={styles.hierarchyLevel}>
                  <View
                    style={[
                      styles.hierarchyDot,
                      { backgroundColor: getRoleBadgeColor('manager') },
                    ]}
                  />
                  <View style={styles.hierarchyLine} />
                </View>
                <View style={styles.hierarchyContent}>
                  <ThemedText style={styles.hierarchyTitle}>Manager</ThemedText>
                  <ThemedText style={styles.hierarchyDescription}>
                    Manage products and orders
                  </ThemedText>
                </View>
              </View>

              <View style={styles.hierarchyItem}>
                <View style={styles.hierarchyLevel}>
                  <View
                    style={[
                      styles.hierarchyDot,
                      { backgroundColor: getRoleBadgeColor('staff') },
                    ]}
                  />
                </View>
                <View style={styles.hierarchyContent}>
                  <ThemedText style={styles.hierarchyTitle}>Staff</ThemedText>
                  <ThemedText style={styles.hierarchyDescription}>
                    View-only access with limited actions
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

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
  permissionsButton: {
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.light.info + '15',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.info,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  rolesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  rolesGrid: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleCardInfo: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
  roleCardDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  capabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  capabilityText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
  },
  viewPermissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  viewPermissionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  hierarchySection: {
    marginBottom: 24,
  },
  hierarchyCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
  },
  hierarchyItem: {
    flexDirection: 'row',
    gap: 16,
  },
  hierarchyLevel: {
    alignItems: 'center',
    width: 20,
  },
  hierarchyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  hierarchyLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  hierarchyContent: {
    flex: 1,
    paddingBottom: 20,
  },
  hierarchyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  hierarchyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

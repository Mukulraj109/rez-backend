/**
 * Team Management - Permissions Matrix Screen
 * Displays all permissions across roles with visual grid
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { MerchantRole, Permission } from '@/types/team';

interface PermissionCategory {
  name: string;
  icon: string;
  permissions: Array<{
    permission: Permission;
    description: string;
  }>;
}

export default function PermissionsScreen() {
  const { role: paramRole } = useLocalSearchParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<MerchantRole>('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<MerchantRole | 'all'>(
    (paramRole as MerchantRole) || 'all'
  );

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
          'Only the account owner can view the permissions matrix.',
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

  const getAllPermissions = (): PermissionCategory[] => {
    const categories: Record<string, PermissionCategory> = {
      products: {
        name: 'Products',
        icon: 'cube-outline',
        permissions: [
          { permission: 'products:view', description: 'View products' },
          { permission: 'products:create', description: 'Create new products' },
          { permission: 'products:edit', description: 'Edit existing products' },
          { permission: 'products:delete', description: 'Delete products' },
          { permission: 'products:bulk_import', description: 'Bulk import products' },
          { permission: 'products:export', description: 'Export products' },
        ],
      },
      orders: {
        name: 'Orders',
        icon: 'receipt-outline',
        permissions: [
          { permission: 'orders:view', description: 'View orders' },
          { permission: 'orders:view_all', description: 'View all order details' },
          { permission: 'orders:update_status', description: 'Update order status' },
          { permission: 'orders:cancel', description: 'Cancel orders' },
          { permission: 'orders:refund', description: 'Process refunds' },
          { permission: 'orders:export', description: 'Export orders' },
        ],
      },
      team: {
        name: 'Team',
        icon: 'people-outline',
        permissions: [
          { permission: 'team:view', description: 'View team members' },
          { permission: 'team:invite', description: 'Invite team members' },
          { permission: 'team:remove', description: 'Remove team members' },
          { permission: 'team:change_role', description: 'Change team member roles' },
          { permission: 'team:change_status', description: 'Change team member status' },
        ],
      },
      analytics: {
        name: 'Analytics',
        icon: 'analytics-outline',
        permissions: [
          { permission: 'analytics:view', description: 'View analytics' },
          { permission: 'analytics:view_revenue', description: 'View revenue analytics' },
          { permission: 'analytics:view_costs', description: 'View cost analytics' },
          { permission: 'analytics:export', description: 'Export analytics' },
        ],
      },
      settings: {
        name: 'Settings',
        icon: 'settings-outline',
        permissions: [
          { permission: 'settings:view', description: 'View settings' },
          { permission: 'settings:edit', description: 'Edit all settings' },
          { permission: 'settings:edit_basic', description: 'Edit basic settings' },
        ],
      },
      billing: {
        name: 'Billing',
        icon: 'card-outline',
        permissions: [
          { permission: 'billing:view', description: 'View billing' },
          { permission: 'billing:manage', description: 'Manage billing' },
          { permission: 'billing:view_invoices', description: 'View invoices' },
        ],
      },
      customers: {
        name: 'Customers',
        icon: 'person-outline',
        permissions: [
          { permission: 'customers:view', description: 'View customers' },
          { permission: 'customers:edit', description: 'Edit customers' },
          { permission: 'customers:delete', description: 'Delete customers' },
          { permission: 'customers:export', description: 'Export customers' },
        ],
      },
      promotions: {
        name: 'Promotions',
        icon: 'pricetag-outline',
        permissions: [
          { permission: 'promotions:view', description: 'View promotions' },
          { permission: 'promotions:create', description: 'Create promotions' },
          { permission: 'promotions:edit', description: 'Edit promotions' },
          { permission: 'promotions:delete', description: 'Delete promotions' },
        ],
      },
      reviews: {
        name: 'Reviews',
        icon: 'star-outline',
        permissions: [
          { permission: 'reviews:view', description: 'View reviews' },
          { permission: 'reviews:respond', description: 'Respond to reviews' },
          { permission: 'reviews:delete', description: 'Delete reviews' },
        ],
      },
      notifications: {
        name: 'Notifications',
        icon: 'notifications-outline',
        permissions: [
          { permission: 'notifications:view', description: 'View notifications' },
          { permission: 'notifications:send', description: 'Send notifications' },
        ],
      },
      reports: {
        name: 'Reports',
        icon: 'document-text-outline',
        permissions: [
          { permission: 'reports:view', description: 'View reports' },
          { permission: 'reports:export', description: 'Export reports' },
          { permission: 'reports:view_detailed', description: 'View detailed reports' },
        ],
      },
      inventory: {
        name: 'Inventory',
        icon: 'list-outline',
        permissions: [
          { permission: 'inventory:view', description: 'View inventory' },
          { permission: 'inventory:edit', description: 'Edit inventory' },
          { permission: 'inventory:bulk_update', description: 'Bulk update inventory' },
        ],
      },
      categories: {
        name: 'Categories',
        icon: 'grid-outline',
        permissions: [
          { permission: 'categories:view', description: 'View categories' },
          { permission: 'categories:create', description: 'Create categories' },
          { permission: 'categories:edit', description: 'Edit categories' },
          { permission: 'categories:delete', description: 'Delete categories' },
        ],
      },
      profile: {
        name: 'Profile',
        icon: 'storefront-outline',
        permissions: [
          { permission: 'profile:view', description: 'View store profile' },
          { permission: 'profile:edit', description: 'Edit store profile' },
        ],
      },
      logs: {
        name: 'Logs',
        icon: 'time-outline',
        permissions: [
          { permission: 'logs:view', description: 'View activity logs' },
          { permission: 'logs:export', description: 'Export activity logs' },
        ],
      },
      api: {
        name: 'API',
        icon: 'code-outline',
        permissions: [
          { permission: 'api:access', description: 'Access API' },
          { permission: 'api:manage_keys', description: 'Manage API keys' },
        ],
      },
    };

    return Object.values(categories);
  };

  const getRolePermissions = (role: MerchantRole): Set<Permission> => {
    const capabilities = teamService.getRoleCapabilities(role);
    return new Set(capabilities.permissions);
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

  const filterPermissions = (): PermissionCategory[] => {
    let categories = getAllPermissions();

    // Filter by category
    if (selectedCategory !== 'all') {
      categories = categories.filter((cat) => cat.name.toLowerCase() === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      categories = categories
        .map((cat) => ({
          ...cat,
          permissions: cat.permissions.filter(
            (p) =>
              p.description.toLowerCase().includes(query) ||
              p.permission.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.permissions.length > 0);
    }

    // Filter by role
    if (selectedRoleFilter !== 'all') {
      const rolePermissions = getRolePermissions(selectedRoleFilter);
      categories = categories
        .map((cat) => ({
          ...cat,
          permissions: cat.permissions.filter((p) => rolePermissions.has(p.permission)),
        }))
        .filter((cat) => cat.permissions.length > 0);
    }

    return categories;
  };

  const renderPermissionRow = (
    permissionItem: { permission: Permission; description: string },
    categoryName: string
  ) => {
    const roles: MerchantRole[] = ['owner', 'admin', 'manager', 'staff'];

    return (
      <View key={permissionItem.permission} style={styles.permissionRow}>
        <View style={styles.permissionInfo}>
          <ThemedText style={styles.permissionDescription}>
            {permissionItem.description}
          </ThemedText>
          <ThemedText style={styles.permissionKey}>{permissionItem.permission}</ThemedText>
        </View>

        <View style={styles.roleChecks}>
          {roles.map((role) => {
            const rolePermissions = getRolePermissions(role);
            const hasPermission = rolePermissions.has(permissionItem.permission);

            return (
              <View
                key={role}
                style={[
                  styles.roleCheck,
                  { backgroundColor: hasPermission ? getRoleBadgeColor(role) + '15' : 'transparent' },
                ]}
              >
                {hasPermission ? (
                  <Ionicons name="checkmark-circle" size={20} color={getRoleBadgeColor(role)} />
                ) : (
                  <Ionicons name="close-circle" size={20} color={Colors.light.border} />
                )}
              </View>
            );
          })}
        </View>
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
              Permissions Matrix
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={styles.loadingText}>Loading permissions...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (currentUserRole !== 'owner') {
    return null;
  }

  const filteredCategories = filterPermissions();
  const allCategories = getAllPermissions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Permissions Matrix
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Search and Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search permissions..."
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
            contentContainerStyle={styles.chipsContainer}
          >
            <TouchableOpacity
              style={[styles.chip, selectedRoleFilter === 'all' && styles.chipActive]}
              onPress={() => setSelectedRoleFilter('all')}
            >
              <ThemedText
                style={[styles.chipText, selectedRoleFilter === 'all' && styles.chipTextActive]}
              >
                All Roles
              </ThemedText>
            </TouchableOpacity>

            {(['owner', 'admin', 'manager', 'staff'] as MerchantRole[]).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.chip, selectedRoleFilter === role && styles.chipActive]}
                onPress={() => setSelectedRoleFilter(role)}
              >
                <ThemedText
                  style={[styles.chipText, selectedRoleFilter === role && styles.chipTextActive]}
                >
                  {teamService.formatRoleLabel(role)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Role Headers */}
        <View style={styles.roleHeaders}>
          <View style={styles.roleHeadersLeft}>
            <ThemedText style={styles.roleHeadersTitle}>Permission</ThemedText>
          </View>
          <View style={styles.roleHeadersRight}>
            {(['owner', 'admin', 'manager', 'staff'] as MerchantRole[]).map((role) => (
              <View key={role} style={styles.roleHeaderItem}>
                <ThemedText style={styles.roleHeaderText}>
                  {teamService.formatRoleLabel(role).substring(0, 1)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Permissions List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={Colors.light.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No permissions found</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </ThemedText>
            </View>
          ) : (
            filteredCategories.map((category) => (
              <View key={category.name} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLeft}>
                    <Ionicons name={category.icon as any} size={20} color={Colors.light.primary} />
                    <ThemedText style={styles.categoryTitle}>{category.name}</ThemedText>
                  </View>
                  <ThemedText style={styles.categoryCount}>
                    {category.permissions.length} permission{category.permissions.length !== 1 ? 's' : ''}
                  </ThemedText>
                </View>

                <View style={styles.permissionsContainer}>
                  {category.permissions.map((perm) => renderPermissionRow(perm, category.name))}
                </View>
              </View>
            ))
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
  filtersContainer: {
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
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: 'white',
  },
  roleHeaders: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
  },
  roleHeadersLeft: {
    flex: 1,
  },
  roleHeadersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  roleHeadersRight: {
    flexDirection: 'row',
    gap: 8,
  },
  roleHeaderItem: {
    width: 40,
    alignItems: 'center',
  },
  roleHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  categorySection: {
    backgroundColor: Colors.light.background,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  permissionsContainer: {
    padding: 16,
    gap: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  permissionKey: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontFamily: 'monospace',
  },
  roleChecks: {
    flexDirection: 'row',
    gap: 8,
  },
  roleCheck: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
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
  },
  bottomSpacing: {
    height: 40,
  },
});

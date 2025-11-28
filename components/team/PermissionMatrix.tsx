import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Permission, MerchantRole } from '../../types/team';
import { useThemedStyles } from '../ui/ThemeProvider';
import { PermissionToggle } from './PermissionToggle';
import { RoleBadge } from './RoleBadge';

interface PermissionMatrixProps {
  role: MerchantRole;
  permissions: Permission[];
  viewOnly?: boolean;
  onPermissionChange?: (permission: Permission, enabled: boolean) => void;
  style?: ViewStyle;
  testID?: string;
}

interface PermissionGroup {
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  permissions: Array<{
    permission: Permission;
    description: string;
    enabled: boolean;
  }>;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  role,
  permissions,
  viewOnly = true,
  onPermissionChange,
  style,
  testID,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['products', 'orders']) // Default expanded categories
  );

  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    header: {
      padding: theme.spacing.base,
      gap: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    } as ViewStyle,
    roleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as ViewStyle,
    roleDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,
    permissionCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    } as ViewStyle,
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      minHeight: 36,
    },
    content: {
      padding: theme.spacing.base,
    } as ViewStyle,
    categoryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      marginBottom: theme.spacing.base,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    } as ViewStyle,
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.base,
      backgroundColor: theme.colors.backgroundSecondary,
    } as ViewStyle,
    categoryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    } as ViewStyle,
    categoryIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.base,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    categoryTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
      textTransform: 'capitalize',
      flex: 1,
    },
    categoryBadge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.base,
    } as ViewStyle,
    categoryCount: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary,
    },
    permissionsList: {
      padding: theme.spacing.sm,
      gap: theme.spacing.sm,
    } as ViewStyle,
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

  // Permission descriptions
  const permissionDescriptions: Record<string, string> = {
    'products:view': 'View all products in the catalog',
    'products:create': 'Add new products to the store',
    'products:edit': 'Modify existing product details',
    'products:delete': 'Remove products from the store',
    'products:bulk_import': 'Import multiple products at once',
    'products:export': 'Export product data',
    'orders:view': 'View assigned orders',
    'orders:view_all': 'View all store orders',
    'orders:update_status': 'Change order status',
    'orders:cancel': 'Cancel customer orders',
    'orders:refund': 'Process refunds',
    'orders:export': 'Export order data',
    'team:view': 'View team members',
    'team:invite': 'Invite new team members',
    'team:remove': 'Remove team members',
    'team:change_role': 'Change team member roles',
    'team:change_status': 'Update member status',
    'analytics:view': 'View basic analytics',
    'analytics:view_revenue': 'View revenue data',
    'analytics:view_costs': 'View cost data',
    'analytics:export': 'Export analytics reports',
    'settings:view': 'View store settings',
    'settings:edit': 'Modify all settings',
    'settings:edit_basic': 'Edit basic settings only',
    'billing:view': 'View billing information',
    'billing:manage': 'Manage payment methods',
    'billing:view_invoices': 'View invoices',
    'customers:view': 'View customer list',
    'customers:edit': 'Edit customer details',
    'customers:delete': 'Remove customers',
    'customers:export': 'Export customer data',
    'promotions:view': 'View promotions',
    'promotions:create': 'Create new promotions',
    'promotions:edit': 'Modify promotions',
    'promotions:delete': 'Remove promotions',
    'reviews:view': 'View customer reviews',
    'reviews:respond': 'Respond to reviews',
    'reviews:delete': 'Delete reviews',
    'notifications:view': 'View notifications',
    'notifications:send': 'Send notifications',
    'reports:view': 'View reports',
    'reports:export': 'Export reports',
    'reports:view_detailed': 'View detailed reports',
    'inventory:view': 'View inventory levels',
    'inventory:edit': 'Update inventory',
    'inventory:bulk_update': 'Bulk update inventory',
    'categories:view': 'View categories',
    'categories:create': 'Create categories',
    'categories:edit': 'Edit categories',
    'categories:delete': 'Delete categories',
    'profile:view': 'View own profile',
    'profile:edit': 'Edit own profile',
    'logs:view': 'View activity logs',
    'logs:export': 'Export logs',
    'api:access': 'Access API',
    'api:manage_keys': 'Manage API keys',
  };

  // Group permissions by category
  const permissionGroups = useMemo((): PermissionGroup[] => {
    const groups: Record<string, PermissionGroup> = {};

    // Category icons
    const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
      products: 'cube-outline',
      orders: 'receipt-outline',
      team: 'people-outline',
      analytics: 'stats-chart-outline',
      settings: 'settings-outline',
      billing: 'card-outline',
      customers: 'person-outline',
      promotions: 'pricetag-outline',
      reviews: 'star-outline',
      notifications: 'notifications-outline',
      reports: 'document-text-outline',
      inventory: 'list-outline',
      categories: 'apps-outline',
      profile: 'person-circle-outline',
      logs: 'time-outline',
      api: 'code-slash-outline',
    };

    // Get all possible permissions from the type
    const allPermissions: Permission[] = Object.keys(
      permissionDescriptions
    ) as Permission[];

    allPermissions.forEach((perm) => {
      const [category] = perm.split(':');
      if (!groups[category]) {
        groups[category] = {
          category,
          icon: categoryIcons[category] || 'key-outline',
          permissions: [],
        };
      }

      const enabled = permissions.includes(perm);
      const matchesSearch =
        !searchQuery ||
        perm.toLowerCase().includes(searchQuery.toLowerCase()) ||
        permissionDescriptions[perm]
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (matchesSearch) {
        groups[category].permissions.push({
          permission: perm,
          description: permissionDescriptions[perm] || '',
          enabled,
        });
      }
    });

    return Object.values(groups).filter((group) => group.permissions.length > 0);
  }, [permissions, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const totalEnabledPermissions = permissions.length;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.header}>
        <View style={styles.roleInfo}>
          <View style={styles.roleDetails}>
            <RoleBadge role={role} size="medium" showIcon />
            <Text style={styles.permissionCount}>
              {totalEnabledPermissions} permission{totalEnabledPermissions !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search permissions..."
            placeholderTextColor="#9CA3AF"
            testID={`${testID}-search-input`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {permissionGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              No permissions found matching "{searchQuery}"
            </Text>
          </View>
        ) : (
          permissionGroups.map((group) => {
            const isExpanded = expandedCategories.has(group.category);
            const enabledCount = group.permissions.filter((p) => p.enabled).length;

            return (
              <View key={group.category} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(group.category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name={group.icon} size={20} color="#7C3AED" />
                    </View>
                    <Text style={styles.categoryTitle}>{group.category}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryCount}>
                        {enabledCount}/{group.permissions.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.permissionsList}>
                    {group.permissions.map((perm) => (
                      <PermissionToggle
                        key={perm.permission}
                        permission={perm.permission}
                        enabled={perm.enabled}
                        onChange={
                          viewOnly
                            ? undefined
                            : (enabled) =>
                                onPermissionChange?.(perm.permission, enabled)
                        }
                        disabled={viewOnly}
                        description={perm.description}
                        testID={`${testID}-permission-${perm.permission}`}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

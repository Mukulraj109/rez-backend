/**
 * useRBAC Hook
 * Main RBAC hook with permission checking, caching, and authorization
 */

import { useMemo, useCallback } from 'react';
import { usePermissions } from './usePermissions';
import { Permission, MerchantRole } from '../types/team';
import { ROLE_HIERARCHY } from '../constants/roles';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsByCategory,
  isSensitivePermission,
} from '../utils/permissions';

/**
 * Action types for authorization
 */
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'manage' | 'access';

/**
 * Resource types for authorization
 */
export type Resource =
  | 'products'
  | 'orders'
  | 'team'
  | 'analytics'
  | 'settings'
  | 'billing'
  | 'customers'
  | 'promotions'
  | 'reviews'
  | 'notifications'
  | 'reports'
  | 'inventory'
  | 'categories'
  | 'profile'
  | 'logs'
  | 'api';

/**
 * Authorization result
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  permission?: Permission;
}

/**
 * Main RBAC Hook
 */
export const useRBAC = () => {
  const { permissions, role, isLoading, roleDescription } = usePermissions();

  /**
   * Check if user has a specific permission
   * Uses memoization for performance
   */
  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      if (isLoading) return false;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  /**
   * Check if user can perform an action on a resource
   */
  const canPerformAction = useCallback(
    (action: Action, resource: Resource): AuthorizationResult => {
      if (isLoading) {
        return {
          authorized: false,
          reason: 'Loading permissions...',
        };
      }

      // Build permission string
      const permission = `${resource}:${action}` as Permission;

      // Check if permission exists in user's permissions
      const hasAccess = permissions.includes(permission);

      if (!hasAccess) {
        return {
          authorized: false,
          reason: `You don't have permission to ${action} ${resource}`,
          permission,
        };
      }

      return {
        authorized: true,
        permission,
      };
    },
    [permissions, isLoading]
  );

  /**
   * Check if user can view a resource
   */
  const canView = useCallback(
    (resource: Resource): boolean => {
      return canPerformAction('view', resource).authorized;
    },
    [canPerformAction]
  );

  /**
   * Check if user can create a resource
   */
  const canCreate = useCallback(
    (resource: Resource): boolean => {
      return canPerformAction('create', resource).authorized;
    },
    [canPerformAction]
  );

  /**
   * Check if user can edit a resource
   */
  const canEdit = useCallback(
    (resource: Resource): boolean => {
      return canPerformAction('edit', resource).authorized;
    },
    [canPerformAction]
  );

  /**
   * Check if user can delete a resource
   */
  const canDelete = useCallback(
    (resource: Resource): boolean => {
      return canPerformAction('delete', resource).authorized;
    },
    [canPerformAction]
  );

  /**
   * Check if user can export a resource
   */
  const canExport = useCallback(
    (resource: Resource): boolean => {
      return canPerformAction('export', resource).authorized;
    },
    [canPerformAction]
  );

  /**
   * Check if user can manage a resource (edit + delete)
   */
  const canManage = useCallback(
    (resource: Resource): boolean => {
      const editPermission = `${resource}:edit` as Permission;
      const deletePermission = `${resource}:delete` as Permission;
      return permissions.includes(editPermission) || permissions.includes(deletePermission);
    },
    [permissions]
  );

  /**
   * Check if user has role hierarchy level
   */
  const hasRoleLevel = useCallback(
    (minRole: MerchantRole): boolean => {
      return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
    },
    [role]
  );

  /**
   * Check if user can access a feature based on multiple permissions
   */
  const canAccessFeature = useCallback(
    (requiredPermissions: Permission[], requireAll: boolean = false): boolean => {
      if (isLoading) return false;

      if (requireAll) {
        return requiredPermissions.every(p => permissions.includes(p));
      } else {
        return requiredPermissions.some(p => permissions.includes(p));
      }
    },
    [permissions, isLoading]
  );

  /**
   * Get permissions grouped by category
   */
  const permissionsByCategory = useMemo(() => {
    return getPermissionsByCategory(role);
  }, [role]);

  /**
   * Check if a permission is sensitive
   */
  const isPermissionSensitive = useCallback(
    (permission: Permission): boolean => {
      return isSensitivePermission(permission);
    },
    []
  );

  /**
   * Get all sensitive permissions user has
   */
  const sensitivePermissions = useMemo(() => {
    return permissions.filter(p => isSensitivePermission(p));
  }, [permissions]);

  /**
   * Check if user can edit another team member
   */
  const canEditTeamMember = useCallback(
    (targetRole: MerchantRole): boolean => {
      // Owner can edit anyone except other owners
      if (role === 'owner') {
        return targetRole !== 'owner';
      }

      // Admin can edit manager and staff
      if (role === 'admin') {
        return targetRole === 'manager' || targetRole === 'staff';
      }

      // Manager can edit staff
      if (role === 'manager') {
        return targetRole === 'staff';
      }

      // Staff cannot edit anyone
      return false;
    },
    [role]
  );

  /**
   * Check if user can assign a role
   */
  const canAssignRole = useCallback(
    (targetRole: MerchantRole): boolean => {
      // Owner role cannot be assigned
      if (targetRole === 'owner') return false;

      // Check if user has permission to change roles
      if (!permissions.includes('team:change_role')) return false;

      // Check hierarchy - can only assign roles below current role
      return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[targetRole];
    },
    [role, permissions]
  );

  /**
   * Get UI visibility rules
   */
  const uiVisibility = useMemo(() => {
    return {
      // Navigation items
      showProducts: canView('products'),
      showOrders: canView('orders'),
      showTeam: canView('team'),
      showAnalytics: canView('analytics'),
      showSettings: permissions.includes('settings:view' as Permission),
      showBilling: permissions.includes('billing:view' as Permission),
      showCustomers: canView('customers'),
      showPromotions: canView('promotions'),
      showReviews: canView('reviews'),
      showReports: canView('reports'),
      showInventory: canView('inventory'),
      showCategories: canView('categories'),
      showLogs: permissions.includes('logs:view' as Permission),

      // Action buttons
      showCreateProduct: canCreate('products'),
      showDeleteProduct: canDelete('products'),
      showExportProducts: canExport('products'),
      showInviteTeam: permissions.includes('team:invite' as Permission),
      showManageBilling: permissions.includes('billing:manage' as Permission),

      // Sections
      showFinancialData: permissions.includes('analytics:view_revenue' as Permission),
      showCostData: permissions.includes('analytics:view_costs' as Permission),
      showSensitiveData: sensitivePermissions.length > 0,

      // Features
      canBulkImport: permissions.includes('products:bulk_import' as Permission),
      canProcessRefunds: permissions.includes('orders:refund' as Permission),
      canManageAPI: permissions.includes('api:manage_keys' as Permission),
    };
  }, [permissions, sensitivePermissions, canView, canCreate, canDelete, canExport]);

  /**
   * Authorization guard for actions
   */
  const authorize = useCallback(
    (
      requiredPermissions: Permission | Permission[],
      options?: {
        requireAll?: boolean;
        minRole?: MerchantRole;
        onUnauthorized?: () => void;
      }
    ): boolean => {
      // Check role level if specified
      if (options?.minRole && !hasRoleLevel(options.minRole)) {
        options?.onUnauthorized?.();
        return false;
      }

      // Check permissions
      const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const authorized = canAccessFeature(permissionsArray, options?.requireAll);

      if (!authorized) {
        options?.onUnauthorized?.();
      }

      return authorized;
    },
    [hasRoleLevel, canAccessFeature]
  );

  /**
   * Get permission summary
   */
  const permissionSummary = useMemo(() => {
    return {
      total: permissions.length,
      sensitive: sensitivePermissions.length,
      byCategory: Object.keys(permissionsByCategory).reduce((acc, category) => {
        acc[category] = permissionsByCategory[category].length;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [permissions, sensitivePermissions, permissionsByCategory]);

  /**
   * Check if loading
   */
  const isReady = !isLoading;

  return {
    // Basic checks
    checkPermission,
    hasPermission: checkPermission,
    canPerformAction,

    // Resource actions
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canManage,

    // Role checks
    role,
    roleDescription,
    hasRoleLevel,
    isOwner: role === 'owner',
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',

    // Feature access
    canAccessFeature,
    authorize,

    // Team management
    canEditTeamMember,
    canAssignRole,

    // Permission info
    permissions,
    permissionsByCategory,
    isPermissionSensitive,
    sensitivePermissions,
    permissionSummary,

    // UI visibility
    uiVisibility,

    // State
    isLoading,
    isReady,
  };
};

/**
 * Hook for resource-specific RBAC
 */
export const useResourceRBAC = (resource: Resource) => {
  const rbac = useRBAC();

  return useMemo(() => {
    return {
      canView: rbac.canView(resource),
      canCreate: rbac.canCreate(resource),
      canEdit: rbac.canEdit(resource),
      canDelete: rbac.canDelete(resource),
      canExport: rbac.canExport(resource),
      canManage: rbac.canManage(resource),
      resource,
      isLoading: rbac.isLoading,
    };
  }, [rbac, resource]);
};

/**
 * Hook for action-specific authorization
 */
export const useActionAuth = (action: Action, resource: Resource) => {
  const rbac = useRBAC();

  return useMemo(() => {
    const result = rbac.canPerformAction(action, resource);
    return {
      authorized: result.authorized,
      reason: result.reason,
      permission: result.permission,
      isLoading: rbac.isLoading,
    };
  }, [rbac, action, resource]);
};

/**
 * Hook for multiple permission checks
 */
export const useMultiplePermissions = (permissions: Permission[], requireAll: boolean = false) => {
  const { canAccessFeature, isLoading } = useRBAC();

  return useMemo(() => {
    return {
      authorized: canAccessFeature(permissions, requireAll),
      isLoading,
      permissions,
      requireAll,
    };
  }, [canAccessFeature, permissions, requireAll, isLoading]);
};

/**
 * Export all RBAC hooks
 */
export default {
  useRBAC,
  useResourceRBAC,
  useActionAuth,
  useMultiplePermissions,
};

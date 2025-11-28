/**
 * usePermissions Hook
 * Custom hook for permission checking and role management
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamService } from '../services/api/team';
import { Permission, MerchantRole, CurrentUserTeam } from '../types/team';
import {
  hasPermission as utilHasPermission,
  hasAnyPermission as utilHasAnyPermission,
  hasAllPermissions as utilHasAllPermissions,
  getRolePermissions,
} from '../utils/permissions';

/**
 * Query keys for React Query caching
 */
export const PERMISSIONS_QUERY_KEYS = {
  currentUser: ['permissions', 'current-user'] as const,
  checkPermission: (permission: Permission) => ['permissions', 'check', permission] as const,
};

/**
 * Hook to get current user's permissions
 */
export const usePermissions = () => {
  const {
    data: userTeam,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CurrentUserTeam>({
    queryKey: PERMISSIONS_QUERY_KEYS.currentUser,
    queryFn: () => teamService.getCurrentUserPermissions(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
  });

  const permissions = useMemo(() => userTeam?.permissions || [], [userTeam?.permissions]);
  const role = useMemo(() => userTeam?.role || 'staff', [userTeam?.role]);

  return {
    permissions,
    role,
    roleDescription: userTeam?.roleDescription,
    permissionCount: userTeam?.permissionCount || 0,
    isLoading,
    isError,
    error,
    refetch,
  };
};

/**
 * Hook to check if user has a specific permission
 */
export const useHasPermission = (permission: Permission): boolean => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => {
    if (isLoading) return false;
    return permissions.includes(permission);
  }, [permissions, permission, isLoading]);
};

/**
 * Hook to check if user has any of the specified permissions
 */
export const useHasAnyPermission = (requiredPermissions: Permission[]): boolean => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => {
    if (isLoading || requiredPermissions.length === 0) return false;
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions, requiredPermissions, isLoading]);
};

/**
 * Hook to check if user has all of the specified permissions
 */
export const useHasAllPermissions = (requiredPermissions: Permission[]): boolean => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => {
    if (isLoading || requiredPermissions.length === 0) return false;
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions, requiredPermissions, isLoading]);
};

/**
 * Hook to get current user's role
 */
export const useRole = (): MerchantRole => {
  const { role } = usePermissions();
  return role;
};

/**
 * Hook to check if user is owner
 */
export const useIsOwner = (): boolean => {
  const role = useRole();
  return role === 'owner';
};

/**
 * Hook to check if user is admin
 */
export const useIsAdmin = (): boolean => {
  const role = useRole();
  return role === 'admin';
};

/**
 * Hook to check if user is manager
 */
export const useIsManager = (): boolean => {
  const role = useRole();
  return role === 'manager';
};

/**
 * Hook to check if user is staff
 */
export const useIsStaff = (): boolean => {
  const role = useRole();
  return role === 'staff';
};

/**
 * Hook to check if user has at least a specific role level
 * Uses role hierarchy (owner > admin > manager > staff)
 */
export const useHasRoleOrHigher = (minRole: MerchantRole): boolean => {
  const role = useRole();

  return useMemo(() => {
    const roleHierarchy: Record<MerchantRole, number> = {
      owner: 4,
      admin: 3,
      manager: 2,
      staff: 1,
    };

    return roleHierarchy[role] >= roleHierarchy[minRole];
  }, [role, minRole]);
};

/**
 * Hook to check multiple permissions at once
 * Returns an object with permission states
 */
export const usePermissionChecks = (permissionsToCheck: Permission[]) => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => {
    const checks: Record<Permission, boolean> = {} as Record<Permission, boolean>;

    permissionsToCheck.forEach(permission => {
      checks[permission] = permissions.includes(permission);
    });

    return {
      checks,
      isLoading,
      hasAny: Object.values(checks).some(value => value),
      hasAll: Object.values(checks).every(value => value),
    };
  }, [permissions, permissionsToCheck, isLoading]);
};

/**
 * Hook for permission-based conditional rendering
 * Returns helper functions for common permission patterns
 */
export const usePermissionHelpers = () => {
  const { permissions, role, isLoading } = usePermissions();

  const canView = useCallback(
    (resource: string): boolean => {
      if (isLoading) return false;
      const permission = `${resource}:view` as Permission;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  const canCreate = useCallback(
    (resource: string): boolean => {
      if (isLoading) return false;
      const permission = `${resource}:create` as Permission;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  const canEdit = useCallback(
    (resource: string): boolean => {
      if (isLoading) return false;
      const permission = `${resource}:edit` as Permission;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  const canDelete = useCallback(
    (resource: string): boolean => {
      if (isLoading) return false;
      const permission = `${resource}:delete` as Permission;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  const canExport = useCallback(
    (resource: string): boolean => {
      if (isLoading) return false;
      const permission = `${resource}:export` as Permission;
      return permissions.includes(permission);
    },
    [permissions, isLoading]
  );

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    role,
    isLoading,
  };
};

/**
 * Hook for managing team member permissions
 * Useful for team management screens
 */
export const useTeamPermissions = () => {
  const { permissions, role } = usePermissions();

  const canViewTeam = useMemo(
    () => permissions.includes('team:view'),
    [permissions]
  );

  const canInviteMembers = useMemo(
    () => permissions.includes('team:invite'),
    [permissions]
  );

  const canRemoveMembers = useMemo(
    () => permissions.includes('team:remove'),
    [permissions]
  );

  const canChangeRoles = useMemo(
    () => permissions.includes('team:change_role'),
    [permissions]
  );

  const canChangeStatus = useMemo(
    () => permissions.includes('team:change_status'),
    [permissions]
  );

  /**
   * Check if current user can edit another team member
   * Based on role hierarchy
   */
  const canEditMember = useCallback(
    (memberRole: MerchantRole): boolean => {
      const roleHierarchy: Record<MerchantRole, number> = {
        owner: 4,
        admin: 3,
        manager: 2,
        staff: 1,
      };

      // Can't edit users with higher or equal role
      return roleHierarchy[role] > roleHierarchy[memberRole];
    },
    [role]
  );

  return {
    canViewTeam,
    canInviteMembers,
    canRemoveMembers,
    canChangeRoles,
    canChangeStatus,
    canEditMember,
    currentRole: role,
  };
};

/**
 * Hook for permission-based feature flags
 * Returns boolean flags for common features
 */
export const useFeaturePermissions = () => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => {
    if (isLoading) {
      return {
        canManageProducts: false,
        canManageOrders: false,
        canManageTeam: false,
        canViewAnalytics: false,
        canViewFinancials: false,
        canManageSettings: false,
        canManageBilling: false,
        canExportData: false,
        canManageAPI: false,
        canViewLogs: false,
        isLoading: true,
      };
    }

    return {
      canManageProducts: permissions.includes('products:edit') || permissions.includes('products:create'),
      canManageOrders: permissions.includes('orders:update_status') || permissions.includes('orders:cancel'),
      canManageTeam: permissions.includes('team:invite') || permissions.includes('team:remove'),
      canViewAnalytics: permissions.includes('analytics:view'),
      canViewFinancials: permissions.includes('analytics:view_revenue') || permissions.includes('billing:view'),
      canManageSettings: permissions.includes('settings:edit') || permissions.includes('settings:edit_basic'),
      canManageBilling: permissions.includes('billing:manage'),
      canExportData: permissions.some(p => p.includes(':export')),
      canManageAPI: permissions.includes('api:manage_keys'),
      canViewLogs: permissions.includes('logs:view'),
      isLoading: false,
    };
  }, [permissions, isLoading]);
};

/**
 * Hook to check permission with fallback
 * Returns permission state and loading state
 */
export const usePermissionState = (permission: Permission) => {
  const { permissions, isLoading } = usePermissions();

  return useMemo(() => ({
    hasPermission: permissions.includes(permission),
    isLoading,
    isReady: !isLoading,
  }), [permissions, permission, isLoading]);
};

/**
 * Hook for optimistic permission checks
 * Uses both cached and fresh data for immediate UI updates
 */
export const useOptimisticPermission = (permission: Permission) => {
  const [cachedHasPermission, setCachedHasPermission] = useState<boolean | null>(null);
  const { permissions, isLoading } = usePermissions();

  const hasPermission = useMemo(
    () => permissions.includes(permission),
    [permissions, permission]
  );

  useEffect(() => {
    if (!isLoading && hasPermission !== cachedHasPermission) {
      setCachedHasPermission(hasPermission);
    }
  }, [hasPermission, isLoading, cachedHasPermission]);

  // Return cached value immediately, then real value
  return cachedHasPermission !== null ? cachedHasPermission : hasPermission;
};

/**
 * Export all hooks
 */
export default {
  usePermissions,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useRole,
  useIsOwner,
  useIsAdmin,
  useIsManager,
  useIsStaff,
  useHasRoleOrHigher,
  usePermissionChecks,
  usePermissionHelpers,
  useTeamPermissions,
  useFeaturePermissions,
  usePermissionState,
  useOptimisticPermission,
};

import { useCallback, useMemo } from 'react';
import { useTeamContext } from '../contexts/TeamContext';
import {
  TeamMemberSummary,
  MerchantRole,
  TeamMemberStatus,
  Permission,
  InviteTeamMemberRequest
} from '../types/team';

// ============================================================================
// MAIN HOOK - Access to full team context
// ============================================================================

/**
 * Main hook to access team context
 * Use this for general team state and actions
 */
export function useTeam() {
  const context = useTeamContext();
  return context;
}

// ============================================================================
// SPECIALIZED HOOKS - Specific use cases
// ============================================================================

/**
 * Get all team members
 * Returns members array with loading state
 */
export function useTeamMembers() {
  const { members, isLoadingMembers, fetchTeamMembers, totalMembers } = useTeamContext();

  return {
    members,
    isLoading: isLoadingMembers,
    refetch: fetchTeamMembers,
    total: totalMembers,
    isEmpty: members.length === 0 && !isLoadingMembers
  };
}

/**
 * Get a specific team member by ID
 */
export function useTeamMember(userId: string | undefined) {
  const { getMember, isLoadingMembers } = useTeamContext();

  const member = useMemo(() => {
    return userId ? getMember(userId) : undefined;
  }, [userId, getMember]);

  return {
    member,
    isLoading: isLoadingMembers,
    exists: !!member
  };
}

/**
 * Get current user's role and permissions
 */
export function useCurrentUserTeam() {
  const {
    currentUserRole,
    currentUserPermissions,
    isLoadingPermissions,
    fetchCurrentUserPermissions
  } = useTeamContext();

  return {
    role: currentUserRole,
    permissions: currentUserPermissions,
    isLoading: isLoadingPermissions,
    refetch: fetchCurrentUserPermissions,
    permissionCount: currentUserPermissions.length
  };
}

/**
 * Permission checking hook
 * Provides convenient permission checking methods
 */
export function usePermissions() {
  const {
    currentUserPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoadingPermissions
  } = useTeamContext();

  return {
    permissions: currentUserPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: isLoadingPermissions,

    // Common permission checks as convenience methods
    canViewTeam: hasPermission('team:view'),
    canInviteTeam: hasPermission('team:invite'),
    canRemoveTeam: hasPermission('team:remove'),
    canChangeRole: hasPermission('team:change_role'),
    canChangeStatus: hasPermission('team:change_status'),

    canManageProducts: hasAnyPermission(['products:create', 'products:edit', 'products:delete']),
    canViewProducts: hasPermission('products:view'),

    canManageOrders: hasAnyPermission(['orders:update_status', 'orders:cancel', 'orders:refund']),
    canViewOrders: hasPermission('orders:view'),

    canViewAnalytics: hasPermission('analytics:view'),
    canViewRevenue: hasPermission('analytics:view_revenue'),

    canManageSettings: hasPermission('settings:edit'),
    canViewSettings: hasPermission('settings:view'),

    isOwner: currentUserPermissions.length > 50, // Owners typically have all permissions
    isAdmin: hasPermission('team:invite') && hasPermission('team:remove'),
    isManager: hasPermission('products:edit') && !hasPermission('team:invite'),
    isStaff: hasPermission('orders:view') && !hasPermission('products:edit')
  };
}

/**
 * Hook for inviting team members
 * Returns mutation function with loading state
 */
export function useInviteTeamMember() {
  const { inviteMember } = useTeamContext();

  const invite = useCallback(async (data: InviteTeamMemberRequest) => {
    try {
      await inviteMember(data);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to invite team member'
      };
    }
  }, [inviteMember]);

  return invite;
}

/**
 * Hook for updating member role
 * Returns mutation function with optimistic updates
 */
export function useUpdateMemberRole() {
  const { updateMemberRole } = useTeamContext();

  const updateRole = useCallback(async (
    userId: string,
    role: Exclude<MerchantRole, 'owner'>
  ) => {
    try {
      await updateMemberRole(userId, role);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update role'
      };
    }
  }, [updateMemberRole]);

  return updateRole;
}

/**
 * Hook for updating member status
 * Returns mutation function with optimistic updates
 */
export function useUpdateMemberStatus() {
  const { updateMemberStatus } = useTeamContext();

  const updateStatus = useCallback(async (
    userId: string,
    status: TeamMemberStatus
  ) => {
    try {
      await updateMemberStatus(userId, status);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update status'
      };
    }
  }, [updateMemberStatus]);

  return updateStatus;
}

/**
 * Hook for removing team member
 * Returns mutation function with optimistic updates
 */
export function useRemoveTeamMember() {
  const { removeMember } = useTeamContext();

  const remove = useCallback(async (userId: string) => {
    try {
      await removeMember(userId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove team member'
      };
    }
  }, [removeMember]);

  return remove;
}

/**
 * Hook for suspending team member
 * Returns mutation function
 */
export function useSuspendTeamMember() {
  const { suspendMember } = useTeamContext();

  const suspend = useCallback(async (userId: string) => {
    try {
      await suspendMember(userId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to suspend team member'
      };
    }
  }, [suspendMember]);

  return suspend;
}

/**
 * Hook for activating team member
 * Returns mutation function
 */
export function useActivateTeamMember() {
  const { activateMember } = useTeamContext();

  const activate = useCallback(async (userId: string) => {
    try {
      await activateMember(userId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to activate team member'
      };
    }
  }, [activateMember]);

  return activate;
}

/**
 * Hook for resending invitation
 * Returns mutation function
 */
export function useResendInvitation() {
  const { resendInvitation } = useTeamContext();

  const resend = useCallback(async (userId: string) => {
    try {
      await resendInvitation(userId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to resend invitation'
      };
    }
  }, [resendInvitation]);

  return resend;
}

/**
 * Hook to check if user can edit a specific team member
 */
export function useCanEditMember(targetRole: MerchantRole | undefined) {
  const { canEditMember } = useTeamContext();

  return useMemo(() => {
    return targetRole ? canEditMember(targetRole) : false;
  }, [targetRole, canEditMember]);
}

/**
 * Hook to filter team members by various criteria
 */
export function useFilteredTeamMembers(filters?: {
  role?: MerchantRole;
  status?: TeamMemberStatus;
  searchTerm?: string;
}) {
  const { members, isLoadingMembers } = useTeamContext();

  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    // Filter by role
    if (filters?.role) {
      filtered = filtered.filter(m => m.role === filters.role);
    }

    // Filter by status
    if (filters?.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }

    // Search by name or email
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [members, filters]);

  return {
    members: filteredMembers,
    count: filteredMembers.length,
    isLoading: isLoadingMembers
  };
}

/**
 * Hook to get team statistics
 */
export function useTeamStats() {
  const { members, totalMembers, isLoadingMembers } = useTeamContext();

  const stats = useMemo(() => {
    const activeCount = members.filter(m => m.status === 'active').length;
    const pendingCount = members.filter(m => m.status === 'inactive').length;
    const suspendedCount = members.filter(m => m.status === 'suspended').length;

    const roleBreakdown = {
      owner: members.filter(m => m.role === 'owner').length,
      admin: members.filter(m => m.role === 'admin').length,
      manager: members.filter(m => m.role === 'manager').length,
      staff: members.filter(m => m.role === 'staff').length
    };

    return {
      total: totalMembers,
      active: activeCount,
      pending: pendingCount,
      suspended: suspendedCount,
      roles: roleBreakdown
    };
  }, [members, totalMembers]);

  return {
    ...stats,
    isLoading: isLoadingMembers
  };
}

/**
 * Hook to check if any team operations are pending
 */
export function useTeamOperationStatus() {
  const { state } = useTeamContext();

  return {
    hasPendingOperations: state.pendingOperations.size > 0,
    pendingOperationsCount: state.pendingOperations.size,
    isLoading: state.isLoadingMembers || state.isLoadingPermissions
  };
}

/**
 * Hook to get team members sorted by various criteria
 */
export function useSortedTeamMembers(sortBy?: 'name' | 'email' | 'role' | 'invitedAt' | 'lastLoginAt') {
  const { members, isLoadingMembers } = useTeamContext();

  const sortedMembers = useMemo(() => {
    if (!sortBy) return members;

    return [...members].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'role': {
          const roleOrder: Record<MerchantRole, number> = {
            owner: 0,
            admin: 1,
            manager: 2,
            staff: 3
          };
          return roleOrder[a.role] - roleOrder[b.role];
        }
        case 'invitedAt':
          return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
        case 'lastLoginAt': {
          const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bTime - aTime;
        }
        default:
          return 0;
      }
    });
  }, [members, sortBy]);

  return {
    members: sortedMembers,
    isLoading: isLoadingMembers
  };
}

/**
 * Hook to get team members by role
 */
export function useTeamMembersByRole(role: MerchantRole) {
  const { members, isLoadingMembers } = useTeamContext();

  const membersByRole = useMemo(() => {
    return members.filter(m => m.role === role);
  }, [members, role]);

  return {
    members: membersByRole,
    count: membersByRole.length,
    isLoading: isLoadingMembers
  };
}

/**
 * Hook to check if team feature is accessible
 * Checks both loading state and permissions
 */
export function useTeamAccess() {
  const {
    isLoadingPermissions,
    hasPermission,
    currentUserRole
  } = useTeamContext();

  const canAccessTeam = useMemo(() => {
    return hasPermission('team:view');
  }, [hasPermission]);

  return {
    canAccess: canAccessTeam,
    isLoading: isLoadingPermissions,
    role: currentUserRole,
    shouldRedirect: !isLoadingPermissions && !canAccessTeam
  };
}

// ============================================================================
// EXPORT ALL HOOKS
// ============================================================================

export default useTeam;

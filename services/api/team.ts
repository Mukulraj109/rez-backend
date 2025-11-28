import { apiClient } from './index';
import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';
import {
  // Types
  TeamMember,
  TeamMemberSummary,
  TeamMemberWithDescription,
  CurrentUserTeam,
  MerchantRole,
  TeamMemberStatus,
  Permission,
  // Request/Response types
  InviteTeamMemberRequest,
  InvitationResponse,
  ValidateInvitationResult,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  UpdateTeamMemberRoleRequest,
  UpdateTeamMemberStatusRequest,
  ResendInvitationResponse,
  TeamMembersListResponse,
  TeamMemberResponse,
  UpdateRoleResponse,
  UpdateStatusResponse,
  RemoveMemberResponse,
  TeamPaginationParams,
  TeamPaginatedResponse,
  PermissionCheckResult,
  PermissionsCheckResult,
  RoleCapabilities
} from '../../types/team';

// Permission descriptions mapping
const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'products:view': 'View products',
  'products:create': 'Create new products',
  'products:edit': 'Edit existing products',
  'products:delete': 'Delete products',
  'products:bulk_import': 'Bulk import products',
  'products:export': 'Export products',
  'orders:view': 'View orders',
  'orders:view_all': 'View all order details',
  'orders:update_status': 'Update order status',
  'orders:cancel': 'Cancel orders',
  'orders:refund': 'Process refunds',
  'orders:export': 'Export orders',
  'team:view': 'View team members',
  'team:invite': 'Invite team members',
  'team:remove': 'Remove team members',
  'team:change_role': 'Change team member roles',
  'team:change_status': 'Change team member status',
  'analytics:view': 'View analytics',
  'analytics:view_revenue': 'View revenue analytics',
  'analytics:view_costs': 'View cost analytics',
  'analytics:export': 'Export analytics',
  'settings:view': 'View settings',
  'settings:edit': 'Edit all settings',
  'settings:edit_basic': 'Edit basic settings',
  'billing:view': 'View billing',
  'billing:manage': 'Manage billing',
  'billing:view_invoices': 'View invoices',
  'customers:view': 'View customers',
  'customers:edit': 'Edit customers',
  'customers:delete': 'Delete customers',
  'customers:export': 'Export customers',
  'promotions:view': 'View promotions',
  'promotions:create': 'Create promotions',
  'promotions:edit': 'Edit promotions',
  'promotions:delete': 'Delete promotions',
  'reviews:view': 'View reviews',
  'reviews:respond': 'Respond to reviews',
  'reviews:delete': 'Delete reviews',
  'notifications:view': 'View notifications',
  'notifications:send': 'Send notifications',
  'reports:view': 'View reports',
  'reports:export': 'Export reports',
  'reports:view_detailed': 'View detailed reports',
  'inventory:view': 'View inventory',
  'inventory:edit': 'Edit inventory',
  'inventory:bulk_update': 'Bulk update inventory',
  'categories:view': 'View categories',
  'categories:create': 'Create categories',
  'categories:edit': 'Edit categories',
  'categories:delete': 'Delete categories',
  'profile:view': 'View store profile',
  'profile:edit': 'Edit store profile',
  'logs:view': 'View activity logs',
  'logs:export': 'Export activity logs',
  'api:access': 'Access API',
  'api:manage_keys': 'Manage API keys'
};

// Role descriptions
const ROLE_DESCRIPTIONS: Record<MerchantRole, string> = {
  owner: 'Full access to all features including billing and account deletion',
  admin: 'Manage products, orders, team, and most settings. Cannot manage billing or delete account',
  manager: 'Manage products and orders. Cannot delete products or manage team',
  staff: 'View-only access with ability to update order status'
};

/**
 * Team Management API Service
 * Handles all team-related API operations with RBAC support
 */
class TeamService {
  // ============================================================================
  // TEAM MEMBERS - Core Operations
  // ============================================================================

  /**
   * Get all team members for the current merchant
   * Requires: team:view permission
   */
  async getTeamMembers(pagination?: TeamPaginationParams): Promise<TeamMembersListResponse> {
    try {
      const params = new URLSearchParams();

      if (pagination) {
        if (pagination.page) params.append('page', pagination.page.toString());
        if (pagination.limit) params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }

      const url = params.toString() ? `merchant/team?${params}` : 'merchant/team';
      const response = await apiClient.get<TeamMembersListResponse>(url);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch team members');
      }
    } catch (error: any) {
      console.error('Get team members error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch team members');
    }
  }

  /**
   * Get single team member details
   * Requires: team:view permission
   */
  async getTeamMember(userId: string): Promise<TeamMemberResponse> {
    try {
      const response = await apiClient.get<TeamMemberResponse>(`merchant/team/${userId}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch team member');
      }
    } catch (error: any) {
      console.error('Get team member error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch team member');
    }
  }

  /**
   * Get current user's permissions
   * No specific permission required
   */
  async getCurrentUserPermissions(): Promise<CurrentUserTeam> {
    try {
      const response = await apiClient.get<CurrentUserTeam>('merchant/team/me/permissions');

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch permissions');
      }
    } catch (error: any) {
      console.error('Get current user permissions error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permissions');
    }
  }

  // ============================================================================
  // INVITATIONS - Invite and Manage
  // ============================================================================

  /**
   * Invite new team member
   * Requires: team:invite permission
   */
  async inviteTeamMember(inviteData: InviteTeamMemberRequest): Promise<InvitationResponse> {
    try {
      // Validate input
      if (!inviteData.email || !inviteData.name || !inviteData.role) {
        throw new Error('Email, name, and role are required');
      }

      if (!['admin', 'manager', 'staff'].includes(inviteData.role)) {
        throw new Error('Invalid role. Can only invite admin, manager, or staff');
      }

      const response = await apiClient.post<InvitationResponse>('merchant/team/invite', inviteData);

      if (response.success && response.data) {
        console.log(`✅ Invitation sent to ${inviteData.email}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to invite team member');
      }
    } catch (error: any) {
      console.error('Invite team member error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to invite team member');
    }
  }

  /**
   * Resend invitation to existing invited user
   * Requires: team:invite permission
   */
  async resendInvitation(userId: string): Promise<ResendInvitationResponse> {
    try {
      const response = await apiClient.post<ResendInvitationResponse>(
        `merchant/team/${userId}/resend-invite`,
        {}
      );

      if (response.success && response.data) {
        console.log(`✅ Invitation resent to user ${userId}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to resend invitation');
      }
    } catch (error: any) {
      console.error('Resend invitation error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to resend invitation');
    }
  }

  /**
   * Validate invitation token (public - no auth required)
   */
  async validateInvitationToken(token: string): Promise<ValidateInvitationResult> {
    try {
      const response = await apiClient.get<ValidateInvitationResult>(
        `merchant/team-public/validate-invitation/${token}`
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Invalid invitation token');
      }
    } catch (error: any) {
      console.error('Validate invitation error:', error);
      return {
        valid: false,
        message: error.response?.data?.message || error.message || 'Invalid invitation token'
      };
    }
  }

  /**
   * Accept invitation with password (public - no auth required)
   */
  async acceptInvitation(
    token: string,
    acceptData: AcceptInvitationRequest
  ): Promise<AcceptInvitationResponse> {
    try {
      // Validate input
      if (!acceptData.password || !acceptData.confirmPassword) {
        throw new Error('Password and confirmation are required');
      }

      if (acceptData.password !== acceptData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (acceptData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await apiClient.post<AcceptInvitationResponse>(
        `merchant/team-public/accept-invitation/${token}`,
        { password: acceptData.password }
      );

      if (response.success && response.data) {
        console.log(`✅ Invitation accepted for ${response.data.email}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to accept invitation');
    }
  }

  // ============================================================================
  // ROLE & STATUS MANAGEMENT
  // ============================================================================

  /**
   * Update team member role
   * Requires: team:change_role permission (usually owner only)
   */
  async updateTeamMemberRole(
    userId: string,
    roleData: UpdateTeamMemberRoleRequest
  ): Promise<UpdateRoleResponse> {
    try {
      // Validate role
      if (!['admin', 'manager', 'staff'].includes(roleData.role)) {
        throw new Error('Invalid role. Can only set admin, manager, or staff');
      }

      const response = await apiClient.put<UpdateRoleResponse>(
        `merchant/team/${userId}/role`,
        roleData
      );

      if (response.success) {
        console.log(`✅ Role updated for user ${userId} to ${roleData.role}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Update team member role error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update role');
    }
  }

  /**
   * Update team member status (active/suspended)
   * Requires: team:change_status permission
   */
  async updateTeamMemberStatus(
    userId: string,
    statusData: UpdateTeamMemberStatusRequest
  ): Promise<UpdateStatusResponse> {
    try {
      // Validate status
      if (!['active', 'inactive', 'suspended'].includes(statusData.status)) {
        throw new Error('Invalid status. Must be active, inactive, or suspended');
      }

      const response = await apiClient.put<UpdateStatusResponse>(
        `merchant/team/${userId}/status`,
        statusData
      );

      if (response.success) {
        console.log(`✅ Status updated for user ${userId} to ${statusData.status}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Update team member status error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update status');
    }
  }

  // ============================================================================
  // REMOVAL
  // ============================================================================

  /**
   * Remove team member
   * Requires: team:remove permission
   */
  async removeTeamMember(userId: string): Promise<RemoveMemberResponse> {
    try {
      const response = await apiClient.delete<RemoveMemberResponse>(
        `merchant/team/${userId}`
      );

      if (response.success) {
        console.log(`✅ Team member removed: ${userId}`);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to remove team member');
      }
    } catch (error: any) {
      console.error('Remove team member error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to remove team member');
    }
  }

  // ============================================================================
  // PERMISSION & CAPABILITY CHECKS
  // ============================================================================

  /**
   * Check if a specific permission is available
   * Used to show/hide UI elements based on user permissions
   */
  async checkPermission(permission: Permission): Promise<PermissionCheckResult> {
    try {
      const userTeam = await this.getCurrentUserPermissions();
      const hasPermission = userTeam.permissions.includes(permission);

      return {
        hasPermission,
        permission,
        role: userTeam.role
      };
    } catch (error) {
      console.error('Check permission error:', error);
      // Default to false if check fails
      return {
        hasPermission: false,
        permission,
        role: 'staff'
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(permissions: Permission[]): Promise<PermissionsCheckResult> {
    try {
      const userTeam = await this.getCurrentUserPermissions();
      const userPermissions = new Set(userTeam.permissions);

      const permissionsMap: Record<Permission, boolean> = {} as Record<Permission, boolean>;
      let hasAll = true;
      let hasAny = false;

      for (const permission of permissions) {
        const has = userPermissions.has(permission);
        permissionsMap[permission] = has;
        if (!has) hasAll = false;
        if (has) hasAny = true;
      }

      return {
        permissions: permissionsMap,
        hasAll,
        hasAny
      };
    } catch (error) {
      console.error('Check multiple permissions error:', error);
      // Default to no permissions
      const permissionsMap: Record<Permission, boolean> = {} as Record<Permission, boolean>;
      permissions.forEach(p => {
        permissionsMap[p] = false;
      });

      return {
        permissions: permissionsMap,
        hasAll: false,
        hasAny: false
      };
    }
  }

  /**
   * Get capabilities of a specific role (for reference/display)
   */
  getRoleCapabilities(role: MerchantRole): RoleCapabilities {
    // Define role capabilities
    const capabilities: Record<MerchantRole, RoleCapabilities> = {
      owner: {
        role: 'owner',
        description: ROLE_DESCRIPTIONS.owner,
        permissions: [] as Permission[], // Would be all permissions
        permissionCount: 75, // Approximate
        canManageTeam: true,
        canManageProducts: true,
        canManageOrders: true,
        canViewAnalytics: true,
        canManageSettings: true,
        canManageBilling: true
      },
      admin: {
        role: 'admin',
        description: ROLE_DESCRIPTIONS.admin,
        permissions: [
          'products:view', 'products:create', 'products:edit', 'products:delete',
          'products:bulk_import', 'products:export',
          'orders:view', 'orders:view_all', 'orders:update_status', 'orders:cancel',
          'orders:refund', 'orders:export',
          'team:view', 'team:invite', 'team:remove', 'team:change_status',
          'analytics:view', 'analytics:view_revenue', 'analytics:export',
          'settings:view', 'settings:edit_basic',
          'customers:view', 'customers:edit', 'customers:delete', 'customers:export',
          'promotions:view', 'promotions:create', 'promotions:edit', 'promotions:delete',
          'reviews:view', 'reviews:respond', 'reviews:delete',
          'notifications:view', 'notifications:send',
          'reports:view', 'reports:export', 'reports:view_detailed',
          'inventory:view', 'inventory:edit', 'inventory:bulk_update',
          'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
          'profile:view', 'profile:edit',
          'logs:view',
          'api:access'
        ] as Permission[],
        permissionCount: 54,
        canManageTeam: true,
        canManageProducts: true,
        canManageOrders: true,
        canViewAnalytics: true,
        canManageSettings: false,
        canManageBilling: false
      },
      manager: {
        role: 'manager',
        description: ROLE_DESCRIPTIONS.manager,
        permissions: [
          'products:view', 'products:create', 'products:edit', 'products:export',
          'orders:view', 'orders:view_all', 'orders:update_status', 'orders:cancel', 'orders:export',
          'analytics:view',
          'customers:view', 'customers:edit', 'customers:export',
          'promotions:view', 'promotions:create', 'promotions:edit',
          'reviews:view', 'reviews:respond',
          'notifications:view', 'notifications:send',
          'reports:view', 'reports:export',
          'inventory:view', 'inventory:edit',
          'categories:view', 'categories:create', 'categories:edit',
          'profile:view'
        ] as Permission[],
        permissionCount: 24,
        canManageTeam: false,
        canManageProducts: true,
        canManageOrders: true,
        canViewAnalytics: true,
        canManageSettings: false,
        canManageBilling: false
      },
      staff: {
        role: 'staff',
        description: ROLE_DESCRIPTIONS.staff,
        permissions: [
          'products:view',
          'orders:view', 'orders:update_status',
          'customers:view',
          'promotions:view',
          'reviews:view',
          'notifications:view',
          'reports:view',
          'inventory:view',
          'categories:view',
          'profile:view'
        ] as Permission[],
        permissionCount: 11,
        canManageTeam: false,
        canManageProducts: false,
        canManageOrders: false,
        canViewAnalytics: false,
        canManageSettings: false,
        canManageBilling: false
      }
    };

    return capabilities[role];
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get description for a permission
   */
  getPermissionDescription(permission: Permission): string {
    return PERMISSION_DESCRIPTIONS[permission] || permission;
  }

  /**
   * Get description for a role
   */
  getRoleDescription(role: MerchantRole): string {
    return ROLE_DESCRIPTIONS[role] || role;
  }

  /**
   * Get all available roles (except owner)
   */
  getAvailableRoles(): Array<{ role: MerchantRole; label: string; description: string }> {
    return [
      {
        role: 'admin',
        label: 'Admin',
        description: ROLE_DESCRIPTIONS.admin
      },
      {
        role: 'manager',
        label: 'Manager',
        description: ROLE_DESCRIPTIONS.manager
      },
      {
        role: 'staff',
        label: 'Staff',
        description: ROLE_DESCRIPTIONS.staff
      }
    ];
  }

  /**
   * Validate team member data before sending to API
   */
  validateInviteData(data: InviteTeamMemberRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!data.role || !['admin', 'manager', 'staff'].includes(data.role)) {
      errors.push('Valid role must be selected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format team member for display
   */
  formatTeamMember(member: TeamMember): TeamMember & { roleLabel: string } {
    return {
      ...member,
      roleLabel: this.formatRoleLabel(member.role)
    };
  }

  /**
   * Format role label for display
   */
  formatRoleLabel(role: MerchantRole): string {
    const labels: Record<MerchantRole, string> = {
      owner: 'Owner',
      admin: 'Admin',
      manager: 'Manager',
      staff: 'Staff'
    };
    return labels[role] || role;
  }

  /**
   * Format status badge
   */
  getStatusBadgeColor(status: TeamMemberStatus): string {
    const colors: Record<TeamMemberStatus, string> = {
      active: '#10b981',      // Green
      inactive: '#f59e0b',    // Amber
      suspended: '#ef4444'    // Red
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Check if user can edit a team member
   */
  canEditTeamMember(currentUserRole: MerchantRole, targetUserRole: MerchantRole): boolean {
    // Owner can edit anyone
    if (currentUserRole === 'owner') {
      return targetUserRole !== 'owner'; // Cannot edit other owners
    }

    // Admin can edit manager and staff
    if (currentUserRole === 'admin') {
      return targetUserRole === 'manager' || targetUserRole === 'staff';
    }

    // Manager and staff cannot edit anyone
    return false;
  }

  /**
   * Get team member status badge
   */
  getStatusLabel(status: TeamMemberStatus): string {
    const labels: Record<TeamMemberStatus, string> = {
      active: 'Active',
      inactive: 'Pending Acceptance',
      suspended: 'Suspended'
    };
    return labels[status] || status;
  }
}

// Create and export singleton instance
export const teamService = new TeamService();
export default teamService;

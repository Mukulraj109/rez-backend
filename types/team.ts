// Team Management Types
// Comprehensive types for team members, roles, permissions, and invitations

/**
 * Role-Based Access Control (RBAC) Types
 */

// Merchant user roles
export type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff';

// Team member status
export type TeamMemberStatus = 'active' | 'inactive' | 'suspended';

// Granular permission type
export type Permission =
  | 'products:view' | 'products:create' | 'products:edit' | 'products:delete' | 'products:bulk_import' | 'products:export'
  | 'orders:view' | 'orders:view_all' | 'orders:update_status' | 'orders:cancel' | 'orders:refund' | 'orders:export'
  | 'team:view' | 'team:invite' | 'team:remove' | 'team:change_role' | 'team:change_status'
  | 'analytics:view' | 'analytics:view_revenue' | 'analytics:view_costs' | 'analytics:export'
  | 'settings:view' | 'settings:edit' | 'settings:edit_basic'
  | 'billing:view' | 'billing:manage' | 'billing:view_invoices'
  | 'customers:view' | 'customers:edit' | 'customers:delete' | 'customers:export'
  | 'promotions:view' | 'promotions:create' | 'promotions:edit' | 'promotions:delete'
  | 'reviews:view' | 'reviews:respond' | 'reviews:delete'
  | 'notifications:view' | 'notifications:send'
  | 'reports:view' | 'reports:export' | 'reports:view_detailed'
  | 'inventory:view' | 'inventory:edit' | 'inventory:bulk_update'
  | 'categories:view' | 'categories:create' | 'categories:edit' | 'categories:delete'
  | 'profile:view' | 'profile:edit'
  | 'logs:view' | 'logs:export'
  | 'api:access' | 'api:manage_keys';

/**
 * Team Member Types
 */

// Team member details
export interface TeamMember {
  id: string;
  merchantId: string;
  email: string;
  name: string;
  role: MerchantRole;
  status: TeamMemberStatus;
  permissions: Permission[];
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
  invitedAt: string;
  acceptedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Team member for list view
export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: MerchantRole;
  status: TeamMemberStatus;
  lastLoginAt?: string;
  invitedAt: string;
  acceptedAt?: string;
}

// Team member with role description
export interface TeamMemberWithDescription extends TeamMember {
  roleDescription: string;
}

// Current user's team info
export interface CurrentUserTeam {
  role: MerchantRole;
  roleDescription: string;
  permissions: Permission[];
  permissionCount: number;
}

/**
 * Invitation Types
 */

// Invitation request
export interface InviteTeamMemberRequest {
  email: string;
  name: string;
  role: Exclude<MerchantRole, 'owner'>; // Cannot invite another owner
}

// Invitation response (public - development only includes token)
export interface InvitationResponse {
  success: boolean;
  message: string;
  invitationId: string;
  expiresAt: string;
  invitationToken?: string; // Only in development
  invitationUrl?: string;    // Only in development
}

// Invitation validation result
export interface ValidateInvitationResult {
  valid: boolean;
  message?: string;
  invitation?: {
    name: string;
    email: string;
    role: MerchantRole;
    businessName: string;
    expiresAt: string;
  };
}

// Accept invitation request
export interface AcceptInvitationRequest {
  password: string;
  confirmPassword: string;
}

// Accept invitation response
export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  email: string;
  name: string;
  role: MerchantRole;
}

/**
 * Update Request Types
 */

// Update team member role
export interface UpdateTeamMemberRoleRequest {
  role: Exclude<MerchantRole, 'owner'>;
}

// Update team member status
export interface UpdateTeamMemberStatusRequest {
  status: TeamMemberStatus;
}

// Resend invitation request
export interface ResendInvitationResponse {
  success: boolean;
  message: string;
  invitationId: string;
  expiresAt: string;
  invitationToken?: string;
}

/**
 * Response Types
 */

// Team members list response
export interface TeamMembersListResponse {
  success: boolean;
  data: {
    teamMembers: TeamMemberSummary[];
    total: number;
  };
}

// Single team member response
export interface TeamMemberResponse {
  success: boolean;
  data: {
    teamMember: TeamMemberWithDescription;
  };
}

// Update role response
export interface UpdateRoleResponse {
  success: boolean;
  message: string;
  data: {
    teamMember: {
      id: string;
      name: string;
      email: string;
      role: MerchantRole;
      permissions: Permission[];
      oldRole: MerchantRole;
    };
  };
}

// Update status response
export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data: {
    teamMember: {
      id: string;
      name: string;
      email: string;
      status: TeamMemberStatus;
      oldStatus: TeamMemberStatus;
    };
  };
}

// Remove member response
export interface RemoveMemberResponse {
  success: boolean;
  message: string;
  data: {
    removedMember: {
      id: string;
      name: string;
      email: string;
      role: MerchantRole;
    };
  };
}

/**
 * Permission Checking Types
 */

// Permission check result
export interface PermissionCheckResult {
  hasPermission: boolean;
  permission: Permission;
  role: MerchantRole;
}

// Multiple permissions check result
export interface PermissionsCheckResult {
  permissions: Record<Permission, boolean>;
  hasAll: boolean;
  hasAny: boolean;
}

// Role capabilities
export interface RoleCapabilities {
  role: MerchantRole;
  description: string;
  permissions: Permission[];
  permissionCount: number;
  canManageTeam: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canManageBilling: boolean;
}

/**
 * Error Response Types
 */

export interface TeamApiError {
  success: false;
  message: string;
  error?: string;
  timestamp?: string;
}

/**
 * Pagination Types
 */

export interface TeamPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'role' | 'invitedAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TeamPaginatedResponse {
  success: boolean;
  data: {
    teamMembers: TeamMemberSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

/**
 * Filter Types
 */

export interface TeamFilterParams {
  role?: MerchantRole;
  status?: TeamMemberStatus;
  searchTerm?: string;
  invitedAfter?: string;
  invitedBefore?: string;
  acceptedOnly?: boolean;
  pendingOnly?: boolean;
}

/**
 * Bulk Operation Types
 */

export interface BulkTeamOperation {
  userIds: string[];
  action: 'activate' | 'suspend' | 'remove';
  role?: MerchantRole; // Only for role update operations
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    success: boolean;
    message: string;
  }>;
}

/**
 * Activity Logging Types
 */

export interface TeamActivity {
  id: string;
  merchantId: string;
  action: 'invite' | 'accept' | 'role_change' | 'status_change' | 'remove' | 'resend_invite';
  targetUserId: string;
  targetUserEmail: string;
  performedBy: string;
  performedByName: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Utility Types
 */

// Role info with all details
export interface RoleInfo {
  role: MerchantRole;
  label: string;
  description: string;
  permissions: Permission[];
  canBeAssigned: boolean; // owner cannot be assigned to non-owners
}

// Permission category
export interface PermissionCategory {
  category: string;
  description: string;
  permissions: Array<{
    permission: Permission;
    description: string;
  }>;
}

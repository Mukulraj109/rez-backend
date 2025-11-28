/**
 * Team Management Helper Functions
 * Utility functions for team operations, permission checks, and data formatting
 */

import { MerchantRole, TeamMemberStatus, Permission, TeamMember, TeamMemberSummary } from '../types/team';
import {
  ROLE_CONFIG,
  STATUS_CONFIG,
  PERMISSION_DESCRIPTIONS,
  ROLE_HIERARCHY,
  canManageUser as checkCanManageUser
} from '../constants/teamConstants';

/**
 * Permission Checking Functions
 */

/**
 * Check if user can invite team members
 */
export function canInviteMembers(role: MerchantRole, permissions: Permission[]): boolean {
  return permissions.includes('team:invite');
}

/**
 * Check if user can update roles
 */
export function canUpdateRoles(role: MerchantRole, permissions: Permission[]): boolean {
  return permissions.includes('team:change_role');
}

/**
 * Check if user can remove members
 */
export function canRemoveMembers(role: MerchantRole, permissions: Permission[]): boolean {
  return permissions.includes('team:remove');
}

/**
 * Check if user can update member status (activate/suspend)
 */
export function canUpdateStatus(role: MerchantRole, permissions: Permission[]): boolean {
  return permissions.includes('team:change_status');
}

/**
 * Check if user can view team
 */
export function canViewTeam(permissions: Permission[]): boolean {
  return permissions.includes('team:view');
}

/**
 * Check if user can manage a specific team member based on roles
 */
export function canManageTeamMember(
  currentUserRole: MerchantRole,
  targetMemberRole: MerchantRole
): boolean {
  return checkCanManageUser(currentUserRole, targetMemberRole);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Role Formatting Functions
 */

/**
 * Format role name for display
 */
export function formatRoleName(role: MerchantRole): string {
  return ROLE_CONFIG[role]?.label || role;
}

/**
 * Get role color
 */
export function getRoleColor(role: MerchantRole): string {
  return ROLE_CONFIG[role]?.color || '#6B7280';
}

/**
 * Get role background color
 */
export function getRoleBackgroundColor(role: MerchantRole): string {
  return ROLE_CONFIG[role]?.backgroundColor || '#F3F4F6';
}

/**
 * Get role description
 */
export function getRoleDescription(role: MerchantRole): string {
  return ROLE_CONFIG[role]?.description || '';
}

/**
 * Get role icon
 */
export function getRoleIcon(role: MerchantRole): string {
  return ROLE_CONFIG[role]?.icon || 'person';
}

/**
 * Status Formatting Functions
 */

/**
 * Format status for display
 */
export function formatStatusName(status: TeamMemberStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

/**
 * Get status color
 */
export function getStatusColor(status: TeamMemberStatus): string {
  return STATUS_CONFIG[status]?.color || '#6B7280';
}

/**
 * Get status background color
 */
export function getStatusBackgroundColor(status: TeamMemberStatus): string {
  return STATUS_CONFIG[status]?.backgroundColor || '#F3F4F6';
}

/**
 * Get status icon
 */
export function getStatusIcon(status: TeamMemberStatus): string {
  return STATUS_CONFIG[status]?.icon || 'help-circle';
}

/**
 * Get status description
 */
export function getStatusDescription(status: TeamMemberStatus): string {
  return STATUS_CONFIG[status]?.description || '';
}

/**
 * Permission Formatting Functions
 */

/**
 * Get permission description
 */
export function getPermissionDescription(permission: Permission): string {
  return PERMISSION_DESCRIPTIONS[permission] || permission;
}

/**
 * Format permission for display (removes prefix)
 */
export function formatPermissionName(permission: Permission): string {
  const description = PERMISSION_DESCRIPTIONS[permission];
  if (description) {
    return description;
  }

  // Fallback: convert permission to readable format
  const parts = permission.split(':');
  if (parts.length === 2) {
    return parts[1].replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  return permission;
}

/**
 * Team Member Filtering Functions
 */

/**
 * Filter team members by role
 */
export function filterByRole(members: TeamMemberSummary[], role: MerchantRole): TeamMemberSummary[] {
  return members.filter(member => member.role === role);
}

/**
 * Filter team members by status
 */
export function filterByStatus(members: TeamMemberSummary[], status: TeamMemberStatus): TeamMemberSummary[] {
  return members.filter(member => member.status === status);
}

/**
 * Filter active team members
 */
export function filterActiveMembers(members: TeamMemberSummary[]): TeamMemberSummary[] {
  return filterByStatus(members, 'active');
}

/**
 * Filter pending (inactive) team members
 */
export function filterPendingMembers(members: TeamMemberSummary[]): TeamMemberSummary[] {
  return filterByStatus(members, 'inactive');
}

/**
 * Filter suspended team members
 */
export function filterSuspendedMembers(members: TeamMemberSummary[]): TeamMemberSummary[] {
  return filterByStatus(members, 'suspended');
}

/**
 * Search team members by name or email
 */
export function searchMembers(members: TeamMemberSummary[], searchTerm: string): TeamMemberSummary[] {
  if (!searchTerm.trim()) {
    return members;
  }

  const lowerSearch = searchTerm.toLowerCase();

  return members.filter(member =>
    member.name.toLowerCase().includes(lowerSearch) ||
    member.email.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Sorting Functions
 */

/**
 * Sort team members by name
 */
export function sortByName(members: TeamMemberSummary[], order: 'asc' | 'desc' = 'asc'): TeamMemberSummary[] {
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Sort team members by role (by hierarchy)
 */
export function sortByRole(members: TeamMemberSummary[], order: 'asc' | 'desc' = 'desc'): TeamMemberSummary[] {
  const sorted = [...members].sort((a, b) => {
    const aLevel = ROLE_HIERARCHY[a.role];
    const bLevel = ROLE_HIERARCHY[b.role];
    return bLevel - aLevel; // Higher roles first by default
  });
  return order === 'asc' ? sorted.reverse() : sorted;
}

/**
 * Sort team members by last login
 */
export function sortByLastLogin(members: TeamMemberSummary[], order: 'asc' | 'desc' = 'desc'): TeamMemberSummary[] {
  const sorted = [...members].sort((a, b) => {
    if (!a.lastLoginAt && !b.lastLoginAt) return 0;
    if (!a.lastLoginAt) return 1;
    if (!b.lastLoginAt) return -1;

    const dateA = new Date(a.lastLoginAt).getTime();
    const dateB = new Date(b.lastLoginAt).getTime();
    return dateB - dateA; // Most recent first by default
  });
  return order === 'asc' ? sorted.reverse() : sorted;
}

/**
 * Sort team members by invited date
 */
export function sortByInvitedDate(members: TeamMemberSummary[], order: 'asc' | 'desc' = 'desc'): TeamMemberSummary[] {
  const sorted = [...members].sort((a, b) => {
    const dateA = new Date(a.invitedAt).getTime();
    const dateB = new Date(b.invitedAt).getTime();
    return dateB - dateA; // Most recent first by default
  });
  return order === 'asc' ? sorted.reverse() : sorted;
}

/**
 * Date/Time Formatting Functions
 */

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatDate(dateString);
  }
}

/**
 * Statistics Functions
 */

/**
 * Get team statistics
 */
export function getTeamStats(members: TeamMemberSummary[]) {
  const total = members.length;
  const active = filterActiveMembers(members).length;
  const pending = filterPendingMembers(members).length;
  const suspended = filterSuspendedMembers(members).length;

  const roleBreakdown = {
    owner: filterByRole(members, 'owner').length,
    admin: filterByRole(members, 'admin').length,
    manager: filterByRole(members, 'manager').length,
    staff: filterByRole(members, 'staff').length
  };

  return {
    total,
    active,
    pending,
    suspended,
    roleBreakdown
  };
}

/**
 * Validation Functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Validate team member name
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get avatar background color based on name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316'  // Orange
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Export all helpers as a default object
 */
export default {
  // Permission checks
  canInviteMembers,
  canUpdateRoles,
  canRemoveMembers,
  canUpdateStatus,
  canViewTeam,
  canManageTeamMember,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,

  // Role formatting
  formatRoleName,
  getRoleColor,
  getRoleBackgroundColor,
  getRoleDescription,
  getRoleIcon,

  // Status formatting
  formatStatusName,
  getStatusColor,
  getStatusBackgroundColor,
  getStatusIcon,
  getStatusDescription,

  // Permission formatting
  getPermissionDescription,
  formatPermissionName,

  // Filtering
  filterByRole,
  filterByStatus,
  filterActiveMembers,
  filterPendingMembers,
  filterSuspendedMembers,
  searchMembers,

  // Sorting
  sortByName,
  sortByRole,
  sortByLastLogin,
  sortByInvitedDate,

  // Date/time
  formatDate,
  formatDateTime,
  getRelativeTime,

  // Statistics
  getTeamStats,

  // Validation
  isValidEmail,
  isValidPassword,
  isValidName,

  // UI helpers
  getInitials,
  getAvatarColor
};

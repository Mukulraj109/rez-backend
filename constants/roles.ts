/**
 * Role Definitions and Constants
 * Comprehensive role configurations for RBAC system
 */

import { MerchantRole } from '../types/team';

/**
 * Role Display Information
 */
export interface RoleInfo {
  role: MerchantRole;
  label: string;
  description: string;
  color: string;
  icon: string;
  hierarchy: number;
  canBeAssignedBy: MerchantRole[];
}

/**
 * Role Hierarchy Levels
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<MerchantRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  staff: 1,
};

/**
 * Role Colors (for UI badges, chips, etc.)
 */
export const ROLE_COLORS: Record<MerchantRole, string> = {
  owner: '#8B5CF6',    // Purple
  admin: '#3B82F6',    // Blue
  manager: '#10B981',  // Green
  staff: '#6B7280',    // Gray
};

/**
 * Role Icons (using Ionicons)
 */
export const ROLE_ICONS: Record<MerchantRole, string> = {
  owner: 'shield-checkmark',
  admin: 'people',
  manager: 'briefcase',
  staff: 'person',
};

/**
 * Role Labels (display names)
 */
export const ROLE_LABELS: Record<MerchantRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

/**
 * Role Descriptions
 */
export const ROLE_DESCRIPTIONS: Record<MerchantRole, string> = {
  owner: 'Full access to all features including billing and account deletion. Cannot be assigned to others.',
  admin: 'Manage products, orders, team, and most settings. Cannot manage billing or delete account.',
  manager: 'Manage products and orders. Limited access to analytics and team management.',
  staff: 'View-only access with ability to update order status. Cannot modify products or access sensitive data.',
};

/**
 * Role Detailed Information
 */
export const ROLE_INFO: Record<MerchantRole, RoleInfo> = {
  owner: {
    role: 'owner',
    label: ROLE_LABELS.owner,
    description: ROLE_DESCRIPTIONS.owner,
    color: ROLE_COLORS.owner,
    icon: ROLE_ICONS.owner,
    hierarchy: ROLE_HIERARCHY.owner,
    canBeAssignedBy: [], // Owner role cannot be assigned
  },
  admin: {
    role: 'admin',
    label: ROLE_LABELS.admin,
    description: ROLE_DESCRIPTIONS.admin,
    color: ROLE_COLORS.admin,
    icon: ROLE_ICONS.admin,
    hierarchy: ROLE_HIERARCHY.admin,
    canBeAssignedBy: ['owner'],
  },
  manager: {
    role: 'manager',
    label: ROLE_LABELS.manager,
    description: ROLE_DESCRIPTIONS.manager,
    color: ROLE_COLORS.manager,
    icon: ROLE_ICONS.manager,
    hierarchy: ROLE_HIERARCHY.manager,
    canBeAssignedBy: ['owner', 'admin'],
  },
  staff: {
    role: 'staff',
    label: ROLE_LABELS.staff,
    description: ROLE_DESCRIPTIONS.staff,
    color: ROLE_COLORS.staff,
    icon: ROLE_ICONS.staff,
    hierarchy: ROLE_HIERARCHY.staff,
    canBeAssignedBy: ['owner', 'admin', 'manager'],
  },
};

/**
 * Get all assignable roles for a given role
 */
export const getAssignableRoles = (currentRole: MerchantRole): MerchantRole[] => {
  const roles: MerchantRole[] = [];
  const currentHierarchy = ROLE_HIERARCHY[currentRole];

  // Can only assign roles with lower or equal hierarchy
  (Object.entries(ROLE_HIERARCHY) as [MerchantRole, number][]).forEach(([role, hierarchy]) => {
    if (hierarchy < currentHierarchy && role !== 'owner') {
      roles.push(role);
    }
  });

  return roles;
};

/**
 * Check if a role can be assigned by another role
 */
export const canAssignRole = (
  assignerRole: MerchantRole,
  targetRole: MerchantRole
): boolean => {
  // Owner role can never be assigned
  if (targetRole === 'owner') {
    return false;
  }

  return ROLE_INFO[targetRole].canBeAssignedBy.includes(assignerRole);
};

/**
 * Compare role hierarchy
 */
export const isHigherRole = (role1: MerchantRole, role2: MerchantRole): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
};

/**
 * Get role color with opacity
 */
export const getRoleColorWithOpacity = (role: MerchantRole, opacity: number = 0.1): string => {
  const color = ROLE_COLORS[role];
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Role Permissions Summary (high-level capabilities)
 */
export const ROLE_CAPABILITIES = {
  owner: {
    products: { view: true, create: true, edit: true, delete: true, export: true, bulkImport: true },
    orders: { view: true, viewAll: true, updateStatus: true, cancel: true, refund: true, export: true },
    team: { view: true, invite: true, remove: true, changeRole: true, changeStatus: true },
    analytics: { view: true, viewRevenue: true, viewCosts: true, export: true },
    settings: { view: true, edit: true, editBasic: true },
    billing: { view: true, manage: true, viewInvoices: true },
    customers: { view: true, edit: true, delete: true, export: true },
    promotions: { view: true, create: true, edit: true, delete: true },
    reviews: { view: true, respond: true, delete: true },
    notifications: { view: true, send: true },
    reports: { view: true, export: true, viewDetailed: true },
    inventory: { view: true, edit: true, bulkUpdate: true },
    categories: { view: true, create: true, edit: true, delete: true },
    profile: { view: true, edit: true },
    logs: { view: true, export: true },
    api: { access: true, manageKeys: true },
  },
  admin: {
    products: { view: true, create: true, edit: true, delete: true, export: true, bulkImport: true },
    orders: { view: true, viewAll: true, updateStatus: true, cancel: true, refund: true, export: true },
    team: { view: true, invite: true, remove: true, changeRole: false, changeStatus: true },
    analytics: { view: true, viewRevenue: true, viewCosts: false, export: true },
    settings: { view: true, edit: false, editBasic: true },
    billing: { view: false, manage: false, viewInvoices: false },
    customers: { view: true, edit: true, delete: true, export: true },
    promotions: { view: true, create: true, edit: true, delete: true },
    reviews: { view: true, respond: true, delete: true },
    notifications: { view: true, send: true },
    reports: { view: true, export: true, viewDetailed: true },
    inventory: { view: true, edit: true, bulkUpdate: true },
    categories: { view: true, create: true, edit: true, delete: true },
    profile: { view: true, edit: true },
    logs: { view: true, export: false },
    api: { access: true, manageKeys: false },
  },
  manager: {
    products: { view: true, create: true, edit: true, delete: false, export: true, bulkImport: false },
    orders: { view: true, viewAll: true, updateStatus: true, cancel: true, refund: false, export: true },
    team: { view: false, invite: false, remove: false, changeRole: false, changeStatus: false },
    analytics: { view: true, viewRevenue: false, viewCosts: false, export: false },
    settings: { view: false, edit: false, editBasic: false },
    billing: { view: false, manage: false, viewInvoices: false },
    customers: { view: true, edit: true, delete: false, export: true },
    promotions: { view: true, create: true, edit: true, delete: false },
    reviews: { view: true, respond: true, delete: false },
    notifications: { view: true, send: true },
    reports: { view: true, export: true, viewDetailed: false },
    inventory: { view: true, edit: true, bulkUpdate: false },
    categories: { view: true, create: true, edit: true, delete: false },
    profile: { view: true, edit: false },
    logs: { view: false, export: false },
    api: { access: false, manageKeys: false },
  },
  staff: {
    products: { view: true, create: false, edit: false, delete: false, export: false, bulkImport: false },
    orders: { view: true, viewAll: false, updateStatus: true, cancel: false, refund: false, export: false },
    team: { view: false, invite: false, remove: false, changeRole: false, changeStatus: false },
    analytics: { view: false, viewRevenue: false, viewCosts: false, export: false },
    settings: { view: false, edit: false, editBasic: false },
    billing: { view: false, manage: false, viewInvoices: false },
    customers: { view: true, edit: false, delete: false, export: false },
    promotions: { view: true, create: false, edit: false, delete: false },
    reviews: { view: true, respond: false, delete: false },
    notifications: { view: true, send: false },
    reports: { view: true, export: false, viewDetailed: false },
    inventory: { view: true, edit: false, bulkUpdate: false },
    categories: { view: true, create: false, edit: false, delete: false },
    profile: { view: true, edit: false },
    logs: { view: false, export: false },
    api: { access: false, manageKeys: false },
  },
} as const;

/**
 * Get role capabilities for a specific role
 */
export const getRoleCapabilities = (role: MerchantRole) => {
  return ROLE_CAPABILITIES[role];
};

/**
 * Default role for new team members
 */
export const DEFAULT_ROLE: MerchantRole = 'staff';

/**
 * Roles that require special permissions to invite
 */
export const RESTRICTED_ROLES: MerchantRole[] = ['owner', 'admin'];

/**
 * Export all role utilities
 */
export default {
  ROLE_HIERARCHY,
  ROLE_COLORS,
  ROLE_ICONS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_INFO,
  ROLE_CAPABILITIES,
  getAssignableRoles,
  canAssignRole,
  isHigherRole,
  getRoleColorWithOpacity,
  getRoleCapabilities,
  DEFAULT_ROLE,
  RESTRICTED_ROLES,
};

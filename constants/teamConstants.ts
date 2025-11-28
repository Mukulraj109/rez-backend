/**
 * Team Management Constants
 * Central configuration for team roles, permissions, status, and actions
 */

import { MerchantRole, TeamMemberStatus, Permission } from '../types/team';

/**
 * Role Definitions with Colors
 */
export const ROLE_CONFIG: Record<MerchantRole, {
  label: string;
  color: string;
  backgroundColor: string;
  description: string;
  icon: string;
}> = {
  owner: {
    label: 'Owner',
    color: '#7C3AED', // Primary purple
    backgroundColor: '#F3E8FF',
    description: 'Full access to all features including billing and account deletion',
    icon: 'shield-checkmark'
  },
  admin: {
    label: 'Admin',
    color: '#3B82F6', // Blue
    backgroundColor: '#DBEAFE',
    description: 'Manage products, orders, team, and most settings. Cannot manage billing or delete account',
    icon: 'key'
  },
  manager: {
    label: 'Manager',
    color: '#10B981', // Green
    backgroundColor: '#D1FAE5',
    description: 'Manage products and orders. Cannot delete products or manage team',
    icon: 'briefcase'
  },
  staff: {
    label: 'Staff',
    color: '#6B7280', // Gray
    backgroundColor: '#F3F4F6',
    description: 'View-only access with ability to update order status',
    icon: 'person'
  }
};

/**
 * Status Definitions with Colors
 */
export const STATUS_CONFIG: Record<TeamMemberStatus, {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
  description: string;
}> = {
  active: {
    label: 'Active',
    color: '#10B981', // Green
    backgroundColor: '#D1FAE5',
    icon: 'checkmark-circle',
    description: 'Team member is active and can access the system'
  },
  inactive: {
    label: 'Pending Acceptance',
    color: '#F59E0B', // Amber
    backgroundColor: '#FEF3C7',
    icon: 'time',
    description: 'Invitation sent, waiting for team member to accept'
  },
  suspended: {
    label: 'Suspended',
    color: '#EF4444', // Red
    backgroundColor: '#FEE2E2',
    icon: 'ban',
    description: 'Team member is suspended and cannot access the system'
  }
};

/**
 * Permission Categories
 * Organized by feature area for better UI display
 */
export const PERMISSION_CATEGORIES = {
  products: {
    name: 'Products',
    description: 'Manage product catalog',
    icon: 'cube',
    permissions: [
      'products:view',
      'products:create',
      'products:edit',
      'products:delete',
      'products:bulk_import',
      'products:export'
    ] as Permission[]
  },
  orders: {
    name: 'Orders',
    description: 'Manage customer orders',
    icon: 'receipt',
    permissions: [
      'orders:view',
      'orders:view_all',
      'orders:update_status',
      'orders:cancel',
      'orders:refund',
      'orders:export'
    ] as Permission[]
  },
  team: {
    name: 'Team',
    description: 'Manage team members',
    icon: 'people',
    permissions: [
      'team:view',
      'team:invite',
      'team:remove',
      'team:change_role',
      'team:change_status'
    ] as Permission[]
  },
  analytics: {
    name: 'Analytics',
    description: 'View business analytics',
    icon: 'bar-chart',
    permissions: [
      'analytics:view',
      'analytics:view_revenue',
      'analytics:view_costs',
      'analytics:export'
    ] as Permission[]
  },
  customers: {
    name: 'Customers',
    description: 'Manage customer data',
    icon: 'person',
    permissions: [
      'customers:view',
      'customers:edit',
      'customers:delete',
      'customers:export'
    ] as Permission[]
  },
  settings: {
    name: 'Settings',
    description: 'Configure system settings',
    icon: 'settings',
    permissions: [
      'settings:view',
      'settings:edit',
      'settings:edit_basic'
    ] as Permission[]
  },
  billing: {
    name: 'Billing',
    description: 'Manage billing and payments',
    icon: 'card',
    permissions: [
      'billing:view',
      'billing:manage',
      'billing:view_invoices'
    ] as Permission[]
  },
  promotions: {
    name: 'Promotions',
    description: 'Manage promotions and discounts',
    icon: 'gift',
    permissions: [
      'promotions:view',
      'promotions:create',
      'promotions:edit',
      'promotions:delete'
    ] as Permission[]
  },
  reviews: {
    name: 'Reviews',
    description: 'Manage customer reviews',
    icon: 'star',
    permissions: [
      'reviews:view',
      'reviews:respond',
      'reviews:delete'
    ] as Permission[]
  },
  notifications: {
    name: 'Notifications',
    description: 'Send and manage notifications',
    icon: 'notifications',
    permissions: [
      'notifications:view',
      'notifications:send'
    ] as Permission[]
  },
  reports: {
    name: 'Reports',
    description: 'Generate and export reports',
    icon: 'document-text',
    permissions: [
      'reports:view',
      'reports:export',
      'reports:view_detailed'
    ] as Permission[]
  },
  inventory: {
    name: 'Inventory',
    description: 'Manage inventory levels',
    icon: 'layers',
    permissions: [
      'inventory:view',
      'inventory:edit',
      'inventory:bulk_update'
    ] as Permission[]
  },
  categories: {
    name: 'Categories',
    description: 'Manage product categories',
    icon: 'apps',
    permissions: [
      'categories:view',
      'categories:create',
      'categories:edit',
      'categories:delete'
    ] as Permission[]
  },
  profile: {
    name: 'Profile',
    description: 'Manage store profile',
    icon: 'storefront',
    permissions: [
      'profile:view',
      'profile:edit'
    ] as Permission[]
  },
  logs: {
    name: 'Activity Logs',
    description: 'View activity logs',
    icon: 'list',
    permissions: [
      'logs:view',
      'logs:export'
    ] as Permission[]
  },
  api: {
    name: 'API Access',
    description: 'API keys and access',
    icon: 'code-slash',
    permissions: [
      'api:access',
      'api:manage_keys'
    ] as Permission[]
  }
};

/**
 * Permission Descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
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

/**
 * Team Action Types
 */
export const TEAM_ACTIONS = {
  INVITE: 'invite',
  ACCEPT: 'accept',
  ROLE_CHANGE: 'role_change',
  STATUS_CHANGE: 'status_change',
  REMOVE: 'remove',
  RESEND_INVITE: 'resend_invite'
} as const;

export type TeamActionType = typeof TEAM_ACTIONS[keyof typeof TEAM_ACTIONS];

/**
 * Team Limits
 */
export const TEAM_LIMITS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEAM_SIZE: 50,
  INVITATION_EXPIRY_DAYS: 7,
  MAX_PENDING_INVITATIONS: 10
};

/**
 * Role Hierarchy
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<MerchantRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  staff: 1
};

/**
 * Get roles that can be assigned by a given role
 */
export function getAssignableRoles(currentUserRole: MerchantRole): MerchantRole[] {
  const currentLevel = ROLE_HIERARCHY[currentUserRole];

  return Object.entries(ROLE_HIERARCHY)
    .filter(([role, level]) => level < currentLevel && role !== 'owner')
    .map(([role]) => role as MerchantRole);
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: MerchantRole, targetRole: MerchantRole): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Permission Utilities
 * Comprehensive permission definitions, mappings, and helper functions
 */

import { Permission, MerchantRole } from '../types/team';

/**
 * Permission Categories
 */
export const PERMISSION_CATEGORIES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  TEAM: 'team',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  BILLING: 'billing',
  CUSTOMERS: 'customers',
  PROMOTIONS: 'promotions',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  INVENTORY: 'inventory',
  CATEGORIES: 'categories',
  PROFILE: 'profile',
  LOGS: 'logs',
  API: 'api',
} as const;

/**
 * Permission Definitions with Descriptions
 */
export interface PermissionDefinition {
  permission: Permission;
  category: string;
  label: string;
  description: string;
  sensitive: boolean; // Indicates if this is a sensitive permission
}

/**
 * All Permission Definitions (75+ permissions)
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // PRODUCTS (6 permissions)
  {
    permission: 'products:view',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'View Products',
    description: 'View product listings and details',
    sensitive: false,
  },
  {
    permission: 'products:create',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'Create Products',
    description: 'Add new products to the store',
    sensitive: false,
  },
  {
    permission: 'products:edit',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'Edit Products',
    description: 'Modify existing product details',
    sensitive: false,
  },
  {
    permission: 'products:delete',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'Delete Products',
    description: 'Remove products from the store',
    sensitive: true,
  },
  {
    permission: 'products:bulk_import',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'Bulk Import Products',
    description: 'Import multiple products at once',
    sensitive: false,
  },
  {
    permission: 'products:export',
    category: PERMISSION_CATEGORIES.PRODUCTS,
    label: 'Export Products',
    description: 'Export product data to CSV/Excel',
    sensitive: false,
  },

  // ORDERS (6 permissions)
  {
    permission: 'orders:view',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'View Orders',
    description: 'View order listings',
    sensitive: false,
  },
  {
    permission: 'orders:view_all',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'View All Order Details',
    description: 'View complete order information including customer data',
    sensitive: true,
  },
  {
    permission: 'orders:update_status',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'Update Order Status',
    description: 'Change order status (processing, shipped, delivered)',
    sensitive: false,
  },
  {
    permission: 'orders:cancel',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'Cancel Orders',
    description: 'Cancel customer orders',
    sensitive: true,
  },
  {
    permission: 'orders:refund',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'Process Refunds',
    description: 'Issue refunds to customers',
    sensitive: true,
  },
  {
    permission: 'orders:export',
    category: PERMISSION_CATEGORIES.ORDERS,
    label: 'Export Orders',
    description: 'Export order data to CSV/Excel',
    sensitive: true,
  },

  // TEAM (5 permissions)
  {
    permission: 'team:view',
    category: PERMISSION_CATEGORIES.TEAM,
    label: 'View Team',
    description: 'View team members and their roles',
    sensitive: false,
  },
  {
    permission: 'team:invite',
    category: PERMISSION_CATEGORIES.TEAM,
    label: 'Invite Team Members',
    description: 'Send invitations to new team members',
    sensitive: true,
  },
  {
    permission: 'team:remove',
    category: PERMISSION_CATEGORIES.TEAM,
    label: 'Remove Team Members',
    description: 'Remove team members from the organization',
    sensitive: true,
  },
  {
    permission: 'team:change_role',
    category: PERMISSION_CATEGORIES.TEAM,
    label: 'Change Member Roles',
    description: 'Modify team member roles and permissions',
    sensitive: true,
  },
  {
    permission: 'team:change_status',
    category: PERMISSION_CATEGORIES.TEAM,
    label: 'Change Member Status',
    description: 'Activate, suspend, or deactivate team members',
    sensitive: true,
  },

  // ANALYTICS (4 permissions)
  {
    permission: 'analytics:view',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    label: 'View Analytics',
    description: 'View basic analytics and reports',
    sensitive: false,
  },
  {
    permission: 'analytics:view_revenue',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    label: 'View Revenue Analytics',
    description: 'View revenue, sales, and financial metrics',
    sensitive: true,
  },
  {
    permission: 'analytics:view_costs',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    label: 'View Cost Analytics',
    description: 'View cost analysis and profit margins',
    sensitive: true,
  },
  {
    permission: 'analytics:export',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    label: 'Export Analytics',
    description: 'Export analytics data',
    sensitive: true,
  },

  // SETTINGS (3 permissions)
  {
    permission: 'settings:view',
    category: PERMISSION_CATEGORIES.SETTINGS,
    label: 'View Settings',
    description: 'View application settings',
    sensitive: false,
  },
  {
    permission: 'settings:edit',
    category: PERMISSION_CATEGORIES.SETTINGS,
    label: 'Edit All Settings',
    description: 'Modify all application settings',
    sensitive: true,
  },
  {
    permission: 'settings:edit_basic',
    category: PERMISSION_CATEGORIES.SETTINGS,
    label: 'Edit Basic Settings',
    description: 'Modify basic store settings',
    sensitive: false,
  },

  // BILLING (3 permissions)
  {
    permission: 'billing:view',
    category: PERMISSION_CATEGORIES.BILLING,
    label: 'View Billing',
    description: 'View billing information and invoices',
    sensitive: true,
  },
  {
    permission: 'billing:manage',
    category: PERMISSION_CATEGORIES.BILLING,
    label: 'Manage Billing',
    description: 'Update payment methods and billing details',
    sensitive: true,
  },
  {
    permission: 'billing:view_invoices',
    category: PERMISSION_CATEGORIES.BILLING,
    label: 'View Invoices',
    description: 'View billing invoices',
    sensitive: true,
  },

  // CUSTOMERS (4 permissions)
  {
    permission: 'customers:view',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
    label: 'View Customers',
    description: 'View customer listings and basic information',
    sensitive: false,
  },
  {
    permission: 'customers:edit',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
    label: 'Edit Customers',
    description: 'Modify customer information',
    sensitive: true,
  },
  {
    permission: 'customers:delete',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
    label: 'Delete Customers',
    description: 'Remove customer accounts',
    sensitive: true,
  },
  {
    permission: 'customers:export',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
    label: 'Export Customers',
    description: 'Export customer data',
    sensitive: true,
  },

  // PROMOTIONS (4 permissions)
  {
    permission: 'promotions:view',
    category: PERMISSION_CATEGORIES.PROMOTIONS,
    label: 'View Promotions',
    description: 'View promotional campaigns and discounts',
    sensitive: false,
  },
  {
    permission: 'promotions:create',
    category: PERMISSION_CATEGORIES.PROMOTIONS,
    label: 'Create Promotions',
    description: 'Create new promotional campaigns',
    sensitive: false,
  },
  {
    permission: 'promotions:edit',
    category: PERMISSION_CATEGORIES.PROMOTIONS,
    label: 'Edit Promotions',
    description: 'Modify existing promotions',
    sensitive: false,
  },
  {
    permission: 'promotions:delete',
    category: PERMISSION_CATEGORIES.PROMOTIONS,
    label: 'Delete Promotions',
    description: 'Remove promotional campaigns',
    sensitive: true,
  },

  // REVIEWS (3 permissions)
  {
    permission: 'reviews:view',
    category: PERMISSION_CATEGORIES.REVIEWS,
    label: 'View Reviews',
    description: 'View customer reviews and ratings',
    sensitive: false,
  },
  {
    permission: 'reviews:respond',
    category: PERMISSION_CATEGORIES.REVIEWS,
    label: 'Respond to Reviews',
    description: 'Reply to customer reviews',
    sensitive: false,
  },
  {
    permission: 'reviews:delete',
    category: PERMISSION_CATEGORIES.REVIEWS,
    label: 'Delete Reviews',
    description: 'Remove inappropriate reviews',
    sensitive: true,
  },

  // NOTIFICATIONS (2 permissions)
  {
    permission: 'notifications:view',
    category: PERMISSION_CATEGORIES.NOTIFICATIONS,
    label: 'View Notifications',
    description: 'View system notifications',
    sensitive: false,
  },
  {
    permission: 'notifications:send',
    category: PERMISSION_CATEGORIES.NOTIFICATIONS,
    label: 'Send Notifications',
    description: 'Send notifications to customers',
    sensitive: false,
  },

  // REPORTS (3 permissions)
  {
    permission: 'reports:view',
    category: PERMISSION_CATEGORIES.REPORTS,
    label: 'View Reports',
    description: 'View standard reports',
    sensitive: false,
  },
  {
    permission: 'reports:export',
    category: PERMISSION_CATEGORIES.REPORTS,
    label: 'Export Reports',
    description: 'Export report data',
    sensitive: false,
  },
  {
    permission: 'reports:view_detailed',
    category: PERMISSION_CATEGORIES.REPORTS,
    label: 'View Detailed Reports',
    description: 'Access detailed financial and operational reports',
    sensitive: true,
  },

  // INVENTORY (3 permissions)
  {
    permission: 'inventory:view',
    category: PERMISSION_CATEGORIES.INVENTORY,
    label: 'View Inventory',
    description: 'View inventory levels and stock information',
    sensitive: false,
  },
  {
    permission: 'inventory:edit',
    category: PERMISSION_CATEGORIES.INVENTORY,
    label: 'Edit Inventory',
    description: 'Update inventory levels',
    sensitive: false,
  },
  {
    permission: 'inventory:bulk_update',
    category: PERMISSION_CATEGORIES.INVENTORY,
    label: 'Bulk Update Inventory',
    description: 'Update inventory for multiple products at once',
    sensitive: true,
  },

  // CATEGORIES (4 permissions)
  {
    permission: 'categories:view',
    category: PERMISSION_CATEGORIES.CATEGORIES,
    label: 'View Categories',
    description: 'View product categories',
    sensitive: false,
  },
  {
    permission: 'categories:create',
    category: PERMISSION_CATEGORIES.CATEGORIES,
    label: 'Create Categories',
    description: 'Add new product categories',
    sensitive: false,
  },
  {
    permission: 'categories:edit',
    category: PERMISSION_CATEGORIES.CATEGORIES,
    label: 'Edit Categories',
    description: 'Modify existing categories',
    sensitive: false,
  },
  {
    permission: 'categories:delete',
    category: PERMISSION_CATEGORIES.CATEGORIES,
    label: 'Delete Categories',
    description: 'Remove product categories',
    sensitive: true,
  },

  // PROFILE (2 permissions)
  {
    permission: 'profile:view',
    category: PERMISSION_CATEGORIES.PROFILE,
    label: 'View Store Profile',
    description: 'View store profile information',
    sensitive: false,
  },
  {
    permission: 'profile:edit',
    category: PERMISSION_CATEGORIES.PROFILE,
    label: 'Edit Store Profile',
    description: 'Modify store profile and public information',
    sensitive: true,
  },

  // LOGS (2 permissions)
  {
    permission: 'logs:view',
    category: PERMISSION_CATEGORIES.LOGS,
    label: 'View Activity Logs',
    description: 'View system and user activity logs',
    sensitive: true,
  },
  {
    permission: 'logs:export',
    category: PERMISSION_CATEGORIES.LOGS,
    label: 'Export Logs',
    description: 'Export activity log data',
    sensitive: true,
  },

  // API (2 permissions)
  {
    permission: 'api:access',
    category: PERMISSION_CATEGORIES.API,
    label: 'API Access',
    description: 'Access to API endpoints',
    sensitive: false,
  },
  {
    permission: 'api:manage_keys',
    category: PERMISSION_CATEGORIES.API,
    label: 'Manage API Keys',
    description: 'Create, revoke, and manage API keys',
    sensitive: true,
  },
];

/**
 * Role Permission Mappings
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<MerchantRole, Permission[]> = {
  owner: [
    // Products - all permissions
    'products:view', 'products:create', 'products:edit', 'products:delete', 'products:bulk_import', 'products:export',
    // Orders - all permissions
    'orders:view', 'orders:view_all', 'orders:update_status', 'orders:cancel', 'orders:refund', 'orders:export',
    // Team - all permissions
    'team:view', 'team:invite', 'team:remove', 'team:change_role', 'team:change_status',
    // Analytics - all permissions
    'analytics:view', 'analytics:view_revenue', 'analytics:view_costs', 'analytics:export',
    // Settings - all permissions
    'settings:view', 'settings:edit', 'settings:edit_basic',
    // Billing - all permissions
    'billing:view', 'billing:manage', 'billing:view_invoices',
    // Customers - all permissions
    'customers:view', 'customers:edit', 'customers:delete', 'customers:export',
    // Promotions - all permissions
    'promotions:view', 'promotions:create', 'promotions:edit', 'promotions:delete',
    // Reviews - all permissions
    'reviews:view', 'reviews:respond', 'reviews:delete',
    // Notifications - all permissions
    'notifications:view', 'notifications:send',
    // Reports - all permissions
    'reports:view', 'reports:export', 'reports:view_detailed',
    // Inventory - all permissions
    'inventory:view', 'inventory:edit', 'inventory:bulk_update',
    // Categories - all permissions
    'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
    // Profile - all permissions
    'profile:view', 'profile:edit',
    // Logs - all permissions
    'logs:view', 'logs:export',
    // API - all permissions
    'api:access', 'api:manage_keys',
  ],
  admin: [
    // Products - all except sensitive
    'products:view', 'products:create', 'products:edit', 'products:delete', 'products:bulk_import', 'products:export',
    // Orders - all permissions
    'orders:view', 'orders:view_all', 'orders:update_status', 'orders:cancel', 'orders:refund', 'orders:export',
    // Team - limited (no role changes)
    'team:view', 'team:invite', 'team:remove', 'team:change_status',
    // Analytics - limited (no cost analytics)
    'analytics:view', 'analytics:view_revenue', 'analytics:export',
    // Settings - basic only
    'settings:view', 'settings:edit_basic',
    // Billing - none
    // Customers - all permissions
    'customers:view', 'customers:edit', 'customers:delete', 'customers:export',
    // Promotions - all permissions
    'promotions:view', 'promotions:create', 'promotions:edit', 'promotions:delete',
    // Reviews - all permissions
    'reviews:view', 'reviews:respond', 'reviews:delete',
    // Notifications - all permissions
    'notifications:view', 'notifications:send',
    // Reports - all permissions
    'reports:view', 'reports:export', 'reports:view_detailed',
    // Inventory - all permissions
    'inventory:view', 'inventory:edit', 'inventory:bulk_update',
    // Categories - all permissions
    'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
    // Profile - all permissions
    'profile:view', 'profile:edit',
    // Logs - view only
    'logs:view',
    // API - access only
    'api:access',
  ],
  manager: [
    // Products - no delete or bulk import
    'products:view', 'products:create', 'products:edit', 'products:export',
    // Orders - no refund
    'orders:view', 'orders:view_all', 'orders:update_status', 'orders:cancel', 'orders:export',
    // Team - none
    // Analytics - basic view only
    'analytics:view',
    // Settings - none
    // Billing - none
    // Customers - no delete
    'customers:view', 'customers:edit', 'customers:export',
    // Promotions - no delete
    'promotions:view', 'promotions:create', 'promotions:edit',
    // Reviews - no delete
    'reviews:view', 'reviews:respond',
    // Notifications - all permissions
    'notifications:view', 'notifications:send',
    // Reports - no detailed
    'reports:view', 'reports:export',
    // Inventory - no bulk update
    'inventory:view', 'inventory:edit',
    // Categories - no delete
    'categories:view', 'categories:create', 'categories:edit',
    // Profile - view only
    'profile:view',
    // Logs - none
    // API - none
  ],
  staff: [
    // Products - view only
    'products:view',
    // Orders - view and update status only
    'orders:view', 'orders:update_status',
    // Team - none
    // Analytics - none
    // Settings - none
    // Billing - none
    // Customers - view only
    'customers:view',
    // Promotions - view only
    'promotions:view',
    // Reviews - view only
    'reviews:view',
    // Notifications - view only
    'notifications:view',
    // Reports - view only
    'reports:view',
    // Inventory - view only
    'inventory:view',
    // Categories - view only
    'categories:view',
    // Profile - view only
    'profile:view',
    // Logs - none
    // API - none
  ],
};

/**
 * Helper Functions
 */

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: MerchantRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role].includes(permission);
};

/**
 * Check if a role has any of the specified permissions
 */
export const hasAnyPermission = (role: MerchantRole, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a role has all of the specified permissions
 */
export const hasAllPermissions = (role: MerchantRole, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: MerchantRole): Permission[] => {
  return ROLE_PERMISSIONS[role];
};

/**
 * Get permissions grouped by category
 */
export const getPermissionsByCategory = (role: MerchantRole): Record<string, PermissionDefinition[]> => {
  const permissions = ROLE_PERMISSIONS[role];
  const permissionDefs = PERMISSION_DEFINITIONS.filter(def => permissions.includes(def.permission));

  const grouped: Record<string, PermissionDefinition[]> = {};
  permissionDefs.forEach(def => {
    if (!grouped[def.category]) {
      grouped[def.category] = [];
    }
    grouped[def.category].push(def);
  });

  return grouped;
};

/**
 * Get permission definition by permission key
 */
export const getPermissionDefinition = (permission: Permission): PermissionDefinition | undefined => {
  return PERMISSION_DEFINITIONS.find(def => def.permission === permission);
};

/**
 * Get permissions for a specific category
 */
export const getCategoryPermissions = (category: string): PermissionDefinition[] => {
  return PERMISSION_DEFINITIONS.filter(def => def.category === category);
};

/**
 * Check if permission is sensitive
 */
export const isSensitivePermission = (permission: Permission): boolean => {
  const def = getPermissionDefinition(permission);
  return def?.sensitive ?? false;
};

/**
 * Get missing permissions (what a role doesn't have)
 */
export const getMissingPermissions = (role: MerchantRole): Permission[] => {
  const allPermissions = PERMISSION_DEFINITIONS.map(def => def.permission);
  const rolePermissions = ROLE_PERMISSIONS[role];
  return allPermissions.filter(permission => !rolePermissions.includes(permission));
};

/**
 * Compare two roles and get permission differences
 */
export const compareRolePermissions = (
  role1: MerchantRole,
  role2: MerchantRole
): {
  onlyInRole1: Permission[];
  onlyInRole2: Permission[];
  shared: Permission[];
} => {
  const permissions1 = new Set(ROLE_PERMISSIONS[role1]);
  const permissions2 = new Set(ROLE_PERMISSIONS[role2]);

  const onlyInRole1 = ROLE_PERMISSIONS[role1].filter(p => !permissions2.has(p));
  const onlyInRole2 = ROLE_PERMISSIONS[role2].filter(p => !permissions1.has(p));
  const shared = ROLE_PERMISSIONS[role1].filter(p => permissions2.has(p));

  return { onlyInRole1, onlyInRole2, shared };
};

/**
 * Get permission count for a role
 */
export const getPermissionCount = (role: MerchantRole): number => {
  return ROLE_PERMISSIONS[role].length;
};

/**
 * Export all utilities
 */
export default {
  PERMISSION_CATEGORIES,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  getPermissionsByCategory,
  getPermissionDefinition,
  getCategoryPermissions,
  isSensitivePermission,
  getMissingPermissions,
  compareRolePermissions,
  getPermissionCount,
};

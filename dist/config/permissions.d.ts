import { MerchantUserRole } from '../models/MerchantUser';
/**
 * RBAC Permission System
 *
 * This file defines all available permissions and which roles have access to them.
 * Permissions follow the format: "resource:action"
 */
export declare const PERMISSIONS: {
    readonly 'products:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'products:create': readonly ["owner", "admin", "manager"];
    readonly 'products:edit': readonly ["owner", "admin", "manager"];
    readonly 'products:delete': readonly ["owner", "admin"];
    readonly 'products:bulk_import': readonly ["owner", "admin"];
    readonly 'products:export': readonly ["owner", "admin", "manager"];
    readonly 'orders:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'orders:view_all': readonly ["owner", "admin", "manager"];
    readonly 'orders:update_status': readonly ["owner", "admin", "manager", "staff"];
    readonly 'orders:cancel': readonly ["owner", "admin", "manager"];
    readonly 'orders:refund': readonly ["owner", "admin"];
    readonly 'orders:export': readonly ["owner", "admin", "manager"];
    readonly 'team:view': readonly ["owner", "admin"];
    readonly 'team:invite': readonly ["owner", "admin"];
    readonly 'team:remove': readonly ["owner", "admin"];
    readonly 'team:change_role': readonly ["owner"];
    readonly 'team:change_status': readonly ["owner", "admin"];
    readonly 'analytics:view': readonly ["owner", "admin", "manager"];
    readonly 'analytics:view_revenue': readonly ["owner", "admin"];
    readonly 'analytics:view_costs': readonly ["owner"];
    readonly 'analytics:export': readonly ["owner", "admin"];
    readonly 'settings:view': readonly ["owner", "admin"];
    readonly 'settings:edit': readonly ["owner"];
    readonly 'settings:edit_basic': readonly ["owner", "admin"];
    readonly 'billing:view': readonly ["owner"];
    readonly 'billing:manage': readonly ["owner"];
    readonly 'billing:view_invoices': readonly ["owner"];
    readonly 'customers:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'customers:edit': readonly ["owner", "admin", "manager"];
    readonly 'customers:delete': readonly ["owner", "admin"];
    readonly 'customers:export': readonly ["owner", "admin", "manager"];
    readonly 'promotions:view': readonly ["owner", "admin", "manager"];
    readonly 'promotions:create': readonly ["owner", "admin", "manager"];
    readonly 'promotions:edit': readonly ["owner", "admin", "manager"];
    readonly 'promotions:delete': readonly ["owner", "admin"];
    readonly 'reviews:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'reviews:respond': readonly ["owner", "admin", "manager"];
    readonly 'reviews:delete': readonly ["owner", "admin"];
    readonly 'notifications:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'notifications:send': readonly ["owner", "admin", "manager"];
    readonly 'reports:view': readonly ["owner", "admin", "manager"];
    readonly 'reports:export': readonly ["owner", "admin", "manager"];
    readonly 'reports:view_detailed': readonly ["owner", "admin"];
    readonly 'inventory:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'inventory:edit': readonly ["owner", "admin", "manager"];
    readonly 'inventory:bulk_update': readonly ["owner", "admin"];
    readonly 'categories:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'categories:create': readonly ["owner", "admin", "manager"];
    readonly 'categories:edit': readonly ["owner", "admin", "manager"];
    readonly 'categories:delete': readonly ["owner", "admin"];
    readonly 'profile:view': readonly ["owner", "admin", "manager", "staff"];
    readonly 'profile:edit': readonly ["owner", "admin"];
    readonly 'logs:view': readonly ["owner", "admin"];
    readonly 'logs:export': readonly ["owner"];
    readonly 'api:access': readonly ["owner", "admin"];
    readonly 'api:manage_keys': readonly ["owner"];
};
export type Permission = keyof typeof PERMISSIONS;
/**
 * Role-based permission sets
 * These are the default permissions assigned to each role
 */
export declare const ROLE_PERMISSIONS: Record<MerchantUserRole, Permission[]>;
/**
 * Check if a role has a specific permission
 */
export declare function hasPermission(role: MerchantUserRole, permission: Permission): boolean;
/**
 * Get all permissions for a role
 */
export declare function getPermissionsForRole(role: MerchantUserRole): Permission[];
/**
 * Check if a role has all of the specified permissions
 */
export declare function hasAllPermissions(role: MerchantUserRole, permissions: Permission[]): boolean;
/**
 * Check if a role has any of the specified permissions
 */
export declare function hasAnyPermission(role: MerchantUserRole, permissions: Permission[]): boolean;
/**
 * Get readable permission description
 */
export declare function getPermissionDescription(permission: Permission): string;
/**
 * Get role description
 */
export declare function getRoleDescription(role: string): string;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireManagerOrHigher = exports.requireAdminOrOwner = exports.requireOwner = void 0;
exports.checkPermission = checkPermission;
exports.checkAnyPermission = checkAnyPermission;
exports.checkAllPermissions = checkAllPermissions;
exports.requireRole = requireRole;
const permissions_1 = require("../config/permissions");
/**
 * RBAC Middleware
 *
 * Provides role-based access control for merchant routes.
 * Requires the auth middleware to run first to populate req.merchant or req.merchantUser
 */
/**
 * Check if user has a specific permission
 *
 * Usage:
 * router.post('/products', checkPermission('products:create'), createProduct);
 */
function checkPermission(permission) {
    return (req, res, next) => {
        try {
            // Get user role from either merchantUser or merchant (owner)
            const role = req.merchantUser?.role || 'owner';
            const userId = req.merchantUser?._id || req.merchantId;
            console.log(`🔐 [RBAC] Checking permission "${permission}" for role "${role}"`);
            if (!userId) {
                console.warn('⚠️ [RBAC] No authenticated user found');
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Check if user's account is active
            if (req.merchantUser && req.merchantUser.status !== 'active') {
                console.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
                return res.status(403).json({
                    success: false,
                    message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
                });
            }
            // Check permission
            if (!(0, permissions_1.hasPermission)(role, permission)) {
                console.warn(`⚠️ [RBAC] Permission denied: "${permission}" for role "${role}"`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Insufficient permissions',
                    required: permission,
                    userRole: role
                });
            }
            console.log(`✅ [RBAC] Permission granted: "${permission}" for role "${role}"`);
            next();
        }
        catch (error) {
            console.error('❌ [RBAC] Error in checkPermission middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
}
/**
 * Check if user has any of the specified permissions
 *
 * Usage:
 * router.get('/analytics', checkAnyPermission(['analytics:view', 'reports:view']), getAnalytics);
 */
function checkAnyPermission(permissions) {
    return (req, res, next) => {
        try {
            const role = req.merchantUser?.role || 'owner';
            const userId = req.merchantUser?._id || req.merchantId;
            console.log(`🔐 [RBAC] Checking any of permissions [${permissions.join(', ')}] for role "${role}"`);
            if (!userId) {
                console.warn('⚠️ [RBAC] No authenticated user found');
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Check if user's account is active
            if (req.merchantUser && req.merchantUser.status !== 'active') {
                console.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
                return res.status(403).json({
                    success: false,
                    message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
                });
            }
            // Check if user has any of the permissions
            if (!(0, permissions_1.hasAnyPermission)(role, permissions)) {
                console.warn(`⚠️ [RBAC] Permission denied: User needs any of [${permissions.join(', ')}]`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Insufficient permissions',
                    required: `Any of: ${permissions.join(', ')}`,
                    userRole: role
                });
            }
            console.log(`✅ [RBAC] Permission granted for role "${role}"`);
            next();
        }
        catch (error) {
            console.error('❌ [RBAC] Error in checkAnyPermission middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
}
/**
 * Check if user has all of the specified permissions
 *
 * Usage:
 * router.post('/bulk-import', checkAllPermissions(['products:create', 'products:bulk_import']), bulkImport);
 */
function checkAllPermissions(permissions) {
    return (req, res, next) => {
        try {
            const role = req.merchantUser?.role || 'owner';
            const userId = req.merchantUser?._id || req.merchantId;
            console.log(`🔐 [RBAC] Checking all permissions [${permissions.join(', ')}] for role "${role}"`);
            if (!userId) {
                console.warn('⚠️ [RBAC] No authenticated user found');
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Check if user's account is active
            if (req.merchantUser && req.merchantUser.status !== 'active') {
                console.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
                return res.status(403).json({
                    success: false,
                    message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
                });
            }
            // Check if user has all permissions
            if (!(0, permissions_1.hasAllPermissions)(role, permissions)) {
                console.warn(`⚠️ [RBAC] Permission denied: User needs all of [${permissions.join(', ')}]`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Insufficient permissions',
                    required: `All of: ${permissions.join(', ')}`,
                    userRole: role
                });
            }
            console.log(`✅ [RBAC] All permissions granted for role "${role}"`);
            next();
        }
        catch (error) {
            console.error('❌ [RBAC] Error in checkAllPermissions middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
}
/**
 * Check if user has a specific role
 *
 * Usage:
 * router.delete('/account', requireRole('owner'), deleteAccount);
 */
function requireRole(...roles) {
    return (req, res, next) => {
        try {
            const role = req.merchantUser?.role || 'owner';
            const userId = req.merchantUser?._id || req.merchantId;
            console.log(`🔐 [RBAC] Checking if role "${role}" is in [${roles.join(', ')}]`);
            if (!userId) {
                console.warn('⚠️ [RBAC] No authenticated user found');
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Check if user's account is active
            if (req.merchantUser && req.merchantUser.status !== 'active') {
                console.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
                return res.status(403).json({
                    success: false,
                    message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
                });
            }
            // Check role
            if (!roles.includes(role)) {
                console.warn(`⚠️ [RBAC] Role denied: "${role}" not in [${roles.join(', ')}]`);
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Insufficient role',
                    required: `One of: ${roles.join(', ')}`,
                    userRole: role
                });
            }
            console.log(`✅ [RBAC] Role authorized: "${role}"`);
            next();
        }
        catch (error) {
            console.error('❌ [RBAC] Error in requireRole middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
}
/**
 * Require owner role (shorthand for requireRole('owner'))
 *
 * Usage:
 * router.delete('/account', requireOwner, deleteAccount);
 */
exports.requireOwner = requireRole('owner');
/**
 * Require admin or owner role
 *
 * Usage:
 * router.post('/team/invite', requireAdminOrOwner, inviteTeamMember);
 */
exports.requireAdminOrOwner = requireRole('owner', 'admin');
/**
 * Require manager or higher role (owner, admin, or manager)
 *
 * Usage:
 * router.post('/products', requireManagerOrHigher, createProduct);
 */
exports.requireManagerOrHigher = requireRole('owner', 'admin', 'manager');

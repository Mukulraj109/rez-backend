import { Request, Response, NextFunction } from 'express';
import { MerchantUserRole } from '../models/MerchantUser';
import { Permission } from '../config/permissions';
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
export declare function checkPermission(permission: Permission): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Check if user has any of the specified permissions
 *
 * Usage:
 * router.get('/analytics', checkAnyPermission(['analytics:view', 'reports:view']), getAnalytics);
 */
export declare function checkAnyPermission(permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Check if user has all of the specified permissions
 *
 * Usage:
 * router.post('/bulk-import', checkAllPermissions(['products:create', 'products:bulk_import']), bulkImport);
 */
export declare function checkAllPermissions(permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Check if user has a specific role
 *
 * Usage:
 * router.delete('/account', requireRole('owner'), deleteAccount);
 */
export declare function requireRole(...roles: MerchantUserRole[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Require owner role (shorthand for requireRole('owner'))
 *
 * Usage:
 * router.delete('/account', requireOwner, deleteAccount);
 */
export declare const requireOwner: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Require admin or owner role
 *
 * Usage:
 * router.post('/team/invite', requireAdminOrOwner, inviteTeamMember);
 */
export declare const requireAdminOrOwner: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Require manager or higher role (owner, admin, or manager)
 *
 * Usage:
 * router.post('/products', requireManagerOrHigher, createProduct);
 */
export declare const requireManagerOrHigher: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;

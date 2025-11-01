import { Request, Response } from 'express';
/**
 * GET /api/store-vouchers/store/:storeId
 * Get available store vouchers for a specific store
 */
export declare const getStoreVouchers: (req: Request, res: Response) => Promise<any>;
/**
 * GET /api/store-vouchers/:id
 * Get single store voucher by ID
 */
export declare const getStoreVoucherById: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/store-vouchers/:id/claim
 * Claim a store voucher (assign to user) - authenticated users only
 */
export declare const claimStoreVoucher: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/store-vouchers/:id/redeem
 * Redeem a store voucher (mark as used) - authenticated users only
 */
export declare const redeemStoreVoucher: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/store-vouchers/validate
 * Validate a store voucher code
 */
export declare const validateStoreVoucher: (req: Request, res: Response) => Promise<any>;
/**
 * GET /api/store-vouchers/my-vouchers
 * Get user's claimed store vouchers (authenticated users only)
 */
export declare const getMyStoreVouchers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/store-vouchers/my-vouchers/:id
 * Get single user voucher details (authenticated users only)
 */
export declare const getMyStoreVoucherById: (req: Request, res: Response) => Promise<any>;
/**
 * DELETE /api/store-vouchers/my-vouchers/:id
 * Remove a claimed voucher (only if not used) - authenticated users only
 */
export declare const removeClaimedVoucher: (req: Request, res: Response) => Promise<any>;

/**
 * Creates a test merchant with default or custom values
 */
export declare const createTestMerchant: (overrides?: any) => Promise<any>;
/**
 * Generates a JWT token for a merchant
 */
export declare const generateMerchantToken: (merchantId: string) => string;
/**
 * Creates authentication headers with Bearer token
 */
export declare const createAuthHeaders: (token: string) => {
    Authorization: string;
    'Content-Type': string;
};
/**
 * Creates a plain password for testing (before hashing)
 */
export declare const TEST_PASSWORD = "Password123";
/**
 * Helper to create merchant with known password
 */
export declare const createTestMerchantWithPassword: (password?: string, overrides?: any) => Promise<any>;
/**
 * Create test merchant user (team member)
 */
export declare const createTestMerchantUser: (merchantId: string, overrides?: any) => Promise<any>;
/**
 * Create test product
 */
export declare const createTestProduct: (merchantId: string, overrides?: any) => Promise<any>;
/**
 * Create test order
 */
export declare const createTestOrder: (merchantId: string, overrides?: any) => Promise<any>;
/**
 * Generate auth token for merchant user
 */
export declare const generateMerchantUserToken: (userId: string, merchantId: string, role?: string) => string;
/**
 * Clean up test data
 */
export declare const cleanupTestData: () => Promise<void>;
/**
 * Sleep utility
 */
export declare const sleep: (ms: number) => Promise<unknown>;

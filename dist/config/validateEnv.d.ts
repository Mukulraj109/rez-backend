/**
 * Environment Variable Validation Utility
 * Ensures all required environment variables are present and valid
 * Prevents server startup with missing or invalid configuration
 */
interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_MERCHANT_SECRET: string;
    FRONTEND_URL: string;
    BCRYPT_ROUNDS: number;
}
/**
 * Validate environment variables
 * Throws error if required variables are missing
 * Logs warnings for recommended variables
 */
export declare function validateEnvironment(): EnvConfig;
/**
 * Check if sensitive data is exposed in environment
 */
export declare function checkForExposedSecrets(): void;
/**
 * Generate secure random secret
 * Useful for generating new JWT secrets
 */
export declare function generateSecureSecret(length?: number): string;
/**
 * Mask sensitive environment variable for logging
 */
export declare function maskSecret(secret: string): string;
declare const _default: {
    validateEnvironment: typeof validateEnvironment;
    checkForExposedSecrets: typeof checkForExposedSecrets;
    generateSecureSecret: typeof generateSecureSecret;
    maskSecret: typeof maskSecret;
};
export default _default;

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export declare function encrypt(text: string): string;
/**
 * Decrypt sensitive data
 * @param encryptedString - Encrypted data string
 * @returns Decrypted plain text
 */
export declare function decrypt(encryptedString: string): string;
/**
 * Hash sensitive data (one-way)
 * Used for data that doesn't need to be retrieved (like verification codes)
 * @param text - Text to hash
 * @returns Hashed string
 */
export declare function hash(text: string): string;
/**
 * Generate secure random token
 * @param length - Length of token in bytes (default 32)
 * @returns Random token in hex format
 */
export declare function generateSecureToken(length?: number): string;
/**
 * Mask sensitive data for logging/display
 * Shows only first and last few characters
 * @param text - Text to mask
 * @param visibleChars - Number of visible characters at start/end (default 4)
 * @returns Masked string
 */
export declare function maskSensitiveData(text: string, visibleChars?: number): string;
/**
 * Encrypt bank account number
 * Special handling for bank account numbers
 */
export declare function encryptBankAccount(accountNumber: string): string;
/**
 * Decrypt bank account number
 */
export declare function decryptBankAccount(encryptedAccount: string): string;
/**
 * Encrypt PAN/Tax ID
 */
export declare function encryptTaxId(taxId: string): string;
/**
 * Decrypt PAN/Tax ID
 */
export declare function decryptTaxId(encryptedTaxId: string): string;
/**
 * Compare encrypted value with plain text
 * @param plainText - Plain text to compare
 * @param encryptedString - Encrypted string
 * @returns True if values match
 */
export declare function compareEncrypted(plainText: string, encryptedString: string): boolean;
/**
 * Encrypt object fields
 * Encrypts specified fields in an object
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export declare function encryptObjectFields(obj: any, fieldsToEncrypt: string[]): any;
/**
 * Decrypt object fields
 * Decrypts specified fields in an object
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export declare function decryptObjectFields(obj: any, fieldsToDecrypt: string[]): any;
declare const _default: {
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    hash: typeof hash;
    generateSecureToken: typeof generateSecureToken;
    maskSensitiveData: typeof maskSensitiveData;
    encryptBankAccount: typeof encryptBankAccount;
    decryptBankAccount: typeof decryptBankAccount;
    encryptTaxId: typeof encryptTaxId;
    decryptTaxId: typeof decryptTaxId;
    compareEncrypted: typeof compareEncrypted;
    encryptObjectFields: typeof encryptObjectFields;
    decryptObjectFields: typeof decryptObjectFields;
};
export default _default;

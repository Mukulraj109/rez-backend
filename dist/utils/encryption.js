"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.hash = hash;
exports.generateSecureToken = generateSecureToken;
exports.maskSensitiveData = maskSensitiveData;
exports.encryptBankAccount = encryptBankAccount;
exports.decryptBankAccount = decryptBankAccount;
exports.encryptTaxId = encryptTaxId;
exports.decryptTaxId = decryptTaxId;
exports.compareEncrypted = compareEncrypted;
exports.encryptObjectFields = encryptObjectFields;
exports.decryptObjectFields = decryptObjectFields;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Field Encryption Utility
 * Encrypts sensitive fields like bank account numbers, SSN, etc.
 * Uses AES-256-GCM for authenticated encryption
 */
// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-encryption-key-change-this';
// Ensure key is 32 bytes for AES-256
const KEY = crypto_1.default.createHash('sha256').update(ENCRYPTION_KEY).digest();
/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted data with IV and auth tag
 */
function encrypt(text) {
    if (!text)
        return '';
    try {
        // Generate random initialization vector
        const iv = crypto_1.default.randomBytes(16);
        // Create cipher with AES-256-GCM
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', KEY, iv);
        // Encrypt the data
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Get auth tag for authenticated encryption
        const authTag = cipher.getAuthTag();
        // Return encrypted data with IV and auth tag
        const encryptedData = {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
        return JSON.stringify(encryptedData);
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}
/**
 * Decrypt sensitive data
 * @param encryptedString - Encrypted data string
 * @returns Decrypted plain text
 */
function decrypt(encryptedString) {
    if (!encryptedString)
        return '';
    try {
        // Parse encrypted data
        const encryptedData = JSON.parse(encryptedString);
        // Convert hex strings back to buffers
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        const encrypted = encryptedData.encrypted;
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', KEY, iv);
        decipher.setAuthTag(authTag);
        // Decrypt the data
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}
/**
 * Hash sensitive data (one-way)
 * Used for data that doesn't need to be retrieved (like verification codes)
 * @param text - Text to hash
 * @returns Hashed string
 */
function hash(text) {
    return crypto_1.default.createHash('sha256').update(text).digest('hex');
}
/**
 * Generate secure random token
 * @param length - Length of token in bytes (default 32)
 * @returns Random token in hex format
 */
function generateSecureToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Mask sensitive data for logging/display
 * Shows only first and last few characters
 * @param text - Text to mask
 * @param visibleChars - Number of visible characters at start/end (default 4)
 * @returns Masked string
 */
function maskSensitiveData(text, visibleChars = 4) {
    if (!text || text.length <= visibleChars * 2) {
        return '***';
    }
    const start = text.substring(0, visibleChars);
    const end = text.substring(text.length - visibleChars);
    const maskedLength = text.length - (visibleChars * 2);
    const mask = '*'.repeat(Math.min(maskedLength, 10));
    return `${start}${mask}${end}`;
}
/**
 * Encrypt bank account number
 * Special handling for bank account numbers
 */
function encryptBankAccount(accountNumber) {
    // Remove any spaces or dashes
    const cleaned = accountNumber.replace(/[\s-]/g, '');
    return encrypt(cleaned);
}
/**
 * Decrypt bank account number
 */
function decryptBankAccount(encryptedAccount) {
    return decrypt(encryptedAccount);
}
/**
 * Encrypt PAN/Tax ID
 */
function encryptTaxId(taxId) {
    const cleaned = taxId.replace(/[\s-]/g, '').toUpperCase();
    return encrypt(cleaned);
}
/**
 * Decrypt PAN/Tax ID
 */
function decryptTaxId(encryptedTaxId) {
    return decrypt(encryptedTaxId);
}
/**
 * Compare encrypted value with plain text
 * @param plainText - Plain text to compare
 * @param encryptedString - Encrypted string
 * @returns True if values match
 */
function compareEncrypted(plainText, encryptedString) {
    try {
        const decrypted = decrypt(encryptedString);
        return plainText === decrypted;
    }
    catch (error) {
        return false;
    }
}
/**
 * Encrypt object fields
 * Encrypts specified fields in an object
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
function encryptObjectFields(obj, fieldsToEncrypt) {
    const encrypted = { ...obj };
    fieldsToEncrypt.forEach(field => {
        if (encrypted[field] && typeof encrypted[field] === 'string') {
            encrypted[field] = encrypt(encrypted[field]);
        }
    });
    return encrypted;
}
/**
 * Decrypt object fields
 * Decrypts specified fields in an object
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
function decryptObjectFields(obj, fieldsToDecrypt) {
    const decrypted = { ...obj };
    fieldsToDecrypt.forEach(field => {
        if (decrypted[field] && typeof decrypted[field] === 'string') {
            try {
                decrypted[field] = decrypt(decrypted[field]);
            }
            catch (error) {
                // If decryption fails, field might not be encrypted
                console.warn(`Failed to decrypt field: ${field}`);
            }
        }
    });
    return decrypted;
}
exports.default = {
    encrypt,
    decrypt,
    hash,
    generateSecureToken,
    maskSensitiveData,
    encryptBankAccount,
    decryptBankAccount,
    encryptTaxId,
    decryptTaxId,
    compareEncrypted,
    encryptObjectFields,
    decryptObjectFields
};

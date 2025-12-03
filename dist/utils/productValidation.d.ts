/**
 * Product Validation Utility
 * Provides comprehensive validation functions for product data
 */
export interface PriceValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface SKUValidationResult {
    isValid: boolean;
    error?: string;
}
export interface CashbackValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}
export interface InventoryValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}
/**
 * Validate pricing logic
 * Ensures selling price <= original price and cost price < selling price
 */
export declare function validatePriceLogic(sellingPrice: number, originalPrice?: number, costPrice?: number): PriceValidationResult;
/**
 * Validate SKU format
 * Ensures SKU follows proper format (alphanumeric, uppercase, hyphens allowed)
 */
export declare function validateSKUFormat(sku: string): SKUValidationResult;
/**
 * Validate cashback logic
 * Ensures cashback percentage and max amount are reasonable
 */
export declare function validateCashbackLogic(percentage: number, maxAmount?: number, productPrice?: number): CashbackValidationResult;
/**
 * Validate inventory settings
 * Ensures stock levels and thresholds are properly configured
 */
export declare function validateInventory(stock: number, lowStockThreshold?: number, allowBackorders?: boolean, trackInventory?: boolean): InventoryValidationResult;
/**
 * Validate variant pricing
 * Ensures variant prices are consistent with base product price
 */
export declare function validateVariantPricing(basePrice: number, variantPrice: number, variantName: string): PriceValidationResult;
/**
 * Comprehensive product validation
 * Validates all product data at once
 */
export interface ComprehensiveValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateProduct(data: {
    name?: string;
    sku?: string;
    price?: number;
    originalPrice?: number;
    costPrice?: number;
    stock?: number;
    lowStockThreshold?: number;
    cashbackPercentage?: number;
    cashbackMaxAmount?: number;
    allowBackorders?: boolean;
    trackInventory?: boolean;
}): ComprehensiveValidationResult;
/**
 * Sanitize product data
 * Removes invalid characters and normalizes data
 */
export declare function sanitizeProductData(data: any): any;

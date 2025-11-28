// Variant utility functions for the merchant app

import {
  ProductVariant,
  VariantAttribute,
  AttributeType,
  VariantValidationResult,
  VariantStockStatus,
  AttributeOption,
  VariantCombination,
} from '../types/variants';
import {
  VALIDATION_RULES,
  SKU_GENERATION,
  VARIANT_DISPLAY,
  STOCK_STATUS,
  MAX_ATTRIBUTES_PER_VARIANT,
} from '../constants/variantConstants';

/**
 * Auto-generate SKU for a variant based on product SKU and attributes
 */
export const generateSKU = (
  productSKU: string,
  attributes: VariantAttribute[],
  options?: {
    includeRandomString?: boolean;
    randomStringLength?: number;
  }
): string => {
  const { includeRandomString = SKU_GENERATION.includeRandomString, randomStringLength = SKU_GENERATION.randomStringLength } = options || {};

  // Create SKU from product SKU and attribute values
  const attributeParts = attributes
    .map((attr) => {
      // Take first 3 characters of attribute value, uppercase
      return attr.value.substring(0, 3).toUpperCase();
    })
    .join(SKU_GENERATION.separator);

  let sku = `${productSKU}${SKU_GENERATION.separator}${attributeParts}`;

  // Add random string if enabled
  if (includeRandomString) {
    const randomString = Math.random()
      .toString(36)
      .substring(2, 2 + randomStringLength)
      .toUpperCase();
    sku += `${SKU_GENERATION.separator}${randomString}`;
  }

  return sku;
};

/**
 * Format variant name from attributes (e.g., "Red / Large / Cotton")
 */
export const formatVariantName = (attributes: VariantAttribute[]): string => {
  // Sort attributes by sort order if available
  const sortedAttributes = [...attributes].sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    return orderA - orderB;
  });

  // Take up to max attributes for display
  const displayAttributes = sortedAttributes.slice(0, VARIANT_DISPLAY.maxAttributesInName);

  // Use display value if available, otherwise use value
  const nameParts = displayAttributes.map((attr) => attr.displayValue || attr.value);

  return nameParts.join(VARIANT_DISPLAY.attributeSeparator);
};

/**
 * Calculate final variant price based on base price and adjustment
 */
export const calculateVariantPrice = (
  basePrice: number,
  priceAdjustment: number
): number => {
  const finalPrice = basePrice + priceAdjustment;
  // Round to 2 decimal places
  return Math.round(finalPrice * 100) / 100;
};

/**
 * Calculate profit margin percentage
 */
export const calculateMargin = (
  finalPrice: number,
  costPrice: number
): number => {
  if (costPrice === 0) return 0;
  const margin = ((finalPrice - costPrice) / finalPrice) * 100;
  return Math.round(margin * 100) / 100;
};

/**
 * Generate all possible combinations from attribute options
 */
export const generateCombinations = (
  attributeOptions: AttributeOption[]
): VariantCombination[] => {
  if (attributeOptions.length === 0) {
    return [];
  }

  // Validate we don't exceed max attributes
  if (attributeOptions.length > MAX_ATTRIBUTES_PER_VARIANT) {
    throw new Error(`Cannot generate combinations with more than ${MAX_ATTRIBUTES_PER_VARIANT} attributes`);
  }

  // Start with first attribute
  let combinations: VariantCombination[] = attributeOptions[0].values.map((value) => ({
    attributes: [
      {
        type: attributeOptions[0].type,
        name: attributeOptions[0].name,
        value: value.value,
        displayValue: value.displayValue,
        hexColor: value.hexColor,
        sortOrder: value.sortOrder,
      },
    ],
  }));

  // For each remaining attribute, cross-multiply with existing combinations
  for (let i = 1; i < attributeOptions.length; i++) {
    const newCombinations: VariantCombination[] = [];

    for (const combination of combinations) {
      for (const value of attributeOptions[i].values) {
        newCombinations.push({
          attributes: [
            ...combination.attributes,
            {
              type: attributeOptions[i].type,
              name: attributeOptions[i].name,
              value: value.value,
              displayValue: value.displayValue,
              hexColor: value.hexColor,
              sortOrder: value.sortOrder,
            },
          ],
        });
      }
    }

    combinations = newCombinations;
  }

  return combinations;
};

/**
 * Validate variant data before submission
 */
export const validateVariantData = (
  variantData: {
    attributes: VariantAttribute[];
    sku?: string;
    pricing: {
      priceAdjustment: number;
      costPrice?: number;
    };
    inventory: {
      stock: number;
      lowStockThreshold: number;
    };
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  }
): VariantValidationResult => {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Validate attributes
  if (!variantData.attributes || variantData.attributes.length === 0) {
    errors.push({
      field: 'attributes',
      message: 'At least one attribute is required',
    });
  }

  if (variantData.attributes && variantData.attributes.length > MAX_ATTRIBUTES_PER_VARIANT) {
    errors.push({
      field: 'attributes',
      message: `Maximum ${MAX_ATTRIBUTES_PER_VARIANT} attributes allowed per variant`,
    });
  }

  // Validate SKU if provided
  if (variantData.sku) {
    const { minLength, maxLength, pattern, message } = VALIDATION_RULES.sku;
    if (variantData.sku.length < minLength || variantData.sku.length > maxLength) {
      errors.push({ field: 'sku', message });
    }
    if (!pattern.test(variantData.sku)) {
      errors.push({ field: 'sku', message });
    }
  }

  // Validate pricing
  const { min: priceMin, max: priceMax, message: priceMessage } = VALIDATION_RULES.priceAdjustment;
  if (
    variantData.pricing.priceAdjustment < priceMin ||
    variantData.pricing.priceAdjustment > priceMax
  ) {
    errors.push({ field: 'priceAdjustment', message: priceMessage });
  }

  if (variantData.pricing.costPrice !== undefined) {
    if (variantData.pricing.costPrice < 0) {
      errors.push({
        field: 'costPrice',
        message: 'Cost price cannot be negative',
      });
    }
  }

  // Validate inventory
  const { min: stockMin, max: stockMax, message: stockMessage } = VALIDATION_RULES.stock;
  if (
    variantData.inventory.stock < stockMin ||
    variantData.inventory.stock > stockMax
  ) {
    errors.push({ field: 'stock', message: stockMessage });
  }

  if (variantData.inventory.lowStockThreshold < 0) {
    errors.push({
      field: 'lowStockThreshold',
      message: 'Low stock threshold cannot be negative',
    });
  }

  if (variantData.inventory.lowStockThreshold > variantData.inventory.stock) {
    warnings.push({
      field: 'lowStockThreshold',
      message: 'Low stock threshold is higher than current stock',
    });
  }

  // Validate weight if provided
  if (variantData.weight !== undefined) {
    const { min: weightMin, max: weightMax, message: weightMessage } = VALIDATION_RULES.weight;
    if (variantData.weight < weightMin || variantData.weight > weightMax) {
      errors.push({ field: 'weight', message: weightMessage });
    }
  }

  // Validate dimensions if provided
  if (variantData.dimensions) {
    const { min: dimMin, max: dimMax, message: dimMessage } = VALIDATION_RULES.dimensions;
    const { length, width, height } = variantData.dimensions;

    if (length < dimMin || length > dimMax) {
      errors.push({ field: 'dimensions.length', message: dimMessage });
    }
    if (width < dimMin || width > dimMax) {
      errors.push({ field: 'dimensions.width', message: dimMessage });
    }
    if (height < dimMin || height > dimMax) {
      errors.push({ field: 'dimensions.height', message: dimMessage });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Compare two variants for sorting
 */
export const compareVariants = (
  v1: ProductVariant,
  v2: ProductVariant,
  sortBy: 'name' | 'price' | 'stock' | 'created' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): number => {
  let comparison = 0;

  switch (sortBy) {
    case 'name':
      comparison = v1.name.localeCompare(v2.name);
      break;
    case 'price':
      comparison = v1.pricing.finalPrice - v2.pricing.finalPrice;
      break;
    case 'stock':
      comparison = v1.inventory.stock - v2.inventory.stock;
      break;
    case 'created':
      comparison = new Date(v1.createdAt).getTime() - new Date(v2.createdAt).getTime();
      break;
  }

  return sortOrder === 'asc' ? comparison : -comparison;
};

/**
 * Get stock status for a variant
 */
export const getVariantStockStatus = (
  stock: number,
  lowStockThreshold: number,
  allowBackorders: boolean = false
): VariantStockStatus => {
  // Check backorder first
  if (stock === 0 && allowBackorders) {
    return {
      status: 'backorder',
      availableQuantity: 0,
      message: STOCK_STATUS.backorder.label,
      color: STOCK_STATUS.backorder.color,
    };
  }

  // Check out of stock
  if (stock === 0) {
    return {
      status: 'out_of_stock',
      availableQuantity: 0,
      message: STOCK_STATUS.out_of_stock.label,
      color: STOCK_STATUS.out_of_stock.color,
    };
  }

  // Check low stock
  if (stock <= lowStockThreshold) {
    return {
      status: 'low_stock',
      availableQuantity: stock,
      message: `${STOCK_STATUS.low_stock.label} (${stock} left)`,
      color: STOCK_STATUS.low_stock.color,
    };
  }

  // In stock
  return {
    status: 'in_stock',
    availableQuantity: stock,
    message: STOCK_STATUS.in_stock.label,
    color: STOCK_STATUS.in_stock.color,
  };
};

/**
 * Format attributes for display (e.g., for product cards)
 */
export const formatAttributes = (
  attributes: VariantAttribute[],
  options?: {
    includeType?: boolean;
    separator?: string;
    maxAttributes?: number;
  }
): string => {
  const {
    includeType = false,
    separator = ', ',
    maxAttributes = attributes.length,
  } = options || {};

  const displayAttributes = attributes.slice(0, maxAttributes);

  const formattedParts = displayAttributes.map((attr) => {
    const value = attr.displayValue || attr.value;
    if (includeType) {
      return `${attr.name}: ${value}`;
    }
    return value;
  });

  let result = formattedParts.join(separator);

  if (attributes.length > maxAttributes) {
    result += ` +${attributes.length - maxAttributes} more`;
  }

  return result;
};

/**
 * Check if two variants have the same attributes
 */
export const areAttributesEqual = (
  attributes1: VariantAttribute[],
  attributes2: VariantAttribute[]
): boolean => {
  if (attributes1.length !== attributes2.length) {
    return false;
  }

  // Sort both arrays by type and value for comparison
  const sorted1 = [...attributes1].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.value.localeCompare(b.value);
  });

  const sorted2 = [...attributes2].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.value.localeCompare(b.value);
  });

  return sorted1.every((attr1, index) => {
    const attr2 = sorted2[index];
    return attr1.type === attr2.type && attr1.value === attr2.value;
  });
};

/**
 * Get attribute value by type
 */
export const getAttributeValue = (
  attributes: VariantAttribute[],
  type: AttributeType
): string | undefined => {
  const attribute = attributes.find((attr) => attr.type === type);
  return attribute?.value;
};

/**
 * Filter variants by attributes
 */
export const filterVariantsByAttributes = (
  variants: ProductVariant[],
  filters: Array<{ type: AttributeType; value: string }>
): ProductVariant[] => {
  if (filters.length === 0) {
    return variants;
  }

  return variants.filter((variant) => {
    return filters.every((filter) => {
      const attrValue = getAttributeValue(variant.attributes, filter.type);
      return attrValue === filter.value;
    });
  });
};

/**
 * Get unique attribute values from variants
 */
export const getUniqueAttributeValues = (
  variants: ProductVariant[],
  attributeType: AttributeType
): Array<{ value: string; displayValue: string; count: number }> => {
  const valueMap = new Map<string, { displayValue: string; count: number }>();

  variants.forEach((variant) => {
    const attribute = variant.attributes.find((attr) => attr.type === attributeType);
    if (attribute) {
      const existing = valueMap.get(attribute.value);
      if (existing) {
        existing.count++;
      } else {
        valueMap.set(attribute.value, {
          displayValue: attribute.displayValue || attribute.value,
          count: 1,
        });
      }
    }
  });

  return Array.from(valueMap.entries()).map(([value, data]) => ({
    value,
    displayValue: data.displayValue,
    count: data.count,
  }));
};

/**
 * Calculate total stock across all variants
 */
export const calculateTotalVariantStock = (variants: ProductVariant[]): number => {
  return variants.reduce((total, variant) => {
    if (variant.isActive) {
      return total + variant.inventory.stock;
    }
    return total;
  }, 0);
};

/**
 * Find variant by attribute values
 */
export const findVariantByAttributes = (
  variants: ProductVariant[],
  attributes: Array<{ type: AttributeType; value: string }>
): ProductVariant | undefined => {
  return variants.find((variant) => {
    if (variant.attributes.length !== attributes.length) {
      return false;
    }

    return attributes.every((searchAttr) => {
      return variant.attributes.some(
        (variantAttr) =>
          variantAttr.type === searchAttr.type && variantAttr.value === searchAttr.value
      );
    });
  });
};

/**
 * Format price with currency
 */
export const formatPrice = (price: number, currency: string = 'INR'): string => {
  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${price.toFixed(2)}`;
};

/**
 * Format price adjustment with sign
 */
export const formatPriceAdjustment = (adjustment: number, currency: string = 'INR'): string => {
  const sign = adjustment >= 0 ? '+' : '';
  return `${sign}${formatPrice(adjustment, currency)}`;
};

/**
 * Parse form string values to numbers
 */
export const parseFormNumber = (value: string, defaultValue: number = 0): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Sanitize SKU (remove invalid characters)
 */
export const sanitizeSKU = (sku: string): string => {
  return sku
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, '')
    .substring(0, VALIDATION_RULES.sku.maxLength);
};

/**
 * Check if variant has images
 */
export const hasVariantImages = (variant: ProductVariant): boolean => {
  return !!(variant.images && variant.images.length > 0);
};

/**
 * Get main variant image URL
 */
export const getMainVariantImage = (variant: ProductVariant): string | undefined => {
  if (!variant.images || variant.images.length === 0) {
    return undefined;
  }

  const mainImage = variant.images.find((img) => img.isMain);
  return mainImage?.url || variant.images[0].url;
};

/**
 * Generate variant comparison key for deduplication
 */
export const getVariantKey = (attributes: VariantAttribute[]): string => {
  return attributes
    .map((attr) => `${attr.type}:${attr.value}`)
    .sort()
    .join('|');
};

/**
 * Group variants by attribute type
 */
export const groupVariantsByAttribute = (
  variants: ProductVariant[],
  attributeType: AttributeType
): Map<string, ProductVariant[]> => {
  const grouped = new Map<string, ProductVariant[]>();

  variants.forEach((variant) => {
    const attrValue = getAttributeValue(variant.attributes, attributeType);
    if (attrValue) {
      const existing = grouped.get(attrValue) || [];
      existing.push(variant);
      grouped.set(attrValue, existing);
    }
  });

  return grouped;
};

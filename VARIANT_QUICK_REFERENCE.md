# Product Variants - Quick Reference Guide

## Import Statements

```typescript
// Types
import {
  ProductVariant,
  VariantAttribute,
  AttributeType,
  CreateVariantRequest,
  UpdateVariantRequest,
} from '@/types/variants';

// Constants
import {
  ATTRIBUTE_TYPES,
  SIZE_OPTIONS,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  DEFAULT_VARIANT_SETTINGS,
  getAttributeOptions,
  getSizeOptionsByCategory,
} from '@/constants/variantConstants';

// Helpers
import {
  generateSKU,
  formatVariantName,
  calculateVariantPrice,
  validateVariantData,
  generateCombinations,
  getVariantStockStatus,
  filterVariantsByAttributes,
} from '@/utils/variantHelpers';

// Service
import { productsService } from '@/services/api/products';
```

## Common Tasks

### Create a Variant

```typescript
const variant = await productsService.createVariant(productId, {
  attributes: [
    {
      type: AttributeType.COLOR,
      name: 'Color',
      value: 'red',
      displayValue: 'Red',
      hexColor: '#FF0000',
    },
    {
      type: AttributeType.SIZE,
      name: 'Size',
      value: 'L',
      displayValue: 'Large',
    },
  ],
  pricing: {
    priceAdjustment: 5.00,
    costPrice: 25.00,
  },
  inventory: {
    stock: 100,
    lowStockThreshold: 10,
    trackInventory: true,
    allowBackorders: false,
  },
});
```

### Generate Auto SKU

```typescript
import { generateSKU } from '@/utils/variantHelpers';

const sku = generateSKU('PROD-123', attributes);
// Result: "PROD-123-RED-L-A7B2C9"
```

### Generate All Combinations

```typescript
import { generateCombinations } from '@/utils/variantHelpers';

const combinations = generateCombinations([
  {
    type: AttributeType.COLOR,
    name: 'Color',
    values: [
      { value: 'red', displayValue: 'Red' },
      { value: 'blue', displayValue: 'Blue' },
    ],
  },
  {
    type: AttributeType.SIZE,
    name: 'Size',
    values: [
      { value: 'S', displayValue: 'Small' },
      { value: 'M', displayValue: 'Medium' },
    ],
  },
]);
// Result: 4 combinations (Red/S, Red/M, Blue/S, Blue/M)
```

### Validate Before Save

```typescript
import { validateVariantData } from '@/utils/variantHelpers';

const validation = validateVariantData(variantData);

if (!validation.isValid) {
  validation.errors.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
  return;
}

// Proceed with save
await productsService.createVariant(productId, variantData);
```

### Get Stock Status

```typescript
import { getVariantStockStatus } from '@/utils/variantHelpers';

const status = getVariantStockStatus(
  variant.inventory.stock,
  variant.inventory.lowStockThreshold,
  variant.inventory.allowBackorders
);

console.log(status.message); // "In Stock", "Low Stock", etc.
console.log(status.color);   // "#10B981" (green)
```

### Format for Display

```typescript
import { formatVariantName, formatPrice } from '@/utils/variantHelpers';

const name = formatVariantName(variant.attributes);
// Result: "Red / Large / Cotton"

const price = formatPrice(variant.pricing.finalPrice, 'INR');
// Result: "₹99.99"
```

### Filter Variants

```typescript
import { filterVariantsByAttributes } from '@/utils/variantHelpers';

const redVariants = filterVariantsByAttributes(variants, [
  { type: AttributeType.COLOR, value: 'red' }
]);
```

### Bulk Import

```typescript
const importJob = await productsService.bulkImportProducts({
  file: {
    uri: fileUri,
    name: fileName,
    type: 'text/csv',
  },
  format: 'csv',
  options: {
    updateExisting: true,
    createVariants: true,
  },
});

// Check progress
const progress = await productsService.getBulkImportProgress(importJob.jobId);
```

### Export Products

```typescript
const exportFile = await productsService.exportProductsAdvanced({
  filters: {
    category: 'Electronics',
    status: 'active',
  },
  format: 'excel',
  includeVariants: true,
});

console.log(exportFile.url);
```

## Attribute Types

```typescript
AttributeType.COLOR     // Colors with hex values
AttributeType.SIZE      // Sizes (S, M, L, etc.)
AttributeType.MATERIAL  // Materials (cotton, leather, etc.)
AttributeType.WEIGHT    // Weight variants
AttributeType.FLAVOR    // Flavors (for food/beverages)
AttributeType.STYLE     // Style variants
AttributeType.PATTERN   // Patterns (solid, striped, etc.)
AttributeType.FINISH    // Finish types (matte, glossy, etc.)
AttributeType.CUSTOM    // Custom attributes
```

## Predefined Options

```typescript
// Get color options
import { COLOR_OPTIONS } from '@/constants/variantConstants';
COLOR_OPTIONS.forEach(color => {
  console.log(color.value, color.displayValue, color.hexColor);
});

// Get size options by category
import { getSizeOptionsByCategory } from '@/constants/variantConstants';
const sizes = getSizeOptionsByCategory('Clothing');
// Returns: XS, S, M, L, XL, XXL, XXXL

// Get all options for an attribute type
import { getAttributeOptions } from '@/constants/variantConstants';
const materials = getAttributeOptions(AttributeType.MATERIAL);
```

## Validation Rules

| Field | Rule |
|-------|------|
| SKU | 3-50 chars, alphanumeric + hyphens/underscores |
| Barcode | 8-13 digits |
| Price | 0 to 10,000,000 |
| Stock | 0 to 1,000,000 |
| Price Adjustment | -1,000,000 to 1,000,000 |
| Weight | 0 to 100,000 |
| Dimensions | 0 to 10,000 |
| Max Variants per Product | 100 |
| Max Attributes per Variant | 5 |

## Stock Status Colors

| Status | Color | Condition |
|--------|-------|-----------|
| In Stock | #10B981 (green) | stock > threshold |
| Low Stock | #F59E0B (amber) | 0 < stock ≤ threshold |
| Out of Stock | #EF4444 (red) | stock = 0, no backorders |
| Backorder | #3B82F6 (blue) | stock = 0, backorders allowed |

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/merchant/products/:productId/variants` | List variants |
| GET | `/merchant/products/:productId/variants/:variantId` | Get variant |
| POST | `/merchant/products/:productId/variants` | Create variant |
| PUT | `/merchant/products/:productId/variants/:variantId` | Update variant |
| DELETE | `/merchant/products/:productId/variants/:variantId` | Delete variant |
| POST | `/merchant/products/:productId/variants/generate` | Generate combinations |
| POST | `/merchant/products/import` | Bulk import |
| GET | `/merchant/products/import/:jobId` | Import progress |
| POST | `/merchant/products/export/advanced` | Export products |
| POST | `/merchant/products/bulk-update` | Bulk update |
| GET | `/merchant/products/import/template` | Download template |

## Helper Function Cheat Sheet

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `generateSKU` | productSKU, attributes | string | Auto-generate variant SKU |
| `formatVariantName` | attributes | string | Display name |
| `calculateVariantPrice` | basePrice, adjustment | number | Final price |
| `calculateMargin` | finalPrice, costPrice | number | Profit margin % |
| `validateVariantData` | variantData | ValidationResult | Pre-save validation |
| `generateCombinations` | attributeOptions | VariantCombination[] | All combinations |
| `getVariantStockStatus` | stock, threshold, backorders | StockStatus | Stock status |
| `filterVariantsByAttributes` | variants, filters | ProductVariant[] | Filter by attrs |
| `findVariantByAttributes` | variants, attributes | ProductVariant? | Find exact match |
| `getUniqueAttributeValues` | variants, type | Value[] | Unique values + counts |
| `groupVariantsByAttribute` | variants, type | Map | Group by attribute |
| `compareVariants` | v1, v2, sortBy, order | number | Sorting |
| `formatPrice` | price, currency | string | Format with symbol |
| `sanitizeSKU` | sku | string | Clean SKU string |

## Common Patterns

### Pattern 1: Create with Auto SKU
```typescript
const sku = generateSKU(product.sku, attributes);
const name = formatVariantName(attributes);

const variant = await productsService.createVariant(productId, {
  attributes,
  sku,
  // ... rest of data
});
```

### Pattern 2: Validate and Create
```typescript
const validation = validateVariantData(data);

if (validation.isValid) {
  const variant = await productsService.createVariant(productId, data);
} else {
  showErrors(validation.errors);
}
```

### Pattern 3: Generate and Create All
```typescript
const combinations = generateCombinations(attributeOptions);

for (const combo of combinations) {
  const sku = generateSKU(product.sku, combo.attributes);

  await productsService.createVariant(productId, {
    attributes: combo.attributes,
    sku,
    pricing: { priceAdjustment: 0 },
    inventory: { stock: 50, lowStockThreshold: 10, trackInventory: true, allowBackorders: false },
  });
}
```

### Pattern 4: Filter and Display
```typescript
const { variants } = await productsService.getProductVariants(productId);

// Group by color
const grouped = groupVariantsByAttribute(variants, AttributeType.COLOR);

grouped.forEach((variantList, color) => {
  console.log(`${color}: ${variantList.length} variants`);
  variantList.forEach(v => {
    const status = getVariantStockStatus(v.inventory.stock, v.inventory.lowStockThreshold);
    console.log(`  ${formatVariantName(v.attributes)} - ${status.message}`);
  });
});
```

### Pattern 5: Bulk Update Stock
```typescript
await productsService.bulkUpdateProducts({
  productIds: selectedIds,
  updates: {
    stockAdjustment: {
      type: 'add',
      value: 100,
      applyToVariants: true,
    },
  },
});
```

## Error Handling

```typescript
try {
  await productsService.createVariant(productId, data);
} catch (error) {
  if (error.message.includes('HTTP 409')) {
    // SKU conflict
    alert('Variant with this SKU already exists');
  } else if (error.message.includes('HTTP 400')) {
    // Validation error
    alert('Invalid variant data');
  } else if (error.message.includes('HTTP 401')) {
    // Auth error
    router.push('/login');
  } else {
    // Generic error
    alert('Failed to create variant');
  }
}
```

## Performance Tips

1. **Use local combination generation for preview**
   ```typescript
   const combos = generateCombinations(attrs); // Fast, local
   console.log(`Will create ${combos.length} variants`);
   // Then call server to actually create them
   ```

2. **Batch variant creation**
   ```typescript
   // Instead of creating one by one
   const promises = combinations.map(combo =>
     productsService.createVariant(productId, variantData)
   );
   await Promise.all(promises);
   ```

3. **Cache variant lists**
   ```typescript
   const cacheKey = `variants_${productId}`;
   let variants = cache.get(cacheKey);

   if (!variants) {
     const response = await productsService.getProductVariants(productId);
     variants = response.variants;
     cache.set(cacheKey, variants, 5 * 60); // 5 min
   }
   ```

4. **Use helper functions instead of inline logic**
   ```typescript
   // Good
   const status = getVariantStockStatus(stock, threshold);

   // Bad
   const status = stock > threshold ? 'in_stock' :
                  stock > 0 ? 'low_stock' : 'out_of_stock';
   ```

## File Locations

- Types: `types/variants.ts`
- Constants: `constants/variantConstants.ts`
- Helpers: `utils/variantHelpers.ts`
- Service: `services/api/products.ts`
- Docs: `VARIANT_SYSTEM_IMPLEMENTATION.md`

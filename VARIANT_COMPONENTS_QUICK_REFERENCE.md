# Variant Components Quick Reference

## 🚀 Quick Import

```tsx
import {
  VariantTable,
  VariantForm,
  AttributeSelector,
  VariantInventoryCard,
  VariantPricingCard,
  VariantGenerator,
  BulkImportModal,
  ImportErrorList,
  ExportConfigModal,
} from '@/components/products';
```

## 📦 Component Summary

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **VariantTable** | Display variants | Sortable, selectable, inline edit |
| **VariantForm** | Add/edit variant | Validation, auto-SKU, image upload |
| **AttributeSelector** | Select attributes | Color picker, predefined options |
| **VariantInventoryCard** | Manage stock | Quick update, history tracking |
| **VariantPricingCard** | Manage pricing | Discount preview, margin calc |
| **VariantGenerator** | Generate combos | Bulk settings, preview |
| **BulkImportModal** | Import variants | CSV/Excel, progress tracking |
| **ImportErrorList** | Show errors | Line details, export errors |
| **ExportConfigModal** | Configure export | Field selection, filters |

## 🎯 Common Use Cases

### 1. Display Variant Table
```tsx
<VariantTable
  variants={variants}
  onEdit={handleEdit}
  onDelete={handleDelete}
  selectedVariants={selected}
/>
```

### 2. Add New Variant
```tsx
<VariantForm
  baseProductSku="PROD-001"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### 3. Generate Variants from Attributes
```tsx
<VariantGenerator
  attributeGroups={[
    { name: 'Color', values: colorAttributes },
    { name: 'Size', values: sizeAttributes }
  ]}
  basePrice={29.99}
  onGenerate={handleGenerate}
/>
```

### 4. Manage Inventory
```tsx
<VariantInventoryCard
  variantId="var-123"
  variantName="Red - Medium"
  currentStock={50}
  lowStockThreshold={10}
  onUpdateStock={handleUpdateStock}
/>
```

### 5. Manage Pricing
```tsx
<VariantPricingCard
  variantId="var-123"
  variantName="Red - Medium"
  price={29.99}
  salePrice={24.99}
  cost={15.00}
  onUpdatePricing={handleUpdatePricing}
/>
```

### 6. Import Variants
```tsx
<BulkImportModal
  visible={showImport}
  onClose={() => setShowImport(false)}
  onImport={async (file) => {
    // Process file
    return { success: 10, failed: 2, total: 12 };
  }}
/>
```

### 7. Show Import Errors
```tsx
<ImportErrorList
  errors={[
    { row: 5, field: 'price', message: 'Invalid price format' },
    { row: 8, field: 'sku', message: 'SKU already exists' }
  ]}
  onExportErrors={handleExportErrors}
/>
```

### 8. Export Variants
```tsx
<ExportConfigModal
  visible={showExport}
  onClose={() => setShowExport(false)}
  onExport={(config) => {
    console.log('Format:', config.format);
    console.log('Fields:', config.fields);
    console.log('Filters:', config.filters);
  }}
/>
```

## 🎨 Predefined Attributes

### Colors (12)
Black, White, Red, Blue, Green, Yellow, Purple, Pink, Gray, Navy, Brown, Orange

### Sizes (8)
XXS, XS, S, M, L, XL, XXL, XXXL

### Materials (9)
Cotton, Polyester, Wool, Silk, Leather, Denim, Linen, Nylon, Spandex

### Styles (4)
Casual, Formal, Sport, Business

### Fits (4)
Slim, Regular, Relaxed, Oversized

## 📊 Type Definitions

### VariantFormData
```typescript
{
  name: string;
  sku: string;
  price?: number;
  salePrice?: number;
  attributes: Array<{ name: string; value: string }>;
  inventory: { quantity: number; trackQuantity: boolean };
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  status: 'active' | 'inactive';
  image?: string;
}
```

### Attribute
```typescript
{
  name: string;
  value: string;
  type?: 'color' | 'size' | 'material' | 'weight' | 'dimensions' | 'text';
  color?: string;
  unit?: string;
}
```

### ImportError
```typescript
{
  row: number;
  field: string;
  value?: string;
  message: string;
  severity?: 'error' | 'warning';
}
```

### ExportConfig
```typescript
{
  format: 'csv' | 'excel';
  fields: string[];
  filters?: {
    status?: string[];
    hasStock?: boolean;
  };
}
```

## 🎨 Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Primary | Blue | `#3B82F6` |
| Success | Green | `#10B981` |
| Warning | Amber | `#F59E0B` |
| Error | Red | `#EF4444` |
| Text Primary | Gray 900 | `#111827` |
| Text Secondary | Gray 600 | `#6B7280` |
| Border | Gray 200 | `#E5E7EB` |
| Background | Gray 50 | `#F9FAFB` |

## 🔧 Event Handlers

```typescript
// Edit variant
onEdit={(variant: ProductVariant) => void}

// Delete variant
onDelete={(variantId: string) => void}

// Duplicate variant
onDuplicate={(variant: ProductVariant) => void}

// Update price
onUpdatePrice={(variantId: string, price: number) => void}

// Update stock
onUpdateStock={(variantId: string, quantity: number, reason: string) => void}

// Update pricing (with sale price)
onUpdatePricing={(variantId: string, price: number, salePrice?: number) => void}

// Generate variants
onGenerate={(variants: GeneratedVariant[]) => void}

// Import file
onImport={(file: File) => Promise<ImportResult>}

// Export configuration
onExport={(config: ExportConfig) => void}
```

## 📱 Responsive Design

All components are designed to work on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

Horizontal scrolling enabled on tables for mobile devices.

## ♿ Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- Color contrast compliance

## 🔐 Validation Rules

### Variant Form
- Name: Required, min 3 characters
- SKU: Required, alphanumeric + hyphens/underscores
- Price: Optional, must be ≥ 0
- Sale Price: Optional, must be < regular price
- Stock: Required if tracking inventory, must be ≥ 0

### Import
- Row number validation
- Field format validation
- Duplicate SKU detection
- Price range validation
- Stock quantity validation

## 📂 File Structure

```
components/products/
├── VariantTable.tsx
├── VariantForm.tsx
├── AttributeSelector.tsx
├── VariantInventoryCard.tsx
├── VariantPricingCard.tsx
├── VariantGenerator.tsx
├── BulkImportModal.tsx
├── ImportErrorList.tsx
├── ExportConfigModal.tsx
└── index.ts
```

## 🎯 Props Reference

### Optional vs Required

✅ **Required Props**:
- VariantTable: `variants`
- VariantForm: `onSubmit`
- AttributeSelector: `attributes`, `onChange`
- VariantInventoryCard: `variantId`, `variantName`, `currentStock`
- VariantPricingCard: `variantId`, `variantName`
- VariantGenerator: `attributeGroups`, `onGenerate`
- BulkImportModal: `visible`, `onClose`, `onImport`
- ImportErrorList: `errors`
- ExportConfigModal: `visible`, `onClose`, `onExport`

⚡ **Optional Props**:
- All `on*` callback props (except where marked required)
- All `*able` boolean props (default: true/false)
- All styling props (`containerStyle`, etc.)

## 🚀 Performance Tips

1. **Memoize callbacks**: Use `useCallback` for event handlers
2. **Virtualize long lists**: Consider FlatList for 100+ variants
3. **Lazy load images**: Use lazy loading for variant images
4. **Debounce search**: Debounce table search/filter inputs
5. **Paginate data**: Load variants in pages for large datasets

## 📚 Related Files

- `types/products.ts` - Product type definitions
- `components/forms/FormInput.tsx` - Form input component
- `components/forms/FormSelect.tsx` - Form select component
- `services/productsApi.ts` - Product API services (to be created)

## ✨ Features Matrix

| Component | Sort | Filter | Search | Edit | Delete | Bulk | Import | Export |
|-----------|------|--------|--------|------|--------|------|--------|--------|
| VariantTable | ✅ | - | - | ✅ | ✅ | ✅ | - | - |
| VariantForm | - | - | - | ✅ | - | - | - | - |
| AttributeSelector | - | - | - | ✅ | ✅ | - | - | - |
| VariantInventoryCard | - | - | - | ✅ | - | - | - | - |
| VariantPricingCard | - | - | - | ✅ | - | - | - | - |
| VariantGenerator | - | ✅ | - | - | - | ✅ | - | - |
| BulkImportModal | - | - | - | - | - | ✅ | ✅ | - |
| ImportErrorList | - | ✅ | - | - | - | - | - | ✅ |
| ExportConfigModal | - | ✅ | - | - | - | - | - | ✅ |

---

**Last Updated**: 2025-01-17
**Version**: 1.0.0
**Status**: Production Ready ✅

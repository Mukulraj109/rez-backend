# Product Variant Support Implementation

## Summary

This document describes the implementation of product variant support in the merchant app. Product variants allow merchants to create products with multiple options (e.g., size, color) and manage pricing and inventory at the variant level.

## Files Updated

### 1. app/products/add.tsx ✅ COMPLETED

**Changes:**
- Added `hasVariants` boolean field to FormData interface
- Added "Enable Variants" toggle switch with description
- Conditional rendering of pricing and inventory sections (hidden when variants enabled)
- Updated form validation to skip price/quantity validation for variant products
- Modified product creation to handle variant products differently:
  - Variant products: Set price=0, stock=0, navigate to variant management after creation
  - Standard products: Use normal price/stock, navigate back
- Added information box explaining variant behavior
- Added new styles: `switchLabelContainer`, `switchDescription`, `variantInfoBox`, `variantInfoText`

**User Flow:**
1. Merchant toggles "Enable Variants"
2. Price and inventory fields hide
3. Info message shows: "You'll be able to add and manage variants after creating the product"
4. After creation, redirects to `/products/[id]/variants` for variant management

### 2. app/products/edit/[id].tsx ✅ COMPLETED

**Changes:**
- Added state variables: `hasVariants`, `variantCount`
- Added variant summary section at top of form showing:
  - Variant count badge
  - Description of variant management
  - "Manage Variants" button → navigates to `/products/[id]/variants`
  - Warning that direct price/stock editing is disabled
- Disabled price and inventory fields when product has variants
- Added visual indicators (lock icons) for disabled fields
- Added new styles:
  - `variantSummaryCard`, `variantSummaryHeader`, `variantSummaryTitle`
  - `variantSummaryDescription`, `manageVariantsButton`, `manageVariantsButtonText`
  - `warningBox`, `warningText`, `disabledNotice`, `disabledNoticeText`, `inputDisabled`

**User Experience:**
- Clear indication that product uses variants
- Pricing/inventory locked with explanatory messages
- Quick access to variant management
- Prevents accidental modification of variant-level data

---

## Remaining Tasks

### 3. app/products/[id].tsx - Product Detail Screen

**Required Changes:**

Add variant display section after basic product information:

```tsx
{/* Variant Information */}
{product.hasVariants && (
  <View style={styles.section}>
    <View style={styles.sectionTitleRow}>
      <ThemedText style={styles.sectionTitle}>Product Variants</ThemedText>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => router.push(`/products/${product.id}/variants`)}
      >
        <Ionicons name="settings" size={16} color={Colors.light.primary} />
        <ThemedText style={styles.manageButtonText}>Manage</ThemedText>
      </TouchableOpacity>
    </View>

    <View style={styles.variantStatsGrid}>
      <View style={styles.variantStatCard}>
        <Ionicons name="options" size={20} color={Colors.light.primary} />
        <ThemedText style={styles.variantStatValue}>
          {product.variantCount || 0}
        </ThemedText>
        <ThemedText style={styles.variantStatLabel}>Variants</ThemedText>
      </View>

      <View style={styles.variantStatCard}>
        <Ionicons name="cube" size={20} color={Colors.light.primary} />
        <ThemedText style={styles.variantStatValue}>
          {product.totalStock || 0}
        </ThemedText>
        <ThemedText style={styles.variantStatLabel}>Total Stock</ThemedText>
      </View>

      <View style={styles.variantStatCard}>
        <Ionicons name="pricetag" size={20} color={Colors.light.primary} />
        <ThemedText style={styles.variantStatValue}>
          ₹{product.minPrice || 0} - ₹{product.maxPrice || 0}
        </ThemedText>
        <ThemedText style={styles.variantStatLabel}>Price Range</ThemedText>
      </View>
    </View>

    <View style={styles.variantInfoBanner}>
      <Ionicons name="information-circle" size={18} color={Colors.light.primary} />
      <ThemedText style={styles.variantInfoText}>
        This product has multiple variants. Pricing and inventory are managed at the variant level.
      </ThemedText>
    </View>
  </View>
)}

{/* Pricing - Show different info for variants */}
{!product.hasVariants ? (
  <View style={styles.section}>
    <ThemedText style={styles.sectionTitle}>Pricing</ThemedText>
    {/* Existing price display */}
  </View>
) : (
  <View style={styles.section}>
    <ThemedText style={styles.sectionTitle}>Pricing</ThemedText>
    <ThemedText style={styles.variantPricingNote}>
      Pricing varies by variant. See variant details for specific prices.
    </ThemedText>
  </View>
)}
```

**Styles to Add:**
```tsx
sectionTitleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},
manageButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  backgroundColor: Colors.light.backgroundSecondary,
},
manageButtonText: {
  fontSize: 14,
  color: Colors.light.primary,
  fontWeight: '500',
},
variantStatsGrid: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 16,
},
variantStatCard: {
  flex: 1,
  backgroundColor: Colors.light.backgroundSecondary,
  borderRadius: 8,
  padding: 12,
  alignItems: 'center',
  gap: 6,
},
variantStatValue: {
  fontSize: 18,
  fontWeight: '700',
  color: Colors.light.text,
},
variantStatLabel: {
  fontSize: 11,
  color: Colors.light.textSecondary,
  textAlign: 'center',
},
variantInfoBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.light.backgroundSecondary,
  borderRadius: 8,
  padding: 12,
  gap: 8,
},
variantInfoText: {
  flex: 1,
  fontSize: 13,
  color: Colors.light.textSecondary,
  lineHeight: 18,
},
variantPricingNote: {
  fontSize: 14,
  color: Colors.light.textSecondary,
  fontStyle: 'italic',
},
```

### 4. app/(dashboard)/products.tsx - Products List

**Required Changes:**

Update `renderProductCard` to show variant indicator:

```tsx
const renderProductCard = ({ item }: { item: Product }) => {
  const hasVariants = (item as any).hasVariants || false;
  const variantCount = (item as any).variantCount || 0;

  // ... existing code ...

  return (
    <TouchableOpacity
      style={[/* existing styles */]}
      onPress={() => router.push(`/products/${item.id}`)}
    >
      {/* Existing image container */}

      {/* Add variant badge */}
      {hasVariants && (
        <View style={styles.variantBadge}>
          <Ionicons name="options" size={12} color={Colors.light.background} />
          <ThemedText style={styles.variantBadgeText}>
            {variantCount} variant{variantCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      )}

      {/* Existing product info */}

      {/* Update price display for variants */}
      {hasVariants ? (
        <ThemedText style={styles.productPriceRange}>
          ₹{item.minPrice || 0} - ₹{item.maxPrice || 0}
        </ThemedText>
      ) : (
        <ThemedText style={styles.productPrice}>
          ₹{item.price.toFixed(2)}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};
```

Add filter option for variant products:

```tsx
const filters: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'active', label: 'Active', icon: 'checkmark-circle' },
  { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
  { key: 'has_variants', label: 'Has Variants', icon: 'options' },  // NEW
  { key: 'no_variants', label: 'No Variants', icon: 'cube' },       // NEW
  { key: 'low_stock', label: 'Low Stock', icon: 'warning' },
  { key: 'out_of_stock', label: 'Out of Stock', icon: 'close-circle' },
];
```

**Styles to Add:**
```tsx
variantBadge: {
  position: 'absolute',
  top: 6,
  left: 6,
  backgroundColor: Colors.light.primary,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 4,
  gap: 3,
},
variantBadgeText: {
  fontSize: 9,
  color: Colors.light.background,
  fontWeight: '600',
},
productPriceRange: {
  fontSize: 14,
  fontWeight: '600',
  color: Colors.light.primary,
  marginBottom: 8,
},
```

### 5. app/products/_layout.tsx - Products Layout

**Required Changes:**

Add variant-related screens to the stack:

```tsx
import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      {/* NEW: Variant Management Screens */}
      <Stack.Screen
        name="[id]/variants"
        options={{
          headerShown: false,
          presentation: 'card',
          title: 'Manage Variants'
        }}
      />
      <Stack.Screen
        name="[id]/variants/add"
        options={{
          headerShown: false,
          presentation: 'modal',
          title: 'Add Variant'
        }}
      />
      <Stack.Screen
        name="[id]/variants/edit/[variantId]"
        options={{
          headerShown: false,
          presentation: 'modal',
          title: 'Edit Variant'
        }}
      />
      <Stack.Screen
        name="[id]/variants/bulk-actions"
        options={{
          headerShown: false,
          presentation: 'modal',
          title: 'Bulk Actions'
        }}
      />
      {/* Import/Export Screens */}
      <Stack.Screen
        name="import"
        options={{
          headerShown: false,
          presentation: 'modal',
          title: 'Import Products'
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          headerShown: false,
          presentation: 'modal',
          title: 'Export Products'
        }}
      />
    </Stack>
  );
}
```

---

## Testing Checklist

### Add Product Screen
- [ ] Toggle "Enable Variants" shows/hides price and inventory fields
- [ ] Info box appears when variants enabled
- [ ] Form validation skips price/quantity when variants enabled
- [ ] Standard product creation works normally
- [ ] Variant product creation redirects to variant management

### Edit Product Screen
- [ ] Products without variants show normal edit form
- [ ] Products with variants show variant summary card
- [ ] "Manage Variants" button navigates correctly
- [ ] Price and inventory fields are disabled for variant products
- [ ] Lock icons and disabled notices display correctly

### Product Detail Screen
- [ ] Variant stats display correctly (count, total stock, price range)
- [ ] "Manage Variants" button visible and functional
- [ ] Info banner explains variant management
- [ ] Standard products show normal price/inventory details

### Products List
- [ ] Variant badge shows on variant products
- [ ] Variant count displays correctly
- [ ] Price range shows for variant products
- [ ] Filter by "Has Variants" / "No Variants" works
- [ ] All product cards render correctly

### Navigation
- [ ] All variant screens configured in layout
- [ ] Navigation between screens works smoothly
- [ ] Modal presentations work correctly
- [ ] Back navigation returns to correct screen

---

## API Requirements

The backend should support:

1. **Product Model Extensions:**
   - `hasVariants`: boolean
   - `variantCount`: number
   - `totalStock`: number (sum of all variant stocks)
   - `minPrice`: number (lowest variant price)
   - `maxPrice`: number (highest variant price)

2. **Product Creation:**
   - Accept `hasVariants` field
   - For variant products: Allow price=0, stock=0

3. **Product List/Detail:**
   - Return variant information in product data
   - Calculate aggregate stats for variant products

4. **Filter Options:**
   - `has_variants`: boolean filter
   - `no_variants`: boolean filter

---

## Best Practices

1. **Permission Checks:**
   - Use `products:edit` permission for variant management
   - Use `products:bulk_import` for import/export features

2. **User Experience:**
   - Always show clear indicators for variant products
   - Prevent accidental editing of variant-level data
   - Provide easy navigation to variant management

3. **Data Integrity:**
   - Never allow direct price/stock edit on variant products
   - Show aggregate data (price range, total stock) for variants
   - Validate variant products have at least one variant before activation

4. **Performance:**
   - Load variant counts efficiently in list views
   - Cache variant stats to avoid repeated calculations
   - Use pagination for variant lists

---

## Future Enhancements

1. **Bulk Variant Operations:**
   - Update multiple variants at once
   - Import variants from CSV
   - Clone variant structure to other products

2. **Variant Templates:**
   - Save common variant structures (e.g., "Standard Clothing Sizes")
   - Quick apply templates to new products

3. **Variant Analytics:**
   - Best-selling variants
   - Low-stock variant alerts
   - Variant-level performance metrics

4. **Advanced Variant Types:**
   - Conditional variants (show certain options based on other selections)
   - Variant images and descriptions
   - Variant-specific promotions

---

## Implementation Status

- [x] app/products/add.tsx - Variant toggle and conditional form
- [x] app/products/edit/[id].tsx - Variant management and disabled fields
- [ ] app/products/[id].tsx - Variant display and stats
- [ ] app/(dashboard)/products.tsx - Variant indicators and filters
- [ ] app/products/_layout.tsx - Variant screen configuration

## Next Steps

1. Complete remaining three files as outlined above
2. Test all screens thoroughly
3. Create variant management screens (`[id]/variants/*`)
4. Implement bulk operations
5. Add import/export functionality

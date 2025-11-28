# Variant Management Screens - Quick Reference

## 📁 File Locations

```
app/products/variants/
├── [productId].tsx           # List all variants for a product
├── add/
│   └── [productId].tsx       # Add new variant
└── edit/
    └── [variantId].tsx       # Edit existing variant
```

---

## 🚀 Quick Start

### Navigate to Variant Management:
```typescript
// From product detail screen
router.push(`/products/variants/${productId}`);
```

### Add New Variant:
```typescript
router.push(`/products/variants/add/${productId}`);
```

### Edit Variant:
```typescript
router.push(`/products/variants/edit/${variantId}`);
```

---

## 🎨 Screen Features at a Glance

### 1️⃣ Variant List (`[productId].tsx`)

**Stats Bar:**
- Total variants
- Active variants
- Out of stock count

**Variant Cards Show:**
- ✅ Image, Name, SKU
- ✅ Status badge
- ✅ Attributes (color, size, etc.)
- ✅ Price & sale price
- ✅ Stock quantity (color-coded)
- ✅ Edit/Delete buttons

**Bulk Actions:**
- Select multiple (checkbox)
- Activate/Deactivate/Delete selected

**FAB Buttons:**
- 🔵 Add Variant (main)
- ⚪ Generate Combinations (secondary)

---

### 2️⃣ Add Variant (`add/[productId].tsx`)

**Form Sections:**
1. **Image** - Upload variant image
2. **Basic Info** - Name, SKU
3. **Attributes** - Add color, size, material, etc.
4. **Pricing** - Override product price (optional)
5. **Inventory** - Stock quantity
6. **Settings** - Default variant, status

**Attribute Types Available:**
```typescript
Color, Size, Material, Weight, Style,
Pattern, Finish, Capacity, Fragrance, Flavor
```

**Auto Features:**
- ✅ Auto-generate name from attributes
- ✅ Auto-generate SKU suggestions
- ✅ "Save and add another" option

---

### 3️⃣ Edit Variant (`edit/[variantId].tsx`)

**Editable Fields:**
- ✅ Name, SKU
- ✅ Price, Sale Price
- ✅ Stock Quantity
- ✅ Image
- ✅ Default status
- ✅ Active/Inactive status

**Special Actions:**
- 🔄 **Update Only Inventory** - Quick stock update
- 🗑️ **Delete Variant** - Remove variant

**Non-Editable:**
- ❌ Attributes (view-only)

---

## 🔧 API Methods

```typescript
import { productsService } from '@/services';

// Get all variants for product
const variants = await productsService.getProductVariants(productId);

// Get single variant
const variant = await productsService.getVariant(variantId);

// Create variant
const newVariant = await productsService.createVariant(productId, {
  name: 'Red Large',
  sku: 'PRD-RED-L',
  price: 29.99,
  inventory: { quantity: 100, trackQuantity: true },
  attributes: [
    { name: 'color', value: 'Red' },
    { name: 'size', value: 'Large' }
  ],
  status: 'active'
});

// Update variant
await productsService.updateVariant(variantId, {
  price: 24.99,
  inventory: { quantity: 50 }
});

// Delete variant
await productsService.deleteVariant(variantId);

// Bulk actions
const result = await productsService.bulkVariantAction(
  'activate',
  [variantId1, variantId2]
);
console.log(`${result.successful} activated, ${result.failed} failed`);
```

---

## 🔐 Permission Checks

All screens use the same permission:
```typescript
const { hasPermission } = useAuth();
const canEdit = hasPermission('products:edit');

if (!canEdit) {
  // Show permission denied screen
  // or hide edit/delete buttons
}
```

---

## 📋 Form Validation

### Add/Edit Variant Schema:
```typescript
name: required, min 1 char
sku: optional
price: optional, numeric
salePrice: optional, numeric
quantity: required when trackQuantity is true
trackQuantity: boolean
isDefault: boolean
status: 'active' | 'inactive'
```

### Attribute Validation:
- Each attribute is optional
- Only saved if value is provided
- Auto-generates variant name if left empty

---

## 🎯 Common Use Cases

### Create Color + Size Variants:
1. Go to Add Variant screen
2. Select "Color" from dropdown → Enter "Red"
3. Select "Size" from dropdown → Enter "Large"
4. (Name auto-generates as "Red / Large")
5. Set price & stock
6. Click "Create Variant"

### Bulk Deactivate Out-of-Stock:
1. Go to Variant List
2. Long-press or tap checkbox on variants
3. Select all out-of-stock variants
4. Tap "Deactivate" in bulk actions bar
5. Confirm

### Quick Stock Update:
1. Go to Edit Variant
2. Change quantity field
3. Tap "Update Only Inventory" button
4. No need to save entire form

### Delete Multiple Variants:
1. Go to Variant List
2. Select variants via checkbox
3. Tap "Delete" in bulk actions bar
4. Confirm deletion

---

## 🎨 UI Components Used

```typescript
// Form Components
<FormInput name="sku" control={control} label="SKU" />
<FormSelect name="status" control={control} options={statusOptions} />

// UI Elements
<ThemedText>Product Variants</ThemedText>
<ThemedView style={styles.container}>
<Ionicons name="cube-outline" size={24} />
<Switch value={trackQuantity} onValueChange={...} />
<TouchableOpacity onPress={handleSubmit}>
<ActivityIndicator size="small" />
<Image source={{ uri: image }} />
```

---

## 🚨 Error Handling

All screens handle:
- ✅ Loading states (spinner + text)
- ✅ Empty states (helpful message + CTA)
- ✅ Error states (user-friendly alerts)
- ✅ Permission denied (dedicated screen)
- ✅ Not found (variant/product)
- ✅ Network errors (retry mechanism)
- ✅ Validation errors (inline messages)

---

## 📊 Data Flow

```
User Action → Form Validation → API Call → Success/Error

Success: Alert → Navigation → Refresh List
Error: Alert → Stay on Form → Show Errors
```

---

## 🎨 Color Coding

**Stock Levels:**
- 🔴 Red: 0 (Out of stock)
- 🟠 Orange: 1-9 (Low stock)
- 🟢 Green: 10+ (In stock)

**Status:**
- 🟢 Green: Active
- 🟡 Yellow: Inactive

---

## 🧪 Testing Tips

### Test Creating Variant:
1. Select multiple attributes
2. Leave name empty (test auto-generation)
3. Test with/without pricing override
4. Test with/without image
5. Test "Save and add another"

### Test Editing Variant:
1. Update all fields
2. Test "Update Only Inventory"
3. Test delete confirmation
4. Test with/without permission

### Test Bulk Operations:
1. Select 0 variants (show alert)
2. Select 1 variant
3. Select multiple variants
4. Test activate, deactivate, delete
5. Check success/failure counts

---

## 💡 Pro Tips

1. **Auto-Name:** Leave variant name empty to auto-generate from attributes
2. **Quick Stock:** Use "Update Only Inventory" button for fast stock updates
3. **Bulk Select:** Long-press any variant card to enable multi-select mode
4. **Save & Continue:** Enable "Save and add another" to create multiple variants quickly
5. **Permission Check:** Always check `hasPermission('products:edit')` before showing actions

---

## 🔗 Related Files

```typescript
services/api/products.ts        // API methods
types/products.ts               // Type definitions
components/forms/FormInput.tsx  // Form input component
components/forms/FormSelect.tsx // Form select component
contexts/AuthContext.tsx        // Permission context
```

---

## 📱 Navigation Flow

```
Products → Product Detail → [Variants Button]
                              ↓
                         Variant List
                         ↙️         ↘️
                  Add Variant    Edit Variant
                      ↓               ↓
                  [Create] ←→ [Update/Delete]
                      ↓               ↓
                 Variant List ← Back ←┘
```

---

## 🎯 Key Takeaways

✅ **3 Screens:** List, Add, Edit
✅ **10+ Attributes:** Color, size, material, weight, etc.
✅ **Full CRUD:** Create, read, update, delete
✅ **Bulk Operations:** Multi-select with actions
✅ **Permission-Based:** Checks `products:edit`
✅ **Form Validation:** React Hook Form + Zod
✅ **Professional UI:** Loading, error, empty states
✅ **Production Ready:** Error handling, accessibility

---

## 🆘 Need Help?

- Full documentation: `VARIANT_MANAGEMENT_SCREENS.md`
- Backend API: Check `/merchant/products/:id/variants` endpoints
- Form components: See `components/forms/` directory
- Permission system: Check `contexts/AuthContext.tsx`

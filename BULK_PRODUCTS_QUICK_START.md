# Bulk Products - Quick Start Guide

## 🚀 Quick Access

Navigate to these screens:
- `/products/import` - Import products from CSV/Excel
- `/products/export` - Export products to CSV/Excel
- `/products/bulk-actions` - Perform bulk operations

## 📥 Import Products (10,000+ products)

### Steps:
1. Open **Products → Import**
2. Download template (CSV or Excel)
3. Fill in your product data
4. Upload the completed file
5. Review validation results
6. Fix errors if any and re-import

### Template Fields:
```csv
name,sku,description,category,price,stock,status
Product Name,SKU123,Description,Electronics,999,100,active
```

### Validation Rules:
- ✅ Name: Required, 2-200 characters
- ✅ Price: Required, positive number
- ✅ Stock: Required, non-negative number
- ✅ Category: Required
- ✅ Status: active or inactive
- ✅ File size: Max 50MB

## 📤 Export Products

### Steps:
1. Open **Products → Export**
2. Choose format (CSV or Excel)
3. Apply filters (optional):
   - Category
   - Status
   - Date range
4. Select fields to export (16 available)
5. Click **Export Products**
6. Download the file

### Available Fields:
**Required (7):**
- Name, SKU, Description, Category, Price, Stock, Status

**Optional (9):**
- Images, Tags, Cashback, Weight, Dimensions, Brand, Barcode, Created Date, Updated Date

## ⚡ Bulk Actions

### Available Actions:

#### 1. Change Category
- Select products
- Choose "Change Category"
- Enter new category name
- Apply

#### 2. Update Price
- Select products
- Choose "Update Price"
- Select type:
  - **Percentage:** +10% or -10%
  - **Fixed:** Set to ₹999
- Enter value
- Apply

#### 3. Change Status
- Select products
- Choose "Change Status"
- Select:
  - **Activate:** Make products live
  - **Deactivate:** Hide products
- Apply

#### 4. Apply Discount
- Select products
- Choose "Apply Discount"
- Select type:
  - **Percentage:** 10% off
  - **Fixed:** ₹100 off
- Enter value
- Apply

#### 5. Delete Products
- Select products
- Choose "Delete Products"
- Confirm (⚠️ Cannot be undone)
- Apply

### Selection Tips:
- Use **Search** to find specific products
- Use **Filters** to narrow down
- Click **Select All** for all visible products
- Click **Deselect All** to clear selection
- Check count before applying

## 🔐 Permissions Required

| Screen | Permission | Description |
|--------|-----------|-------------|
| Import | `products:bulk_import` | Import products from files |
| Export | `products:export` | Export products to files |
| Bulk Actions | `products:bulk_edit` | Perform bulk operations |

## 📊 Progress Tracking

All operations show:
- Progress bar (0-100%)
- Current status
- Estimated time
- Success/failure count

## 📜 History

Each screen maintains history:
- **Import History:** Past imports with success/failure counts
- **Export History:** Past exports with download links
- **Action History:** Past bulk actions with undo capability

### Undo Actions:
- Available for: Category changes, price updates, status changes, discounts
- Not available for: Delete operations
- Click **Undo Action** in history to reverse

## ⚠️ Important Notes

### File Limits:
- Max file size: **50MB**
- Recommended batch size: **5,000 products**
- For 10,000+ products: Split into multiple files

### Best Practices:
1. **Test with small batch first** (10-50 products)
2. **Backup before bulk delete** (export first)
3. **Review errors carefully** (line numbers provided)
4. **Use templates** (ensure correct format)
5. **Check history** (verify operations completed)

### Error Handling:
- Import errors show **line numbers** and **field names**
- Fix errors in original file
- Re-import failed rows only
- Check validation rules

## 🎯 Common Use Cases

### Scenario 1: Adding 1000 New Products
1. Download import template
2. Fill Excel with 1000 products
3. Save as CSV or keep as Excel
4. Import via Products → Import
5. Review any validation errors
6. Fix errors and re-import if needed

### Scenario 2: 20% Discount Sale
1. Go to Products → Bulk Actions
2. Filter by category (e.g., "Electronics")
3. Select All products
4. Choose "Apply Discount"
5. Select "Percentage" and enter "20"
6. Apply to all selected

### Scenario 3: Exporting for Analysis
1. Go to Products → Export
2. Select Excel format
3. Filter by status: "active"
4. Select all fields
5. Export and download
6. Open in Excel for analysis

### Scenario 4: Seasonal Category Update
1. Go to Products → Bulk Actions
2. Search "winter" to find winter products
3. Select All results
4. Choose "Change Category"
5. Enter "Winter Sale 2025"
6. Apply

## 🐛 Troubleshooting

### Import Issues:
| Problem | Solution |
|---------|----------|
| File not uploading | Check file size < 50MB |
| Validation errors | Check line numbers, fix data |
| Template not downloading | Check internet connection |
| Upload stuck | Refresh page, try again |

### Export Issues:
| Problem | Solution |
|---------|----------|
| No products in export | Check filters applied |
| Download not starting | Check browser settings |
| File won't open | Try different format |
| Missing fields | Select fields in field selector |

### Bulk Action Issues:
| Problem | Solution |
|---------|----------|
| Action not working | Check permission settings |
| No products selected | Use Select All or select manually |
| Undo not available | Only available for non-delete actions |
| Progress stuck | Refresh page, check history |

## 📱 Mobile vs Web

### Mobile:
- Native file picker
- Swipe gestures
- Optimized for touch
- Smaller batch sizes recommended

### Web:
- Drag-and-drop (coming soon)
- Keyboard shortcuts
- Larger batch sizes
- Better for data entry

## 🔗 Related Screens

- **Products List:** View all products
- **Add Product:** Add single product
- **Edit Product:** Edit single product
- **Categories:** Manage categories

## 📞 Support

Need help?
1. Check this quick start guide
2. Review error messages carefully
3. Test with small datasets
4. Check permissions with admin
5. Contact support team

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0

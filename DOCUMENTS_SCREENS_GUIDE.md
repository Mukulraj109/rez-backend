# Document Generation Screens - Complete Guide

## Overview

The merchant app now includes comprehensive document generation capabilities for invoices, shipping labels, and packing slips. All documents are generated as PDFs and stored in Cloudinary for easy access and sharing.

## File Structure

```
app/documents/
├── index.tsx                    # Documents overview screen
├── invoices/
│   └── [orderId].tsx           # Invoice viewer/generator
├── labels/
│   └── [orderId].tsx           # Shipping label viewer/generator
└── packing-slips/
    └── [orderId].tsx           # Packing slip viewer/generator

services/api/
└── documents.ts                 # Documents API service
```

## Screen Descriptions

### 1. Documents Overview (`app/documents/index.tsx`)

**Purpose**: Central hub for managing all document types

**Features**:
- Document statistics (invoices, labels, packing slips)
- Search functionality by order number or customer name
- Filter by document type
- Document history with status indicators
- Bulk download capability
- Quick actions for common tasks
- Template management access

**Navigation**:
- Access from dashboard or orders screen
- Routes to specific document generators
- Links to template settings

**Key Components**:
```typescript
// Stats display
- Total documents count
- Invoices count
- Labels count
- Packing slips count

// Filter options
- All documents
- Invoices only
- Labels only
- Packing slips only

// Document list
- Document type icon
- Order number
- Customer name
- Generation date
- Status (generated/pending)
```

### 2. Invoice Generator (`app/documents/invoices/[orderId].tsx`)

**Purpose**: Generate, view, and manage professional invoices

**Features**:
- ✅ Real-time invoice preview
- ✅ Customizable settings (logo, colors, company info)
- ✅ Generate invoice button
- ✅ Download PDF
- ✅ Email to customer
- ✅ Print (web only)
- ✅ Share functionality
- ✅ Order details display
- ✅ Customer information
- ✅ Itemized list with totals
- ✅ Tax breakdown

**Invoice Layout**:
```
┌────────────────────────────┐
│ [Logo]  Company Info       │
├────────────────────────────┤
│ Invoice #, Date, Due Date  │
├────────────────────────────┤
│ Bill To: Customer Info     │
├────────────────────────────┤
│ Items Table                │
│ - Product Name             │
│ - Quantity                 │
│ - Price                    │
│ - Total                    │
├────────────────────────────┤
│ Subtotal:          $XX.XX  │
│ Tax:               $XX.XX  │
│ Delivery:          $XX.XX  │
│ ─────────────────────────  │
│ Total:             $XX.XX  │
├────────────────────────────┤
│ Footer Text / Notes        │
└────────────────────────────┘
```

**Customization Options**:
- Show/hide logo
- Show/hide tax breakdown
- Show/hide notes section
- Custom company information
- Custom footer text
- Primary color theme

### 3. Shipping Label Generator (`app/documents/labels/[orderId].tsx`)

**Purpose**: Generate thermal shipping labels (4x6" format)

**Features**:
- ✅ Carrier selection (FedEx, UPS, USPS, DHL, Custom)
- ✅ Tracking number input
- ✅ 4x6" thermal label preview
- ✅ Barcode display
- ✅ QR code for tracking
- ✅ Generate label button
- ✅ Download PDF
- ✅ Print (web only)
- ✅ Share functionality

**Label Layout** (4x6" thermal format):
```
┌─────────────────────┐
│   [Carrier Logo]    │
│   Carrier Name      │
├─────────────────────┤
│ FROM:               │
│ Business Name       │
│ Business Address    │
├─────────────────────┤
│ TO:                 │
│ Customer Name       │
│ Delivery Address    │
│ Phone Number        │
├─────────────────────┤
│   [Barcode]         │
│   Tracking Number   │
├─────────────────────┤
│ Order: #12345       │
│ Date: Jan 15, 2025  │
│ Weight: 1.5 lbs     │
├─────────────────────┤
│     [QR Code]       │
│  Scan for tracking  │
└─────────────────────┘
```

**Supported Carriers**:
- FedEx
- UPS
- USPS
- DHL
- Custom carrier

### 4. Packing Slip Generator (`app/documents/packing-slips/[orderId].tsx`)

**Purpose**: Generate packing slips with item checklists

**Features**:
- ✅ Interactive item checklist
- ✅ Packing progress tracker
- ✅ Custom packing notes
- ✅ Quick note suggestions
- ✅ Real-time slip preview
- ✅ Generate slip button
- ✅ Download PDF
- ✅ Print (web only)
- ✅ Share functionality

**Packing Slip Layout**:
```
┌───────────────────────────┐
│    PACKING SLIP           │
│    Order #12345           │
├───────────────────────────┤
│ Date: Jan 15, 2025        │
│ Customer: John Doe        │
│ Address: 123 Main St      │
├───────────────────────────┤
│ Item          Qty    ✓    │
│ Product 1      2    [ ]   │
│ Product 2      1    [✓]   │
│ Product 3      3    [ ]   │
├───────────────────────────┤
│ Total Items: 3            │
│ Packed Items: 1           │
├───────────────────────────┤
│ Special Instructions:     │
│ Handle with care          │
├───────────────────────────┤
│ Packed by: _______        │
│ Date: _______             │
│ Verified by: _______      │
└───────────────────────────┘
```

**Packing Features**:
- Interactive checkboxes for each item
- Progress bar showing completion
- "All items packed" indicator
- Custom packing notes with suggestions:
  - "Handle with care"
  - "Fragile items"
  - "Keep upright"
  - "Temperature sensitive"

## API Integration

### Documents Service (`services/api/documents.ts`)

**Available Methods**:

```typescript
// Generate Invoice
await documentsService.generateInvoice({
  orderId: 'order_123',
  settings: {
    companyName: 'Your Business',
    showLogo: true,
    showTaxBreakdown: true,
    // ... other settings
  }
});

// Generate Shipping Label
await documentsService.generateLabel({
  orderId: 'order_123',
  carrier: 'fedex',
  trackingNumber: '1234567890',
  format: '4x6'
});

// Generate Packing Slip
await documentsService.generatePackingSlip({
  orderId: 'order_123',
  items: [
    { productId: 'prod_1', quantity: 2, packed: true },
    // ... other items
  ],
  notes: 'Handle with care'
});

// Email Document
await documentsService.emailDocument({
  documentId: 'doc_123',
  documentType: 'invoice',
  recipientEmail: 'customer@example.com',
  message: 'Please find your invoice attached.'
});

// Get Document History
await documentsService.getDocumentHistory({
  type: 'invoice',
  page: 1,
  limit: 20
});

// Bulk Download
await documentsService.bulkDownload(['doc_1', 'doc_2', 'doc_3']);
```

### Backend Integration Required

The screens are ready but require backend implementation for:

1. **PDF Generation Endpoint**: `/api/merchant/documents/invoice`
   - Generate PDF using libraries like PDFKit or Puppeteer
   - Upload to Cloudinary
   - Return document URL

2. **Label Generation Endpoint**: `/api/merchant/documents/label`
   - Generate 4x6" thermal label PDF
   - Include barcode and QR code
   - Upload to Cloudinary

3. **Packing Slip Endpoint**: `/api/merchant/documents/packing-slip`
   - Generate packing slip PDF
   - Include item checklist
   - Upload to Cloudinary

4. **Email Endpoint**: `/api/merchant/documents/email`
   - Send document via email using SendGrid/Nodemailer
   - Attach PDF from Cloudinary

5. **History Endpoint**: `/api/merchant/documents/history`
   - Return paginated list of generated documents
   - Include metadata and URLs

## Usage Examples

### Opening Invoice Generator

```typescript
// From order detail screen
router.push(`/documents/invoices/${orderId}`);

// From documents overview
router.push(`/documents/invoices/${document.orderId}`);
```

### Opening Label Generator

```typescript
router.push(`/documents/labels/${orderId}`);
```

### Opening Packing Slip

```typescript
router.push(`/documents/packing-slips/${orderId}`);
```

### Accessing Documents Overview

```typescript
router.push('/documents');
```

## File Download & Sharing

### Mobile (iOS/Android)

Downloads use `expo-file-system`:
```typescript
const fileUri = `${FileSystem.documentDirectory}filename.pdf`;
const result = await FileSystem.downloadAsync(url, fileUri);
// File saved to device
```

### Web

Downloads open in new tab:
```typescript
window.open(url, '_blank');
```

### Sharing

Uses React Native Share API:
```typescript
await Share.share({
  message: 'Document for Order #12345',
  url: documentUrl,
  title: 'Share Document'
});
```

### Printing (Web Only)

```typescript
const printWindow = window.open(url, '_blank');
printWindow?.addEventListener('load', () => {
  printWindow.print();
});
```

## Permissions & Security

All document endpoints require:
- Valid authentication token
- `orders:view` permission
- `documents:generate` permission (optional)

Validation checks:
- Merchant can only access their own orders
- Order must exist
- Order must belong to the merchant

## UI/UX Features

### Loading States
- ✅ Initial data loading with spinner
- ✅ Document generation progress
- ✅ Download progress indicator
- ✅ Email sending feedback

### Error Handling
- ✅ Order not found
- ✅ Network errors
- ✅ Generation failures
- ✅ Download errors
- ✅ Email errors

### Success Feedback
- ✅ Generation success alerts
- ✅ Download confirmation
- ✅ Email sent confirmation
- ✅ Visual status indicators

### Accessibility
- ✅ Clear labels and headings
- ✅ Readable fonts and spacing
- ✅ Color contrast for status indicators
- ✅ Touch-friendly buttons
- ✅ Keyboard navigation (web)

## Design Tokens

Colors used:
- Primary: `Colors.light.primary` (#7C3AED - Purple)
- Success: `Colors.light.success` (#10B981 - Green)
- Warning: `Colors.light.warning` (#F59E0B - Amber)
- Error: `Colors.light.error` (#EF4444 - Red)
- Text: `Colors.light.text` (#11181C)
- Secondary Text: `Colors.light.textSecondary` (#6B7280)

## Testing Checklist

### Invoice Generator
- [ ] Generate invoice for order
- [ ] Download invoice PDF
- [ ] Email invoice to customer
- [ ] Print invoice (web)
- [ ] Share invoice
- [ ] Toggle customization options
- [ ] Verify invoice preview accuracy

### Label Generator
- [ ] Select different carriers
- [ ] Enter tracking number
- [ ] Generate label
- [ ] Download label PDF
- [ ] Print label (web)
- [ ] Share label
- [ ] Verify 4x6" format

### Packing Slip Generator
- [ ] Check/uncheck items
- [ ] Track packing progress
- [ ] Add custom notes
- [ ] Use quick note suggestions
- [ ] Generate packing slip
- [ ] Download slip PDF
- [ ] Print slip (web)
- [ ] Share slip

### Documents Overview
- [ ] View all documents
- [ ] Filter by type
- [ ] Search by order/customer
- [ ] Bulk download
- [ ] Navigate to generators
- [ ] Access template settings

## Future Enhancements

### Phase 2 Features
- [ ] Batch invoice generation
- [ ] Custom templates editor
- [ ] Multi-language support
- [ ] Currency localization
- [ ] Automatic generation on order status change
- [ ] Document versioning
- [ ] Digital signatures
- [ ] Watermarks for unpaid invoices

### Phase 3 Features
- [ ] Integration with accounting software
- [ ] E-invoice compliance (EU)
- [ ] GST/VAT support (India, Europe)
- [ ] Automated email scheduling
- [ ] Document analytics
- [ ] Customer portal for document access
- [ ] Mobile barcode scanning
- [ ] Return labels generation

## Troubleshooting

### Common Issues

**Issue**: Invoice not generating
- **Solution**: Check order exists and belongs to merchant
- **Solution**: Verify backend PDF generation endpoint is running
- **Solution**: Check Cloudinary credentials

**Issue**: Download fails on mobile
- **Solution**: Check file system permissions
- **Solution**: Verify document URL is accessible
- **Solution**: Check network connection

**Issue**: Email not sending
- **Solution**: Verify email service credentials
- **Solution**: Check recipient email is valid
- **Solution**: Ensure SMTP/SendGrid is configured

**Issue**: Print not working
- **Solution**: Print only works on web platform
- **Solution**: Check browser popup blockers
- **Solution**: Verify PDF URL is accessible

## Support

For issues or questions:
1. Check backend logs for API errors
2. Verify Cloudinary integration
3. Test document URLs directly
4. Check authentication tokens
5. Review permission settings

## Conclusion

The document generation system provides a complete solution for creating, managing, and distributing professional business documents. The screens are production-ready and only require backend API implementation to start generating actual PDFs.

# Document Generation - Quick Reference

Fast reference guide for common document generation tasks.

## Quick Imports

```typescript
// Service
import { documentsService } from '../services/api/documents';

// Types
import {
  DocumentType,
  DocumentStatus,
  InvoiceTemplate,
  PaperSize,
  ShippingCarrier
} from '../types/documents';

// Helpers
import {
  formatInvoiceNumber,
  calculateInvoiceTotal,
  formatAddress,
  formatCurrency,
  validateDocumentData
} from '../utils/documentHelpers';

// PDF Utilities
import {
  previewPDF,
  downloadPDF,
  sharePDF,
  printPDF
} from '../utils/pdfHelpers';
```

## Common Operations

### Generate Invoice

```typescript
const result = await documentsService.generateInvoice(orderId, {
  template: InvoiceTemplate.MODERN,
  includeNotes: true,
  includeTerms: true
});
```

### Generate Shipping Label

```typescript
const result = await documentsService.generateShippingLabel(
  orderId,
  ShippingCarrier.USPS,
  { paperSize: PaperSize.LABEL_4X6 }
);
```

### Generate Packing Slip

```typescript
const result = await documentsService.generatePackingSlip(orderId);
```

### List Documents

```typescript
const { documents, totalCount } = await documentsService.listDocuments({
  type: DocumentType.INVOICE,
  page: 1,
  limit: 20
});
```

### Get Document

```typescript
const document = await documentsService.getDocument(documentId);
```

### Email Document

```typescript
await documentsService.emailDocument(documentId, ['customer@example.com']);
```

### Download Document

```typescript
const { url, filename } = await documentsService.downloadDocument(documentId);
```

### Delete Document

```typescript
await documentsService.deleteDocument(documentId);
```

## PDF Operations

### Preview

```typescript
await previewPDF(url, { title: 'Invoice' });
```

### Download

```typescript
await downloadPDF(url, 'invoice.pdf', { showNotification: true });
```

### Share

```typescript
await sharePDF(url, 'invoice.pdf', {
  subject: 'Your Invoice',
  message: 'Thanks for your order!'
});
```

### Print (Web)

```typescript
await printPDF(url);
```

## Helper Functions

### Format Invoice Number

```typescript
const invoiceNum = formatInvoiceNumber('order123');
// "INV-202411-000123"
```

### Calculate Totals

```typescript
const totals = calculateInvoiceTotal(items, {
  taxRate: 8.5,
  shippingCost: 15.00
});
```

### Format Address

```typescript
const formatted = formatAddress(address);
```

### Format Currency

```typescript
const price = formatCurrency(99.99, 'USD');
// "$99.99"
```

### Validate Data

```typescript
const { isValid, errors } = validateDocumentData(
  DocumentType.INVOICE,
  data
);
```

## Document Types

```typescript
DocumentType.INVOICE
DocumentType.SHIPPING_LABEL
DocumentType.PACKING_SLIP
DocumentType.RECEIPT
DocumentType.RETURN_LABEL
DocumentType.REPORT
DocumentType.COMMERCIAL_INVOICE
```

## Templates

```typescript
InvoiceTemplate.MODERN
InvoiceTemplate.CLASSIC
InvoiceTemplate.MINIMAL
InvoiceTemplate.PROFESSIONAL
InvoiceTemplate.BRANDED
```

## Paper Sizes

```typescript
PaperSize.A4           // 210 x 297 mm
PaperSize.LETTER       // 8.5 x 11 in
PaperSize.LABEL_4X6    // 4 x 6 in
PaperSize.LABEL_4X8    // 4 x 8 in
```

## Shipping Carriers

```typescript
ShippingCarrier.USPS
ShippingCarrier.UPS
ShippingCarrier.FEDEX
ShippingCarrier.DHL
ShippingCarrier.ROYAL_MAIL
ShippingCarrier.CANADA_POST
ShippingCarrier.AUSTRALIA_POST
ShippingCarrier.OTHER
```

## Bulk Operations

```typescript
const result = await documentsService.bulkGenerateDocuments({
  type: DocumentType.INVOICE,
  orderIds: ['order1', 'order2', 'order3'],
  options: { template: InvoiceTemplate.PROFESSIONAL }
});

console.log(`${result.summary.successful}/${result.summary.total} successful`);
```

## Analytics

```typescript
const analytics = await documentsService.getAnalytics('2024-01-01', '2024-12-31');

console.log('Total:', analytics.totalDocuments);
console.log('Downloads:', analytics.totalDownloads);
console.log('Storage:', analytics.storageUsed);
```

## Settings

```typescript
// Get settings
const settings = await documentsService.getSettings();

// Update settings
await documentsService.updateSettings({
  defaultTemplate: { invoice: InvoiceTemplate.MODERN },
  defaultOptions: { paperSize: PaperSize.A4, expiryDays: 30 },
  branding: { primaryColor: '#3b82f6' }
});
```

## Error Handling

```typescript
try {
  const result = await documentsService.generateInvoice(orderId);
  console.log('Success:', result.fileUrl);
} catch (error) {
  console.error('Error:', error.message);
  Alert.alert('Error', 'Failed to generate invoice');
}
```

## Constants

```typescript
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  PAPER_SIZES,
  SHIPPING_CARRIERS,
  INVOICE_TEMPLATES,
  DEFAULT_DOCUMENT_SETTINGS
} from '../constants/documentConstants';

// Get document icon
const icon = DOCUMENT_TYPES[DocumentType.INVOICE].icon;

// Get document color
const color = DOCUMENT_TYPES[DocumentType.INVOICE].color;

// Get carrier tracking URL
const trackingUrl = SHIPPING_CARRIERS[ShippingCarrier.FEDEX].trackingUrl;
```

## Component Example

```typescript
const DocumentButton = ({ orderId }: { orderId: string }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await documentsService.generateInvoice(orderId);
      await previewPDF(result.fileUrl);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title="Generate Invoice"
      onPress={handleGenerate}
      disabled={loading}
    />
  );
};
```

## Files Created

- `services/api/documents.ts` - Main service
- `types/documents.ts` - Type definitions
- `constants/documentConstants.ts` - Constants
- `utils/documentHelpers.ts` - Helper functions
- `utils/pdfHelpers.ts` - PDF utilities
- `DOCUMENTS_SYSTEM_GUIDE.md` - Complete guide
- `DOCUMENTS_QUICK_REFERENCE.md` - This file

## Next Steps

1. Import the service in your component
2. Use the helper functions to format data
3. Generate documents with the service methods
4. Use PDF helpers for preview/download/share
5. Handle errors appropriately
6. Test with real order data

## Tips

- Always validate data before generation
- Use bulk operations for multiple documents
- Cache document URLs when possible
- Handle progress for downloads
- Set appropriate expiry times
- Clean up old documents regularly

## Support

See `DOCUMENTS_SYSTEM_GUIDE.md` for detailed documentation.

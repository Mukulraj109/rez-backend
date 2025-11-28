# Document Generation System - Complete Guide

Complete documentation for the merchant app document generation and management system.

## Overview

The document generation system provides comprehensive functionality for creating, managing, and distributing various business documents including invoices, shipping labels, packing slips, and more.

## Features

- **Document Generation**: Generate PDF documents from order data
- **Multiple Document Types**: Invoices, shipping labels, packing slips, receipts, return labels
- **Template System**: Customizable templates with branding options
- **Bulk Operations**: Generate multiple documents in one request
- **Email Integration**: Send documents directly to customers
- **Download Management**: Secure document downloads with expiry
- **Analytics**: Track document usage and performance
- **Storage Integration**: Cloudinary integration for document storage

## File Structure

```
merchant-app/
├── services/api/
│   └── documents.ts          # Main document service
├── types/
│   └── documents.ts           # Complete type definitions
├── constants/
│   └── documentConstants.ts   # Document-related constants
├── utils/
│   ├── documentHelpers.ts     # Document utility functions
│   └── pdfHelpers.ts          # PDF client-side utilities
└── DOCUMENTS_SYSTEM_GUIDE.md  # This file
```

## Installation

Required dependencies (should already be installed):

```bash
npm install expo-file-system expo-sharing expo-print expo-web-browser
```

## Quick Start

### 1. Import the Service

```typescript
import { documentsService } from '../services/api/documents';
```

### 2. Generate an Invoice

```typescript
const generateInvoice = async (orderId: string) => {
  try {
    const result = await documentsService.generateInvoice(orderId, {
      template: 'modern',
      includeNotes: true,
      includeTerms: true,
      sendEmail: true,
      emailRecipients: ['customer@example.com']
    });

    console.log('Invoice URL:', result.fileUrl);
    console.log('Document ID:', result.documentId);
  } catch (error) {
    console.error('Failed to generate invoice:', error);
  }
};
```

### 3. Generate a Shipping Label

```typescript
import { ShippingCarrier } from '../types/documents';

const generateLabel = async (orderId: string) => {
  try {
    const result = await documentsService.generateShippingLabel(
      orderId,
      ShippingCarrier.USPS,
      {
        paperSize: 'LABEL_4X6',
        includeBarcode: true
      }
    );

    console.log('Label URL:', result.fileUrl);
  } catch (error) {
    console.error('Failed to generate label:', error);
  }
};
```

### 4. List Documents

```typescript
const fetchDocuments = async () => {
  try {
    const result = await documentsService.listDocuments({
      type: DocumentType.INVOICE,
      status: DocumentStatus.COMPLETED,
      page: 1,
      limit: 20,
      sortBy: 'created',
      sortOrder: 'desc'
    });

    console.log(`Found ${result.totalCount} documents`);
    result.documents.forEach(doc => {
      console.log(`${doc.title} - ${doc.fileUrl}`);
    });
  } catch (error) {
    console.error('Failed to list documents:', error);
  }
};
```

## API Reference

### DocumentsService Methods

#### generateInvoice(orderId, options?)
Generate an invoice PDF for an order.

```typescript
const result = await documentsService.generateInvoice(orderId, {
  template: InvoiceTemplate.MODERN,
  paperSize: PaperSize.A4,
  includeNotes: true,
  includeTerms: true,
  sendEmail: true,
  emailRecipients: ['customer@example.com']
});
```

**Returns**: `DocumentGenerationResponse`

#### generateShippingLabel(orderId, carrier, options?)
Generate a shipping label with barcode.

```typescript
const result = await documentsService.generateShippingLabel(
  orderId,
  ShippingCarrier.FEDEX,
  {
    paperSize: PaperSize.LABEL_4X6,
    includeBarcode: true,
    includeReturnLabel: false
  }
);
```

**Returns**: `DocumentGenerationResponse`

#### generatePackingSlip(orderId, options?)
Generate a packing slip for order fulfillment.

```typescript
const result = await documentsService.generatePackingSlip(orderId, {
  includeNotes: true
});
```

**Returns**: `DocumentGenerationResponse`

#### getDocument(documentId)
Get document details by ID.

```typescript
const document = await documentsService.getDocument(documentId);
console.log(document.fileUrl, document.status);
```

**Returns**: `Document`

#### listDocuments(filters?)
List documents with optional filters.

```typescript
const result = await documentsService.listDocuments({
  type: DocumentType.INVOICE,
  orderId: 'order123',
  dateStart: '2024-01-01',
  dateEnd: '2024-12-31',
  page: 1,
  limit: 20
});
```

**Returns**: `DocumentListResponse`

#### deleteDocument(documentId)
Delete a document permanently.

```typescript
await documentsService.deleteDocument(documentId);
```

**Returns**: `{ success: boolean; message: string }`

#### emailDocument(documentId, recipients, options?)
Email a document to recipients.

```typescript
await documentsService.emailDocument(
  documentId,
  ['customer@example.com', 'accounting@example.com'],
  {
    subject: 'Your Invoice',
    message: 'Thank you for your order!'
  }
);
```

**Returns**: `{ success: boolean; message: string }`

#### downloadDocument(documentId)
Get download URL for a document.

```typescript
const { url, filename } = await documentsService.downloadDocument(documentId);
```

**Returns**: `{ url: string; filename: string }`

#### bulkGenerateDocuments(request)
Generate multiple documents at once.

```typescript
const result = await documentsService.bulkGenerateDocuments({
  type: DocumentType.INVOICE,
  orderIds: ['order1', 'order2', 'order3'],
  options: {
    template: InvoiceTemplate.PROFESSIONAL
  }
});

console.log(`${result.summary.successful}/${result.summary.total} successful`);
```

**Returns**: `BulkGenerateDocumentsResponse`

## Helper Functions

### Document Helpers

```typescript
import {
  formatInvoiceNumber,
  calculateInvoiceTotal,
  formatAddress,
  formatCurrency,
  validateDocumentData,
  getDocumentIcon,
  getDocumentColor
} from '../utils/documentHelpers';

// Format invoice number
const invoiceNumber = formatInvoiceNumber('order123');
// Result: "INV-202411-000123"

// Calculate invoice totals
const totals = calculateInvoiceTotal(items, {
  taxRate: 8.5,
  shippingCost: 15.00,
  discount: 10.00
});

// Format address
const formatted = formatAddress(address, {
  singleLine: false,
  includeCountry: true
});

// Format currency
const price = formatCurrency(99.99, 'USD', { showSymbol: true });
// Result: "$99.99"

// Validate document data
const { isValid, errors } = validateDocumentData(
  DocumentType.INVOICE,
  invoiceData
);
```

### PDF Helpers

```typescript
import {
  previewPDF,
  downloadPDF,
  sharePDF,
  printPDF
} from '../utils/pdfHelpers';

// Preview PDF
await previewPDF(documentUrl, { title: 'Invoice' });

// Download PDF
await downloadPDF(documentUrl, 'invoice.pdf', {
  showNotification: true,
  onProgress: (progress) => console.log(`${progress}%`)
});

// Share PDF
await sharePDF(documentUrl, 'invoice.pdf', {
  subject: 'Your Invoice',
  message: 'Please find attached your invoice'
});

// Print PDF (web only)
await printPDF(documentUrl);
```

## Document Types

### Available Document Types

- **INVOICE**: Customer invoice with payment details
- **SHIPPING_LABEL**: Shipping label with barcode and tracking
- **PACKING_SLIP**: Packing slip for order fulfillment
- **RECEIPT**: Payment receipt
- **RETURN_LABEL**: Return shipping label
- **REPORT**: Business report or analytics
- **COMMERCIAL_INVOICE**: Commercial invoice for international shipping

### Document Status

- **PENDING**: Generation queued
- **GENERATING**: Document is being generated
- **COMPLETED**: Document ready for download
- **FAILED**: Generation failed
- **EXPIRED**: Document link has expired

## Templates

### Invoice Templates

- **MODERN**: Clean, modern design with bold typography
- **CLASSIC**: Traditional invoice layout
- **MINIMAL**: Minimalist design with clean lines
- **PROFESSIONAL**: Professional business invoice
- **BRANDED**: Customizable with brand colors

### Paper Sizes

- **A4**: 210 x 297 mm (International standard)
- **LETTER**: 8.5 x 11 in (US standard)
- **LABEL_4X6**: 4 x 6 in (Standard shipping label)
- **LABEL_4X8**: 4 x 8 in (Large shipping label)

## Complete Example: Invoice Generation Flow

```typescript
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { documentsService } from '../services/api/documents';
import { previewPDF, downloadPDF, sharePDF } from '../utils/pdfHelpers';
import { DocumentType, InvoiceTemplate } from '../types/documents';

const InvoiceManager = ({ orderId }: { orderId: string }) => {
  const [loading, setLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);

      const result = await documentsService.generateInvoice(orderId, {
        template: InvoiceTemplate.MODERN,
        includeNotes: true,
        includeTerms: true,
        paperSize: 'A4',
        sendEmail: false
      });

      setDocumentUrl(result.fileUrl);
      Alert.alert('Success', 'Invoice generated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (documentUrl) {
      await previewPDF(documentUrl, { title: 'Invoice Preview' });
    }
  };

  const handleDownload = async () => {
    if (documentUrl) {
      await downloadPDF(documentUrl, 'invoice.pdf', {
        showNotification: true
      });
    }
  };

  const handleShare = async () => {
    if (documentUrl) {
      await sharePDF(documentUrl, 'invoice.pdf', {
        subject: 'Invoice',
        message: 'Please find your invoice attached'
      });
    }
  };

  return (
    <View>
      <Button
        title="Generate Invoice"
        onPress={handleGenerateInvoice}
        disabled={loading}
      />

      {documentUrl && (
        <>
          <Button title="Preview" onPress={handlePreview} />
          <Button title="Download" onPress={handleDownload} />
          <Button title="Share" onPress={handleShare} />
        </>
      )}
    </View>
  );
};
```

## Error Handling

```typescript
import { documentsService } from '../services/api/documents';

const generateWithErrorHandling = async (orderId: string) => {
  try {
    // Validate order ID
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Generate document
    const result = await documentsService.generateInvoice(orderId);

    // Check if generation was successful
    if (result.status === 'FAILED') {
      throw new Error('Document generation failed');
    }

    return result;
  } catch (error: any) {
    // Handle specific error types
    if (error.message.includes('not found')) {
      Alert.alert('Error', 'Order not found');
    } else if (error.message.includes('unauthorized')) {
      Alert.alert('Error', 'Authentication required');
    } else {
      Alert.alert('Error', 'Failed to generate document');
    }

    console.error('Document generation error:', error);
    throw error;
  }
};
```

## Best Practices

### 1. Always Validate Data

```typescript
import { validateDocumentData } from '../utils/documentHelpers';

const { isValid, errors } = validateDocumentData(
  DocumentType.INVOICE,
  invoiceData
);

if (!isValid) {
  console.error('Validation errors:', errors);
  return;
}
```

### 2. Handle Progress for Long Operations

```typescript
const [progress, setProgress] = useState(0);

await downloadPDF(url, filename, {
  onProgress: (percent) => setProgress(percent)
});
```

### 3. Cache Document URLs

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save document URL
await AsyncStorage.setItem(`doc_${orderId}`, documentUrl);

// Retrieve later
const cachedUrl = await AsyncStorage.getItem(`doc_${orderId}`);
```

### 4. Use Bulk Operations for Multiple Documents

```typescript
// Instead of multiple single requests
const results = await documentsService.bulkGenerateDocuments({
  type: DocumentType.INVOICE,
  orderIds: ['order1', 'order2', 'order3']
});
```

### 5. Set Document Expiry

```typescript
import { calculateExpiryDate } from '../utils/documentHelpers';

const expiresAt = calculateExpiryDate(30); // 30 days
```

## Analytics Integration

```typescript
const analyzeDocumentUsage = async () => {
  try {
    const analytics = await documentsService.getAnalytics(
      '2024-01-01',
      '2024-12-31'
    );

    console.log('Total Documents:', analytics.totalDocuments);
    console.log('Total Downloads:', analytics.totalDownloads);
    console.log('Storage Used:', analytics.storageUsed);
    console.log('Top Types:', analytics.topDocumentTypes);
  } catch (error) {
    console.error('Analytics error:', error);
  }
};
```

## Settings Management

```typescript
const updateDocumentSettings = async () => {
  try {
    const settings = await documentsService.updateSettings({
      defaultTemplate: {
        invoice: InvoiceTemplate.MODERN,
        packingSlip: 'standard'
      },
      defaultOptions: {
        paperSize: PaperSize.A4,
        includeNotes: true,
        autoEmailCustomer: false,
        expiryDays: 30
      },
      branding: {
        logo: 'https://example.com/logo.png',
        primaryColor: '#3b82f6',
        footerText: 'Thank you for your business!'
      }
    });

    console.log('Settings updated:', settings);
  } catch (error) {
    console.error('Settings error:', error);
  }
};
```

## Troubleshooting

### Common Issues

1. **Document generation fails**
   - Check order data is complete
   - Validate merchant settings are configured
   - Ensure backend endpoint is accessible

2. **PDF won't preview on mobile**
   - Check file URL is accessible
   - Verify expo-web-browser is installed
   - Try download instead of preview

3. **Email delivery fails**
   - Validate email addresses
   - Check email service is configured
   - Verify SMTP settings in backend

4. **Documents expire too quickly**
   - Update settings to increase expiry days
   - Generate new document if expired

## Performance Tips

1. **Use pagination for large lists**
```typescript
const result = await documentsService.listDocuments({
  page: 1,
  limit: 20
});
```

2. **Generate documents on-demand**
```typescript
// Only generate when needed, not automatically
```

3. **Clean up old documents**
```typescript
// Implement automatic cleanup of expired documents
```

## Security Considerations

- Documents are stored securely with expiring URLs
- Authentication required for all operations
- Email validation for document sharing
- Rate limiting on bulk operations
- Secure document deletion

## Support

For issues or questions:
1. Check this guide first
2. Review error logs
3. Verify backend endpoint is available
4. Contact development team

## Version History

- **1.0.0**: Initial implementation
  - Document generation (invoice, label, packing slip)
  - PDF utilities
  - Template system
  - Bulk operations
  - Email integration
  - Analytics

## License

Internal use only - Merchant App Project

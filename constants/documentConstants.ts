// Document-related constants for merchant app

import { DocumentType, PaperSize, ShippingCarrier, InvoiceTemplate, DocumentStatus } from '../types/documents';

// Document type configurations
export const DOCUMENT_TYPES = {
  [DocumentType.INVOICE]: {
    label: 'Invoice',
    icon: 'receipt',
    color: '#3b82f6',
    description: 'Customer invoice with payment details',
    mimeType: 'application/pdf'
  },
  [DocumentType.SHIPPING_LABEL]: {
    label: 'Shipping Label',
    icon: 'local-shipping',
    color: '#10b981',
    description: 'Shipping label with barcode and tracking',
    mimeType: 'application/pdf'
  },
  [DocumentType.PACKING_SLIP]: {
    label: 'Packing Slip',
    icon: 'inventory',
    color: '#f59e0b',
    description: 'Packing slip for order fulfillment',
    mimeType: 'application/pdf'
  },
  [DocumentType.RECEIPT]: {
    label: 'Receipt',
    icon: 'receipt-long',
    color: '#8b5cf6',
    description: 'Payment receipt',
    mimeType: 'application/pdf'
  },
  [DocumentType.RETURN_LABEL]: {
    label: 'Return Label',
    icon: 'keyboard-return',
    color: '#ef4444',
    description: 'Return shipping label',
    mimeType: 'application/pdf'
  },
  [DocumentType.REPORT]: {
    label: 'Report',
    icon: 'analytics',
    color: '#06b6d4',
    description: 'Business report or analytics',
    mimeType: 'application/pdf'
  },
  [DocumentType.COMMERCIAL_INVOICE]: {
    label: 'Commercial Invoice',
    icon: 'business',
    color: '#6366f1',
    description: 'Commercial invoice for international shipping',
    mimeType: 'application/pdf'
  }
} as const;

// Document status configurations
export const DOCUMENT_STATUSES = {
  [DocumentStatus.PENDING]: {
    label: 'Pending',
    color: '#6b7280',
    icon: 'schedule',
    description: 'Document generation queued'
  },
  [DocumentStatus.GENERATING]: {
    label: 'Generating',
    color: '#f59e0b',
    icon: 'hourglass-empty',
    description: 'Document is being generated'
  },
  [DocumentStatus.COMPLETED]: {
    label: 'Completed',
    color: '#10b981',
    icon: 'check-circle',
    description: 'Document ready for download'
  },
  [DocumentStatus.FAILED]: {
    label: 'Failed',
    color: '#ef4444',
    icon: 'error',
    description: 'Document generation failed'
  },
  [DocumentStatus.EXPIRED]: {
    label: 'Expired',
    color: '#9ca3af',
    icon: 'timer-off',
    description: 'Document link has expired'
  }
} as const;

// Paper sizes with dimensions
export const PAPER_SIZES = {
  [PaperSize.A4]: {
    label: 'A4',
    width: 210,
    height: 297,
    unit: 'mm',
    description: '210 x 297 mm (Standard international)'
  },
  [PaperSize.LETTER]: {
    label: 'Letter',
    width: 8.5,
    height: 11,
    unit: 'in',
    description: '8.5 x 11 in (US standard)'
  },
  [PaperSize.LABEL_4X6]: {
    label: '4x6 Label',
    width: 4,
    height: 6,
    unit: 'in',
    description: '4 x 6 in (Standard shipping label)'
  },
  [PaperSize.LABEL_4X8]: {
    label: '4x8 Label',
    width: 4,
    height: 8,
    unit: 'in',
    description: '4 x 8 in (Large shipping label)'
  }
} as const;

// Shipping carriers
export const SHIPPING_CARRIERS = {
  [ShippingCarrier.USPS]: {
    label: 'USPS',
    fullName: 'United States Postal Service',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
    country: 'US'
  },
  [ShippingCarrier.UPS]: {
    label: 'UPS',
    fullName: 'United Parcel Service',
    trackingUrl: 'https://www.ups.com/track?tracknum=',
    country: 'US'
  },
  [ShippingCarrier.FEDEX]: {
    label: 'FedEx',
    fullName: 'Federal Express',
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=',
    country: 'US'
  },
  [ShippingCarrier.DHL]: {
    label: 'DHL',
    fullName: 'DHL Express',
    trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=',
    country: 'International'
  },
  [ShippingCarrier.ROYAL_MAIL]: {
    label: 'Royal Mail',
    fullName: 'Royal Mail',
    trackingUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/',
    country: 'UK'
  },
  [ShippingCarrier.CANADA_POST]: {
    label: 'Canada Post',
    fullName: 'Canada Post',
    trackingUrl: 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=',
    country: 'CA'
  },
  [ShippingCarrier.AUSTRALIA_POST]: {
    label: 'Australia Post',
    fullName: 'Australia Post',
    trackingUrl: 'https://auspost.com.au/mypost/track/#/details/',
    country: 'AU'
  },
  [ShippingCarrier.OTHER]: {
    label: 'Other',
    fullName: 'Other Carrier',
    trackingUrl: '',
    country: 'Multiple'
  }
} as const;

// Invoice templates
export const INVOICE_TEMPLATES = {
  [InvoiceTemplate.MODERN]: {
    label: 'Modern',
    description: 'Clean, modern design with bold typography',
    preview: '/templates/previews/modern.png',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      text: '#1f2937',
      background: '#ffffff'
    }
  },
  [InvoiceTemplate.CLASSIC]: {
    label: 'Classic',
    description: 'Traditional invoice layout',
    preview: '/templates/previews/classic.png',
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      text: '#374151',
      background: '#ffffff'
    }
  },
  [InvoiceTemplate.MINIMAL]: {
    label: 'Minimal',
    description: 'Minimalist design with clean lines',
    preview: '/templates/previews/minimal.png',
    colors: {
      primary: '#000000',
      secondary: '#6b7280',
      text: '#1f2937',
      background: '#ffffff'
    }
  },
  [InvoiceTemplate.PROFESSIONAL]: {
    label: 'Professional',
    description: 'Professional business invoice',
    preview: '/templates/previews/professional.png',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      text: '#1f2937',
      background: '#ffffff'
    }
  },
  [InvoiceTemplate.BRANDED]: {
    label: 'Branded',
    description: 'Customizable with your brand colors',
    preview: '/templates/previews/branded.png',
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      text: '#1f2937',
      background: '#ffffff'
    }
  }
} as const;

// Default document settings
export const DEFAULT_DOCUMENT_SETTINGS = {
  paperSize: PaperSize.A4,
  template: InvoiceTemplate.MODERN,
  includeNotes: true,
  includeTerms: true,
  includeBarcode: true,
  autoEmailCustomer: false,
  expiryDays: 30,
  language: 'en',
  currency: 'USD'
} as const;

// Document generation limits
export const DOCUMENT_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxBulkGeneration: 100,
  maxEmailRecipients: 10,
  defaultExpiryDays: 30,
  maxExpiryDays: 365,
  maxDownloads: 1000
} as const;

// Document file extensions
export const DOCUMENT_EXTENSIONS = {
  pdf: '.pdf',
  png: '.png',
  jpg: '.jpg',
  html: '.html'
} as const;

// Document MIME types
export const DOCUMENT_MIME_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  html: 'text/html'
} as const;

// Invoice number formatting
export const INVOICE_NUMBER_FORMAT = {
  prefix: 'INV',
  separator: '-',
  minDigits: 6,
  yearFormat: 'YYYY',
  includeYear: true
} as const;

// Default terms and conditions
export const DEFAULT_TERMS_AND_CONDITIONS = `Payment is due within 30 days of invoice date.
Late payments may be subject to a service charge.
Please include invoice number with payment.
Thank you for your business!`;

// Default invoice notes
export const DEFAULT_INVOICE_NOTES = `Thank you for your order!
If you have any questions about this invoice, please contact us.`;

// Barcode types
export const BARCODE_TYPES = {
  CODE128: 'CODE128',
  CODE39: 'CODE39',
  EAN13: 'EAN13',
  UPC: 'UPC',
  QR: 'QR',
  PDF417: 'PDF417'
} as const;

// Weight units
export const WEIGHT_UNITS = {
  kg: { label: 'kg', fullName: 'Kilogram', conversionToKg: 1 },
  lb: { label: 'lb', fullName: 'Pound', conversionToKg: 0.453592 },
  oz: { label: 'oz', fullName: 'Ounce', conversionToKg: 0.0283495 },
  g: { label: 'g', fullName: 'Gram', conversionToKg: 0.001 }
} as const;

// Dimension units
export const DIMENSION_UNITS = {
  cm: { label: 'cm', fullName: 'Centimeter', conversionToCm: 1 },
  in: { label: 'in', fullName: 'Inch', conversionToCm: 2.54 },
  mm: { label: 'mm', fullName: 'Millimeter', conversionToCm: 0.1 },
  m: { label: 'm', fullName: 'Meter', conversionToCm: 100 }
} as const;

// Document action types
export const DOCUMENT_ACTIONS = {
  DOWNLOAD: 'download',
  EMAIL: 'email',
  PRINT: 'print',
  SHARE: 'share',
  DELETE: 'delete',
  REGENERATE: 'regenerate',
  VIEW: 'view'
} as const;

// Email templates for documents
export const EMAIL_TEMPLATES = {
  invoice: {
    subject: 'Invoice #{invoiceNumber} from {merchantName}',
    body: `Dear {customerName},

Thank you for your order! Please find attached your invoice #{invoiceNumber}.

Order Number: {orderNumber}
Invoice Date: {invoiceDate}
Total Amount: {totalAmount}

If you have any questions, please don't hesitate to contact us.

Best regards,
{merchantName}`
  },
  packingSlip: {
    subject: 'Packing Slip for Order #{orderNumber}',
    body: `Dear {customerName},

Your order #{orderNumber} is being prepared for shipment.
Please find attached the packing slip for your reference.

Best regards,
{merchantName}`
  },
  shippingLabel: {
    subject: 'Shipping Label for Order #{orderNumber}',
    body: `Dear {customerName},

Your order #{orderNumber} has been shipped!
Tracking Number: {trackingNumber}

Please find attached the shipping label for your reference.

Best regards,
{merchantName}`
  }
} as const;

// Document storage configuration
export const DOCUMENT_STORAGE = {
  cloudProvider: 'cloudinary', // or 's3', 'gcs', etc.
  folder: 'merchant-documents',
  publicAccess: false,
  secureUrl: true,
  resourceType: 'raw'
} as const;

// Document generation queue settings
export const DOCUMENT_QUEUE = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  timeout: 60000, // 60 seconds
  batchSize: 10
} as const;

// Document watermark settings
export const WATERMARK_DEFAULTS = {
  text: 'DRAFT',
  opacity: 0.3,
  fontSize: 48,
  rotation: -45,
  color: '#9ca3af'
} as const;

// Currency symbols
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  CNY: '¥',
  CHF: 'CHF',
  SEK: 'kr',
  NZD: 'NZ$'
} as const;

// Date format options
export const DATE_FORMATS = {
  short: 'MM/DD/YYYY',
  long: 'MMMM DD, YYYY',
  iso: 'YYYY-MM-DD',
  custom: 'DD MMM YYYY'
} as const;

// Document sort options
export const DOCUMENT_SORT_OPTIONS = [
  { value: 'created', label: 'Date Created', default: true },
  { value: 'updated', label: 'Last Updated', default: false },
  { value: 'type', label: 'Document Type', default: false },
  { value: 'title', label: 'Title', default: false },
  { value: 'downloads', label: 'Download Count', default: false }
] as const;

// Export all constants
export default {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  PAPER_SIZES,
  SHIPPING_CARRIERS,
  INVOICE_TEMPLATES,
  DEFAULT_DOCUMENT_SETTINGS,
  DOCUMENT_LIMITS,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_TYPES,
  INVOICE_NUMBER_FORMAT,
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_INVOICE_NOTES,
  BARCODE_TYPES,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  DOCUMENT_ACTIONS,
  EMAIL_TEMPLATES,
  DOCUMENT_STORAGE,
  DOCUMENT_QUEUE,
  WATERMARK_DEFAULTS,
  CURRENCY_SYMBOLS,
  DATE_FORMATS,
  DOCUMENT_SORT_OPTIONS
};

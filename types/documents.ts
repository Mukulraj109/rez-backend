// Document type definitions for merchant app

// Document types enum
export enum DocumentType {
  INVOICE = 'invoice',
  SHIPPING_LABEL = 'shipping_label',
  PACKING_SLIP = 'packing_slip',
  REPORT = 'report',
  RECEIPT = 'receipt',
  RETURN_LABEL = 'return_label',
  COMMERCIAL_INVOICE = 'commercial_invoice'
}

// Document status
export enum DocumentStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// Paper size enum
export enum PaperSize {
  A4 = 'A4',
  LETTER = 'LETTER',
  LABEL_4X6 = '4x6',
  LABEL_4X8 = '4x8'
}

// Shipping carrier enum
export enum ShippingCarrier {
  USPS = 'usps',
  UPS = 'ups',
  FEDEX = 'fedex',
  DHL = 'dhl',
  ROYAL_MAIL = 'royal_mail',
  CANADA_POST = 'canada_post',
  AUSTRALIA_POST = 'australia_post',
  OTHER = 'other'
}

// Invoice template types
export enum InvoiceTemplate {
  MODERN = 'modern',
  CLASSIC = 'classic',
  MINIMAL = 'minimal',
  PROFESSIONAL = 'professional',
  BRANDED = 'branded'
}

// Main document interface
export interface Document {
  id: string;
  merchantId: string;
  type: DocumentType;
  status: DocumentStatus;
  title: string;
  filename: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType: string;
  metadata: DocumentMetadata;
  relatedEntities: {
    orderId?: string;
    customerId?: string;
    productIds?: string[];
  };
  generatedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  isPublic: boolean;
  downloadCount: number;
}

// Document metadata
export interface DocumentMetadata {
  pageCount?: number;
  dimensions?: {
    width: number;
    height: number;
    unit: 'px' | 'mm' | 'in';
  };
  format?: string;
  generator?: string;
  version?: string;
  [key: string]: any;
}

// Invoice data interface
export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  invoiceDate: string;
  dueDate?: string;

  // Merchant information
  merchant: {
    businessName: string;
    ownerName?: string;
    email: string;
    phone?: string;
    address?: AddressInfo;
    taxId?: string;
    logo?: string;
  };

  // Customer information
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    billingAddress?: AddressInfo;
    shippingAddress?: AddressInfo;
    taxId?: string;
  };

  // Line items
  items: InvoiceLineItem[];

  // Pricing breakdown
  pricing: {
    subtotal: number;
    taxRate?: number;
    taxAmount: number;
    shippingCost: number;
    discount?: number;
    discountDescription?: string;
    total: number;
  };

  // Payment information
  payment: {
    method: string;
    status: string;
    paidAmount?: number;
    remainingAmount?: number;
    transactionId?: string;
  };

  // Additional details
  notes?: string;
  terms?: string;
  footer?: string;
  currency: string;
}

// Invoice line item
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sku?: string;
  taxRate?: number;
  discount?: number;
}

// Shipping label data interface
export interface ShippingLabelData {
  orderId: string;
  orderNumber: string;
  trackingNumber?: string;
  carrier: ShippingCarrier;
  serviceLevel?: string;

  // Sender information
  sender: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address: AddressInfo;
  };

  // Recipient information
  recipient: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address: AddressInfo;
  };

  // Package information
  package: {
    weight: number;
    weightUnit: 'kg' | 'lb' | 'oz' | 'g';
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: 'cm' | 'in';
    };
    contents?: string;
    value?: number;
    currency?: string;
  };

  // Label options
  options: {
    includeReturnLabel?: boolean;
    signature?: boolean;
    insurance?: boolean;
    insuranceAmount?: number;
  };

  // Barcode data
  barcode?: {
    type: string;
    value: string;
    imageUrl?: string;
  };

  shipmentDate: string;
  estimatedDelivery?: string;
}

// Packing slip data interface
export interface PackingSlipData {
  orderId: string;
  orderNumber: string;
  orderDate: string;

  // Merchant information
  merchant: {
    businessName: string;
    phone?: string;
    email?: string;
    logo?: string;
  };

  // Customer information
  customer: {
    name: string;
    phone?: string;
    shippingAddress: AddressInfo;
  };

  // Items to pack
  items: PackingSlipItem[];

  // Additional information
  specialInstructions?: string;
  giftMessage?: string;
  packingDate?: string;
  packedBy?: string;

  // Tracking
  trackingNumber?: string;
  carrier?: ShippingCarrier;
}

// Packing slip item
export interface PackingSlipItem {
  id: string;
  sku?: string;
  name: string;
  quantity: number;
  variant?: string;
  location?: string; // Warehouse location
  notes?: string;
  imageUrl?: string;
}

// Address information
export interface AddressInfo {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formatted?: string;
}

// Document template interface
export interface DocumentTemplate {
  id: string;
  type: DocumentType;
  name: string;
  description?: string;
  templateType: InvoiceTemplate | string;
  isDefault: boolean;
  isActive: boolean;
  config: {
    colors?: {
      primary?: string;
      secondary?: string;
      text?: string;
      background?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
    logo?: {
      url?: string;
      width?: number;
      height?: number;
      position?: 'left' | 'center' | 'right';
    };
    layout?: {
      margins?: number;
      spacing?: number;
      columns?: number;
    };
    branding?: {
      showLogo?: boolean;
      showContactInfo?: boolean;
      customFooter?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Document generation request
export interface GenerateDocumentRequest {
  type: DocumentType;
  orderId?: string;
  templateId?: string;
  options?: DocumentGenerationOptions;
  data?: any; // Type-specific data
}

// Document generation options
export interface DocumentGenerationOptions {
  paperSize?: PaperSize;
  template?: InvoiceTemplate | string;
  includeNotes?: boolean;
  includeTerms?: boolean;
  includeBarcode?: boolean;
  language?: string;
  currency?: string;
  sendEmail?: boolean;
  emailRecipients?: string[];
  emailSubject?: string;
  emailMessage?: string;
  watermark?: {
    text: string;
    opacity?: number;
  };
}

// Document list filters
export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus;
  orderId?: string;
  customerId?: string;
  dateStart?: string;
  dateEnd?: string;
  search?: string;
  sortBy?: 'created' | 'updated' | 'type' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Document list response
export interface DocumentListResponse {
  documents: Document[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Document generation response
export interface DocumentGenerationResponse {
  documentId: string;
  fileUrl: string;
  filename: string;
  status: DocumentStatus;
  expiresAt?: string;
  message?: string;
}

// Email document request
export interface EmailDocumentRequest {
  documentId: string;
  recipients: string[];
  subject?: string;
  message?: string;
  attachmentName?: string;
}

// Bulk document generation request
export interface BulkGenerateDocumentsRequest {
  type: DocumentType;
  orderIds: string[];
  options?: DocumentGenerationOptions;
}

// Bulk document generation response
export interface BulkGenerateDocumentsResponse {
  results: Array<{
    orderId: string;
    success: boolean;
    documentId?: string;
    fileUrl?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  zipUrl?: string; // URL to download all documents as ZIP
}

// Document analytics
export interface DocumentAnalytics {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<DocumentStatus, number>;
  totalDownloads: number;
  totalEmailsSent: number;
  averageGenerationTime: number;
  storageUsed: number; // in bytes
  topDocumentTypes: Array<{
    type: DocumentType;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    date: string;
    documentsGenerated: number;
    downloads: number;
    emails: number;
  }>;
}

// Document settings
export interface DocumentSettings {
  merchantId: string;
  defaultTemplate: {
    invoice?: string;
    packingSlip?: string;
    shippingLabel?: string;
  };
  defaultOptions: {
    paperSize?: PaperSize;
    includeNotes?: boolean;
    includeTerms?: boolean;
    autoEmailCustomer?: boolean;
    expiryDays?: number;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerText?: string;
  };
  termsAndConditions?: string;
  notesTemplate?: string;
  invoicePrefix?: string;
  invoiceNumberStart?: number;
  updatedAt?: string;
}

// Export request types
export * from './api'; // Import common API types if needed

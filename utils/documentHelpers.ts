// Document utility functions for merchant app

import {
  DocumentType,
  InvoiceData,
  ShippingLabelData,
  PackingSlipData,
  AddressInfo,
  InvoiceLineItem,
  DocumentStatus,
  PaperSize,
  ShippingCarrier
} from '../types/documents';
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  INVOICE_NUMBER_FORMAT,
  CURRENCY_SYMBOLS,
  SHIPPING_CARRIERS,
  BARCODE_TYPES
} from '../constants/documentConstants';

/**
 * Format invoice number based on order ID and configuration
 */
export const formatInvoiceNumber = (
  orderId: string,
  orderNumber?: string,
  merchantId?: string
): string => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Extract numeric part from order number or use orderId
    const numericPart = orderNumber
      ? orderNumber.replace(/\D/g, '').slice(-6).padStart(6, '0')
      : orderId.slice(-6).padStart(6, '0');

    // Format: INV-YYYY-NNNNNN or INV-YYYYMM-NNNNNN
    if (INVOICE_NUMBER_FORMAT.includeYear) {
      return `${INVOICE_NUMBER_FORMAT.prefix}${INVOICE_NUMBER_FORMAT.separator}${year}${month}${INVOICE_NUMBER_FORMAT.separator}${numericPart}`;
    } else {
      return `${INVOICE_NUMBER_FORMAT.prefix}${INVOICE_NUMBER_FORMAT.separator}${numericPart}`;
    }
  } catch (error) {
    console.error('Error formatting invoice number:', error);
    return `${INVOICE_NUMBER_FORMAT.prefix}${INVOICE_NUMBER_FORMAT.separator}${orderId.slice(-6)}`;
  }
};

/**
 * Calculate invoice total and pricing breakdown
 */
export const calculateInvoiceTotal = (
  items: InvoiceLineItem[],
  options?: {
    taxRate?: number;
    shippingCost?: number;
    discount?: number;
  }
): {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  total: number;
} => {
  try {
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      return sum + (itemTotal - itemDiscount);
    }, 0);

    // Calculate discount
    const discount = options?.discount || 0;
    const subtotalAfterDiscount = subtotal - discount;

    // Calculate tax
    const taxRate = options?.taxRate || 0;
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100;

    // Shipping cost
    const shippingCost = options?.shippingCost || 0;

    // Calculate total
    const total = subtotalAfterDiscount + taxAmount + shippingCost;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  } catch (error) {
    console.error('Error calculating invoice total:', error);
    return {
      subtotal: 0,
      taxAmount: 0,
      shippingCost: 0,
      discount: 0,
      total: 0
    };
  }
};

/**
 * Format address for display on documents
 */
export const formatAddress = (
  address: AddressInfo,
  options?: {
    singleLine?: boolean;
    includeCountry?: boolean;
  }
): string => {
  try {
    if (!address) return '';

    const parts: string[] = [];

    // Street address
    if (address.street) parts.push(address.street);
    if (address.street2) parts.push(address.street2);

    // City, State ZIP
    const cityStateZip = [
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean).join(', ');

    if (cityStateZip) parts.push(cityStateZip);

    // Country (optional)
    if (options?.includeCountry && address.country) {
      parts.push(address.country);
    }

    // Join with line breaks or comma
    const separator = options?.singleLine ? ', ' : '\n';
    return parts.join(separator);
  } catch (error) {
    console.error('Error formatting address:', error);
    return address?.street || '';
  }
};

/**
 * Generate barcode data for shipping labels
 */
export const generateBarcodeData = (
  trackingNumber: string,
  carrier: ShippingCarrier,
  type: keyof typeof BARCODE_TYPES = 'CODE128'
): {
  type: string;
  value: string;
  displayValue: string;
  format: string;
} => {
  try {
    return {
      type: BARCODE_TYPES[type],
      value: trackingNumber,
      displayValue: trackingNumber,
      format: type
    };
  } catch (error) {
    console.error('Error generating barcode data:', error);
    return {
      type: BARCODE_TYPES.CODE128,
      value: trackingNumber,
      displayValue: trackingNumber,
      format: 'CODE128'
    };
  }
};

/**
 * Format date for documents
 */
export const formatDocumentDate = (
  date: string | Date,
  format: 'short' | 'long' | 'iso' = 'long'
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? '2-digit' : 'long',
      day: '2-digit'
    };

    if (format === 'iso') {
      return dateObj.toISOString().split('T')[0];
    }

    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleDateString();
  }
};

/**
 * Validate document data before generation
 */
export const validateDocumentData = (
  type: DocumentType,
  data: any
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    switch (type) {
      case DocumentType.INVOICE:
        const invoiceData = data as InvoiceData;
        if (!invoiceData.orderId) errors.push('Order ID is required');
        if (!invoiceData.customer?.name) errors.push('Customer name is required');
        if (!invoiceData.items || invoiceData.items.length === 0) {
          errors.push('At least one line item is required');
        }
        if (!invoiceData.pricing?.total || invoiceData.pricing.total <= 0) {
          errors.push('Invoice total must be greater than 0');
        }
        break;

      case DocumentType.SHIPPING_LABEL:
        const labelData = data as ShippingLabelData;
        if (!labelData.orderId) errors.push('Order ID is required');
        if (!labelData.carrier) errors.push('Shipping carrier is required');
        if (!labelData.sender?.address) errors.push('Sender address is required');
        if (!labelData.recipient?.address) errors.push('Recipient address is required');
        if (!labelData.package?.weight || labelData.package.weight <= 0) {
          errors.push('Package weight is required');
        }
        break;

      case DocumentType.PACKING_SLIP:
        const packingData = data as PackingSlipData;
        if (!packingData.orderId) errors.push('Order ID is required');
        if (!packingData.customer?.name) errors.push('Customer name is required');
        if (!packingData.items || packingData.items.length === 0) {
          errors.push('At least one item is required');
        }
        break;

      default:
        // Generic validation for other document types
        if (!data.orderId && !data.id) {
          errors.push('Document must have an orderId or id');
        }
    }
  } catch (error) {
    console.error('Error validating document data:', error);
    errors.push('Validation error occurred');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get icon for document type
 */
export const getDocumentIcon = (type: DocumentType): string => {
  return DOCUMENT_TYPES[type]?.icon || 'description';
};

/**
 * Get color for document type
 */
export const getDocumentColor = (type: DocumentType): string => {
  return DOCUMENT_TYPES[type]?.color || '#6b7280';
};

/**
 * Get icon for document status
 */
export const getDocumentStatusIcon = (status: DocumentStatus): string => {
  return DOCUMENT_STATUSES[status]?.icon || 'help';
};

/**
 * Get color for document status
 */
export const getDocumentStatusColor = (status: DocumentStatus): string => {
  return DOCUMENT_STATUSES[status]?.color || '#6b7280';
};

/**
 * Format currency amount
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  options?: {
    showSymbol?: boolean;
    decimals?: number;
  }
): string => {
  try {
    const decimals = options?.decimals ?? 2;
    const formatted = amount.toFixed(decimals);

    if (options?.showSymbol !== false) {
      const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
      return `${symbol}${formatted}`;
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return String(amount);
  }
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  try {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  } catch (error) {
    console.error('Error formatting file size:', error);
    return `${bytes} Bytes`;
  }
};

/**
 * Generate filename for document
 */
export const generateDocumentFilename = (
  type: DocumentType,
  orderNumber: string,
  options?: {
    includeDate?: boolean;
    extension?: string;
  }
): string => {
  try {
    const typeLabel = DOCUMENT_TYPES[type]?.label.replace(/\s+/g, '_') || 'document';
    const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    const extension = options?.extension || '.pdf';

    let filename = `${typeLabel}_${sanitizedOrderNumber}`;

    if (options?.includeDate) {
      const dateStr = formatDocumentDate(new Date(), 'iso');
      filename += `_${dateStr}`;
    }

    return `${filename}${extension}`;
  } catch (error) {
    console.error('Error generating filename:', error);
    return `document_${orderNumber}.pdf`;
  }
};

/**
 * Get tracking URL for carrier
 */
export const getTrackingUrl = (
  trackingNumber: string,
  carrier: ShippingCarrier
): string => {
  try {
    const carrierInfo = SHIPPING_CARRIERS[carrier];
    if (!carrierInfo || !carrierInfo.trackingUrl) {
      return '';
    }
    return `${carrierInfo.trackingUrl}${trackingNumber}`;
  } catch (error) {
    console.error('Error generating tracking URL:', error);
    return '';
  }
};

/**
 * Calculate estimated delivery date
 */
export const calculateEstimatedDelivery = (
  shipmentDate: Date,
  carrier: ShippingCarrier,
  serviceLevel?: string
): Date => {
  try {
    const estimatedDate = new Date(shipmentDate);

    // Default business days based on carrier and service
    let businessDays = 5; // Default

    if (carrier === ShippingCarrier.FEDEX || carrier === ShippingCarrier.UPS) {
      if (serviceLevel?.toLowerCase().includes('overnight')) {
        businessDays = 1;
      } else if (serviceLevel?.toLowerCase().includes('2day')) {
        businessDays = 2;
      } else if (serviceLevel?.toLowerCase().includes('3day')) {
        businessDays = 3;
      }
    }

    // Add business days (skip weekends)
    let daysAdded = 0;
    while (daysAdded < businessDays) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      // Skip weekends
      if (estimatedDate.getDay() !== 0 && estimatedDate.getDay() !== 6) {
        daysAdded++;
      }
    }

    return estimatedDate;
  } catch (error) {
    console.error('Error calculating estimated delivery:', error);
    const fallbackDate = new Date(shipmentDate);
    fallbackDate.setDate(fallbackDate.getDate() + 5);
    return fallbackDate;
  }
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  try {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  } catch (error) {
    console.error('Error sanitizing filename:', error);
    return 'document.pdf';
  }
};

/**
 * Check if document has expired
 */
export const isDocumentExpired = (expiresAt?: string): boolean => {
  try {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    return expiryDate < new Date();
  } catch (error) {
    console.error('Error checking document expiry:', error);
    return false;
  }
};

/**
 * Calculate document expiry date
 */
export const calculateExpiryDate = (days: number = 30): string => {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate.toISOString();
  } catch (error) {
    console.error('Error calculating expiry date:', error);
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    return fallbackDate.toISOString();
  }
};

/**
 * Parse template variables in text
 */
export const parseTemplateVariables = (
  template: string,
  variables: Record<string, any>
): string => {
  try {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
    return result;
  } catch (error) {
    console.error('Error parsing template variables:', error);
    return template;
  }
};

/**
 * Convert weight units
 */
export const convertWeight = (
  weight: number,
  fromUnit: 'kg' | 'lb' | 'oz' | 'g',
  toUnit: 'kg' | 'lb' | 'oz' | 'g'
): number => {
  try {
    // Convert to kg first
    const weightInKg = weight * (
      fromUnit === 'kg' ? 1 :
      fromUnit === 'lb' ? 0.453592 :
      fromUnit === 'oz' ? 0.0283495 :
      0.001 // g
    );

    // Convert from kg to target unit
    return weightInKg / (
      toUnit === 'kg' ? 1 :
      toUnit === 'lb' ? 0.453592 :
      toUnit === 'oz' ? 0.0283495 :
      0.001 // g
    );
  } catch (error) {
    console.error('Error converting weight:', error);
    return weight;
  }
};

/**
 * Validate email address
 */
export const isValidEmail = (email: string): boolean => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  } catch (error) {
    console.error('Error validating email:', error);
    return false;
  }
};

/**
 * Get document type label
 */
export const getDocumentTypeLabel = (type: DocumentType): string => {
  return DOCUMENT_TYPES[type]?.label || type;
};

/**
 * Get document status label
 */
export const getDocumentStatusLabel = (status: DocumentStatus): string => {
  return DOCUMENT_STATUSES[status]?.label || status;
};

// Export all helper functions
export default {
  formatInvoiceNumber,
  calculateInvoiceTotal,
  formatAddress,
  generateBarcodeData,
  formatDocumentDate,
  validateDocumentData,
  getDocumentIcon,
  getDocumentColor,
  getDocumentStatusIcon,
  getDocumentStatusColor,
  formatCurrency,
  formatFileSize,
  generateDocumentFilename,
  getTrackingUrl,
  calculateEstimatedDelivery,
  sanitizeFilename,
  isDocumentExpired,
  calculateExpiryDate,
  parseTemplateVariables,
  convertWeight,
  isValidEmail,
  getDocumentTypeLabel,
  getDocumentStatusLabel
};

/**
 * Audit Constants
 *
 * All audit-related constants:
 * - Action configurations
 * - Resource type configurations
 * - Severity level configurations
 * - Icons and colors
 * - Retention periods
 * - Export formats
 */

import type {
  AuditAction,
  AuditResourceType,
  AuditSeverity,
} from '../../types/audit';

// ============================================================================
// ACTION CONFIGURATIONS
// ============================================================================

export interface ActionConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  severity: AuditSeverity;
  category: string;
}

export const AUDIT_ACTIONS: Record<string, ActionConfig> = {
  // Product Actions
  'product.created': {
    label: 'Product Created',
    description: 'A new product was added',
    icon: 'add-circle',
    color: '#34C759',
    severity: 'info',
    category: 'product',
  },
  'product.updated': {
    label: 'Product Updated',
    description: 'Product details were modified',
    icon: 'create',
    color: '#007AFF',
    severity: 'info',
    category: 'product',
  },
  'product.deleted': {
    label: 'Product Deleted',
    description: 'A product was removed',
    icon: 'trash',
    color: '#FF3B30',
    severity: 'warning',
    category: 'product',
  },
  'product.published': {
    label: 'Product Published',
    description: 'Product was made visible to customers',
    icon: 'checkmark-circle',
    color: '#34C759',
    severity: 'info',
    category: 'product',
  },
  'product.unpublished': {
    label: 'Product Unpublished',
    description: 'Product was hidden from customers',
    icon: 'close-circle',
    color: '#FF9500',
    severity: 'warning',
    category: 'product',
  },
  'product.bulk_update': {
    label: 'Bulk Product Update',
    description: 'Multiple products were updated',
    icon: 'albums',
    color: '#007AFF',
    severity: 'warning',
    category: 'product',
  },
  'product.bulk_delete': {
    label: 'Bulk Product Delete',
    description: 'Multiple products were deleted',
    icon: 'trash-bin',
    color: '#FF3B30',
    severity: 'critical',
    category: 'product',
  },

  // Order Actions
  'order.created': {
    label: 'Order Created',
    description: 'A new order was received',
    icon: 'cart',
    color: '#34C759',
    severity: 'info',
    category: 'order',
  },
  'order.status_changed': {
    label: 'Order Status Changed',
    description: 'Order status was updated',
    icon: 'swap-horizontal',
    color: '#007AFF',
    severity: 'info',
    category: 'order',
  },
  'order.cancelled': {
    label: 'Order Cancelled',
    description: 'An order was cancelled',
    icon: 'close-circle',
    color: '#FF3B30',
    severity: 'warning',
    category: 'order',
  },
  'order.shipped': {
    label: 'Order Shipped',
    description: 'Order was shipped to customer',
    icon: 'airplane',
    color: '#007AFF',
    severity: 'info',
    category: 'order',
  },
  'order.delivered': {
    label: 'Order Delivered',
    description: 'Order was delivered successfully',
    icon: 'checkmark-done',
    color: '#34C759',
    severity: 'info',
    category: 'order',
  },

  // User Actions
  'user.created': {
    label: 'User Created',
    description: 'A new user account was created',
    icon: 'person-add',
    color: '#34C759',
    severity: 'info',
    category: 'user',
  },
  'user.updated': {
    label: 'User Updated',
    description: 'User details were modified',
    icon: 'create',
    color: '#007AFF',
    severity: 'info',
    category: 'user',
  },
  'user.deleted': {
    label: 'User Deleted',
    description: 'A user account was removed',
    icon: 'person-remove',
    color: '#FF3B30',
    severity: 'warning',
    category: 'user',
  },
  'user.login': {
    label: 'User Login',
    description: 'User logged in successfully',
    icon: 'log-in',
    color: '#34C759',
    severity: 'info',
    category: 'user',
  },
  'user.logout': {
    label: 'User Logout',
    description: 'User logged out',
    icon: 'log-out',
    color: '#666',
    severity: 'info',
    category: 'user',
  },
  'user.failed_login': {
    label: 'Failed Login',
    description: 'Login attempt failed',
    icon: 'alert-circle',
    color: '#FF3B30',
    severity: 'warning',
    category: 'user',
  },
  'user.password_changed': {
    label: 'Password Changed',
    description: 'User password was updated',
    icon: 'key',
    color: '#007AFF',
    severity: 'warning',
    category: 'user',
  },
  'user.permissions_changed': {
    label: 'Permissions Changed',
    description: 'User permissions were modified',
    icon: 'shield',
    color: '#FF9500',
    severity: 'warning',
    category: 'user',
  },
  'user.access_denied': {
    label: 'Access Denied',
    description: 'User attempted unauthorized action',
    icon: 'shield-outline',
    color: '#FF3B30',
    severity: 'critical',
    category: 'user',
  },

  // Payment Actions
  'payment.processed': {
    label: 'Payment Processed',
    description: 'Payment was processed successfully',
    icon: 'card',
    color: '#34C759',
    severity: 'info',
    category: 'payment',
  },
  'payment.failed': {
    label: 'Payment Failed',
    description: 'Payment processing failed',
    icon: 'close-circle',
    color: '#FF3B30',
    severity: 'error',
    category: 'payment',
  },
  'payment.refunded': {
    label: 'Payment Refunded',
    description: 'Payment was refunded to customer',
    icon: 'return-up-back',
    color: '#FF9500',
    severity: 'warning',
    category: 'payment',
  },

  // Cashback Actions
  'cashback.claimed': {
    label: 'Cashback Claimed',
    description: 'Customer claimed cashback',
    icon: 'wallet',
    color: '#007AFF',
    severity: 'info',
    category: 'cashback',
  },
  'cashback.approved': {
    label: 'Cashback Approved',
    description: 'Cashback request was approved',
    icon: 'checkmark-circle',
    color: '#34C759',
    severity: 'info',
    category: 'cashback',
  },
  'cashback.rejected': {
    label: 'Cashback Rejected',
    description: 'Cashback request was rejected',
    icon: 'close-circle',
    color: '#FF3B30',
    severity: 'warning',
    category: 'cashback',
  },
  'cashback.paid': {
    label: 'Cashback Paid',
    description: 'Cashback was paid to customer',
    icon: 'cash',
    color: '#34C759',
    severity: 'info',
    category: 'cashback',
  },

  // Store Actions
  'store.created': {
    label: 'Store Created',
    description: 'A new store was created',
    icon: 'storefront',
    color: '#34C759',
    severity: 'info',
    category: 'store',
  },
  'store.updated': {
    label: 'Store Updated',
    description: 'Store details were modified',
    icon: 'create',
    color: '#007AFF',
    severity: 'info',
    category: 'store',
  },
  'store.verified': {
    label: 'Store Verified',
    description: 'Store was verified by admin',
    icon: 'checkmark-circle',
    color: '#34C759',
    severity: 'info',
    category: 'store',
  },
  'store.suspended': {
    label: 'Store Suspended',
    description: 'Store was suspended',
    icon: 'ban',
    color: '#FF3B30',
    severity: 'critical',
    category: 'store',
  },

  // System Actions
  'system.backup_created': {
    label: 'Backup Created',
    description: 'System backup was created',
    icon: 'save',
    color: '#007AFF',
    severity: 'info',
    category: 'system',
  },
  'system.data_exported': {
    label: 'Data Exported',
    description: 'Data was exported',
    icon: 'download',
    color: '#007AFF',
    severity: 'info',
    category: 'system',
  },
  'system.data_imported': {
    label: 'Data Imported',
    description: 'Data was imported',
    icon: 'cloud-upload',
    color: '#007AFF',
    severity: 'warning',
    category: 'system',
  },
  'system.security_event': {
    label: 'Security Event',
    description: 'Security-related event occurred',
    icon: 'shield-checkmark',
    color: '#FF3B30',
    severity: 'critical',
    category: 'system',
  },
};

// ============================================================================
// RESOURCE TYPE CONFIGURATIONS
// ============================================================================

export interface ResourceConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const RESOURCE_TYPES: Record<AuditResourceType, ResourceConfig> = {
  product: {
    label: 'Product',
    description: 'Product catalog items',
    icon: 'cube',
    color: '#007AFF',
  },
  order: {
    label: 'Order',
    description: 'Customer orders',
    icon: 'cart',
    color: '#34C759',
  },
  store: {
    label: 'Store',
    description: 'Store information',
    icon: 'storefront',
    color: '#FF9500',
  },
  user: {
    label: 'User',
    description: 'User accounts',
    icon: 'person',
    color: '#007AFF',
  },
  merchant: {
    label: 'Merchant',
    description: 'Merchant accounts',
    icon: 'business',
    color: '#5856D6',
  },
  cashback: {
    label: 'Cashback',
    description: 'Cashback transactions',
    icon: 'wallet',
    color: '#34C759',
  },
  payment: {
    label: 'Payment',
    description: 'Payment transactions',
    icon: 'card',
    color: '#FF3B30',
  },
  inventory: {
    label: 'Inventory',
    description: 'Stock management',
    icon: 'layers',
    color: '#007AFF',
  },
  category: {
    label: 'Category',
    description: 'Product categories',
    icon: 'list',
    color: '#5856D6',
  },
  customer: {
    label: 'Customer',
    description: 'Customer accounts',
    icon: 'people',
    color: '#007AFF',
  },
  report: {
    label: 'Report',
    description: 'System reports',
    icon: 'stats-chart',
    color: '#FF9500',
  },
  settings: {
    label: 'Settings',
    description: 'System settings',
    icon: 'settings',
    color: '#666',
  },
  permissions: {
    label: 'Permissions',
    description: 'Access permissions',
    icon: 'shield',
    color: '#FF9500',
  },
  api_key: {
    label: 'API Key',
    description: 'API authentication keys',
    icon: 'key',
    color: '#5856D6',
  },
  webhook: {
    label: 'Webhook',
    description: 'Webhook integrations',
    icon: 'git-network',
    color: '#007AFF',
  },
  bulk_action: {
    label: 'Bulk Action',
    description: 'Batch operations',
    icon: 'albums',
    color: '#FF9500',
  },
  export: {
    label: 'Export',
    description: 'Data exports',
    icon: 'download',
    color: '#007AFF',
  },
  import: {
    label: 'Import',
    description: 'Data imports',
    icon: 'cloud-upload',
    color: '#34C759',
  },
};

// ============================================================================
// SEVERITY LEVEL CONFIGURATIONS
// ============================================================================

export interface SeverityConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
}

export const SEVERITY_LEVELS: Record<AuditSeverity, SeverityConfig> = {
  info: {
    label: 'Info',
    description: 'Informational events',
    icon: 'information-circle',
    color: '#007AFF',
    priority: 1,
  },
  warning: {
    label: 'Warning',
    description: 'Potentially concerning events',
    icon: 'warning',
    color: '#FF9500',
    priority: 2,
  },
  error: {
    label: 'Error',
    description: 'Error events requiring attention',
    icon: 'close-circle',
    color: '#FF3B30',
    priority: 3,
  },
  critical: {
    label: 'Critical',
    description: 'Critical security or business events',
    icon: 'alert-circle',
    color: '#D70015',
    priority: 4,
  },
};

// ============================================================================
// ICON MAPPINGS
// ============================================================================

export const ACTION_ICONS: Record<string, string> = {
  // CRUD Operations
  created: 'add-circle',
  updated: 'create',
  deleted: 'trash',
  archived: 'archive',
  restored: 'reload',

  // Status Changes
  published: 'checkmark-circle',
  unpublished: 'close-circle',
  approved: 'checkmark-done',
  rejected: 'close',
  verified: 'shield-checkmark',
  suspended: 'ban',

  // User Actions
  login: 'log-in',
  logout: 'log-out',
  password_changed: 'key',
  permissions_changed: 'shield',
  access_denied: 'shield-outline',

  // Order Actions
  status_changed: 'swap-horizontal',
  cancelled: 'close-circle',
  shipped: 'airplane',
  delivered: 'checkmark-done',
  refunded: 'return-up-back',

  // Payment Actions
  processed: 'card',
  failed: 'close-circle',

  // Cashback Actions
  claimed: 'wallet',
  paid: 'cash',

  // System Actions
  backup_created: 'save',
  data_exported: 'download',
  data_imported: 'cloud-upload',
  security_event: 'shield-checkmark',
  report_generated: 'stats-chart',
};

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

export const ACTION_COLORS: Record<string, string> = {
  // Positive Actions
  created: '#34C759',
  published: '#34C759',
  approved: '#34C759',
  verified: '#34C759',
  delivered: '#34C759',
  processed: '#34C759',
  paid: '#34C759',

  // Neutral Actions
  updated: '#007AFF',
  status_changed: '#007AFF',
  shipped: '#007AFF',
  claimed: '#007AFF',
  login: '#34C759',
  logout: '#666',

  // Warning Actions
  unpublished: '#FF9500',
  refunded: '#FF9500',
  archived: '#FF9500',
  password_changed: '#FF9500',
  permissions_changed: '#FF9500',

  // Negative Actions
  deleted: '#FF3B30',
  rejected: '#FF3B30',
  cancelled: '#FF3B30',
  failed: '#FF3B30',
  suspended: '#FF3B30',
  access_denied: '#FF3B30',
  security_event: '#FF3B30',
};

// ============================================================================
// RETENTION PERIODS
// ============================================================================

export const RETENTION_PERIODS = [
  { value: 7, label: '7 days', description: 'Keep logs for 7 days' },
  { value: 30, label: '30 days', description: 'Keep logs for 1 month' },
  { value: 90, label: '90 days', description: 'Keep logs for 3 months' },
  { value: 180, label: '180 days', description: 'Keep logs for 6 months' },
  { value: 365, label: '1 year', description: 'Keep logs for 1 year' },
  { value: 730, label: '2 years', description: 'Keep logs for 2 years' },
  { value: -1, label: 'Forever', description: 'Never delete logs' },
];

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export const EXPORT_FORMATS = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Comma-separated values',
    icon: 'document-text',
    mimeType: 'text/csv',
  },
  {
    value: 'excel',
    label: 'Excel',
    description: 'Microsoft Excel spreadsheet',
    icon: 'grid',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation',
    icon: 'code-slash',
    mimeType: 'application/json',
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Portable Document Format',
    icon: 'document',
    mimeType: 'application/pdf',
  },
];

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

export const DATE_RANGE_PRESETS = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'yesterday', label: 'Yesterday', days: 1 },
  { value: 'last_7_days', label: 'Last 7 days', days: 7 },
  { value: 'last_30_days', label: 'Last 30 days', days: 30 },
  { value: 'last_90_days', label: 'Last 90 days', days: 90 },
  { value: 'custom', label: 'Custom range', days: -1 },
];

// ============================================================================
// COMPLIANCE FRAMEWORKS
// ============================================================================

export const COMPLIANCE_FRAMEWORKS = [
  {
    id: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'EU data protection regulation',
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    description: 'Security and availability standards',
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001',
    description: 'Information security management',
  },
  {
    id: 'pci',
    name: 'PCI DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    description: 'Payment card data security',
  },
];

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100, 250, 500],
};

// ============================================================================
// FILTER DEFAULTS
// ============================================================================

export const FILTER_DEFAULTS = {
  DEFAULT_SEVERITY: 'info' as AuditSeverity,
  DEFAULT_DATE_RANGE: 'last_30_days',
  DEFAULT_SORT: 'newest',
  SORT_OPTIONS: [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
  ],
};

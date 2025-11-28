// Product variant types for merchant app

export enum AttributeType {
  COLOR = 'color',
  SIZE = 'size',
  MATERIAL = 'material',
  WEIGHT = 'weight',
  FLAVOR = 'flavor',
  STYLE = 'style',
  PATTERN = 'pattern',
  FINISH = 'finish',
  CUSTOM = 'custom'
}

export interface VariantAttribute {
  type: AttributeType;
  name: string;
  value: string;
  displayValue?: string; // For formatted display
  hexColor?: string; // For color type
  sortOrder?: number;
}

export interface VariantInventory {
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorders: boolean;
  reservedStock: number;
  warehouse?: string;
  location?: string;
}

export interface VariantPricing {
  basePrice: number;
  priceAdjustment: number; // Positive or negative adjustment from base product price
  finalPrice: number;
  costPrice?: number;
  compareAtPrice?: number;
  margin?: number; // Calculated margin percentage
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;

  // Variant-specific attributes
  attributes: VariantAttribute[];
  name: string; // Auto-generated from attributes (e.g., "Red / Large")

  // Pricing
  pricing: VariantPricing;

  // Inventory
  inventory: VariantInventory;

  // Media
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder: number;
    isMain: boolean;
  }>;

  // Physical properties
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };

  // Status
  isActive: boolean;
  isDefault: boolean; // Mark as default variant for product

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeOption {
  type: AttributeType;
  name: string; // e.g., "Color", "Size"
  values: Array<{
    value: string;
    displayValue?: string;
    hexColor?: string;
    sortOrder?: number;
  }>;
}

export interface VariantCombination {
  attributes: VariantAttribute[];
  sku?: string;
  priceAdjustment?: number;
  stock?: number;
}

// Request/Response Types

export interface CreateVariantRequest {
  productId: string;
  attributes: VariantAttribute[];
  sku?: string; // Auto-generated if not provided
  barcode?: string;
  pricing: {
    priceAdjustment: number;
    costPrice?: number;
    compareAtPrice?: number;
  };
  inventory: Omit<VariantInventory, 'reservedStock'>;
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder?: number;
    isMain?: boolean;
  }>;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateVariantRequest {
  attributes?: VariantAttribute[];
  sku?: string;
  barcode?: string;
  pricing?: {
    priceAdjustment?: number;
    costPrice?: number;
    compareAtPrice?: number;
  };
  inventory?: Partial<VariantInventory>;
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder?: number;
    isMain?: boolean;
  }>;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  isActive?: boolean;
  isDefault?: boolean;
}

export interface GetVariantsResponse {
  variants: ProductVariant[];
  totalCount: number;
  product: {
    id: string;
    name: string;
    basePrice: number;
  };
}

export interface GenerateVariantsRequest {
  productId: string;
  attributeOptions: AttributeOption[];
  defaultPricing?: {
    priceAdjustment: number;
    costPrice?: number;
  };
  defaultInventory?: {
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    allowBackorders: boolean;
  };
}

export interface GenerateVariantsResponse {
  combinations: VariantCombination[];
  totalCombinations: number;
  message: string;
}

// Bulk Import/Export Types

export interface BulkImportJob {
  id: string;
  merchantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileName: string;
  fileType: 'csv' | 'excel';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportError {
  row: number;
  field?: string;
  value?: any;
  error: string;
  severity: 'error' | 'warning';
}

export interface BulkImportRequest {
  file: File | { uri: string; name: string; type: string }; // File object or React Native file
  format: 'csv' | 'excel';
  options?: {
    updateExisting?: boolean; // Update if SKU exists
    skipErrors?: boolean; // Continue on row errors
    createVariants?: boolean; // Auto-create product variants
    validateOnly?: boolean; // Only validate, don't import
  };
}

export interface BulkImportResponse {
  jobId: string;
  message: string;
  status: BulkImportJob['status'];
}

export interface BulkImportProgressResponse {
  job: BulkImportJob;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
}

export interface ExportConfig {
  filters?: {
    productIds?: string[];
    category?: string;
    status?: 'active' | 'inactive';
    hasVariants?: boolean;
  };
  format: 'csv' | 'excel';
  includeVariants?: boolean;
  includeImages?: boolean;
  includeInventory?: boolean;
  columns?: string[]; // Specific columns to export
}

export interface ExportProductsResponse {
  url: string;
  fileName: string;
  expiresAt: Date;
  recordCount: number;
}

export interface BulkUpdateProductsRequest {
  productIds: string[];
  updates: {
    status?: 'active' | 'inactive' | 'draft' | 'archived';
    category?: string;
    priceAdjustment?: {
      type: 'percentage' | 'fixed' | 'set';
      value: number;
    };
    stockAdjustment?: {
      type: 'set' | 'add' | 'subtract';
      value: number;
      applyToVariants?: boolean;
    };
    tags?: {
      action: 'add' | 'remove' | 'replace';
      values: string[];
    };
    visibility?: 'public' | 'hidden' | 'featured';
  };
}

export interface BulkUpdateProductsResponse {
  successful: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
  message: string;
}

// Template types

export interface ImportTemplateColumn {
  field: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  example?: string;
  validation?: string;
  enumValues?: string[];
}

export interface ImportTemplate {
  format: 'csv' | 'excel';
  columns: ImportTemplateColumn[];
  sampleData: Record<string, any>[];
}

// Validation types

export interface VariantValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface VariantStockStatus {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder';
  availableQuantity: number;
  message: string;
  color: string; // UI color indicator
}

// Utility types for variant operations

export interface VariantFormData {
  attributes: VariantAttribute[];
  sku: string;
  barcode: string;
  priceAdjustment: string; // String for form input
  costPrice: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  allowBackorders: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: 'cm' | 'inch';
  };
  isActive: boolean;
  isDefault: boolean;
}

export interface VariantFilters {
  search?: string;
  attributes?: Array<{
    type: AttributeType;
    value: string;
  }>;
  priceRange?: {
    min: number;
    max: number;
  };
  stockStatus?: VariantStockStatus['status'];
  isActive?: boolean;
  sortBy?: 'name' | 'price' | 'stock' | 'created';
  sortOrder?: 'asc' | 'desc';
}

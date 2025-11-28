// Variant-related constants for the merchant app

import { AttributeType } from '../types/variants';

// Attribute type options
export const ATTRIBUTE_TYPES = [
  { label: 'Color', value: AttributeType.COLOR },
  { label: 'Size', value: AttributeType.SIZE },
  { label: 'Material', value: AttributeType.MATERIAL },
  { label: 'Weight', value: AttributeType.WEIGHT },
  { label: 'Flavor', value: AttributeType.FLAVOR },
  { label: 'Style', value: AttributeType.STYLE },
  { label: 'Pattern', value: AttributeType.PATTERN },
  { label: 'Finish', value: AttributeType.FINISH },
  { label: 'Custom', value: AttributeType.CUSTOM },
];

// Common size options
export const SIZE_OPTIONS = {
  clothing: [
    { value: 'XXS', displayValue: 'XX-Small', sortOrder: 1 },
    { value: 'XS', displayValue: 'X-Small', sortOrder: 2 },
    { value: 'S', displayValue: 'Small', sortOrder: 3 },
    { value: 'M', displayValue: 'Medium', sortOrder: 4 },
    { value: 'L', displayValue: 'Large', sortOrder: 5 },
    { value: 'XL', displayValue: 'X-Large', sortOrder: 6 },
    { value: 'XXL', displayValue: 'XX-Large', sortOrder: 7 },
    { value: 'XXXL', displayValue: 'XXX-Large', sortOrder: 8 },
  ],
  shoes: [
    { value: '5', displayValue: 'Size 5', sortOrder: 1 },
    { value: '6', displayValue: 'Size 6', sortOrder: 2 },
    { value: '7', displayValue: 'Size 7', sortOrder: 3 },
    { value: '8', displayValue: 'Size 8', sortOrder: 4 },
    { value: '9', displayValue: 'Size 9', sortOrder: 5 },
    { value: '10', displayValue: 'Size 10', sortOrder: 6 },
    { value: '11', displayValue: 'Size 11', sortOrder: 7 },
    { value: '12', displayValue: 'Size 12', sortOrder: 8 },
    { value: '13', displayValue: 'Size 13', sortOrder: 9 },
  ],
  numeric: [
    { value: '28', displayValue: '28', sortOrder: 1 },
    { value: '30', displayValue: '30', sortOrder: 2 },
    { value: '32', displayValue: '32', sortOrder: 3 },
    { value: '34', displayValue: '34', sortOrder: 4 },
    { value: '36', displayValue: '36', sortOrder: 5 },
    { value: '38', displayValue: '38', sortOrder: 6 },
    { value: '40', displayValue: '40', sortOrder: 7 },
    { value: '42', displayValue: '42', sortOrder: 8 },
  ],
  international: [
    { value: 'XS', displayValue: 'X-Small', sortOrder: 1 },
    { value: 'S', displayValue: 'Small', sortOrder: 2 },
    { value: 'M', displayValue: 'Medium', sortOrder: 3 },
    { value: 'L', displayValue: 'Large', sortOrder: 4 },
    { value: 'XL', displayValue: 'X-Large', sortOrder: 5 },
  ],
};

// Common color options with hex values
export const COLOR_OPTIONS = [
  { value: 'black', displayValue: 'Black', hexColor: '#000000', sortOrder: 1 },
  { value: 'white', displayValue: 'White', hexColor: '#FFFFFF', sortOrder: 2 },
  { value: 'gray', displayValue: 'Gray', hexColor: '#808080', sortOrder: 3 },
  { value: 'red', displayValue: 'Red', hexColor: '#FF0000', sortOrder: 4 },
  { value: 'blue', displayValue: 'Blue', hexColor: '#0000FF', sortOrder: 5 },
  { value: 'green', displayValue: 'Green', hexColor: '#00FF00', sortOrder: 6 },
  { value: 'yellow', displayValue: 'Yellow', hexColor: '#FFFF00', sortOrder: 7 },
  { value: 'orange', displayValue: 'Orange', hexColor: '#FFA500', sortOrder: 8 },
  { value: 'purple', displayValue: 'Purple', hexColor: '#800080', sortOrder: 9 },
  { value: 'pink', displayValue: 'Pink', hexColor: '#FFC0CB', sortOrder: 10 },
  { value: 'brown', displayValue: 'Brown', hexColor: '#A52A2A', sortOrder: 11 },
  { value: 'beige', displayValue: 'Beige', hexColor: '#F5F5DC', sortOrder: 12 },
  { value: 'navy', displayValue: 'Navy', hexColor: '#000080', sortOrder: 13 },
  { value: 'maroon', displayValue: 'Maroon', hexColor: '#800000', sortOrder: 14 },
  { value: 'teal', displayValue: 'Teal', hexColor: '#008080', sortOrder: 15 },
  { value: 'gold', displayValue: 'Gold', hexColor: '#FFD700', sortOrder: 16 },
  { value: 'silver', displayValue: 'Silver', hexColor: '#C0C0C0', sortOrder: 17 },
  { value: 'multicolor', displayValue: 'Multicolor', hexColor: '#FF00FF', sortOrder: 18 },
];

// Common material options
export const MATERIAL_OPTIONS = [
  { value: 'cotton', displayValue: 'Cotton', sortOrder: 1 },
  { value: 'polyester', displayValue: 'Polyester', sortOrder: 2 },
  { value: 'wool', displayValue: 'Wool', sortOrder: 3 },
  { value: 'silk', displayValue: 'Silk', sortOrder: 4 },
  { value: 'leather', displayValue: 'Leather', sortOrder: 5 },
  { value: 'denim', displayValue: 'Denim', sortOrder: 6 },
  { value: 'linen', displayValue: 'Linen', sortOrder: 7 },
  { value: 'nylon', displayValue: 'Nylon', sortOrder: 8 },
  { value: 'spandex', displayValue: 'Spandex', sortOrder: 9 },
  { value: 'rayon', displayValue: 'Rayon', sortOrder: 10 },
  { value: 'velvet', displayValue: 'Velvet', sortOrder: 11 },
  { value: 'canvas', displayValue: 'Canvas', sortOrder: 12 },
  { value: 'synthetic', displayValue: 'Synthetic', sortOrder: 13 },
  { value: 'metal', displayValue: 'Metal', sortOrder: 14 },
  { value: 'plastic', displayValue: 'Plastic', sortOrder: 15 },
  { value: 'wood', displayValue: 'Wood', sortOrder: 16 },
  { value: 'glass', displayValue: 'Glass', sortOrder: 17 },
  { value: 'ceramic', displayValue: 'Ceramic', sortOrder: 18 },
];

// Style options
export const STYLE_OPTIONS = [
  { value: 'casual', displayValue: 'Casual', sortOrder: 1 },
  { value: 'formal', displayValue: 'Formal', sortOrder: 2 },
  { value: 'business', displayValue: 'Business', sortOrder: 3 },
  { value: 'sporty', displayValue: 'Sporty', sortOrder: 4 },
  { value: 'vintage', displayValue: 'Vintage', sortOrder: 5 },
  { value: 'modern', displayValue: 'Modern', sortOrder: 6 },
  { value: 'classic', displayValue: 'Classic', sortOrder: 7 },
  { value: 'bohemian', displayValue: 'Bohemian', sortOrder: 8 },
  { value: 'minimalist', displayValue: 'Minimalist', sortOrder: 9 },
  { value: 'elegant', displayValue: 'Elegant', sortOrder: 10 },
];

// Pattern options
export const PATTERN_OPTIONS = [
  { value: 'solid', displayValue: 'Solid', sortOrder: 1 },
  { value: 'striped', displayValue: 'Striped', sortOrder: 2 },
  { value: 'checked', displayValue: 'Checked', sortOrder: 3 },
  { value: 'polka-dot', displayValue: 'Polka Dot', sortOrder: 4 },
  { value: 'floral', displayValue: 'Floral', sortOrder: 5 },
  { value: 'geometric', displayValue: 'Geometric', sortOrder: 6 },
  { value: 'abstract', displayValue: 'Abstract', sortOrder: 7 },
  { value: 'paisley', displayValue: 'Paisley', sortOrder: 8 },
  { value: 'animal-print', displayValue: 'Animal Print', sortOrder: 9 },
  { value: 'camouflage', displayValue: 'Camouflage', sortOrder: 10 },
];

// Finish options
export const FINISH_OPTIONS = [
  { value: 'matte', displayValue: 'Matte', sortOrder: 1 },
  { value: 'glossy', displayValue: 'Glossy', sortOrder: 2 },
  { value: 'satin', displayValue: 'Satin', sortOrder: 3 },
  { value: 'textured', displayValue: 'Textured', sortOrder: 4 },
  { value: 'metallic', displayValue: 'Metallic', sortOrder: 5 },
  { value: 'brushed', displayValue: 'Brushed', sortOrder: 6 },
  { value: 'polished', displayValue: 'Polished', sortOrder: 7 },
  { value: 'distressed', displayValue: 'Distressed', sortOrder: 8 },
];

// Weight options (for products sold by weight)
export const WEIGHT_OPTIONS = [
  { value: '100g', displayValue: '100 grams', sortOrder: 1 },
  { value: '250g', displayValue: '250 grams', sortOrder: 2 },
  { value: '500g', displayValue: '500 grams', sortOrder: 3 },
  { value: '1kg', displayValue: '1 kilogram', sortOrder: 4 },
  { value: '2kg', displayValue: '2 kilograms', sortOrder: 5 },
  { value: '5kg', displayValue: '5 kilograms', sortOrder: 6 },
];

// Default variant settings
export const DEFAULT_VARIANT_SETTINGS = {
  inventory: {
    stock: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorders: false,
    reservedStock: 0,
  },
  pricing: {
    priceAdjustment: 0,
  },
  isActive: true,
  isDefault: false,
};

// Import/Export formats
export const IMPORT_EXPORT_FORMATS = [
  { label: 'CSV', value: 'csv', extension: '.csv', mimeType: 'text/csv' },
  {
    label: 'Excel',
    value: 'excel',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
];

// CSV template columns
export const PRODUCT_CSV_COLUMNS = [
  'SKU',
  'Product Name',
  'Description',
  'Category',
  'Subcategory',
  'Brand',
  'Price',
  'Cost Price',
  'Compare At Price',
  'Stock',
  'Low Stock Threshold',
  'Track Inventory',
  'Allow Backorders',
  'Image URL',
  'Weight',
  'Length',
  'Width',
  'Height',
  'Dimension Unit',
  'Tags',
  'Status',
  'Visibility',
  'Cashback Percentage',
  'Cashback Max Amount',
];

// Variant CSV template columns (additional to product columns)
export const VARIANT_CSV_COLUMNS = [
  ...PRODUCT_CSV_COLUMNS,
  'Parent SKU',
  'Variant Attributes',
  'Attribute Type',
  'Attribute Value',
  'Price Adjustment',
  'Is Default',
];

// Validation rules
export const VALIDATION_RULES = {
  sku: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Z0-9-_]+$/i,
    message: 'SKU must be 3-50 characters and contain only letters, numbers, hyphens, and underscores',
  },
  barcode: {
    minLength: 8,
    maxLength: 13,
    pattern: /^\d+$/,
    message: 'Barcode must be 8-13 digits',
  },
  price: {
    min: 0,
    max: 10000000,
    message: 'Price must be between 0 and 10,000,000',
  },
  stock: {
    min: 0,
    max: 1000000,
    message: 'Stock must be between 0 and 1,000,000',
  },
  priceAdjustment: {
    min: -1000000,
    max: 1000000,
    message: 'Price adjustment must be between -1,000,000 and 1,000,000',
  },
  weight: {
    min: 0,
    max: 100000,
    message: 'Weight must be between 0 and 100,000',
  },
  dimensions: {
    min: 0,
    max: 10000,
    message: 'Dimensions must be between 0 and 10,000',
  },
};

// Bulk import limits
export const BULK_IMPORT_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxRows: 10000,
  supportedFormats: ['csv', 'xlsx', 'xls'],
  chunkSize: 100, // Process in chunks
};

// Stock status configuration
export const STOCK_STATUS = {
  in_stock: {
    label: 'In Stock',
    color: '#10B981',
    icon: 'checkmark-circle',
    threshold: (stock: number, lowStockThreshold: number) => stock > lowStockThreshold,
  },
  low_stock: {
    label: 'Low Stock',
    color: '#F59E0B',
    icon: 'warning',
    threshold: (stock: number, lowStockThreshold: number) => stock > 0 && stock <= lowStockThreshold,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: '#EF4444',
    icon: 'close-circle',
    threshold: (stock: number) => stock === 0,
  },
  backorder: {
    label: 'Available on Backorder',
    color: '#3B82F6',
    icon: 'time',
    threshold: (stock: number, lowStockThreshold: number, allowBackorders: boolean) =>
      stock === 0 && allowBackorders,
  },
};

// SKU generation config
export const SKU_GENERATION = {
  prefix: {
    default: 'PRD',
    variant: 'VAR',
  },
  separator: '-',
  includeTimestamp: false,
  includeRandomString: true,
  randomStringLength: 6,
};

// Variant display config
export const VARIANT_DISPLAY = {
  maxAttributesInName: 3,
  attributeSeparator: ' / ',
  maxVariantsToShow: 50,
  paginationSize: 20,
};

// Export template instructions
export const EXPORT_TEMPLATE_INSTRUCTIONS = {
  csv: [
    'Fill in all required fields marked with *',
    'SKU must be unique for each product',
    'Price should be in numbers without currency symbols',
    'Stock should be a whole number',
    'Status should be one of: active, inactive, draft, archived',
    'Visibility should be one of: public, hidden, featured',
    'Track Inventory and Allow Backorders should be TRUE or FALSE',
    'Tags should be comma-separated',
    'Image URLs should be valid HTTP/HTTPS URLs',
    'For variants, use Parent SKU to reference the main product',
  ],
};

// Maximum number of variants per product
export const MAX_VARIANTS_PER_PRODUCT = 100;

// Maximum number of attributes per variant
export const MAX_ATTRIBUTES_PER_VARIANT = 5;

// Attribute value mapping helpers
export const getAttributeOptions = (type: AttributeType) => {
  switch (type) {
    case AttributeType.COLOR:
      return COLOR_OPTIONS;
    case AttributeType.MATERIAL:
      return MATERIAL_OPTIONS;
    case AttributeType.STYLE:
      return STYLE_OPTIONS;
    case AttributeType.PATTERN:
      return PATTERN_OPTIONS;
    case AttributeType.FINISH:
      return FINISH_OPTIONS;
    case AttributeType.WEIGHT:
      return WEIGHT_OPTIONS;
    default:
      return [];
  }
};

// Get size options by category
export const getSizeOptionsByCategory = (category?: string): Array<{ value: string; displayValue: string; sortOrder: number }> => {
  if (!category) return SIZE_OPTIONS.international;

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('shoe') || lowerCategory.includes('footwear')) {
    return SIZE_OPTIONS.shoes;
  }
  if (lowerCategory.includes('pant') || lowerCategory.includes('jeans') || lowerCategory.includes('trouser')) {
    return SIZE_OPTIONS.numeric;
  }
  if (lowerCategory.includes('clothing') || lowerCategory.includes('apparel')) {
    return SIZE_OPTIONS.clothing;
  }

  return SIZE_OPTIONS.international;
};
